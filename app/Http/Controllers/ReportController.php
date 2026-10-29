<?php

namespace App\Http\Controllers;

use App\Models\Aplikasi;
use App\Models\Company;
use App\Models\Dokumen;
use App\Services\ContextService;
use App\Services\ReportPdfService;
use App\Services\SimpleXlsxExporter;
use Illuminate\Http\Request;
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

        // Group data by Company -> Aplikasi -> Transaksi -> DocType
        $grouped = $this->buildGroupedReportData($dokumen, $reportType, $request);

        if ($reportType === 'unapproved') {
            $pageTitle = 'Unapprove Dokumen';
            $pageSubtitle = 'Laporan dokumen yang belum disetujui.';
            $viewComponent = 'report/unapproved';
        } elseif ($reportType === 'rejected') {
            $pageTitle = 'Rejected Document';
            $pageSubtitle = 'Laporan dokumen yang ditolak.';
            $viewComponent = 'report/rejected';
        } else {
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
                'start_date' => $request->input('start_date', ''),
                'end_date' => $request->input('end_date', ''),
            ],
        ]);
    }

    /**
     * Export report data to CSV (.csv) grouped by Company -> Aplikasi -> Transaksi.
     */
    public function exportCsv(ContextService $contextService, Request $request)
    {
        $reportType = $request->input('report_type', 'general');
        $query = $this->buildAuthorizedQuery($contextService, $request, $reportType);
        $dokumen = $query->get();

        $grouped = $this->buildGroupedReportData($dokumen, $reportType, $request);

        $reportTitle = match ($reportType) {
            'unapproved' => 'LAPORAN UNAPPROVE DOKUMEN',
            'rejected' => 'LAPORAN REJECTED DOCUMENT',
            default => 'REPORT DOKUMEN',
        };

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $periodeLabel = 'Semua Periode';
        if ($startDate && $endDate) {
            $periodeLabel = date('d/m/Y', strtotime($startDate)) . ' s/d ' . date('d/m/Y', strtotime($endDate));
        } elseif ($startDate) {
            $periodeLabel = 'Mulai ' . date('d/m/Y', strtotime($startDate));
        } elseif ($endDate) {
            $periodeLabel = 'Sampai ' . date('d/m/Y', strtotime($endDate));
        }

        $lines = [];
        // UTF-8 BOM so spreadsheet viewers render characters correctly
        $lines[] = "\xEF\xBB\xBF" . $reportTitle;
        $lines[] = "Periode: " . $periodeLabel;
        $lines[] = "Tgl Cetak: " . date('d/m/Y H:i');
        $lines[] = "";

        foreach ($grouped as $company => $aplikasiGroup) {
            $companyTotal = 0;
            foreach ($aplikasiGroup as $transGroup) {
                foreach ($transGroup as $docTypeGroup) {
                    foreach ($docTypeGroup as $docs) {
                        $companyTotal += count($docs);
                    }
                }
            }

            $lines[] = '"Company: ' . str_replace('"', '""', $company) . ' (' . $companyTotal . ' dokumen)"';

            foreach ($aplikasiGroup as $aplikasi => $transaksiGroup) {
                $lines[] = '"  Aplikasi: ' . str_replace('"', '""', $aplikasi) . '"';

                foreach ($transaksiGroup as $transaksi => $docTypeGroup) {
                    foreach ($docTypeGroup as $docType => $docs) {
                        $lines[] = '"    Transaksi: ' . str_replace('"', '""', $transaksi) . ' [' . $docType . '] (' . count($docs) . ' dokumen)"';
                        $lines[] = '"No","No Dokumen","Judul Dokumen","Pengaju","Nominal","Status","Status Detail","Tgl Pengajuan"';

                        $no = 1;
                        foreach ($docs as $doc) {
                            $escTitle = str_replace('"', '""', $doc['judul_dokumen'] ?? '-');
                            $escUser = str_replace('"', '""', $doc['user'] ?? '-');
                            $escStatus = str_replace('"', '""', $doc['status'] ?? '-');
                            $escDetail = str_replace('"', '""', $doc['status_detail'] ?? '-');
                            $nom = isset($doc['nominal']) ? (float)$doc['nominal'] : 0;

                            $lines[] = sprintf(
                                '%d,"%s","%s","%s",%.2f,"%s","%s","%s"',
                                $no,
                                str_replace('"', '""', $doc['nomor_dokumen'] ?? '-'),
                                $escTitle,
                                $escUser,
                                $nom,
                                $escStatus,
                                $escDetail,
                                $doc['tgl_pengajuan'] ?? '-'
                            );
                            $no++;
                        }
                        $lines[] = "";
                    }
                }
            }
            $lines[] = "";
        }

        $csvContent = implode("\r\n", $lines);
        $filePrefix = match ($reportType) {
            'unapproved' => 'unapprove_dokumen_',
            'rejected' => 'rejected_document_',
            default => 'report_dokumen_',
        };
        $filename = $filePrefix . date('Ymd_His') . '.csv';

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Export report data to Excel (.xlsx) grouped by Company -> Aplikasi -> Transaksi.
     */
    public function exportExcel(ContextService $contextService, Request $request)
    {
        $reportType = $request->input('report_type', 'general');
        $query = $this->buildAuthorizedQuery($contextService, $request, $reportType);
        $dokumen = $query->get();

        $grouped = $this->buildGroupedReportData($dokumen, $reportType, $request);

        $sheetTitle = match ($reportType) {
            'unapproved' => 'Unapprove Dokumen',
            'rejected' => 'Rejected Document',
            default => 'Report Dokumen',
        };

        $reportTitle = match ($reportType) {
            'unapproved' => 'LAPORAN UNAPPROVE DOKUMEN',
            'rejected' => 'LAPORAN REJECTED DOCUMENT',
            default => 'REPORT DOKUMEN',
        };

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $periodeLabel = 'Periode: Semua Periode';
        if ($startDate && $endDate) {
            $periodeLabel = 'Periode: ' . date('d/m/Y', strtotime($startDate)) . ' s/d ' . date('d/m/Y', strtotime($endDate));
        } elseif ($startDate) {
            $periodeLabel = 'Periode: Mulai ' . date('d/m/Y', strtotime($startDate));
        } elseif ($endDate) {
            $periodeLabel = 'Periode: Sampai ' . date('d/m/Y', strtotime($endDate));
        }
        $metaInfo = $periodeLabel . ' | Tgl Cetak: ' . date('d/m/Y H:i');

        $xlsxData = SimpleXlsxExporter::createGroupedReport($sheetTitle, $reportTitle, $metaInfo, $grouped);

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
     * Export report data to PDF (.pdf) grouped by Company -> Aplikasi -> Transaksi.
     */
    public function exportPdf(ContextService $contextService, Request $request)
    {
        $reportType = $request->input('report_type', 'general');
        $query = $this->buildAuthorizedQuery($contextService, $request, $reportType);
        $dokumen = $query->get();

        $grouped = $this->buildGroupedReportData($dokumen, $reportType, $request);

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $periodeLabel = 'Semua Periode';
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

        // Detect mobile device
        $isMobileParam = $request->input('is_mobile');
        $userAgent = strtolower($request->header('User-Agent', ''));
        $isMobile = ($isMobileParam === '1' || $isMobileParam === 'true') ||
            (bool)preg_match('/(android|iphone|ipad|ipod|mobile|phone|blackberry|opera mini|iemobile)/i', $userAgent);

        $totalDocs = $dokumen->count();

        $pdf = new ReportPdfService();
        $pdf->setIsMobile($isMobile);
        $pdf->setTotalDocs($totalDocs);
        $pdf->setFilterInfo($reportTitle, $periodeLabel);
        $pdf->renderGroupedContent($grouped);

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
     * Group documents by Company -> Aplikasi -> Transaksi -> DocType.
     */
    private function buildGroupedReportData($dokumen, string $reportType, Request $request): array
    {
        $statusFilter = strtolower($request->input('status', 'all'));
        $grouped = [];

        foreach ($dokumen as $doc) {
            $companyName = $doc->company ? $doc->company->name : 'Unknown Company';
            $aplikasiName = $doc->aplikasi ? $doc->aplikasi->name : 'Unknown Aplikasi';
            $nomorDokumen = $doc->nomor_dokumen ?? '';
            $docTypePrefix = strtoupper(substr($nomorDokumen, 0, 2));
            $docType = in_array($docTypePrefix, ['PO', 'PR']) ? $docTypePrefix : 'Lainnya';
            $transaksiName = ($doc->transaksi && $doc->transaksi->name && $doc->transaksi->name !== 'Unknown Transaksi')
                ? $doc->transaksi->name
                : ($docType !== 'Lainnya' ? $docType : 'General');

            $statusCategory = $this->resolveStatusCategory($doc);

            // Optional in-memory filter if status was specified
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
                    } elseif ($statusFilter === 'approved' || $statusFilter === 'approve') {
                        if ($statusCategory !== 'Approved') continue;
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
                    uksort($docTypeGroups, fn($a, $b) =>
                        ($docTypeOrder[$a] ?? 99) - ($docTypeOrder[$b] ?? 99)
                    );
                    foreach ($docTypeGroups as $dt => $docs) {
                        usort($docs, fn($a, $b) => strcmp($a['nomor_dokumen'] ?? '', $b['nomor_dokumen'] ?? ''));
                        $docTypeGroups[$dt] = $docs;
                    }
                    $grouped[$cName][$aName][$tName] = $docTypeGroups;
                }
            }
        }

        return $grouped;
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

        // 2. Company filter (if passed)
        if ($request->filled('company_id') && $request->company_id !== 'all') {
            $compFilterId = (int)$request->company_id;
            if ($isSuperAdmin || $contextService->hasAccessToCompany($compFilterId)) {
                $query->where('company_id', $compFilterId);
            }
        }

        // 3. Aplikasi filter (if passed)
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
            $st = strtolower($request->input('status', 'all'));
            if ($st === 'approved' || $st === 'approve') {
                $query->where(function ($q) {
                    $q->where('status', 'approved')
                        ->orWhere(function ($sub) {
                            $sub->whereHas('approvals', fn($a) => $a->where('approval_status', 'approved'))
                                ->whereDoesntHave('approvals', fn($a) => $a->whereIn('approval_status', ['pending', 'waiting', 'rejected', 'revision_requested']));
                        });
                });
            } else {
                // Must NOT be fully approved and NOT rejected
                $query->whereNotIn('status', ['approved', 'rejected'])
                    ->whereDoesntHave('approvals', function ($a) {
                        $a->where('approval_status', 'rejected');
                    });

                // Sub-status filter within unapproved
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
            // General report status filter (if passed)
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
                                ->orWhereHas('approvals', function ($a) {
                                    $a->where('approval_status', 'rejected');
                                });
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
