<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VerificationPortalController extends Controller
{
    /**
     * Public verification portal for scanned QR Code.
     * Accessible without login.
     *
     * @param string $hash
     * @return \Inertia\Response|\Illuminate\Http\JsonResponse
     */
    public function verify(Request $request, string $hash)
    {
        // Try finding by verification_hash, or qr_code_hash, or nomor_dokumen, or ID
        $dokumen = Dokumen::with([
            'user',
            'company',
            'aplikasi',
            'transaksi',
            'latestVersion',
            'approvals' => function ($query) {
                $query->with(['user', 'masterflowStep.jabatan'])
                    ->orderBy('created_at', 'asc');
            },
        ])
        ->where('verification_hash', $hash)
        ->orWhere('qr_code_hash', $hash)
        ->orWhere('nomor_dokumen', $hash)
        ->orWhere('id', is_numeric($hash) ? (int)$hash : 0)
        ->first();

        if (!$dokumen) {
            return Inertia::render('portal/verify', [
                'isValid' => false,
                'errorMessage' => 'Dokumen tidak ditemukan atau kode verifikasi tidak valid.',
                'dokumen' => null,
            ]);
        }

        // Prepare structured approval data
        $approvalsList = $dokumen->approvals->map(function ($approval) {
            // Determine approver's effective jabatan
            $jabatanName = $approval->approver_jabatan 
                ?? $approval->masterflowStep?->jabatan?->name 
                ?? $approval->user?->userAuths?->first()?->jabatan?->name 
                ?? 'Pejabat Berwenang';

            return [
                'id' => $approval->id,
                'step_name' => $approval->masterflowStep?->step_name ?? 'Persetujuan',
                'approver_name' => $approval->user?->name ?? $approval->approver_email ?? 'Pejabat Berwenang',
                'approver_jabatan' => $jabatanName,
                'status' => $approval->approval_status,
                'tgl_approve' => $approval->tgl_approve ? $approval->tgl_approve->format('d F Y, H:i') . ' WIB' : null,
                'comment' => $approval->comment,
                'signature_type' => $approval->signature_type ?? 'signature',
                'has_signature' => !empty($approval->signature_path),
            ];
        });

        $isFullyApproved = $dokumen->isFullyApproved();
        $isRejected = $dokumen->isRejected();

        $statusLabel = 'SEDANG DIPROSES';
        $statusBadge = 'processing';

        if ($isFullyApproved) {
            $statusLabel = 'SAH & TERVERIFIKASI';
            $statusBadge = 'verified';
        } elseif ($isRejected) {
            $statusLabel = 'DITOLAK';
            $statusBadge = 'rejected';
        } elseif ($dokumen->status === 'draft') {
            $statusLabel = 'DRAF DOKUMEN';
            $statusBadge = 'draft';
        }

        $documentData = [
            'id' => $dokumen->id,
            'nomor_dokumen' => $dokumen->nomor_dokumen,
            'judul_dokumen' => $dokumen->judul_dokumen,
            'tipe_dokumen' => $dokumen->tipe_dokumen,
            'nominal' => $dokumen->nominal,
            'company_name' => $dokumen->company?->name ?? 'PT Tiga Serangkai',
            'aplikasi_name' => $dokumen->aplikasi?->name ?? 'Sistem Approval TS',
            'transaksi_name' => $dokumen->transaksi?->nama_transaksi ?? '-',
            'departemen' => $dokumen->departemen ?? '-',
            'creator_name' => $dokumen->user?->name ?? 'Pengaju',
            'creator_email' => $dokumen->user?->email ?? '-',
            'tgl_pengajuan' => $dokumen->tgl_pengajuan ? $dokumen->tgl_pengajuan->format('d F Y') : '-',
            'status' => $dokumen->status,
            'status_label' => $statusLabel,
            'status_badge' => $statusBadge,
            'verification_hash' => $dokumen->verification_hash,
            'verified_at' => now()->format('d F Y, H:i:s') . ' WIB',
            'file_name' => $dokumen->latestVersion?->nama_file,
            'approvals' => $approvalsList,
        ];

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'isValid' => true,
                'data' => $documentData,
            ]);
        }

        return Inertia::render('portal/verify', [
            'isValid' => true,
            'dokumen' => $documentData,
            'errorMessage' => null,
        ]);
    }
}
