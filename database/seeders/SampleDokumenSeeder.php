<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\DokumenApproval;
use App\Models\User;
use App\Models\Masterflow;
use Illuminate\Support\Facades\Storage;

class SampleDokumenSeeder extends Seeder
{
    /**
     * Run the database seeds for sample documents.
     */
    public function run(): void
    {
        $users = User::all();
        if ($users->isEmpty()) {
            return;
        }

        // Get cukakyay or superadmin or first user
        $allUserEmails = ['cukakyay@gmail.com', 'superadmin@gmail.com', 'superadmin@example.com'];
        $owner = User::whereIn('email', $allUserEmails)->first() ?? $users->first();
        $masterflow = Masterflow::first();

        // Create valid real PDF file
        $dummyPdfPath = 'dokumen/sample_document_v1.pdf';
        try {
            $pdf = new \setasign\Fpdi\Fpdi();
            $pdf->AddPage();
            $pdf->SetFont('Arial', 'B', 16);
            $pdf->Cell(0, 10, 'DOKUMEN SAMPEL SYSTEM V2.0', 0, 1, 'C');
            $pdf->Ln(10);
            $pdf->SetFont('Arial', '', 12);
            $pdf->MultiCell(0, 8, "Ini adalah berkas PDF sampel resmi untuk pengujian alur persetujuan sistem.\n\nFile ini mendukung verifikasi TTD Digital otomatis & QR Code Stamping.");
            $pdfData = $pdf->Output('S');
            Storage::disk('public')->put($dummyPdfPath, $pdfData);
        } catch (\Throwable $t) {
            // Fallback
        }

        $sampleDocs = [
            [
                'nomor_dokumen' => 'DOC-PROPOSAL-2026-001',
                'judul_dokumen' => 'Proposal Pengadaan Peralatan IT Kantoran 2026',
                'tipe_dokumen' => 'proposal',
                'nominal' => 4500000,
                'status' => 'submitted',
                'status_current' => 'waiting_approval_1',
                'deskripsi' => 'Pengadaan laptop & perlengkapan pendukung operasional kantor cabang.',
            ],
            [
                'nomor_dokumen' => 'DOC-TRX-2026-002',
                'judul_dokumen' => 'Pengajuan Anggaran Operasional Cabang Utama',
                'tipe_dokumen' => 'transaksi',
                'nominal' => 12500000,
                'status' => 'approved',
                'status_current' => 'approved',
                'deskripsi' => 'Persetujuan dana operasional bulanan cabang Jakarta Pusat.',
            ],
            [
                'nomor_dokumen' => 'DOC-MEMO-2026-003',
                'judul_dokumen' => 'Memo Internal Kebijakan Jam Kerja Terbaru',
                'tipe_dokumen' => 'memo',
                'nominal' => 0,
                'status' => 'draft',
                'status_current' => 'draft',
                'deskripsi' => 'Draf aturan jam kerja terbaru untuk seluruh divisi operasional.',
            ]
        ];

        foreach ($sampleDocs as $docData) {
            // Assign documents to owner and create for all admin/superadmin users
            foreach ($users as $user) {
                $dokumen = Dokumen::updateOrCreate(
                    [
                        'nomor_dokumen' => $docData['nomor_dokumen'] . '-' . $user->id,
                    ],
                    [
                        'judul_dokumen' => $docData['judul_dokumen'],
                        'tipe_dokumen' => $docData['tipe_dokumen'],
                        'nominal' => $docData['nominal'],
                        'user_id' => $user->id,
                        'company_id' => $user->userAuths->first()?->company_id ?? 1,
                        'aplikasi_id' => $user->userAuths->first()?->aplikasi_id ?? 1,
                        'masterflow_id' => $masterflow?->id ?? 1,
                        'status' => $docData['status'],
                        'status_current' => $docData['status_current'],
                        'tgl_pengajuan' => now(),
                        'tgl_deadline' => now()->addDays(7),
                        'deskripsi' => $docData['deskripsi'],
                        'qr_code_hash' => md5($docData['nomor_dokumen'] . $user->id),
                    ]
                );

                $version = DokumenVersion::updateOrCreate(
                    [
                        'dokumen_id' => $dokumen->id,
                        'version' => '1.0'
                    ],
                    [
                        'nama_file' => 'Berkas_' . $docData['nomor_dokumen'] . '.pdf',
                        'tgl_upload' => now(),
                        'tipe_file' => 'pdf',
                        'file_url' => $dummyPdfPath,
                        'size_file' => 1024,
                        'status' => 'active',
                    ]
                );

                // Add approval record
                DokumenApproval::updateOrCreate(
                    [
                        'dokumen_id' => $dokumen->id,
                        'user_id' => $user->id
                    ],
                    [
                        'approval_order' => 1,
                        'dokumen_version_id' => $version->id,
                        'approval_status' => $docData['status'] === 'approved' ? 'approved' : 'pending',
                        'tgl_deadline' => now()->addDays(7),
                        'tgl_approve' => $docData['status'] === 'approved' ? now() : null,
                    ]
                );
            }
        }
    }
}
