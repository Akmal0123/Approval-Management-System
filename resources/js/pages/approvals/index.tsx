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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

    // Bulk approval states
    const [selectedApprovalIds, setSelectedApprovalIds] = useState<number[]>([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkSignatureMethod, setBulkSignatureMethod] = useState<'original' | 'qr'>('original');
    const [bulkSignatureData, setBulkSignatureData] = useState<string | null>(null);
    const [showBulkSignaturePad, setShowBulkSignaturePad] = useState(false);
    const [bulkComment, setBulkComment] = useState('');
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

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
        selectedApprovalIds.length > 0 && !isAllSelected;

    // Handle single checkbox selection
    const toggleSelectApproval = (id: number) => {
        setSelectedApprovalIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    // Handle select all toggle
    const handleSelectAll = (checked?: boolean | 'indeterminate') => {
        if (isAllSelected) {
            setSelectedApprovalIds([]);
        } else {
            setSelectedApprovalIds(eligibleApprovals.map((a) => a.id));
        }
    };

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
                    setSelectedApprovalIds([]);
                    setBulkSignatureData(null);
                    setBulkComment('');
                    setShowBulkSignaturePad(false);
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
        setSelectedApprovalIds([]); // Reset selection on tab switch
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
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-6 p-6" style={{ transition: 'all 0.3s ease' }}>
                            {/* Header */}
                            <div className="space-y-2">
                                <h1 className="font-serif text-3xl font-bold">Approval Dokumen</h1>
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
                                            {/* Toolbar Bulk Selection */}
                                            {eligibleApprovals.length > 0 && (
                                                <div
                                                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 transition-all ${selectedApprovalIds.length > 0
                                                        ? 'border-primary/30 bg-primary/10 shadow-xs'
                                                        : 'border-border/60 bg-muted/40'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        {selectedApprovalIds.length > 0 ? (
                                                            <>
                                                                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                                <span className="font-sans text-xs sm:text-sm font-semibold text-foreground">
                                                                    {selectedApprovalIds.length} dokumen terpilih
                                                                </span>
                                                                <span className="font-sans text-xs text-muted-foreground hidden sm:inline">
                                                                    (dari {eligibleApprovals.length} dokumen menunggu)
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="font-sans text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <IconClock className="h-3.5 w-3.5 text-amber-500" />
                                                                Centang checklist pada tabel samping kiri nomor untuk persetujuan massal ({eligibleApprovals.length} dokumen menunggu)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            disabled={selectedApprovalIds.length === 0}
                                                            onClick={() => setIsBulkModalOpen(true)}
                                                            className={`font-sans text-xs font-semibold shadow-xs transition-colors ${selectedApprovalIds.length > 0
                                                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                                : 'opacity-50 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            <IconCheck className="mr-1.5 h-3.5 w-3.5" />
                                                            Bulk Approve ({selectedApprovalIds.length})
                                                        </Button>
                                                        {selectedApprovalIds.length > 0 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedApprovalIds([]);
                                                                    setBulkSignatureData(null);
                                                                    setShowBulkSignaturePad(false);
                                                                    setBulkComment('');
                                                                }}
                                                                className="font-sans text-xs text-muted-foreground hover:text-destructive"
                                                            >
                                                                Batal
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

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
                                                <div className="rounded-md border bg-card">
                                                    <Table>
                                                        <TableHeader className="bg-muted/50">
                                                            <TableRow>
                                                                <TableHead className="w-10 text-center">
                                                                    <div className="flex items-center justify-center">
                                                                        <Checkbox
                                                                            checked={
                                                                                isAllSelected
                                                                                    ? true
                                                                                    : isSomeSelected
                                                                                        ? "indeterminate"
                                                                                        : false
                                                                            }
                                                                            disabled={eligibleApprovals.length === 0}
                                                                            onCheckedChange={handleSelectAll}
                                                                            aria-label="Pilih semua dokumen yang dapat disetujui"
                                                                        />
                                                                    </div>
                                                                </TableHead>
                                                                <TableHead className="w-10 text-center font-sans font-semibold text-xs">#</TableHead>
                                                                <TableHead className="font-sans font-semibold text-xs">Dokumen</TableHead>
                                                                <TableHead className="font-sans font-semibold text-xs">Perusahaan / Pengaju</TableHead>
                                                                <TableHead className="font-sans font-semibold text-xs">Nominal</TableHead>
                                                                <TableHead className="font-sans font-semibold text-xs">Jenis Transaksi</TableHead>
                                                                <TableHead className="font-sans font-semibold text-xs">Status</TableHead>
                                                                <TableHead className="font-sans font-semibold text-xs">Keterangan</TableHead>
                                                                <TableHead className="font-sans font-semibold text-xs">Tanggal</TableHead>
                                                                <TableHead className="text-right font-sans font-semibold text-xs">Aksi</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {approvalsData.map((approval, index) => {
                                                                const isEligible = approval.approval_status === 'pending' && approval.can_approve !== false;
                                                                const isSelected = selectedApprovalIds.includes(approval.id);

                                                                return (
                                                                    <TableRow
                                                                        key={approval.id}
                                                                        className={`group transition-colors ${updatedApprovalIds.has(approval.id)
                                                                            ? 'bg-green-50 dark:bg-green-950/20'
                                                                            : isSelected
                                                                                ? 'bg-primary/5'
                                                                                : ''
                                                                            }`}
                                                                    >
                                                                        <TableCell className="w-10 text-center py-3">
                                                                            <div className="flex items-center justify-center">
                                                                                <Checkbox
                                                                                    checked={isSelected}
                                                                                    disabled={!isEligible}
                                                                                    onCheckedChange={() => toggleSelectApproval(approval.id)}
                                                                                    aria-label={`Pilih dokumen ${approval.dokumen.judul_dokumen}`}
                                                                                />
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-sans font-medium text-muted-foreground text-xs">
                                                                            {index + 1 + (approvals.current_page - 1) * approvals.per_page}
                                                                        </TableCell>
                                                                        <TableCell className="py-3">
                                                                            <div className="space-y-1">
                                                                                <h4 className="font-sans text-sm leading-tight font-semibold text-foreground">
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
                                                                                            Step {approval.masterflow_step.step_order}:{' '}
                                                                                            {approval.masterflow_step.step_name}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {approval.tgl_deadline && (
                                                                                    <div
                                                                                        className={`flex items-center gap-1 font-sans text-[11px] ${isOverdue(approval.tgl_deadline) ? 'text-red-600' : 'text-muted-foreground'}`}
                                                                                    >
                                                                                        <IconClock className="h-3 w-3" />
                                                                                        <span>Terlambat {formatDate(approval.tgl_deadline)}</span>
                                                                                        {isOverdue(approval.tgl_deadline) && (
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
                                                                        </TableCell>
                                                                        <TableCell className="py-3">
                                                                            <div className="space-y-1 font-sans">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <IconFileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                                                    <span className="text-sm font-medium">
                                                                                        {approval.dokumen.aplikasi?.name || '-'}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                                    <IconUser className="h-3.5 w-3.5 shrink-0" />
                                                                                    <span className="text-xs">{approval.dokumen.user?.name || '-'}</span>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="py-3">
                                                                            <span className="font-sans text-sm font-semibold text-green-600">
                                                                                {formatCurrency(approval.dokumen.nominal)}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="py-3">
                                                                            <div className="flex flex-col items-start gap-1">
                                                                                {approval.dokumen.transaksi ? (
                                                                                    <>
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="border-blue-200 bg-blue-50 px-1.5 py-0 font-sans text-[11px] font-semibold text-blue-700"
                                                                                        >
                                                                                            {approval.dokumen.transaksi.kode_transaksi}
                                                                                        </Badge>
                                                                                        <span className="font-sans text-xs text-muted-foreground">
                                                                                            {approval.dokumen.transaksi.nama_transaksi}
                                                                                        </span>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="text-xs text-muted-foreground">-</span>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="py-3">{getStatusBadge(approval.approval_status)}</TableCell>
                                                                        <TableCell className="max-w-[180px] py-3">
                                                                            <p
                                                                                className="line-clamp-2 font-sans text-xs text-muted-foreground"
                                                                                title={approval.dokumen.deskripsi}
                                                                            >
                                                                                {approval.dokumen.deskripsi || '-'}
                                                                            </p>
                                                                        </TableCell>
                                                                        <TableCell className="py-3 font-sans text-xs whitespace-nowrap text-muted-foreground">
                                                                            {formatDate(approval.dokumen.tgl_pengajuan)}
                                                                        </TableCell>
                                                                        <TableCell className="py-3 text-right">
                                                                            <div className="flex items-center justify-end gap-1.5">
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => handleOpenPreview(approval)}
                                                                                    className="h-8 font-sans text-xs"
                                                                                    title="Preview dokumen"
                                                                                >
                                                                                    <IconEye className="mr-1 h-3.5 w-3.5" />
                                                                                    Preview
                                                                                </Button>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => handleViewDetail(approval.id)}
                                                                                    className="h-8 border-primary/20 font-sans text-xs hover:bg-primary/5 hover:text-primary"
                                                                                >
                                                                                    Detail
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}

                                            {/* Pagination */}
                                            {approvals.last_page > 1 && (
                                                <div className="flex items-center justify-center gap-2 pt-4">
                                                    {approvals.links.map((link, index) => (
                                                        <Button
                                                            key={index}
                                                            variant={link.active ? 'default' : 'outline'}
                                                            size="sm"
                                                            disabled={!link.url}
                                                            onClick={() => link.url && router.visit(link.url)}
                                                            className="font-sans"
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    ))}
                                                </div>
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
                            setIsBulkModalOpen(open);
                            if (!open) {
                                setShowBulkSignaturePad(false);
                            }
                        }}
                    >
                        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col overflow-hidden p-0">
                            <DialogHeader className="shrink-0 border-b bg-muted/20 p-4 sm:p-5">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                                            {selectedApprovalIds.length} Dokumen
                                        </Badge>
                                        <DialogTitle className="font-serif text-lg font-bold">Bulk Approval Persetujuan</DialogTitle>
                                    </div>
                                    <DialogDescription className="font-sans text-xs">
                                        Tanda tangani dan setujui {selectedApprovalIds.length} dokumen yang dipilih sekaligus dengan metode tanda
                                        tangan yang sama.
                                    </DialogDescription>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                                {/* Selected Documents Summary */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Dokumen yang Dipilih ({selectedApprovalIds.length})
                                    </Label>
                                    <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs">
                                        {approvalsData
                                            .filter((a) => selectedApprovalIds.includes(a.id))
                                            .map((a) => (
                                                <span
                                                    key={a.id}
                                                    className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 font-mono text-[11px]"
                                                >
                                                    <IconFileText className="h-3 w-3 shrink-0 text-primary" />
                                                    <span className="max-w-[200px] truncate">
                                                        {a.dokumen.nomor_dokumen || a.dokumen.judul_dokumen}
                                                    </span>
                                                </span>
                                            ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Metode Tanda Tangan */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Metode Tanda Tangan
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <Button
                                            type="button"
                                            variant={bulkSignatureMethod === 'original' ? 'default' : 'outline'}
                                            onClick={() => {
                                                setBulkSignatureMethod('original');
                                                setShowBulkSignaturePad(false);
                                            }}
                                            className="w-full text-xs font-medium"
                                        >
                                            Tanda Tangan Asli
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={bulkSignatureMethod === 'qr' ? 'default' : 'outline'}
                                            onClick={() => {
                                                setBulkSignatureMethod('qr');
                                                setShowBulkSignaturePad(false);
                                            }}
                                            className="w-full text-xs font-medium"
                                        >
                                            Tanda Tangan QR Code
                                        </Button>
                                    </div>
                                </div>

                                <Separator />

                                {/* Signature Input / QR Display */}
                                {bulkSignatureMethod === 'original' ? (
                                    !showBulkSignaturePad && !bulkSignatureData ? (
                                        <div className="space-y-3">
                                            <Card className="border-dashed bg-background">
                                                <CardContent className="flex flex-col items-center justify-center py-6">
                                                    <IconPencil className="h-10 w-10 text-muted-foreground" />
                                                    <p className="mt-2 text-center font-sans text-sm text-muted-foreground">Belum ada tanda tangan</p>
                                                </CardContent>
                                            </Card>
                                            <Button
                                                type="button"
                                                onClick={() => setShowBulkSignaturePad(true)}
                                                className="w-full font-sans"
                                                variant="outline"
                                            >
                                                <IconPencil className="mr-2 h-4 w-4" />
                                                Tambah Tanda Tangan
                                            </Button>
                                        </div>
                                    ) : bulkSignatureData ? (
                                        <div className="space-y-3">
                                            <Card className="mx-auto max-w-xs bg-background">
                                                <CardContent className="p-4">
                                                    <div className="mx-auto flex aspect-square max-w-[160px] items-center justify-center rounded border bg-white p-3">
                                                        <img
                                                            src={bulkSignatureData}
                                                            alt="Signature"
                                                            className="max-h-full max-w-full object-contain"
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <div className="mx-auto flex max-w-xs gap-2">
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
                                                    onClick={() => setBulkSignatureData(null)}
                                                    className="font-sans text-xs text-red-600 hover:bg-red-50"
                                                >
                                                    <IconX className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border bg-background p-3">
                                            <SignaturePad
                                                onSignatureComplete={(sig) => {
                                                    setBulkSignatureData(sig);
                                                    setShowBulkSignaturePad(false);
                                                    showToast.success('✅ Tanda tangan berhasil ditambahkan!');
                                                }}
                                                onCancel={() => setShowBulkSignaturePad(false)}
                                            />
                                        </div>
                                    )
                                ) : (
                                    <Card className="border bg-white">
                                        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="h-8 w-8"
                                                >
                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                    <rect x="7" y="7" width="3" height="3" />
                                                    <rect x="14" y="7" width="3" height="3" />
                                                    <rect x="7" y="14" width="3" height="3" />
                                                    <rect x="14" y="14" width="3" height="3" />
                                                </svg>
                                            </div>
                                            <p className="mt-3 font-serif text-base font-semibold">Tanda Tangan QR Code Terpilih</p>
                                            <p className="mt-1 max-w-[320px] font-sans text-xs text-muted-foreground">
                                                Sistem akan otomatis menyematkan QR Code unik pada setiap dokumen untuk verifikasi keaslian
                                                persetujuan.
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Komentar Opsional */}
                                {(bulkSignatureData || bulkSignatureMethod === 'qr') && (
                                    <div className="space-y-1.5 border-t pt-2">
                                        <Label htmlFor="bulk-comment" className="font-sans text-xs font-medium">
                                            Komentar (Opsional)
                                        </Label>
                                        <Textarea
                                            id="bulk-comment"
                                            placeholder="Tambahkan komentar persetujuan jika diperlukan..."
                                            value={bulkComment}
                                            onChange={(e) => setBulkComment(e.target.value)}
                                            className="bg-background font-sans text-sm"
                                            rows={2}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Footer Action Buttons */}
                            <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-muted/10 p-3 sm:p-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsBulkModalOpen(false)}
                                    disabled={isBulkSubmitting}
                                    className="font-sans"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleBulkApproveSubmit}
                                    disabled={isBulkSubmitting || (bulkSignatureMethod === 'original' && !bulkSignatureData)}
                                    className="font-sans"
                                >
                                    <IconCheck className="mr-2 h-4 w-4" />
                                    {isBulkSubmitting ? 'Memproses Persetujuan...' : `Setujui ${selectedApprovalIds.length} Dokumen`}
                                </Button>
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
                            <DialogContent className="flex h-[90vh] max-w-[90vw] flex-col overflow-y-auto p-0 md:overflow-hidden rounded-2xl">
                                <DialogHeader className="border-b p-4 md:shrink-0">
                                    <div className="space-y-1">
                                        <DialogTitle className="font-serif">Preview Dokumen</DialogTitle>
                                        <DialogDescription className="font-sans">
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

                                <div className="flex min-h-[70vh] flex-1 flex-col md:min-h-0 md:flex-row md:overflow-hidden">
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
