import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import SignaturePad from '@/components/signature-pad';
import SignaturePlacementDialog, { SignaturePosition } from '@/components/signature-placement-dialog';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    IconAlertCircle,
    IconCheck,
    IconClock,
    IconEye,
    IconFileText,
    IconFilter,
    IconLayoutGrid,
    IconList,
    IconPencil,
    IconSearch,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface DokumenVersion {
    id: number;
    version: string;
    nama_file: string;
    tgl_upload: string;
    tipe_file: string;
    file_url: string;
    size_file: number;
}

interface Dokumen {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    status: string;
    tgl_pengajuan: string;
    tgl_deadline?: string;
    deskripsi?: string;
    nominal?: number;
    user?: User;
    aplikasi?: Aplikasi;
    transaksi?: Transaksi;
    latest_version?: DokumenVersion;
    approvals?: DokumenApproval[];
    versions?: DokumenVersion[];
}

interface MasterflowStep {
    id: number;
    step_order: number;
    step_name: string;
    jabatan?: {
        id: number;
        name: string;
    };
}

interface DokumenApproval {
    id: number;
    dokumen_id: number;
    user_id?: number;
    approval_order?: number;
    approval_status: string;
    tgl_deadline?: string;
    tgl_approve?: string;
    alasan_reject?: string;
    comment?: string;
    signature_path?: string;
    signature_url?: string;
    signature_method?: string;
    verification_token?: string | null;
    can_approve?: boolean;
    created_at: string;
    dokumen: Dokumen;
    masterflow_step?: MasterflowStep;
    dokumen_version?: DokumenVersion;
    user?: User;
}

interface PaginatedApprovals {
    data: DokumenApproval[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface Stats {
    pending: number;
    approved: number;
    rejected: number;
    overdue: number;
}

interface Aplikasi {
    id: number;
    name: string;
}

interface Transaksi {
    id: number;
    aplikasi_id: number;
    nama_transaksi: string;
    kode_transaksi?: string;
}

interface Props {
    approvals: PaginatedApprovals;
    stats: Stats;
    filters: {
        status?: string;
        overdue?: boolean;
        search?: string;
        aplikasi_id?: string;
        transaksi_id?: string;
    };
    aplikasis: Aplikasi[];
    transaksis: Transaksi[];
}

interface ApprovalCreatedEvent {
    approval?: DokumenApproval;
}

interface ApprovalCountUpdatedEvent {
    pending_count?: number;
}

export default function ApproverIndex({ approvals, stats, filters, aplikasis = [], transaksis = [] }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [selectedTab, setSelectedTab] = useState(filters.status || 'all');
    const [selectedAplikasiId, setSelectedAplikasiId] = useState<string>(filters.aplikasi_id || 'all');
    const [selectedTransaksiId, setSelectedTransaksiId] = useState<string>(filters.transaksi_id || 'all');
    const [approvalsData, setApprovalsData] = useState<DokumenApproval[]>(approvals.data);
    const [statsData, setStatsData] = useState<Stats>(stats);
    const [updatedApprovalIds, setUpdatedApprovalIds] = useState<Set<number>>(new Set());
    const [approvalsViewMode, setApprovalsViewMode] = useState<'card' | 'table'>('card');

    // Bulk approval states
    const [selectedApprovalIds, setSelectedApprovalIds] = useState<number[]>([]);
    const [selectedApprovalsMap, setSelectedApprovalsMap] = useState<Record<number, DokumenApproval>>({});
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkSignatureMethod, setBulkSignatureMethod] = useState<'original' | 'qr'>('original');
    const [bulkSignatureData, setBulkSignatureData] = useState<string | null>(null);
    const [showBulkSignaturePad, setShowBulkSignaturePad] = useState(false);
    const [bulkComment, setBulkComment] = useState('');
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const [bulkPreviewApprovalId, setBulkPreviewApprovalId] = useState<number | null>(null);

    // Preview Dialog states
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [previewApproval, setPreviewApproval] = useState<DokumenApproval | null>(null);
    const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
    const [previewFileName, setPreviewFileName] = useState<string>('');
    const [previewSignaturePositions, setPreviewSignaturePositions] = useState<SignaturePosition[]>([]);

    // Update local state when props change
    useEffect(() => {
        setApprovalsData(approvals.data);
        setStatsData(stats);
    }, [approvals.data, stats]);

    // Real-time updates - Listen to all dokumen channels that user is approving
    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo && auth.user?.id) {
            console.log('📡 Setting up real-time listeners for approvals');

            const userApprovalChannelName = `user.${auth.user.id}.approvals`;
            console.log('🔧 Subscribing to user approvals channel:', userApprovalChannelName);

            if (window.Echo.connector?.pusher) {
                const pusherChannel = window.Echo.connector.pusher.subscribe(userApprovalChannelName);

                pusherChannel.bind('approval.created', (event: ApprovalCreatedEvent) => {
                    const approval = event.approval;
                    if (approval) {
                        setApprovalsData((prevApprovals) => {
                            const exists = prevApprovals.some((a) => a.id === approval.id);
                            if (exists) return prevApprovals;
                            return [approval, ...prevApprovals];
                        });

                        setStatsData((prevStats) => ({
                            ...prevStats,
                            pending: prevStats.pending + 1,
                        }));

                        setUpdatedApprovalIds((prev) => new Set(prev).add(approval.id));
                        setTimeout(() => {
                            setUpdatedApprovalIds((prev) => {
                                const newSet = new Set(prev);
                                newSet.delete(approval.id);
                                return newSet;
                            });
                        }, 5000);
                    }
                });

                pusherChannel.bind('approval.updated', (event: ApprovalCreatedEvent) => {
                    const approval = event.approval;
                    if (approval) {
                        setApprovalsData((prevApprovals) => prevApprovals.map((a) => (a.id === approval.id ? approval : a)));

                        setUpdatedApprovalIds((prev) => new Set(prev).add(approval.id));
                        setTimeout(() => {
                            setUpdatedApprovalIds((prev) => {
                                const newSet = new Set(prev);
                                newSet.delete(approval.id);
                                return newSet;
                            });
                        }, 5000);
                    }
                });

                pusherChannel.bind('approval.count.updated', (event: ApprovalCountUpdatedEvent) => {
                    const pendingCount = event.pending_count;
                    if (pendingCount !== undefined) {
                        setStatsData((prev) => ({
                            ...prev,
                            pending: pendingCount,
                        }));
                    }
                });
            }
        }
    }, [approvalsData.length, auth.user?.id]);

    // Filter eligible approvals for approval
    const eligibleApprovals = approvalsData.filter(
        (a) => a.approval_status === 'pending' && a.can_approve !== false
    );
    const isAllSelected =
        eligibleApprovals.length > 0 &&
        eligibleApprovals.every((a) => selectedApprovalIds.includes(a.id));
    const isSomeSelected =
        eligibleApprovals.some((a) => selectedApprovalIds.includes(a.id)) && !isAllSelected;

    const selectedApprovalsOnCurrentPageCount = eligibleApprovals.filter((a) =>
        selectedApprovalIds.includes(a.id)
    ).length;

    // Handle single checkbox selection
    const toggleSelectApproval = (id: number, approvalObj?: DokumenApproval) => {
        const doc = approvalObj || approvalsData.find((a) => a.id === id);
        setSelectedApprovalIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
        setSelectedApprovalsMap((prev) => {
            const next = { ...prev };
            if (next[id]) {
                delete next[id];
            } else if (doc) {
                next[id] = doc;
            }
            return next;
        });
    };

    // Handle select all toggle for current page
    const handleSelectAll = (checked?: boolean | 'indeterminate') => {
        const eligibleIds = eligibleApprovals.map((a) => a.id);
        if (isAllSelected) {
            // Uncheck only eligible items on current page, keeping items selected from other pages
            setSelectedApprovalIds((prev) => prev.filter((id) => !eligibleIds.includes(id)));
            setSelectedApprovalsMap((prev) => {
                const next = { ...prev };
                eligibleIds.forEach((id) => {
                    delete next[id];
                });
                return next;
            });
        } else {
            // Select all eligible items on current page, union with existing
            setSelectedApprovalIds((prev) => Array.from(new Set([...prev, ...eligibleIds])));
            setSelectedApprovalsMap((prev) => {
                const next = { ...prev };
                eligibleApprovals.forEach((a) => {
                    next[a.id] = a;
                });
                return next;
            });
        }
    };

    // Clear all selections
    const handleClearSelection = () => {
        setSelectedApprovalIds([]);
        setSelectedApprovalsMap({});
        setBulkSignatureData(null);
        setShowBulkSignaturePad(false);
        setBulkComment('');
    };

    // Clear selection on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedApprovalIds.length > 0 && !isBulkModalOpen && !isPreviewDialogOpen) {
                handleClearSelection();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedApprovalIds.length, isBulkModalOpen, isPreviewDialogOpen]);

    // Handle bulk approve submission
    const handleBulkApproveSubmit = () => {
        if (selectedApprovalIds.length === 0) {
            showToast.error('❌ Pilih setidaknya satu dokumen untuk disetujui');
            return;
        }

        if (bulkSignatureMethod === 'original' && !bulkSignatureData) {
            showToast.error('❌ Silakan buat atau tambahkan tanda tangan terlebih dahulu');
            return;
        }

        setIsBulkSubmitting(true);
        router.post(
            route('approvals.bulk-approve'),
            {
                approval_ids: selectedApprovalIds,
                signature_method: bulkSignatureMethod,
                signature: bulkSignatureMethod === 'original' ? bulkSignatureData : undefined,
                comment: bulkComment.trim() || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showToast.success(`✅ Berhasil menyetujui ${selectedApprovalIds.length} dokumen!`);
                    handleClearSelection();
                    setIsBulkSubmitting(false);
                    setIsBulkModalOpen(false);
                    router.reload({ only: ['approvals', 'stats'] });
                },
                onError: (errors: Record<string, string | string[]>) => {
                    setIsBulkSubmitting(false);
                    const error = errors.error || errors.signature || Object.values(errors)[0];
                    const errMsg = Array.isArray(error) ? error[0] : error || 'Gagal memproses persetujuan massal';
                    showToast.error(`❌ ${errMsg}`);
                },
            },
        );
    };

    // Handle preview dialog open
    const handleOpenPreview = (approval: DokumenApproval) => {
        const targetVersion = approval.dokumen_version || approval.dokumen.latest_version;
        if (!targetVersion) {
            showToast.error('❌ File dokumen tidak ditemukan.');
            return;
        }

        const fileType = (targetVersion.tipe_file || '').toLowerCase();
        if (fileType !== 'pdf' && fileType !== 'application/pdf') {
            showToast.error('❌ Preview hanya tersedia untuk file PDF.');
            return;
        }

        setPreviewApproval(approval);
        setPreviewFileName(targetVersion.nama_file || approval.dokumen.judul_dokumen);
        setPreviewFileUrl(`/api/dokumen/${approval.dokumen.id}/signed-pdf/${targetVersion.id}`);
        setPreviewSignaturePositions([]);
        setIsPreviewDialogOpen(true);
    };

    // Mapped approvals for SignaturePlacementDialog
    const previewMappedApprovals = (previewApproval?.dokumen?.approvals || (previewApproval ? [previewApproval] : []))
        .filter((a) => a.approval_status !== 'skipped')
        .map((a) => ({
            id: a.id,
            step_name: a.masterflow_step?.step_name || 'Approval Step',
            jabatan_name: a.masterflow_step?.jabatan?.name || '',
            user: a.user ? { name: a.user.name } : undefined,
            approver_email: a.user?.email || '',
            approval_status: a.approval_status,
            signature_method: a.signature_method,
            signature_path: a.signature_path,
            verification_token: a.verification_token,
        }));

    // Keep bulkPreviewApprovalId in sync with selectedApprovalIds
    useEffect(() => {
        if (isBulkModalOpen && selectedApprovalIds.length > 0) {
            if (!bulkPreviewApprovalId || !selectedApprovalIds.includes(bulkPreviewApprovalId)) {
                setBulkPreviewApprovalId(selectedApprovalIds[0]);
            }
        }
    }, [isBulkModalOpen, selectedApprovalIds, bulkPreviewApprovalId]);

    const selectedApprovalsList = selectedApprovalIds
        .map((id) => selectedApprovalsMap[id] || approvalsData.find((a) => a.id === id))
        .filter((a): a is DokumenApproval => Boolean(a));
    const currentBulkPreviewApproval =
        selectedApprovalsList.find((a) => a.id === bulkPreviewApprovalId) || selectedApprovalsList[0] || null;
    const bulkPreviewVersion = currentBulkPreviewApproval?.dokumen_version || currentBulkPreviewApproval?.dokumen?.latest_version;
    const bulkPreviewFileUrl =
        currentBulkPreviewApproval && bulkPreviewVersion
            ? `/api/dokumen/${currentBulkPreviewApproval.dokumen.id}/signed-pdf/${bulkPreviewVersion.id}`
            : null;
    const bulkPreviewFileName =
        bulkPreviewVersion?.nama_file || currentBulkPreviewApproval?.dokumen?.judul_dokumen || '';
    const bulkPreviewMappedApprovals = (
        currentBulkPreviewApproval?.dokumen?.approvals || (currentBulkPreviewApproval ? [currentBulkPreviewApproval] : [])
    )
        .filter((a) => a.approval_status !== 'skipped')
        .map((a) => ({
            id: a.id,
            step_name: a.masterflow_step?.step_name || 'Approval Step',
            jabatan_name: a.masterflow_step?.jabatan?.name || '',
            user: a.user ? { name: a.user.name } : undefined,
            approver_email: a.user?.email || '',
            approval_status: a.approval_status,
            signature_method: a.signature_method,
            signature_path: a.signature_path,
            verification_token: a.verification_token,
        }));

    // Handle search
    const handleFilterChange = (aplikasiId: string, transaksiId: string, searchVal: string = search, tabVal: string = selectedTab) => {
        router.get(
            route('approvals.index'),
            {
                search: searchVal,
                status: tabVal !== 'all' ? tabVal : undefined,
                aplikasi_id: aplikasiId !== 'all' ? aplikasiId : undefined,
                transaksi_id: transaksiId !== 'all' ? transaksiId : undefined,
            },
            { preserveState: true },
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange(selectedAplikasiId, selectedTransaksiId, search, selectedTab);
    };

    const handleAplikasiChange = (value: string) => {
        setSelectedAplikasiId(value);
        setSelectedTransaksiId('all'); // Reset transaksi when aplikasi changes
        handleFilterChange(value, 'all', search, selectedTab);
    };

    const handleTransaksiChange = (value: string) => {
        setSelectedTransaksiId(value);
        handleFilterChange(selectedAplikasiId, value, search, selectedTab);
    };

    // Handle tab change
    const handleTabChange = (value: string) => {
        setSelectedTab(value);
        handleClearSelection(); // Reset selection on tab switch
        handleFilterChange(selectedAplikasiId, selectedTransaksiId, search, value);
    };

    // Filter available transactions based on selected aplikasi
    const availableTransaksis = selectedAplikasiId === 'all' ? transaksis : transaksis.filter((t) => t.aplikasi_id.toString() === selectedAplikasiId);

    // Handle view detail
    const handleViewDetail = (approvalId: number) => {
        router.visit(route('approvals.show', approvalId));
    };

    // Format date
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; className: string; icon: typeof IconClock }> = {
            pending: {
                label: 'Menunggu',
                className: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100',
                icon: IconClock,
            },
            approved: {
                label: 'Disetujui',
                className: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-100',
                icon: IconCheck,
            },
            rejected: {
                label: 'Ditolak',
                className: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-100',
                icon: IconX,
            },
        };

        const { label, className, icon: Icon } = config[status] || config.pending;

        return (
            <Badge variant="outline" className={`px-2.5 py-1 font-sans font-semibold ${className}`}>
                <Icon className="mr-1 h-3 w-3" />
                {label}
            </Badge>
        );
    };

    // Check if overdue
    const isOverdue = (deadline: string | undefined) => {
        if (!deadline) return false;
        return new Date(deadline) < new Date();
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null) return '-';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <>
            <Head title="Approval Dokumen" />
            <SidebarProvider>
                <NotificationListener />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />

                    {/* Bulk Selection Overlay Toolbar (Sticky at top of content, never covers sidebar, Chrome History style) */}
                    {selectedApprovalIds.length > 0 && (
                        <aside
                            aria-label="Toolbar persetujuan massal"
                            className="sticky top-0 z-30 w-full border-b border-primary/30 bg-background/95 backdrop-blur-md px-4 py-2.5 shadow-md transition-all duration-200 animate-in fade-in slide-in-from-top-2 lg:px-6"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                {/* Left side: Deselect button & selection counter */}
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleClearSelection}
                                        className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                        title="Batal pilihan (Esc)"
                                    >
                                        <IconX className="h-4 w-4" />
                                        <span className="sr-only">Batal pilihan</span>
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                        <span className="font-sans text-xs sm:text-sm font-semibold text-foreground">
                                            {selectedApprovalIds.length} dokumen terpilih
                                        </span>
                                        {selectedApprovalsOnCurrentPageCount > 0 && (
                                            <span className="hidden font-sans text-xs text-muted-foreground md:inline">
                                                ({selectedApprovalsOnCurrentPageCount} di halaman ini)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right side: Action buttons */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearSelection}
                                        className="hidden font-sans text-xs text-muted-foreground hover:text-destructive sm:inline-flex"
                                    >
                                        Batal Semua
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            if (selectedApprovalIds.length > 0) {
                                                setBulkPreviewApprovalId(selectedApprovalIds[0]);
                                            }
                                            setIsBulkModalOpen(true);
                                        }}
                                        className="font-sans text-xs font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                    >
                                        <IconCheck className="mr-1.5 h-3.5 w-3.5" />
                                        Bulk Approve ({selectedApprovalIds.length})
                                    </Button>
                                </div>
                            </div>
                        </aside>
                    )}

                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-6 p-6" style={{ transition: 'all 0.3s ease' }}>
                            {/* Header */}
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold">Approval Dokumen</h1>
                                <p className="font-sans text-muted-foreground">Kelola persetujuan dokumen yang memerlukan tindakan Anda</p>
                            </div>


                            {/* Search and Filter */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-serif">Daftar Approval</CardTitle>
                                    <CardDescription className="font-sans">Dokumen yang memerlukan persetujuan Anda</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Search */}
                                    <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row md:items-center">
                                        <div className="relative flex-1">
                                            <IconSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                placeholder="Cari berdasarkan judul dokumen..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="pl-10 font-sans"
                                            />
                                        </div>
                                        <Button type="submit" className="shrink-0 font-sans">
                                            Cari
                                        </Button>

                                        <div className="flex shrink-0 items-center gap-2">
                                            <IconFilter className="hidden h-5 w-5 text-muted-foreground lg:block" />
                                            <Select value={selectedAplikasiId} onValueChange={handleAplikasiChange}>
                                                <SelectTrigger className="min-w-0 flex-1 font-sans sm:w-[180px] sm:flex-none">
                                                    <SelectValue placeholder="Semua Aplikasi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Aplikasi</SelectItem>
                                                    {aplikasis.map((app) => (
                                                        <SelectItem key={app.id} value={app.id.toString()}>
                                                            {app.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select value={selectedTransaksiId} onValueChange={handleTransaksiChange}>
                                                <SelectTrigger className="min-w-0 flex-1 font-sans sm:w-[180px] sm:flex-none">
                                                    <SelectValue placeholder="Semua Transaksi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Transaksi</SelectItem>
                                                    {availableTransaksis.map((trx) => (
                                                        <SelectItem key={trx.id} value={trx.id.toString()}>
                                                            {trx.nama_transaksi}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* View Mode Toggle */}
                                        <div className="flex items-center rounded-lg border bg-muted/40 p-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setApprovalsViewMode('card')}
                                                title="Tampilan Card"
                                                className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${approvalsViewMode === 'card'
                                                        ? 'bg-background text-primary shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                <IconLayoutGrid className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setApprovalsViewMode('table')}
                                                title="Tampilan Tabel"
                                                className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${approvalsViewMode === 'table'
                                                        ? 'bg-background text-primary shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                <IconList className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </form>

                                    {/* Tabs */}
                                    <Tabs value={selectedTab} onValueChange={handleTabChange}>
                                        <TabsList className="flex w-full justify-start overflow-x-auto p-1 whitespace-nowrap">
                                            <TabsTrigger value="all" className="font-sans">
                                                Semua
                                            </TabsTrigger>
                                            <TabsTrigger value="pending" className="font-sans">
                                                Menunggu ({statsData.pending})
                                            </TabsTrigger>
                                            <TabsTrigger value="approved" className="font-sans">
                                                Disetujui ({statsData.approved})
                                            </TabsTrigger>
                                            <TabsTrigger value="rejected" className="font-sans">
                                                Ditolak ({statsData.rejected})
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value={selectedTab} className="mt-6 space-y-4">
                                            {/* Approval Items List */}
                                            {approvalsData.length === 0 ? (
                                                <div className="py-12 text-center">
                                                    <IconFileText className="mx-auto h-12 w-12 text-muted-foreground" />
                                                    <h3 className="mt-4 font-serif text-lg font-semibold">Tidak ada dokumen</h3>
                                                    <p className="mt-2 font-sans text-sm text-muted-foreground">
                                                        Belum ada dokumen yang perlu di-approve pada kategori ini.
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* ===== DESKTOP TABLE VIEW ===== */}
                                                    {approvalsViewMode === 'table' ? (
                                                        <div className="hidden lg:block">
                                                            <div className="mb-3 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                                                                <Checkbox
                                                                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                                                                    disabled={eligibleApprovals.length === 0}
                                                                    onCheckedChange={handleSelectAll}
                                                                    aria-label="Pilih semua dokumen yang dapat disetujui"
                                                                />
                                                                <span className="font-sans text-xs font-medium text-muted-foreground">Pilih semua</span>
                                                            </div>
                                                            <div className="overflow-hidden rounded-xl border">
                                                                <table className="w-full text-sm font-sans">
                                                                    <thead className="bg-muted/50 text-left">
                                                                        <tr>
                                                                            <th className="px-4 py-3 w-8"></th>
                                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide w-8">#</th>
                                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Dokumen</th>
                                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Status</th>
                                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Pengaju</th>
                                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Nominal</th>
                                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Tgl Pengajuan</th>
                                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide text-right">Aksi</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border bg-card">
                                                                        {approvalsData.map((approval, index) => {
                                                                            const isEligible = approval.approval_status === 'pending' && approval.can_approve !== false;
                                                                            const isSelected = selectedApprovalIds.includes(approval.id);
                                                                            const overdue = isOverdue(approval.tgl_deadline);
                                                                            return (
                                                                                <tr
                                                                                    key={approval.id}
                                                                                    className={`transition-colors hover:bg-muted/30 ${updatedApprovalIds.has(approval.id) ? 'bg-green-50 dark:bg-green-950/10' : isSelected ? 'bg-primary/5' : ''
                                                                                        }`}
                                                                                >
                                                                                    <td className="px-4 py-3">
                                                                                        <Checkbox
                                                                                            checked={isSelected}
                                                                                            disabled={!isEligible}
                                                                                            onCheckedChange={() => toggleSelectApproval(approval.id, approval)}
                                                                                            aria-label={`Pilih ${approval.dokumen.judul_dokumen}`}
                                                                                        />
                                                                                    </td>
                                                                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{index + 1 + (approvals.current_page - 1) * approvals.per_page}</td>
                                                                                    <td className="px-4 py-3 max-w-xs">
                                                                                        <div className="space-y-1">
                                                                                            <p className="font-semibold text-foreground leading-tight line-clamp-1" title={approval.dokumen.judul_dokumen}>{approval.dokumen.judul_dokumen}</p>
                                                                                            <div className="flex flex-wrap items-center gap-1">
                                                                                                <Badge variant="secondary" className="bg-green-100 px-1 py-0 font-mono text-[10px] text-green-800">{approval.dokumen.nomor_dokumen}</Badge>
                                                                                                {approval.masterflow_step && (
                                                                                                    <span className="rounded bg-muted px-1 py-0 font-sans text-[10px] text-muted-foreground">Step {approval.masterflow_step.step_order}: {approval.masterflow_step.step_name}</span>
                                                                                                )}
                                                                                                {overdue && (
                                                                                                    <Badge variant="outline" className="border-red-300 bg-red-50 px-1 py-0 text-[10px] text-red-700">Terlambat</Badge>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-3">{getStatusBadge(approval.approval_status)}</td>
                                                                                    <td className="px-4 py-3">
                                                                                        <div className="space-y-0.5">
                                                                                            <p className="text-sm font-medium">{approval.dokumen.aplikasi?.name || '-'}</p>
                                                                                            <p className="text-xs text-muted-foreground">{approval.dokumen.user?.name || '-'}</p>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-3">
                                                                                        <span className="font-mono text-xs font-semibold text-green-600">{formatCurrency(approval.dokumen.nominal)}</span>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(approval.dokumen.tgl_pengajuan)}</td>
                                                                                    <td className="px-4 py-3">
                                                                                        <div className="flex items-center justify-end gap-1.5">
                                                                                            <Button variant="outline" size="sm" onClick={() => handleOpenPreview(approval)} className="h-7 px-2 font-sans text-xs" title="Preview">
                                                                                                <IconEye className="h-3.5 w-3.5" />
                                                                                            </Button>
                                                                                            <Button variant="outline" size="sm" onClick={() => handleViewDetail(approval.id)} className="h-7 px-2 border-primary/20 font-sans text-xs hover:bg-primary/5 hover:text-primary" title="Detail">
                                                                                                <IconFileText className="h-3.5 w-3.5" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="hidden gap-4 lg:grid lg:grid-cols-3">
                                                            <div className="col-span-3 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                                                                <Checkbox
                                                                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                                                                    disabled={eligibleApprovals.length === 0}
                                                                    onCheckedChange={handleSelectAll}
                                                                    aria-label="Pilih semua dokumen yang dapat disetujui"
                                                                    className="cursor-pointer"
                                                                />
                                                                <span className="font-sans text-xs font-medium text-muted-foreground">Pilih semua</span>
                                                            </div>

                                                            {approvalsData.map((approval, index) => {
                                                                const isEligible = approval.approval_status === 'pending' && approval.can_approve !== false;
                                                                const isSelected = selectedApprovalIds.includes(approval.id);
                                                                const overdue = isOverdue(approval.tgl_deadline);

                                                                return (
                                                                    <article
                                                                        key={approval.id}
                                                                        className={`min-w-0 space-y-4 rounded-lg border bg-card p-4 transition-colors ${updatedApprovalIds.has(approval.id)
                                                                                ? 'bg-green-50 dark:bg-green-950/20'
                                                                                : isSelected
                                                                                    ? 'bg-primary/5'
                                                                                    : ''
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <Checkbox
                                                                                    checked={isSelected}
                                                                                    disabled={!isEligible}
                                                                                    onCheckedChange={() => toggleSelectApproval(approval.id, approval)}
                                                                                    aria-label={`Pilih dokumen ${approval.dokumen.judul_dokumen}`}
                                                                                />
                                                                                <span className="font-sans text-xs font-medium text-muted-foreground">
                                                                                    #{index + 1 + (approvals.current_page - 1) * approvals.per_page}
                                                                                </span>
                                                                            </div>
                                                                            {getStatusBadge(approval.approval_status)}
                                                                        </div>

                                                                        <div className="min-w-0 space-y-2">
                                                                            <h3 className="break-words font-sans text-base font-semibold leading-tight text-foreground">
                                                                                {approval.dokumen.judul_dokumen}
                                                                            </h3>
                                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                                <Badge
                                                                                    variant="secondary"
                                                                                    className="bg-green-100 px-1.5 py-0 font-mono text-[10px] text-green-800 hover:bg-green-100"
                                                                                >
                                                                                    {approval.dokumen.nomor_dokumen}
                                                                                </Badge>
                                                                                {approval.masterflow_step && (
                                                                                    <span className="rounded bg-muted px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground">
                                                                                        Step {approval.masterflow_step.step_order}: {approval.masterflow_step.step_name}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {approval.tgl_deadline && (
                                                                                <div className={`flex flex-wrap items-center gap-1 font-sans text-xs ${overdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                                                    <IconClock className="h-3.5 w-3.5 shrink-0" />
                                                                                    <span>{overdue ? 'Terlambat' : 'Deadline'} {formatDate(approval.tgl_deadline)}</span>
                                                                                    {overdue && (
                                                                                        <Badge variant="outline" className="border-red-300 bg-red-50 px-1 py-0 text-[10px] text-red-700">
                                                                                            Terlambat
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="grid min-w-0 grid-cols-2 gap-3 border-t pt-3 font-sans">
                                                                            <div className="min-w-0 space-y-1">
                                                                                <p className="text-[10px] font-medium uppercase text-muted-foreground">Perusahaan / Pengaju</p>
                                                                                <div className="flex min-w-0 items-center gap-1.5">
                                                                                    <IconFileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                                                    <span className="min-w-0 break-words text-sm font-medium">{approval.dokumen.aplikasi?.name || '-'}</span>
                                                                                </div>
                                                                                <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                                                                    <IconUser className="h-3.5 w-3.5 shrink-0" />
                                                                                    <span className="min-w-0 break-words text-xs">{approval.dokumen.user?.name || '-'}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="min-w-0 space-y-1">
                                                                                <p className="text-[10px] font-medium uppercase text-muted-foreground">Nominal</p>
                                                                                <p className="break-words text-sm font-semibold text-green-600">{formatCurrency(approval.dokumen.nominal)}</p>
                                                                            </div>
                                                                            <div className="col-span-2 min-w-0 space-y-1">
                                                                                <p className="text-[10px] font-medium uppercase text-muted-foreground">Jenis Transaksi</p>
                                                                                {approval.dokumen.transaksi ? (
                                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="border-blue-200 bg-blue-50 px-1.5 py-0 font-sans text-[11px] font-semibold text-blue-700"
                                                                                        >
                                                                                            {approval.dokumen.transaksi.kode_transaksi}
                                                                                        </Badge>
                                                                                        <span className="break-words text-xs text-muted-foreground">{approval.dokumen.transaksi.nama_transaksi}</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-xs text-muted-foreground">-</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="col-span-2 min-w-0 space-y-1">
                                                                                <p className="text-[10px] font-medium uppercase text-muted-foreground">Tanggal Pengajuan</p>
                                                                                <p className="text-xs text-muted-foreground">{formatDate(approval.dokumen.tgl_pengajuan)}</p>
                                                                            </div>
                                                                            <div className="col-span-2 min-w-0 space-y-1">
                                                                                <p className="text-[10px] font-medium uppercase text-muted-foreground">Keterangan</p>
                                                                                <p className="break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                                                                                    {approval.dokumen.deskripsi || '-'}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex justify-end gap-2 border-t pt-3">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleOpenPreview(approval)}
                                                                                className="font-sans text-xs"
                                                                                title="Preview dokumen"
                                                                            >
                                                                                <IconEye className="mr-1.5 h-3.5 w-3.5" />
                                                                                Preview
                                                                            </Button>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleViewDetail(approval.id)}
                                                                                className="border-primary/20 font-sans text-xs hover:bg-primary/5 hover:text-primary"
                                                                                title="Detail approval"
                                                                            >
                                                                                <IconFileText className="mr-1.5 h-3.5 w-3.5" />
                                                                                Detail
                                                                            </Button>
                                                                        </div>
                                                                    </article>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* ===== MOBILE: daftar card (hanya tampil di bawah lg) ===== */}
                                                    <div className="space-y-3 lg:hidden">
                                                        {/* Pilih semua (sama logikanya dengan header tabel) */}
                                                        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                                                            <Checkbox
                                                                checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                                                                disabled={eligibleApprovals.length === 0}
                                                                onCheckedChange={handleSelectAll}
                                                                aria-label="Pilih semua dokumen yang dapat disetujui"
                                                                className="cursor-pointer"
                                                            />
                                                            <span className="font-sans text-xs font-medium text-muted-foreground">Pilih semua</span>
                                                        </div>

                                                        {approvalsData.map((approval, index) => {
                                                            const isEligible = approval.approval_status === 'pending' && approval.can_approve !== false;
                                                            const isSelected = selectedApprovalIds.includes(approval.id);
                                                            const overdue = isOverdue(approval.tgl_deadline);

                                                            return (
                                                                <div
                                                                    key={approval.id}
                                                                    className={`space-y-3 rounded-xl border bg-card p-3 transition-colors ${updatedApprovalIds.has(approval.id)
                                                                            ? 'bg-green-50 dark:bg-green-950/20'
                                                                            : isSelected
                                                                                ? 'bg-primary/5'
                                                                                : ''
                                                                        }`}
                                                                >
                                                                    {/* Header: checkbox, nomor urut, status */}
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <Checkbox
                                                                                checked={isSelected}
                                                                                disabled={!isEligible}
                                                                                onCheckedChange={() => toggleSelectApproval(approval.id, approval)}
                                                                                aria-label={`Pilih dokumen ${approval.dokumen.judul_dokumen}`}
                                                                            />
                                                                            <span className="font-sans text-xs font-medium text-muted-foreground">
                                                                                #{index + 1 + (approvals.current_page - 1) * approvals.per_page}
                                                                            </span>
                                                                        </div>
                                                                        {getStatusBadge(approval.approval_status)}
                                                                    </div>

                                                                    {/* Dokumen */}
                                                                    <div className="min-w-0 space-y-1">
                                                                        <h4 className="font-sans text-sm leading-tight font-semibold break-words text-foreground">
                                                                            {approval.dokumen.judul_dokumen}
                                                                        </h4>
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="bg-green-100 px-1.5 py-0 font-mono text-[10px] text-green-800 hover:bg-green-100"
                                                                            >
                                                                                {approval.dokumen.nomor_dokumen}
                                                                            </Badge>
                                                                            {approval.masterflow_step && (
                                                                                <span className="rounded bg-muted px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground">
                                                                                    Step {approval.masterflow_step.step_order}: {approval.masterflow_step.step_name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {approval.tgl_deadline && (
                                                                            <div
                                                                                className={`flex flex-wrap items-center gap-1 font-sans text-[11px] ${overdue ? 'text-red-600' : 'text-muted-foreground'
                                                                                    }`}
                                                                            >
                                                                                <IconClock className="h-3 w-3" />
                                                                                <span>
                                                                                    {overdue ? 'Terlambat' : 'Deadline'} {formatDate(approval.tgl_deadline)}
                                                                                </span>
                                                                                {overdue && (
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="border-red-300 bg-red-50 px-1 py-0 text-[10px] text-red-700"
                                                                                    >
                                                                                        Terlambat
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Perusahaan / Pengaju */}
                                                                    <div className="space-y-1 font-sans">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <IconFileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                                            <span className="min-w-0 text-sm font-medium break-words">
                                                                                {approval.dokumen.aplikasi?.name || '-'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                            <IconUser className="h-3.5 w-3.5 shrink-0" />
                                                                            <span className="min-w-0 text-xs break-words">{approval.dokumen.user?.name || '-'}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Nominal, Jenis Transaksi, Tanggal */}
                                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-3 font-sans">
                                                                        <div className="min-w-0">
                                                                            <p className="text-[10px] text-muted-foreground uppercase">Nominal</p>
                                                                            <p className="text-sm font-semibold text-green-600">
                                                                                {formatCurrency(approval.dokumen.nominal)}
                                                                            </p>
                                                                        </div>
                                                                        <div className="col-span-2 min-w-0">
                                                                            <p className="mb-1 text-[10px] text-muted-foreground uppercase">Jenis Transaksi</p>
                                                                            {approval.dokumen.transaksi ? (
                                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="border-blue-200 bg-blue-50 px-1.5 py-0 font-sans text-[11px] font-semibold text-blue-700"
                                                                                    >
                                                                                        {approval.dokumen.transaksi.kode_transaksi}
                                                                                    </Badge>
                                                                                    <span className="text-xs break-words text-muted-foreground">
                                                                                        {approval.dokumen.transaksi.nama_transaksi}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-xs text-muted-foreground">-</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Aksi */}
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleOpenPreview(approval)}
                                                                            className="h-9 font-sans text-xs"
                                                                            title="Preview dokumen"
                                                                        >
                                                                            <IconEye className="mr-1 h-3.5 w-3.5" />
                                                                            Preview
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleViewDetail(approval.id)}
                                                                            className="h-9 border-primary/20 font-sans text-xs hover:bg-primary/5 hover:text-primary"
                                                                        >
                                                                            Detail
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}

                                            {/* Pagination */}
                                            {approvals.last_page > 1 && (
                                                <>
                                                    {/* DESKTOP: pagination asli (hanya ditambah hidden lg:flex) */}
                                                    <div className="hidden items-center justify-center gap-2 pt-4 lg:flex">
                                                        {approvals.links.map((link, index) => (
                                                            <Button
                                                                key={index}
                                                                variant={link.active ? 'default' : 'outline'}
                                                                size="sm"
                                                                disabled={!link.url}
                                                                onClick={() => link.url && router.visit(link.url, { preserveState: true, preserveScroll: true })}
                                                                className="font-sans"
                                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* MOBILE: Sebelumnya / halaman / Berikutnya */}
                                                    <div className="flex items-center justify-between gap-2 pt-4 lg:hidden">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={!approvals.links[0].url}
                                                            onClick={() => approvals.links[0].url && router.visit(approvals.links[0].url, { preserveState: true, preserveScroll: true })}
                                                            className="font-sans"
                                                        >
                                                            ‹ Sebelumnya
                                                        </Button>
                                                        <span className="font-sans text-sm text-muted-foreground">
                                                            {approvals.current_page} / {approvals.last_page}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={!approvals.links[approvals.links.length - 1].url}
                                                            onClick={() => {
                                                                const url = approvals.links[approvals.links.length - 1].url;
                                                                if (url) router.visit(url, { preserveState: true, preserveScroll: true });
                                                            }}
                                                            className="font-sans"
                                                        >
                                                            Berikutnya ›
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Bulk Approval Modal Dialog */}
                    <Dialog
                        open={isBulkModalOpen}
                        onOpenChange={(open) => {
                            if (isBulkSubmitting) return;
                            setIsBulkModalOpen(open);
                            if (!open) {
                                setShowBulkSignaturePad(false);
                                setBulkSignatureData(null);
                            }
                        }}
                    >
                        <DialogContent className="flex h-[92vh] max-h-[92dvh] w-[95vw] max-w-[95vw] flex-col overflow-hidden rounded-2xl p-0 lg:h-[90vh] lg:max-h-[90dvh] lg:w-[95vw] lg:max-w-[1400px]">
                            <DialogHeader className="shrink-0 border-b px-4 py-3">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <div className="min-w-0">
                                        <DialogTitle className="font-serif text-base">Bulk Approval Persetujuan</DialogTitle>
                                        <DialogDescription className="font-sans text-xs truncate">
                                            {bulkPreviewFileName || currentBulkPreviewApproval?.dokumen?.judul_dokumen}
                                        </DialogDescription>
                                    </div>
                                    <Badge className="bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                                        {selectedApprovalIds.length} Dokumen
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 sm:p-4 lg:flex-row lg:overflow-hidden">
                                {/* PDF Preview with Placement - Left Side */}
                                {bulkPreviewFileUrl && currentBulkPreviewApproval ? (
                                    <div className="h-[450px] shrink-0 sm:h-[520px] lg:h-full lg:min-h-0 lg:flex-1">
                                        <SignaturePlacementDialog
                                            key={currentBulkPreviewApproval.id}
                                            open={isBulkModalOpen}
                                            onOpenChange={setIsBulkModalOpen}
                                            dokumenId={currentBulkPreviewApproval.dokumen.id}
                                            fileUrl={bulkPreviewFileUrl}
                                            approvals={bulkPreviewMappedApprovals}
                                            defaultActiveApprovalId={currentBulkPreviewApproval.id}
                                            isEmbedded={true}
                                            readOnly={!((currentBulkPreviewApproval.can_approve ?? true) && currentBulkPreviewApproval.approval_status === 'pending')}
                                            bulkDocuments={selectedApprovalsList.map((a) => ({
                                                id: a.id,
                                                title: a.dokumen.judul_dokumen,
                                                documentNumber: a.dokumen.nomor_dokumen,
                                                transactionCode: a.dokumen.transaksi?.kode_transaksi,
                                                nominal: a.dokumen.nominal,
                                            }))}
                                            selectedDocumentId={currentBulkPreviewApproval.id}
                                            onDocumentSelect={(id) => setBulkPreviewApprovalId(Number(id))}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex h-full min-h-[300px] flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
                                        <IconFileText className="mb-2 h-12 w-12 text-muted-foreground/40" />
                                        <p className="font-sans text-sm font-medium">Preview tidak tersedia</p>
                                        <p className="font-sans text-xs text-muted-foreground">
                                            Dokumen ini tidak memiliki file PDF yang valid untuk dipratinjau.
                                        </p>
                                    </div>
                                )}

                                {/* Signature Panel - Right Side */}
                                <div className="w-full shrink-0 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3 lg:w-[300px] lg:min-w-[260px]">
                                    <div>
                                        <h3 className="font-serif text-base font-semibold leading-tight">Tanda Tangan Persetujuan</h3>
                                        <p className="font-sans text-xs text-muted-foreground mt-0.5">
                                            Tanda tangan akan diterapkan ke semua {selectedApprovalIds.length} dokumen
                                        </p>
                                    </div>

                                    <Separator />

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            Metode Tanda Tangan
                                        </Label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={bulkSignatureMethod === 'original' ? 'default' : 'outline'}
                                                onClick={() => {
                                                    setBulkSignatureMethod('original');
                                                }}
                                                className="w-full text-xs font-medium h-8"
                                            >
                                                Tanda Tangan Asli
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={bulkSignatureMethod === 'qr' ? 'default' : 'outline'}
                                                onClick={() => {
                                                    setBulkSignatureMethod('qr');
                                                }}
                                                className="w-full text-xs font-medium h-8"
                                            >
                                                QR Code
                                            </Button>
                                        </div>
                                    </div>

                                    <Separator />

                                    {bulkSignatureMethod === 'original' ? (
                                        !showBulkSignaturePad && !bulkSignatureData ? (
                                            <div className="space-y-2">
                                                <Card className="border-dashed">
                                                    <CardContent className="flex flex-col items-center justify-center py-4 px-3">
                                                        <IconPencil className="h-8 w-8 text-muted-foreground" />
                                                        <p className="mt-1.5 text-center font-sans text-xs text-muted-foreground">
                                                            Belum ada tanda tangan
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setShowBulkSignaturePad(true)}
                                                    className="w-full font-sans h-8 text-xs"
                                                    variant="outline"
                                                >
                                                    <IconPencil className="mr-1.5 h-3.5 w-3.5" />
                                                    Tambah Tanda Tangan
                                                </Button>
                                            </div>
                                        ) : bulkSignatureData ? (
                                            <div className="space-y-3">
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <div className="flex aspect-square max-w-[200px] mx-auto items-center justify-center rounded border bg-white p-3">
                                                            <img
                                                                src={bulkSignatureData}
                                                                alt="Signature"
                                                                className="max-h-full max-w-full object-contain"
                                                            />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setBulkSignatureData(null);
                                                            setShowBulkSignaturePad(true);
                                                        }}
                                                        className="flex-1 font-sans text-xs"
                                                    >
                                                        Ganti
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setBulkSignatureData(null);
                                                        }}
                                                        className="font-sans text-xs text-red-600 hover:bg-red-50"
                                                    >
                                                        <IconX className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <SignaturePad
                                                onSignatureComplete={(sig) => {
                                                    setBulkSignatureData(sig);
                                                    setShowBulkSignaturePad(false);
                                                    showToast.success('✅ Tanda tangan berhasil ditambahkan!');
                                                }}
                                                onCancel={() => setShowBulkSignaturePad(false)}
                                            />
                                        )
                                    ) : (
                                        <div className="space-y-2">
                                            <Card className="border bg-white">
                                                <CardContent className="flex flex-col items-center justify-center py-4 px-3 text-center">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="h-6 w-6"
                                                        >
                                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                                            <rect x="7" y="7" width="3" height="3" />
                                                            <rect x="14" y="7" width="3" height="3" />
                                                            <rect x="7" y="14" width="3" height="3" />
                                                            <rect x="14" y="14" width="3" height="3" />
                                                        </svg>
                                                    </div>
                                                    <p className="mt-2 font-serif text-sm font-semibold">QR Code Terpilih</p>
                                                    <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                                                        QR Code unik akan disisipkan pada dokumen.
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {(bulkSignatureData || bulkSignatureMethod === 'qr') && (
                                        <>
                                            <Separator />

                                            <div className="space-y-2">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="bulk-comment" className="font-sans text-xs">
                                                        Komentar (Opsional)
                                                    </Label>
                                                    <Textarea
                                                        id="bulk-comment"
                                                        placeholder="Tambahkan komentar jika diperlukan..."
                                                        value={bulkComment}
                                                        onChange={(e) => setBulkComment(e.target.value)}
                                                        className="font-sans text-sm"
                                                        rows={2}
                                                        disabled={isBulkSubmitting}
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleBulkApproveSubmit}
                                                        disabled={isBulkSubmitting || (bulkSignatureMethod === 'original' && !bulkSignatureData)}
                                                        className="w-full font-sans h-9"
                                                    >
                                                        {isBulkSubmitting ? 'Memproses...' : (
                                                            <>
                                                                <IconCheck className="mr-1.5 h-3.5 w-3.5" />
                                                                Setujui ({selectedApprovalIds.length}) Dokumen
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setIsBulkModalOpen(false)}
                                                        className="w-full font-sans h-8 text-xs"
                                                        disabled={isBulkSubmitting}
                                                    >
                                                        Batal
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Preview Dokumen Modal Dialog */}
                    {previewApproval && (
                        <Dialog
                            open={isPreviewDialogOpen}
                            onOpenChange={async (open) => {
                                if (!open && previewApproval?.dokumen?.id && previewSignaturePositions && previewSignaturePositions.length > 0) {
                                    try {
                                        await api.post(`/dokumen/${previewApproval.dokumen.id}/signature-positions`, {
                                            positions: previewSignaturePositions,
                                        });
                                    } catch (e) {
                                        console.error('Failed to sync signature positions on dialog close:', e);
                                    }
                                }
                                setIsPreviewDialogOpen(open);
                                if (!open) {
                                    setPreviewApproval(null);
                                }
                            }}
                        >
                            <DialogContent className="flex h-[100dvh] sm:h-[90dvh] max-h-[100dvh] sm:max-h-[90dvh] w-full sm:max-w-[90vw] flex-col overflow-hidden rounded-none sm:rounded-2xl p-0">
                                <DialogHeader className="shrink-0 border-b p-3 sm:p-4">
                                    <div className="space-y-1">
                                        <DialogTitle className="font-serif text-base sm:text-lg">Preview Dokumen</DialogTitle>
                                        <DialogDescription className="font-sans text-xs line-clamp-1">
                                            {previewFileName || previewApproval.dokumen_version?.nama_file || previewApproval.dokumen.judul_dokumen}
                                        </DialogDescription>
                                        {previewApproval.approval_status !== 'pending' && (
                                            <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-700">
                                                Dokumen ini sudah {previewApproval.approval_status === 'approved' ? 'disetujui' : 'ditolak'}.
                                            </div>
                                        )}
                                        {previewApproval.can_approve === false && previewApproval.approval_status === 'pending' && (
                                            <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-700">
                                                Approval ini bukan untuk Anda atau sedang menunggu giliran.
                                            </div>
                                        )}
                                    </div>
                                </DialogHeader>

                                <div className="flex min-h-0 flex-1 overflow-hidden">
                                    {/* PDF Preview with Placement */}
                                    {previewFileUrl && (
                                        <SignaturePlacementDialog
                                            open={isPreviewDialogOpen}
                                            onOpenChange={setIsPreviewDialogOpen}
                                            dokumenId={previewApproval.dokumen.id}
                                            fileUrl={previewFileUrl}
                                            approvals={previewMappedApprovals}
                                            defaultActiveApprovalId={previewApproval.id}
                                            onPositionsChange={setPreviewSignaturePositions}
                                            onSaved={(positions) => setPreviewSignaturePositions(positions)}
                                            isEmbedded={true}
                                            readOnly={!((previewApproval.can_approve ?? true) && previewApproval.approval_status === 'pending')}
                                        />
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
