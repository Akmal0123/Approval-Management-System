<?php

namespace App\Services;

use App\Models\Dokumen;
use App\Models\DokumenHash;
use App\Models\DokumenVersion;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class LookupDraftSyncService
{
    /**
     * Dapatkan akun pengguna Super Admin di AMS yang akan menjadi pemilik (user_id)
     * dari seluruh dokumen draft yang ditarik dari sistem eksternal.
     */
    public static function getSuperAdminUser(): ?User
    {
        return User::whereHas('userAuths.role', function ($q) {
            $q->where('role_name', 'Super Admin');
        })
            ->orWhereHas('userAuths', function ($q) {
                $q->where('role_id', 1);
            })
            ->orWhere('email', 'superadmin@gmail.com')
            ->first() ?? User::find(1);
    }

    /**
     * Sinkronisasi seluruh lookup data dari semua transaksi aktif ke akun Super Admin sebagai draft dokumen.
     * Mencegah duplikasi: nomor dokumen yang sudah ada di database AMS tidak akan dibuat ulang.
     *
     * @param int|null $limitPerType Maksimal data yang ditarik per jenis transaksi
     * @param string|null $targetKode Filter kode transaksi tertentu (misal: 'PO' atau 'PR')
     * @return array Ringkasan hasil sinkronisasi
     */
    public static function syncAll(?int $limitPerType = null, ?string $targetKode = null): array
    {
        $superadmin = self::getSuperAdminUser();
        if (!$superadmin) {
            Log::error('LookupDraftSyncService: Akun Super Admin tidak ditemukan di sistem AMS.');
            return [
                'success' => false,
                'message' => 'Akun Super Admin tidak ditemukan di sistem.',
                'created' => 0,
                'skipped' => 0,
                'errors' => 1,
                'details' => [],
            ];
        }

        $query = Transaksi::with('aplikasi')
            ->where('is_active', true)
            ->whereNotNull('lookup_path_api');

        if ($targetKode) {
            $query->where('kode_transaksi', strtoupper($targetKode));
        }

        $transaksis = $query->get();

        $totalFetched = 0;
        $totalCreated = 0;
        $totalSkipped = 0;
        $totalErrors = 0;
        $details = [];

        foreach ($transaksis as $transaksi) {
            $txResult = self::syncTransaksi($transaksi, $superadmin, $limitPerType);
            $totalFetched += $txResult['fetched'];
            $totalCreated += $txResult['created'];
            $totalSkipped += $txResult['skipped'];
            $totalErrors += $txResult['errors'];
            $details[$transaksi->kode_transaksi] = $txResult;
        }

        Log::info("LookupDraftSyncService::syncAll selesai: Fetched={$totalFetched}, Created={$totalCreated}, Skipped={$totalSkipped}, Errors={$totalErrors}");

        return [
            'success' => true,
            'message' => "Sinkronisasi selesai: {$totalCreated} dokumen draft baru dibuat, {$totalSkipped} dokumen sudah ada (dilewati).",
            'superadmin' => [
                'id' => $superadmin->id,
                'name' => $superadmin->name,
                'email' => $superadmin->email,
            ],
            'total_fetched' => $totalFetched,
            'created' => $totalCreated,
            'skipped' => $totalSkipped,
            'errors' => $totalErrors,
            'details' => $details,
        ];
    }

    /**
     * Tarik dan buat dokumen draft untuk satu jenis tipe transaksi tertentu.
     */
    public static function syncTransaksi(Transaksi $transaksi, User $superadmin, ?int $limit = null): array
    {
        $lookupPath = $transaksi->lookup_path_api;
        if (empty($lookupPath)) {
            return [
                'transaksi' => $transaksi->kode_transaksi,
                'fetched' => 0,
                'created' => 0,
                'skipped' => 0,
                'errors' => 0,
                'items' => [],
            ];
        }

        $params = [];
        if ($limit) {
            $params['limit'] = $limit;
        }

        $rawItems = FastifyIntegrationService::fetchDocumentsList($lookupPath, $params);
        $itemsToProcess = $limit ? array_slice($rawItems, 0, $limit) : $rawItems;
        $fetched = count($itemsToProcess);
        $created = 0;
        $skipped = 0;
        $errors = 0;
        $itemSummaries = [];

        foreach ($itemsToProcess as $item) {
            $res = self::createDraftFromItem($item, $transaksi, $superadmin);
            if ($res['status'] === 'created') {
                $created++;
            } elseif ($res['status'] === 'skipped') {
                $skipped++;
            } else {
                $errors++;
            }
            $itemSummaries[] = $res;
        }

        return [
            'transaksi' => $transaksi->kode_transaksi,
            'nama_transaksi' => $transaksi->nama_transaksi,
            'fetched' => $fetched,
            'created' => $created,
            'skipped' => $skipped,
            'errors' => $errors,
            'items' => $itemSummaries,
        ];
    }

    /**
     * Buat satu dokumen draft untuk akun Super Admin dari satu record eksternal.
     * Mencegah duplikasi bila dokumen dengan nomor_dokumen yang sama sudah pernah tercatat.
     */
    public static function createDraftFromItem(array $item, Transaksi $transaksi, User $superadmin): array
    {
        $nomorDokumen = trim($item['nomor_dokumen'] ?? ($item['kode'] ?? ($item['document_number'] ?? '')));
        if (empty($nomorDokumen)) {
            return [
                'status' => 'error',
                'nomor_dokumen' => '-',
                'message' => 'Nomor dokumen eksternal tidak ditemukan atau kosong.',
            ];
        }

        // 1. Cek apakah dokumen sudah ada di database AMS
        $existing = Dokumen::where('nomor_dokumen', $nomorDokumen)->first();
        if ($existing) {
            return [
                'status' => 'skipped',
                'nomor_dokumen' => $nomorDokumen,
                'dokumen_id' => $existing->id,
                'current_status' => $existing->status,
                'message' => "Dokumen '{$nomorDokumen}' sudah ada di AMS (ID: {$existing->id}, Status: {$existing->status}).",
            ];
        }

        // 2. Siapkan data atribut dokumen (default nama dokumen mengikuti dari nomor dokumen saja)
        $judul = $nomorDokumen;

        $nominal = (float) ($item['nominal'] ?? ($item['total'] ?? ($item['grand_total'] ?? 0)));
        $tanggal = $item['tanggal'] ?? ($item['date'] ?? ($item['order_date'] ?? now()->toDateString()));
        $deskripsi = $item['deskripsi'] ?? ($item['note'] ?? "Dokumen transaksi {$transaksi->nama_transaksi} ({$nomorDokumen}) ditarik otomatis dari sistem eksternal.");

        $companyId = $transaksi->aplikasi?->company_id ?? 1;
        $aplikasiId = $transaksi->aplikasi_id ?? 1;

        // 3. Ambil file PDF dari microservice-lookup
        $pdfBinary = FastifyIntegrationService::fetchPdfByPath(
            $nomorDokumen,
            $transaksi->get_pdf_path_api,
            $transaksi->lookup_path_api
        );

        DB::beginTransaction();
        try {
            // 4. Buat dokumen baru dengan status draft kepemilikan Super Admin
            $dokumen = Dokumen::create([
                'nomor_dokumen' => $nomorDokumen,
                'judul_dokumen' => $judul,
                'nominal' => $nominal,
                'user_id' => $superadmin->id,
                'company_id' => $companyId,
                'aplikasi_id' => $aplikasiId,
                'transaksi_id' => $transaksi->id,
                'tipe_dokumen' => 'transaksi',
                'status' => 'draft',
                'status_current' => 'draft',
                'tgl_pengajuan' => $tanggal,
                'tgl_deadline' => now()->addDays(7)->toDateString(),
                'deskripsi' => $deskripsi,
            ]);

            // 5. Simpan file PDF ke storage dokumen
            $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
            $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);
            $folderPath = 'dokumen/' . $nomorDokumen;
            $fileName = "{$nomorDokumen}_{$cleanJudul}_v1.pdf";
            $relativePath = "{$folderPath}/{$fileName}";

            if (empty($pdfBinary)) {
                // Fallback: Generate PDF template formulir transaksi standar
                $pdfBinary = self::generateFallbackPdfContent($dokumen, $transaksi);
            }

            Storage::disk('local')->put($relativePath, $pdfBinary);
            $fileSize = strlen($pdfBinary);

            // 6. Buat DokumenVersion v1.0
            $version = DokumenVersion::create([
                'dokumen_id' => $dokumen->id,
                'version' => '1.0',
                'nama_file' => "{$nomorDokumen}.pdf",
                'tgl_upload' => now(),
                'tipe_file' => 'pdf',
                'file_url' => $relativePath,
                'size_file' => $fileSize,
                'status' => 'active',
            ]);

            // 7. Catat DokumenHash awal untuk keaslian dokumen
            try {
                $fullPath = Storage::disk('local')->path($relativePath);
                if (file_exists($fullPath)) {
                    DokumenHash::create([
                        'dokumen_id' => $dokumen->id,
                        'dokumen_version_id' => $version->id,
                        'sha256_hash' => hash_file('sha256', $fullPath),
                        'hash_type' => 'original',
                        'file_path' => $relativePath,
                        'file_size' => $fileSize,
                        'note' => 'Dokumen draft ditarik otomatis dari External Lookup ke akun Super Admin',
                    ]);
                }
            } catch (\Throwable $hashEx) {
                Log::warning("Gagal mencatat hash dokumen {$nomorDokumen}: " . $hashEx->getMessage());
            }

            DB::commit();

            Log::info("Dokumen draft baru berhasil dibuat untuk Superadmin: {$nomorDokumen} (ID: {$dokumen->id})");

            return [
                'status' => 'created',
                'nomor_dokumen' => $nomorDokumen,
                'dokumen_id' => $dokumen->id,
                'user_id' => $superadmin->id,
                'message' => "Dokumen '{$nomorDokumen}' berhasil dibuat sebagai draft untuk Super Admin.",
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Gagal membuat dokumen draft {$nomorDokumen}: " . $e->getMessage());

            return [
                'status' => 'error',
                'nomor_dokumen' => $nomorDokumen,
                'message' => "Gagal membuat dokumen draft {$nomorDokumen}: " . $e->getMessage(),
            ];
        }
    }

    /**
     * Generate konten binary PDF formulir pengajuan transaksi jika service eksternal belum menyediakan file PDF langsung.
     */
    public static function generateFallbackPdfContent(Dokumen $dokumen, ?Transaksi $transaksi = null): string
    {
        $pdf = new \setasign\Fpdi\Fpdi();
        $pdf->SetAuthor('Approval Management System');
        $pdf->SetCreator('Approval Management System');
        $pdf->SetTitle($dokumen->nomor_dokumen . ' - ' . $dokumen->judul_dokumen);
        $pdf->SetSubject('Formulir Pengajuan Transaksi Draft');
        $pdf->AddPage('P', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 15);

        // Header Accent Bar
        $pdf->SetFillColor(15, 118, 110);
        $pdf->Rect(15, 15, 180, 4, 'F');

        // Document Title
        $pdf->SetY(24);
        $pdf->SetFont('Arial', 'B', 16);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(180, 8, 'FORMULIR PENGAJUAN TRANSAKSI (DRAFT)', 0, 1, 'C');

        $pdf->SetFont('Arial', '', 10);
        $pdf->SetTextColor(100, 116, 139);
        $companyName = $dokumen->company?->name ?? 'Approval Management System';
        $aplikasiName = $dokumen->aplikasi?->name ?? '-';
        $pdf->Cell(180, 5, "{$companyName} | Modul Aplikasi: {$aplikasiName}", 0, 1, 'C');

        $pdf->Ln(4);
        $pdf->SetDrawColor(226, 232, 240);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(6);

        // Information Grid
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->SetTextColor(30, 41, 59);
        $pdf->Cell(180, 6, 'INFORMASI TRANSAKSI', 0, 1, 'L');
        $pdf->Ln(2);

        $tglPengajuanFormatted = $dokumen->tgl_pengajuan
            ? (is_string($dokumen->tgl_pengajuan) ? date('d/m/Y', strtotime($dokumen->tgl_pengajuan)) : $dokumen->tgl_pengajuan->format('d/m/Y'))
            : '-';
        $tglDeadlineFormatted = $dokumen->tgl_deadline
            ? (is_string($dokumen->tgl_deadline) ? date('d/m/Y', strtotime($dokumen->tgl_deadline)) : $dokumen->tgl_deadline->format('d/m/Y'))
            : '-';

        $data = [
            ['Nomor Dokumen', ': ' . $dokumen->nomor_dokumen],
            ['Judul Pengajuan', ': ' . $dokumen->judul_dokumen],
            ['Tipe Transaksi', ': ' . ($transaksi ? "{$transaksi->kode_transaksi} - {$transaksi->nama_transaksi}" : '-')],
            ['Departemen', ': ' . ($transaksi?->departemen ?? '-')],
            ['Nominal', ': Rp ' . number_format((float) $dokumen->nominal, 0, ',', '.')],
            ['Tanggal Transaksi', ': ' . $tglPengajuanFormatted],
            ['Batas Waktu (Deadline)', ': ' . $tglDeadlineFormatted],
            ['Pemilik Draft', ': ' . ($dokumen->user?->name ?? 'Super Administrator')],
            ['Status Alur', ': DRAFT (Menunggu Konfigurasi Approval)'],
        ];

        $pdf->SetFont('Arial', '', 9);
        $fill = false;
        foreach ($data as $row) {
            $pdf->SetFillColor($fill ? 248 : 255, $fill ? 250 : 255, $fill ? 252 : 255);
            $pdf->SetTextColor(71, 85, 105);
            $pdf->Cell(50, 7, $row[0], 1, 0, 'L', true);
            $pdf->SetTextColor(15, 23, 42);
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->Cell(130, 7, $row[1], 1, 1, 'L', true);
            $pdf->SetFont('Arial', '', 9);
            $fill = !$fill;
        }

        $pdf->Ln(6);
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->SetTextColor(30, 41, 59);
        $pdf->Cell(180, 6, 'DESKRIPSI / KETERANGAN PENGAJUAN', 0, 1, 'L');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', '', 9);
        $pdf->SetTextColor(51, 65, 85);
        $pdf->SetFillColor(248, 250, 252);
        $deskripsi = $dokumen->deskripsi ?: 'Tidak ada keterangan tambahan.';
        $pdf->MultiCell(180, 6, $deskripsi, 1, 'L', true);

        $pdf->Ln(10);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->SetTextColor(30, 41, 59);
        $pdf->Cell(180, 6, 'LEMBAR PENGESAHAN ELEKTRONIK', 0, 1, 'C');
        $pdf->SetFont('Arial', 'I', 8);
        $pdf->SetTextColor(148, 163, 184);
        $pdf->Cell(180, 4, 'Dokumen ini diproses dan disahkan secara digital melalui Approval Management System', 0, 1, 'C');

        return $pdf->Output('S');
    }
}
