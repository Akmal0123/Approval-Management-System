import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    DownloadIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    SearchIcon,
    RotateCcwIcon,
    UserIcon,
    CalendarIcon,
    AlertCircleIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const PAGE_SIZE = 5;

export interface ReportDoc {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    nominal?: number;
    status: string;
    status_detail: string;
    tgl_pengajuan: string | null;
    user: string;
}

export interface GroupedData {
    [company: string]: {
        [aplikasi: string]: {
            [transaksi: string]: {
                [docType: string]: ReportDoc[];
            };
        };
    };
}

export interface ReportPageProps {
    groupedData: GroupedData;
    reportType: 'general' | 'unapproved' | 'rejected';
    pageTitle: string;
    pageSubtitle: string;
    filters?: {
        start_date?: string;
        end_date?: string;
    };
    breadcrumbs?: Array<{ title: string; href: string }>;
}

// ─── Status Badge helper ───────────────────────────────────────────────────────
function StatusBadge({
    status,
    detail,
    isMobile = false,
}: {
    status: string;
    detail: string;
    isMobile?: boolean;
}) {
    let badgeClass = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
    let variant: 'default' | 'secondary' | 'outline' = 'outline';

    switch (status) {
        case 'Approved':
            badgeClass = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800/60';
            break;
        case 'Rejected':
            badgeClass = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60';
            break;
        case 'Revision':
            badgeClass = 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60';
            break;
        case 'Draft':
            badgeClass = 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700';
            break;
        case 'Belum Approved':
        case 'Waiting Approval':
        default:
            badgeClass = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
            break;
    }

    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${isMobile ? 'justify-end' : ''}`}>
            <Badge variant={variant} className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${badgeClass}`}>
                {status}
            </Badge>
            {detail && (
                <span
                    className={`text-[11px] text-muted-foreground truncate ${
                        isMobile ? 'max-w-[110px] text-right' : 'max-w-[170px]'
                    }`}
                    title={detail}
                >
                    {detail}
                </span>
            )}
        </div>
    );
}

// ─── Pagination helper ────────────────────────────────────────────────────────
function PaginatedTable({ docs }: { docs: ReportDoc[]; groupKey: string }) {
    const [page, setPage] = useState(1);

    // Reset to page 1 whenever documents change
    useEffect(() => {
        setPage(1);
    }, [docs]);

    const totalPages = Math.ceil(docs.length / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const visibleDocs = docs.slice(start, start + PAGE_SIZE);

    return (
        <div>
            {/* Desktop & Tablet View (md and up) */}
            <div className="hidden md:block rounded-md border w-full overflow-x-auto bg-card">
                <Table className="w-full table-fixed min-w-[620px]">
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[15%] text-xs font-semibold">No Dokumen</TableHead>
                            <TableHead className="w-[33%] text-xs font-semibold">Judul</TableHead>
                            <TableHead className="w-[13%] text-xs font-semibold">Pengaju</TableHead>
                            <TableHead className="w-[27%] text-xs font-semibold">Status</TableHead>
                            <TableHead className="w-[12%] text-xs font-semibold">Tgl Pengajuan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleDocs.map(doc => (
                            <TableRow key={doc.id} className="hover:bg-muted/40">
                                <TableCell className="font-medium text-xs truncate">{doc.nomor_dokumen}</TableCell>
                                <TableCell className="text-xs truncate" title={doc.judul_dokumen}>
                                    {doc.judul_dokumen}
                                </TableCell>
                                <TableCell className="text-xs truncate">{doc.user}</TableCell>
                                <TableCell>
                                    <StatusBadge status={doc.status} detail={doc.status_detail} />
                                </TableCell>
                                <TableCell className="text-xs">{doc.tgl_pengajuan || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View (< md) - Responsive Touch-Friendly Card List */}
            <div className="block md:hidden space-y-2.5">
                {visibleDocs.map(doc => (
                    <div
                        key={doc.id}
                        className="rounded-lg border bg-card p-3 shadow-2xs transition-colors space-y-2"
                    >
                        {/* Header: No Dokumen & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-xs text-foreground tracking-tight break-all font-mono">
                                {doc.nomor_dokumen}
                            </span>
                            <div className="shrink-0">
                                <StatusBadge status={doc.status} detail={doc.status_detail} isMobile />
                            </div>
                        </div>

                        {/* Judul Dokumen */}
                        <p className="text-xs text-foreground font-medium leading-relaxed">
                            {doc.judul_dokumen}
                        </p>

                        {/* Metadata Footer: Pengaju & Tanggal Pengajuan */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                                <UserIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{doc.user}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <CalendarIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span>{doc.tgl_pengajuan || '-'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination bar */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 mt-3 px-1">
                    <p className="text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
                        Menampilkan {start + 1}–{Math.min(start + PAGE_SIZE, docs.length)} dari {docs.length} dokumen
                    </p>
                    <div className="flex items-center gap-1 order-1 sm:order-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-md"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            aria-label="Previous Page"
                        >
                            <ChevronLeftIcon className="h-3.5 w-3.5" />
                        </Button>

                        {/* Di layar HP ringkas */}
                        <div className="flex sm:hidden items-center px-2 text-xs font-medium text-muted-foreground">
                            {page} / {totalPages}
                        </div>

                        {/* Di layar tablet/desktop */}
                        <div className="hidden sm:flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <Button
                                    key={p}
                                    variant={p === page ? 'default' : 'outline'}
                                    size="sm"
                                    className={`h-7 w-7 p-0 text-xs rounded-md ${
                                        p === page
                                            ? 'bg-[#16a34a] hover:bg-[#15803d] text-white font-medium'
                                            : ''
                                    }`}
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </Button>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-md"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            aria-label="Next Page"
                        >
                            <ChevronRightIcon className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportView({
    groupedData,
    reportType,
    pageTitle,
    pageSubtitle,
    filters = {},
    breadcrumbs = [{ title: 'Report', href: '/report' }],
}: ReportPageProps) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [dateError, setDateError] = useState('');

    // Sync state with props
    useEffect(() => {
        setStartDate(filters.start_date || '');
        setEndDate(filters.end_date || '');
    }, [filters.start_date, filters.end_date]);

    const currentPath =
        reportType === 'unapproved'
            ? '/report/unapproved'
            : reportType === 'rejected'
            ? '/report/rejected'
            : '/report';

    const handleSearch = () => {
        // Date range validation
        if (startDate && endDate && endDate < startDate) {
            setDateError('End Date tidak boleh lebih awal dari Start Date');
            return;
        }
        setDateError('');

        const queryParams: Record<string, string> = {};
        if (startDate) queryParams.start_date = startDate;
        if (endDate) queryParams.end_date = endDate;

        router.get(currentPath, queryParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleResetFilters = () => {
        setStartDate('');
        setEndDate('');
        setDateError('');

        router.get(currentPath, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const hasActiveFilters = Boolean(startDate) || Boolean(endDate);

    // ─── Export CSV ───────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        const params = new URLSearchParams();
        params.append('report_type', reportType);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        window.location.href = `/report/export/csv?${params.toString()}`;
    };

    // ─── Export Excel ─────────────────────────────────────────────────────────
    const handleExportExcel = () => {
        const params = new URLSearchParams();
        params.append('report_type', reportType);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        window.location.href = `/report/export/excel?${params.toString()}`;
    };

    // ─── Export PDF ───────────────────────────────────────────────────────────
    const handleExportPdf = () => {
        const params = new URLSearchParams();
        params.append('report_type', reportType);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        // Detect mobile screen
        const isMobileScreen = typeof window !== 'undefined' && (
            window.innerWidth < 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        );
        if (isMobileScreen) {
            params.append('is_mobile', '1');
        }

        window.open(`/report/export/pdf?${params.toString()}`, '_blank');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />
            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-5 p-3 sm:p-5 md:p-6 lg:p-8">
                {/* Header & Export Actions */}
                <div className="flex flex-col gap-3.5 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
                        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                            {pageSubtitle}
                        </p>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <Button
                            onClick={handleExportCSV}
                            className="bg-[#16a34a] hover:bg-[#15803d] text-white flex items-center justify-center gap-2 h-9 text-xs sm:text-sm font-medium shadow-xs flex-1 sm:flex-initial"
                        >
                            <DownloadIcon className="h-4 w-4" />
                            Export CSV
                        </Button>
                        <Button
                            onClick={handleExportExcel}
                            className="bg-[#065f46] hover:bg-[#047857] text-white flex items-center justify-center gap-2 h-9 text-xs sm:text-sm font-medium shadow-xs flex-1 sm:flex-initial"
                        >
                            <FileSpreadsheetIcon className="h-4 w-4" />
                            Export Excel
                        </Button>
                        <Button
                            onClick={handleExportPdf}
                            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center justify-center gap-2 h-9 text-xs sm:text-sm font-medium shadow-xs flex-1 sm:flex-initial"
                        >
                            <FileTextIcon className="h-4 w-4" />
                            Export PDF
                        </Button>
                    </div>
                </div>

                {/* Filter Section - Clean Start Date & End Date */}
                <Card className="shadow-xs border-border/80 bg-card">
                    <CardContent className="p-3.5 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                            {/* Filter Start Date */}
                            <div className="flex flex-col gap-1.5 w-full sm:w-56">
                                <label
                                    htmlFor="filter-start-date"
                                    className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5"
                                >
                                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    Start Date
                                </label>
                                <input
                                    id="filter-start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={e => {
                                        setStartDate(e.target.value);
                                        setDateError('');
                                    }}
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>

                            {/* Filter End Date */}
                            <div className="flex flex-col gap-1.5 w-full sm:w-56">
                                <label
                                    htmlFor="filter-end-date"
                                    className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5"
                                >
                                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    End Date
                                </label>
                                <input
                                    id="filter-end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={e => {
                                        setEndDate(e.target.value);
                                        setDateError('');
                                    }}
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>

                            {/* Action Buttons: Cari & Reset */}
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleSearch}
                                    className="bg-[#16a34a] hover:bg-[#15803d] text-white flex items-center justify-center gap-1.5 h-9 text-xs font-medium shadow-xs px-4"
                                >
                                    <SearchIcon className="h-3.5 w-3.5" />
                                    Cari
                                </Button>
                                {hasActiveFilters && (
                                    <Button
                                        variant="outline"
                                        onClick={handleResetFilters}
                                        className="h-9 text-xs flex items-center justify-center gap-1.5 px-3 text-muted-foreground hover:text-foreground"
                                    >
                                        <RotateCcwIcon className="h-3 w-3" />
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Date Validation Alert */}
                        {dateError && (
                            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                                <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                                <span>{dateError}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Content: Grouped by Company -> Aplikasi -> Transaksi */}
                <div className="flex flex-col gap-5">
                    {Object.keys(groupedData).length === 0 && (
                        <Card className="shadow-xs border-border/80">
                            <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                                <p className="text-muted-foreground font-medium text-sm sm:text-base">
                                    Tidak ada data dokumen untuk ditampilkan.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                    {hasActiveFilters
                                        ? 'Tidak ditemukan dokumen yang cocok dengan periode yang dipilih. Silakan ubah filter atau tekan reset.'
                                        : reportType === 'unapproved'
                                        ? 'Tidak ada dokumen yang belum disetujui saat ini.'
                                        : reportType === 'rejected'
                                        ? 'Tidak ada dokumen yang ditolak saat ini.'
                                        : 'Belum ada dokumen yang tersedia di sistem.'}
                                </p>
                                {hasActiveFilters && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="mt-4 flex items-center gap-1 text-xs"
                                    >
                                        <RotateCcwIcon className="h-3.5 w-3.5" />
                                        Reset Filter
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {Object.entries(groupedData).map(([company, aplikasiGroup]) => {
                        const companyDocsCount = Object.values(aplikasiGroup).reduce((appTotal, transGroup) => {
                            return appTotal + Object.values(transGroup).reduce((tTotal, docTypeGroup) => {
                                return tTotal + Object.values(docTypeGroup).reduce((dtTotal, docs) => dtTotal + docs.length, 0);
                            }, 0);
                        }, 0);

                        return (
                            <Card key={company} className="border-t-4 border-t-primary shadow-xs">
                                <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg sm:text-xl font-bold">Company: {company}</CardTitle>
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {companyDocsCount} dokumen
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3.5 sm:p-5 pt-0 sm:pt-0 flex flex-col gap-4 sm:gap-6">
                                    {Object.entries(aplikasiGroup).map(([aplikasi, transaksiGroup]) => (
                                        <div key={aplikasi} className="rounded-lg border p-3 sm:p-4 shadow-xs bg-card">
                                            <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-primary">
                                                Aplikasi: {aplikasi}
                                            </h3>

                                            <div className="flex flex-col gap-4 sm:gap-6">
                                                {Object.entries(transaksiGroup).map(([transaksi, docTypeGroup]) => {
                                                    const totalTranDocs = Object.values(docTypeGroup).reduce((s, d) => s + d.length, 0);
                                                    return (
                                                        <div
                                                            key={transaksi}
                                                            className="pl-2.5 sm:pl-4 border-l-2 border-primary/30"
                                                        >
                                                            <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                                <h4 className="font-medium text-xs sm:text-sm">
                                                                    Transaksi: {transaksi}
                                                                </h4>
                                                                <span className="text-[11px] sm:text-xs text-muted-foreground">
                                                                    {totalTranDocs} dokumen
                                                                </span>
                                                            </div>

                                                            {/* Doc type sub-groups: PO / PR / Lainnya */}
                                                            <div className="flex flex-col gap-4">
                                                                {Object.entries(docTypeGroup).map(([docType, docs]) => (
                                                                    <div key={docType}>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span
                                                                                className={`inline-flex items-center px-3 py-0.5 rounded text-[11px] font-bold tracking-wide border ${
                                                                                    docType === 'PO'
                                                                                        ? 'bg-[#16a34a] text-white border-[#15803d]'
                                                                                        : docType === 'PR'
                                                                                        ? 'bg-[#16a34a] text-white border-[#15803d]'
                                                                                        : 'bg-gray-500 text-white border-gray-600'
                                                                                }`}
                                                                            >
                                                                                {docType}
                                                                            </span>
                                                                            <span className="text-[11px] text-muted-foreground">{docs.length} dokumen</span>
                                                                        </div>
                                                                        <PaginatedTable
                                                                            docs={docs}
                                                                            groupKey={`${company}-${aplikasi}-${transaksi}-${docType}`}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
