<?php

namespace App\Http\Controllers;

use App\Models\Aplikasi;
use App\Models\Company;
use App\Models\Dokumen;
use App\Services\ContextService;
use App\Services\ReportPdfService;
use App\Services\SimpleXlsxExporter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ReportController extends Controller
{
    /**
     * Display the General Document Report page (/report).
     */
    public function index(ContextService $contextService, Request $request)
    {
        return $this->renderReportPage($contextService, $request, 'general');
    }

    /**
     * Display the Unapproved Document Report page (/report/unapproved).
     */
    public function unapproved(ContextService $contextService, Request $request)
    {
        return $this->renderReportPage($contextService, $request, 'unapproved');
    }

    /**
     * Display the Rejected Document Report page (/report/rejected).
     */
    public function rejected(ContextService $contextService, Request $request)
    {
        return $this->renderReportPage($contextService, $request, 'rejected');
    }

    /**
     * Shared render logic for report pages.
     */
    private function renderReportPage(ContextService $contextService, Request $request, string $reportType)
    {
        $query = $this->buildAuthorizedQuery($contextService, $request, $reportType);
        $dokumen = $query->get();

        $statusFilter = strtolower($request->input('status', 'all'));

        // Group the data by Company -> Aplikasi -> Transaksi
        $grouped = [];

        foreach ($dokumen as $doc) {
            $companyName = $doc->company ? $doc->company->name : 'Unknown Company';
            $aplikasiName = $doc->aplikasi ? $doc->aplikasi->name : 'Unknown Aplikasi';
            $transaksiName = $doc->transaksi ? $doc->transaksi->name : 'Unknown Transaksi';

            $statusCategory = $this->resolveStatusCategory($doc);

            // Additional in-memory status check if filter is applied
            if ($statusFilter !== 'all') {
                if ($reportType === 'unapproved') {
                    if ($statusFilter === 'waiting_approval') {
                        $isWaiting = str_starts_with($doc->status_current ?? '', 'waiting_approval') ||
                            $doc->approvals->contains('approval_status', 'pending');
                        if (!$isWaiting) continue;
                    } elseif ($statusFilter === 'revision') {
                        if ($statusCategory !== 'Revision') continue;
                    } elseif ($statusFilter === 'belum_approved') {
                        if ($statusCategory !== 'Belum Approved') continue;
                    } elseif ($statusFilter === 'others') {
                        if (in_array($statusCategory, ['Revision', 'Belum Approved'])) continue;
                    }
                } elseif ($reportType === 'general') {
                    $normalizedCategory = strtolower(str_replace(' ', '_', $statusCategory));
                    $normalizedFilter = ($statusFilter === 'needs_revision') ? 'revision' : $statusFilter;
                    if ($normalizedCategory !== $normalizedFilter) {
                        continue;
                    }
                }
            }

            // Determine doc type from nomor_dokumen prefix (PO, PR, etc.)
            $nomorDokumen = $doc->nomor_dokumen ?? '';
            $docTypePrefix = strtoupper(substr($nomorDokumen, 0, 2));
            $docType = in_array($docTypePrefix, ['PO', 'PR']) ? $docTypePrefix : 'Lainnya';

            if (!isset($grouped[$companyName])) {
                $grouped[$companyName] = [];
            }
            if (!isset($grouped[$companyName][$aplikasiName])) {
                $grouped[$companyName][$aplikasiName] = [];
            }
            if (!isset($grouped[$companyName][$aplikasiName][$transaksiName])) {
                $grouped[$companyName][$aplikasiName][$transaksiName] = [];
            }
            if (!isset($grouped[$companyName][$aplikasiName][$transaksiName][$docType])) {
                $grouped[$companyName][$aplikasiName][$transaksiName][$docType] = [];
            }

            $grouped[$companyName][$aplikasiName][$transaksiName][$docType][] = [
                'id' => $doc->id,
                'nomor_dokumen' => $doc->nomor_dokumen,
                'judul_dokumen' => $doc->judul_dokumen,
                'nominal' => $doc->nominal ? (float)$doc->nominal : 0,
                'status' => $statusCategory,
                'status_detail' => $doc->status_current ?? $doc->status,
                'tgl_pengajuan' => $doc->tgl_pengajuan ? $doc->tgl_pengajuan->format('Y-m-d') : null,
                'user' => $doc->user ? $doc->user->name : 'Unknown',
            ];
        }

        // Sort doc types (PO first, PR second, others last) and sort docs within each group by nomor_dokumen
        $docTypeOrder = ['PO' => 0, 'PR' => 1, 'Lainnya' => 99];
        foreach ($grouped as $cName => $aplikasiGroups) {
            foreach ($aplikasiGroups as $aName => $transaksiGroups) {
                foreach ($transaksiGroups as $tName => $docTypeGroups) {
                    // Sort doc types: PO → PR → Lainnya
                    uksort($docTypeGroups, fn($a, $b) =>
                        ($docTypeOrder[$a] ?? 99) - ($docTypeOrder[$b] ?? 99)
                    );
                    // Sort docs within each doc type by nomor_dokumen
                    foreach ($docTypeGroups as $dt => $docs) {
                        usort($docs, fn($a, $b) => strcmp($a['nomor_dokumen'], $b['nomor_dokumen']));
                        $docTypeGroups[$dt] = $docs;
                    }
                    $grouped[$cName][$aName][$tName] = $docTypeGroups;
                }
            }
        }

        // Available companies & aplikasis for filters according to access rights
        $isSuperAdmin = $contextService->isSuperAdmin();
        if ($isSuperAdmin) {
            $availableCompanies = Company::select('id', 'name')->orderBy('name')->get();
            $availableAplikasis = Aplikasi::select('id', 'name', 'company_id')->orderBy('name')->get();
        } else {
            $userAuths = $contextService->getAvailableContexts();
            $availableCompanies = $userAuths->pluck('company')
                ->filter()
                ->unique('id')
                ->values()
                ->map(fn($c) => ['id' => $c->id, 'name' => $c->name]);

            $availableAplikasis = $userAuths->pluck('aplikasi')
                ->filter()
                ->unique('id')
                ->values()
                ->map(fn($a) => ['id' => $a->id, 'name' => $a->name, 'company_id' => $a->company_id]);
        }

        // Available statuses based on report type
        if ($reportType === 'unapproved') {
            $availableStatuses = [
                ['value' => 'all', 'label' => 'Semua Status'],
                ['value' => 'belum_approved', 'label' => 'Belum Approved'],
                ['value' => 'waiting_approval', 'label' => 'Waiting Approval'],
                ['value' => 'revision', 'label' => 'Revision'],
                ['value' => 'others', 'label' => 'Others'],
            ];
            $pageTitle = 'Unapprove Dokumen';
            $pageSubtitle = 'Laporan dokumen yang belum disetujui.';
            $viewComponent = 'report/unapproved';
        } elseif ($reportType === 'rejected') {
            $availableStatuses = [];
            $pageTitle = 'Rejected Document';
            $pageSubtitle = 'Laporan dokumen yang ditolak.';
            $viewComponent = 'report/rejected';
        } else {
            $availableStatuses = [
                ['value' => 'all', 'label' => 'Semua Status'],
                ['value' => 'approved', 'label' => 'Approved'],
                ['value' => 'belum_approved', 'label' => 'Belum Approved'],
                ['value' => 'rejected', 'label' => 'Rejected'],
                ['value' => 'revision', 'label' => 'Revision'],
                ['value' => 'draft', 'label' => 'Draft'],
            ];
            $pageTitle = 'Report Dokumen';
            $pageSubtitle = 'Laporan dokumen berdasarkan company, aplikasi, dan transaksi.';
            $viewComponent = 'report/index';
        }

        return Inertia::render($viewComponent, [
            'groupedData' => $grouped,
            'reportType' => $reportType,
            'pageTitle' => $pageTitle,
            'pageSubtitle' => $pageSubtitle,
            'filters' => [
                'status' => $request->input('status', 'all'),
                'company_id' => $request->input('company_id', 'all'),
                'aplikasi_id' => $request->input('aplikasi_id', 'all'),
                'start_date' => $request->input('start_date', ''),
                'end_date' => $request->input('end_date', ''),
            ],
            'availableCompanies' => $availableCompanies,
            'availableAplikasis' => $availableAplikasis,
            'availableStatuses' => $availableStatuses,
        ]);
    }

    /**
     * Export report data to Excel (.xlsx).
     */
    public function exportExcel(ContextService $contextService, Request $request)
    {
        $reportType = $request->input('report_type', 'general');
        $query = $this->buildAuthorizedQuery($contextService, $request, $reportType);
        $dokumen = $query->get();

        $statusFilter = strtolower($request->input('status', 'all'));

        $headers = [
            'Company',
            'Aplikasi',
            'Transaksi',
            'No Dokumen',
            'Judul Dokumen',
            'Pengaju',
            'Nominal',
            'Status',
            'Status Detail',
            'Tgl Pengajuan',
        ];

        $rows = [];
        $rawRows = [];
        foreach ($dokumen as $doc) {
            $companyName = $doc->company ? $doc->company->name : 'Unknown Company';
            $aplikasiName = $doc->aplikasi ? $doc->aplikasi->name : 'Unknown Aplikasi';
            $nomorDokumen = $doc->nomor_dokumen ?? '';
            $docTypePrefix = strtoupper(substr($nomorDokumen, 0, 2));
            $docType = in_array($docTypePrefix, ['PO', 'PR']) ? $docTypePrefix : 'Lainnya';
            $transaksiName = ($doc->transaksi && $doc->transaksi->name && $doc->transaksi->name !== 'Unknown Transaksi')
                ? $doc->transaksi->name
                : ($docType !== 'Lainnya' ? $docType : '-');
            $statusCategory = $this->resolveStatusCategory($doc);

            if ($statusFilter !== 'all') {
                if ($reportType === 'unapproved') {
                    if ($statusFilter === 'waiting_approval') {
                        $isWaiting = str_starts_with($doc->status_current ?? '', 'waiting_approval') ||
                            $doc->approvals->contains('approval_status', 'pending');
                        if (!$isWaiting) continue;
                    } elseif ($statusFilter === 'revision') {
                        if ($statusCategory !== 'Revision') continue;
                    } elseif ($statusFilter === 'belum_approved') {
                        if ($statusCategory !== 'Belum Approved') continue;
                    } elseif ($statusFilter === 'others') {
                        if (in_array($statusCategory, ['Revision', 'Belum Approved'])) continue;
                    }
                } elseif ($reportType === 'general') {
                    $normalizedCategory = strtolower(str_replace(' ', '_', $statusCategory));
                    $normalizedFilter = ($statusFilter === 'needs_revision') ? 'revision' : $statusFilter;
                    if ($normalizedCategory !== $normalizedFilter) {
                        continue;
                    }
                }
            }

            $rawRows[] = [
                'company' => $companyName,
                'aplikasi' => $aplikasiName,
                'transaksi' => $transaksiName,
                'doc_type' => $docType,
                'nomor_dokumen' => $doc->nomor_dokumen,
                'judul_dokumen' => $doc->judul_dokumen,
                'user' => $doc->user ? $doc->user->name : 'Unknown',
                'nominal' => $doc->nominal ? (float)$doc->nominal : 0,
                'status' => $statusCategory,
                'status_detail' => $doc->status_current ?? $doc->status,
                'tgl_pengajuan' => $doc->tgl_pengajuan ? $doc->tgl_pengajuan->format('Y-m-d') : '-',
            ];
        }

        // Sort rows: company, aplikasi, doc_type (PO first, PR second, others last), nomor_dokumen
        $docTypeOrder = ['PO' => 0, 'PR' => 1, 'Lainnya' => 99];
        usort($rawRows, function ($a, $b) use ($docTypeOrder) {
            $compCmp = strcmp($a['company'], $b['company']);
            if ($compCmp !== 0) return $compCmp;

            $appCmp = strcmp($a['aplikasi'], $b['aplikasi']);
            if ($appCmp !== 0) return $appCmp;

            $orderA = $docTypeOrder[$a['doc_type']] ?? 99;
            $orderB = $docTypeOrder[$b['doc_type']] ?? 99;
            if ($orderA !== $orderB) {
                return $orderA - $orderB;
            }

            return strcmp($a['nomor_dokumen'] ?? '', $b['nomor_dokumen'] ?? '');
        });

        foreach ($rawRows as $r) {
            $rows[] = [
                $r['company'],
                $r['aplikasi'],
                $r['transaksi'],
                $r['nomor_dokumen'],
                $r['judul_dokumen'],
                $r['user'],
                $r['nominal'],
                $r['status'],
                $r['status_detail'],
                $r['tgl_pengajuan'],
            ];
        }

        $sheetTitle = match ($reportType) {
            'unapproved' => 'Unapprove Dokumen',
            'rejected' => 'Rejected Document',
            default => 'Report Dokumen',
        };

        $xlsxData = SimpleXlsxExporter::create($sheetTitle, $headers, $rows);
        $filePrefix = match ($reportType) {
            'unapproved' => 'unapprove_dokumen_',
            'rejected' => 'rejected_document_',
            default => 'report_dokumen_',
        };
        $filename = $filePrefix . date('Ymd_His') . '.xlsx';

        return response($xlsxData, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Export report data to PDF (.pdf).
     */
    public function exportPdf(ContextService $contextService, Request $request)
    {
        $reportType = $request->input('report_type', 'general');
        $query = $this->buildAuthorizedQuery($contextService, $request, $reportType);
        $dokumen = $query->get();

        $statusFilter = strtolower($request->input('status', 'all'));

        $items = [];
        foreach ($dokumen as $doc) {
            $companyName = $doc->company ? $doc->company->name : 'Unknown Company';
            $aplikasiName = $doc->aplikasi ? $doc->aplikasi->name : 'Unknown Aplikasi';
            $nomorDokumen = $doc->nomor_dokumen ?? '';
            $docTypePrefix = strtoupper(substr($nomorDokumen, 0, 2));
            $docType = in_array($docTypePrefix, ['PO', 'PR']) ? $docTypePrefix : 'Lainnya';
            $transaksiName = ($doc->transaksi && $doc->transaksi->name && $doc->transaksi->name !== 'Unknown Transaksi')
                ? $doc->transaksi->name
                : ($docType !== 'Lainnya' ? $docType : '-');
            $statusCategory = $this->resolveStatusCategory($doc);

            if ($statusFilter !== 'all') {
                if ($reportType === 'unapproved') {
                    if ($statusFilter === 'waiting_approval') {
                        $isWaiting = str_starts_with($doc->status_current ?? '', 'waiting_approval') ||
                            $doc->approvals->contains('approval_status', 'pending');
                        if (!$isWaiting) continue;
                    } elseif ($statusFilter === 'revision') {
                        if ($statusCategory !== 'Revision') continue;
                    } elseif ($statusFilter === 'belum_approved') {
                        if ($statusCategory !== 'Belum Approved') continue;
                    } elseif ($statusFilter === 'others') {
                        if (in_array($statusCategory, ['Revision', 'Belum Approved'])) continue;
                    }
                } elseif ($reportType === 'general') {
                    $normalizedCategory = strtolower(str_replace(' ', '_', $statusCategory));
                    $normalizedFilter = ($statusFilter === 'needs_revision') ? 'revision' : $statusFilter;
                    if ($normalizedCategory !== $normalizedFilter) {
                        continue;
                    }
                }
            }

            $items[] = [
                'company' => $companyName,
                'aplikasi' => $aplikasiName,
                'transaksi' => $transaksiName,
                'doc_type' => $docType,
                'nomor_dokumen' => $doc->nomor_dokumen,
                'judul_dokumen' => $doc->judul_dokumen,
                'user' => $doc->user ? $doc->user->name : 'Unknown',
                'nominal' => $doc->nominal ? (float)$doc->nominal : 0,
                'status' => $statusCategory,
                'status_detail' => $doc->status_current ?? $doc->status,
                'tgl_pengajuan' => $doc->tgl_pengajuan ? $doc->tgl_pengajuan->format('Y-m-d') : '-',
            ];
        }

        // Sort items: company, aplikasi, doc_type (PO first, PR second, others last), nomor_dokumen
        $docTypeOrder = ['PO' => 0, 'PR' => 1, 'Lainnya' => 99];
        usort($items, function ($a, $b) use ($docTypeOrder) {
            $compCmp = strcmp($a['company'], $b['company']);
            if ($compCmp !== 0) return $compCmp;

            $appCmp = strcmp($a['aplikasi'], $b['aplikasi']);
            if ($appCmp !== 0) return $appCmp;

            $orderA = $docTypeOrder[$a['doc_type']] ?? 99;
            $orderB = $docTypeOrder[$b['doc_type']] ?? 99;
            if ($orderA !== $orderB) {
                return $orderA - $orderB;
            }

            return strcmp($a['nomor_dokumen'] ?? '', $b['nomor_dokumen'] ?? '');
        });

        // Determine filter labels for header box
        $companyLabel = 'Semua Company';
        if ($request->filled('company_id') && $request->company_id !== 'all') {
            $c = Company::find($request->company_id);
            if ($c) $companyLabel = $c->name;
        }

        $aplikasiLabel = 'Semua Aplikasi';
        if ($request->filled('aplikasi_id') && $request->aplikasi_id !== 'all') {
            $a = Aplikasi::find($request->aplikasi_id);
            if ($a) $aplikasiLabel = $a->name;
        }

        $statusLabel = 'Semua Status';
        if ($reportType === 'rejected') {
            $statusLabel = 'Rejected';
        } elseif ($request->filled('status') && $request->status !== 'all') {
            $statusMap = [
                'approved' => 'Approved',
                'belum_approved' => 'Belum Approved',
                'waiting_approval' => 'Waiting Approval',
                'rejected' => 'Rejected',
                'revision' => 'Revision',
                'draft' => 'Draft',
                'others' => 'Others',
            ];
            $statusLabel = $statusMap[$statusFilter] ?? ucfirst($statusFilter);
        }

        // Periode label
        $periodeLabel = 'Semua Periode';
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        if ($startDate && $endDate) {
            $periodeLabel = date('d/m/Y', strtotime($startDate)) . ' s/d ' . date('d/m/Y', strtotime($endDate));
        } elseif ($startDate) {
            $periodeLabel = 'Mulai ' . date('d/m/Y', strtotime($startDate));
        } elseif ($endDate) {
            $periodeLabel = 'Sampai ' . date('d/m/Y', strtotime($endDate));
        }

        $reportTitle = match ($reportType) {
            'unapproved' => 'LAPORAN UNAPPROVE DOKUMEN',
            'rejected' => 'LAPORAN REJECTED DOCUMENT',
            default => 'REPORT DOKUMEN',
        };

        // Detect mobile device (via parameter or User-Agent header)
        $isMobileParam = $request->input('is_mobile');
        $userAgent = strtolower($request->header('User-Agent', ''));
        $isMobile = ($isMobileParam === '1' || $isMobileParam === 'true') ||
            (bool)preg_match('/(android|iphone|ipad|ipod|mobile|phone|blackberry|opera mini|iemobile)/i', $userAgent);

        $pdf = new ReportPdfService();
        $pdf->setIsMobile($isMobile);
        $pdf->setFilterInfo($companyLabel, $aplikasiLabel, $statusLabel, $reportTitle, $periodeLabel);
        $pdf->renderContent($items);

        $filePrefix = match ($reportType) {
            'unapproved' => 'unapprove_dokumen_',
            'rejected' => 'rejected_document_',
            default => 'report_dokumen_',
        };
        $filename = $filePrefix . date('Ymd_His') . '.pdf';
        $pdfContent = $pdf->Output('S');

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Build base query with security, date range, and authorization checks
     */
    private function buildAuthorizedQuery(ContextService $contextService, Request $request, string $reportType = 'general')
    {
        $isSuperAdmin = $contextService->isSuperAdmin();
        $context = $contextService->getContext();
        $currentCompanyId = $context ? $context->company_id : null;
        $currentAplikasiId = $context ? $context->aplikasi_id : null;

        $query = Dokumen::with(['company', 'aplikasi', 'transaksi', 'user', 'approvals']);

        // 1. Role-based security & Context filter
        if (!$isSuperAdmin) {
            if ($currentCompanyId) {
                $query->where('company_id', $currentCompanyId);
            }
            if (!$contextService->isAdmin() && $currentAplikasiId) {
                $query->where('aplikasi_id', $currentAplikasiId);
            }
        }

        // 2. Company filter
        if ($request->filled('company_id') && $request->company_id !== 'all') {
            $compFilterId = (int)$request->company_id;
            if ($isSuperAdmin || $contextService->hasAccessToCompany($compFilterId)) {
                $query->where('company_id', $compFilterId);
            }
        }

        // 3. Aplikasi filter
        if ($request->filled('aplikasi_id') && $request->aplikasi_id !== 'all') {
            $appFilterId = (int)$request->aplikasi_id;
            if ($isSuperAdmin || $contextService->hasAccessToAplikasi($appFilterId)) {
                $query->where('aplikasi_id', $appFilterId);
            }
        }

        // 4. Date range filter (based on tgl_pengajuan)
        if ($request->filled('start_date')) {
            $query->whereDate('tgl_pengajuan', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('tgl_pengajuan', '<=', $request->end_date);
        }

        // 5. Filter by Report Type
        if ($reportType === 'unapproved') {
            // Must NOT be fully approved and NOT rejected
            $query->whereNotIn('status', ['approved', 'rejected'])
                ->whereDoesntHave('approvals', function ($a) {
                    $a->where('approval_status', 'rejected');
                });

            // Sub-status filter within unapproved
            if ($request->filled('status') && $request->status !== 'all') {
                $st = strtolower($request->status);
                if ($st === 'belum_approved') {
                    $query->whereIn('status', ['submitted', 'under_review', 'pending']);
                } elseif ($st === 'waiting_approval') {
                    $query->where(function ($q) {
                        $q->where('status_current', 'like', 'waiting_approval%')
                            ->orWhereHas('approvals', fn($a) => $a->where('approval_status', 'pending'));
                    });
                } elseif ($st === 'revision') {
                    $query->where(function ($q) {
                        $q->where('status', 'needs_revision')
                            ->orWhereHas('approvals', fn($a) => $a->where('approval_status', 'revision_requested'));
                    });
                } elseif ($st === 'others') {
                    $query->whereNotIn('status', ['submitted', 'under_review', 'needs_revision']);
                }
            }
        } elseif ($reportType === 'rejected') {
            // Must be rejected
            $query->where(function ($q) {
                $q->where('status', 'rejected')
                    ->orWhereHas('approvals', function ($a) {
                        $a->where('approval_status', 'rejected');
                    });
            });
        } elseif ($reportType === 'general') {
            // General report status filter
            if ($request->filled('status') && $request->status !== 'all') {
                $status = strtolower($request->status);
                switch ($status) {
                    case 'approved':
                        $query->where(function ($q) {
                            $q->where('status', 'approved')
                                ->orWhere(function ($sub) {
                                    $sub->whereHas('approvals', fn($a) => $a->where('approval_status', 'approved'))
                                        ->whereDoesntHave('approvals', fn($a) => $a->whereIn('approval_status', ['pending', 'waiting', 'rejected', 'revision_requested']));
                                });
                        });
                        break;

                    case 'rejected':
                        $query->where(function ($q) {
                            $q->where('status', 'rejected')
                                ->orWhereHas('approvals', fn($a) => $a->where('approval_status', 'rejected'));
                        });
                        break;

                    case 'revision':
                    case 'needs_revision':
                        $query->where(function ($q) {
                            $q->where('status', 'needs_revision')
                                ->orWhereHas('approvals', fn($a) => $a->where('approval_status', 'revision_requested'));
                        });
                        break;

                    case 'draft':
                        $query->where('status', 'draft');
                        break;

                    case 'belum_approved':
                    case 'belum approved':
                        $query->where(function ($q) {
                            $q->whereIn('status', ['submitted', 'under_review', 'pending'])
                                ->orWhere(function ($sub) {
                                    $sub->whereNotIn('status', ['approved', 'rejected', 'needs_revision', 'draft'])
                                        ->whereDoesntHave('approvals', fn($a) => $a->where('approval_status', 'rejected'));
                                });
                        });
                        break;
                }
            }
        }

        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Determine actual document approval status category
     */
    private function resolveStatusCategory(Dokumen $doc): string
    {
        if ($doc->status === 'draft') {
            return 'Draft';
        }
        if ($doc->status === 'rejected' || $doc->isRejected()) {
            return 'Rejected';
        }
        if ($doc->status === 'needs_revision' || $doc->needsRevision()) {
            return 'Revision';
        }
        if ($doc->status === 'approved' || $doc->isFullyApproved()) {
            return 'Approved';
        }
        return 'Belum Approved';
    }
}
