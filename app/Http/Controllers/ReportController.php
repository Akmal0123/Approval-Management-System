<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Services\ContextService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(ContextService $contextService, Request $request)
    {
        $context = $contextService->getContext();
        $companyId = $context ? $context->company_id : null;
        
        $query = Dokumen::with(['company', 'aplikasi', 'transaksi', 'user']);

        // Filter by user's active company context
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $dokumen = $query->orderBy('created_at', 'desc')->get();

        // Group the data by Company -> Aplikasi -> Transaksi
        $grouped = [];
        
        foreach ($dokumen as $doc) {
            $companyName = $doc->company ? $doc->company->name : 'Unknown Company';
            $aplikasiName = $doc->aplikasi ? $doc->aplikasi->name : 'Unknown Aplikasi';
            $transaksiName = $doc->transaksi ? $doc->transaksi->name : 'Unknown Transaksi';
            
            $statusCategory = $doc->isFullyApproved() ? 'Approved' : 'Belum Approved';
            
            if (!isset($grouped[$companyName])) {
                $grouped[$companyName] = [];
            }
            if (!isset($grouped[$companyName][$aplikasiName])) {
                $grouped[$companyName][$aplikasiName] = [];
            }
            if (!isset($grouped[$companyName][$aplikasiName][$transaksiName])) {
                $grouped[$companyName][$aplikasiName][$transaksiName] = [];
            }
            
            $grouped[$companyName][$aplikasiName][$transaksiName][] = [
                'id' => $doc->id,
                'nomor_dokumen' => $doc->nomor_dokumen,
                'judul_dokumen' => $doc->judul_dokumen,
                'status' => $statusCategory,
                'status_detail' => $doc->status_current ?? $doc->status,
                'tgl_pengajuan' => $doc->tgl_pengajuan ? $doc->tgl_pengajuan->format('Y-m-d') : null,
                'user' => $doc->user ? $doc->user->name : 'Unknown',
            ];
        }

        return Inertia::render('report/index', [
            'groupedData' => $grouped,
        ]);
    }
}
