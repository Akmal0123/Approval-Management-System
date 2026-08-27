import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import PDFViewer from '@/components/pdf-viewer';
import SignaturePad from '@/components/signature-pad';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import { Head, router, usePage } from '@inertiajs/react';
import {
    IconAlertCircle,
    IconCalendar,
    IconCheck,
    IconClock,
    IconEye,
    IconFileText,
    IconPencil,
    IconSearch,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import { CheckSquare, QrCode, Square } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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
    user?: User;
    latest_version?: DokumenVersion;
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
    approval_status: string;
    tgl_deadline?: string;
    created_at: string;
    dokumen: Dokumen;
    masterflow_step?: MasterflowStep;
    dokumen_version?: DokumenVersion;
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

interface Props {
    approvals: PaginatedApprovals;
    stats: Stats;
    filters: {
        status?: string;
        overdue?: boolean;
        search?: string;
    };
}

export default function ApproverIndex({ approvals, stats, filters }: Props) {
    const { auth } = usePage().props as any;
    const [search, setSearch] = useState(filters.search || '');
    const [selectedTab, setSelectedTab] = useState(filters.status || 'all');
    const [approvalsData, setApprovalsData] = useState<DokumenApproval[]>(approvals.data);
    const [statsData, setStatsData] = useState<Stats>(stats);
    const [updatedApprovalIds, setUpdatedApprovalIds] = useState<Set<number>>(new Set());

    // Bulk selection state
    const [selectedApprovalIds, setSelectedApprovalIds] = useState<number[]>([]);
    const [isBulkApproveModalOpen, setIsBulkApproveModalOpen] = useState(false);
    const [bulkComment, setBulkComment] = useState('');
    const [bulkSignatureType, setBulkSignatureType] = useState<'signature' | 'qr_code'>('signature');
    const [bulkSignatureData, setBulkSignatureData] = useState<string | null>(null);
    const [showBulkSignaturePad, setShowBulkSignaturePad] = useState(false);
    const [bulkShowSignature, setBulkShowSignature] = useState(true);
    const [bulkShowDate, setBulkShowDate] = useState(true);
    const [bulkShowJabatan, setBulkShowJabatan] = useState(true);
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

    // Quick Preview state
    const [quickPreviewUrl, setQuickPreviewUrl] = useState<string | null>(null);
    const [quickPreviewTitle, setQuickPreviewTitle] = useState<string>('');
    const [isQuickPreviewOpen, setIsQuickPreviewOpen] = useState(false);

    useEffect(() => {
        setApprovalsData(approvals.data);
        setStatsData(stats);
        setSelectedApprovalIds([]);
    }, [approvals.data, stats]);

    // Real-time listener
    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo && auth.user?.id) {
            const userApprovalChannelName = `user.${auth.user.id}.approvals`;
            const userChannel = window.Echo.channel(userApprovalChannelName);

            if (window.Echo.connector?.pusher) {
                const pusherChannel = window.Echo.connector.pusher.subscribe(userApprovalChannelName);
                pusherChannel.bind('approval.created', (event: any) => {
                    if (event.approval) {
                        setApprovalsData((prev) => {
                            if (prev.some((a) => a.id === event.approval.id)) return prev;
                            return [event.approval, ...prev];
                        });
                        setStatsData((prev) => ({ ...prev, pending: prev.pending + 1 }));
                        showToast.success(`🆕 Dokumen baru "${event.approval.dokumen?.judul_dokumen}" perlu persetujuan Anda!`);
                    }
                });
            }

            return () => {
                window.Echo.leave(userApprovalChannelName);
            };
        }
    }, [auth.user?.id]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('approvals.index'), { search, status: selectedTab !== 'all' ? selectedTab : undefined }, { preserveState: true });
    };

    const handleTabChange = (value: string) => {
        setSelectedTab(value);
        setSelectedApprovalIds([]);
        router.get(route('approvals.index'), { status: value !== 'all' ? value : undefined, search }, { preserveState: true });
    };

    const handleViewDetail = (approvalId: number) => {
        router.visit(route('approvals.show', approvalId));
    };

    const openQuickPreview = (approval: DokumenApproval) => {
        const docId = approval.dokumen.id;
        const versionId = approval.dokumen.latest_version?.id;
        const url = versionId
            ? `/api/dokumen/${docId}/signed-pdf/${versionId}`
            : `/api/dokumen/${docId}/signed-pdf`;

        setQuickPreviewUrl(url);
        setQuickPreviewTitle(approval.dokumen.judul_dokumen);
        setIsQuickPreviewOpen(true);
    };

    const pendingApprovals = approvalsData.filter((a) => a.approval_status === 'pending');
    const isAllPendingSelected =
        pendingApprovals.length > 0 &&
        pendingApprovals.every((a) => selectedApprovalIds.includes(a.id));

    const toggleSelectAll = () => {
        if (isAllPendingSelected) {
            setSelectedApprovalIds([]);
        } else {
            setSelectedApprovalIds(pendingApprovals.map((a) => a.id));
        }
    };

    const toggleSelectApproval = (id: number) => {
        setSelectedApprovalIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleBulkApproveSubmit = () => {
        if (bulkSignatureType === 'signature' && !bulkSignatureData) {
            showToast.error('Silakan buat tanda tangan digital terlebih dahulu.');
            return;
        }

        setIsSubmittingBulk(true);
        router.post(
            route('approvals.bulk-approve'),
            {
                approval_ids: selectedApprovalIds,
                comment: bulkComment,
                signature: bulkSignatureData,
                signature_type: bulkSignatureType,
                show_signature: bulkShowSignature,
                show_date: bulkShowDate,
                show_jabatan: bulkShowJabatan,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showToast.success(`Berhasil menyetujui ${selectedApprovalIds.length} dokumen!`);
                    setIsBulkApproveModalOpen(false);
                    setSelectedApprovalIds([]);
                    setBulkSignatureData(null);
                    setBulkComment('');
                },
                onError: (errors) => {
                    showToast.error(errors.error || 'Gagal melakukan persetujuan massal.');
                },
                onFinish: () => {
                    setIsSubmittingBulk(false);
                },
            }
        );
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; className: string; icon: any }> = {
            pending: {
                label: 'Menunggu',
                className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: IconClock,
            },
            approved: {
                label: 'Disetujui',
                className: 'bg-green-100 text-green-800 border-green-300',
                icon: IconCheck,
            },
            rejected: {
                label: 'Ditolak',
                className: 'bg-red-100 text-red-800 border-red-300',
                icon: IconX,
            },
        };

        const { label, className, icon: Icon } = config[status] || config.pending;

        return (
            <Badge variant="outline" className={`font-sans ${className}`}>
                <Icon className="mr-1 h-3 w-3" />
                {label}
            </Badge>
        );
    };

    const isOverdue = (deadline: string | undefined) => {
        if (!deadline) return false;
        return new Date(deadline) < new Date();
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
                        <div className="@container/main flex flex-1 flex-col gap-6 p-6">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h1 className="font-serif text-3xl font-bold">Approval Dokumen</h1>
                                    <p className="font-sans text-muted-foreground text-sm">
                                        Kelola persetujuan dokumen yang memerlukan tindakan Anda
                                    </p>
                                </div>

                                {selectedApprovalIds.length > 0 && (
                                    <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 p-2.5 px-4 rounded-xl shadow-sm animate-in fade-in">
                                        <span className="text-sm font-semibold text-primary">
                                            {selectedApprovalIds.length} Dokumen Dipilih
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={() => setIsBulkApproveModalOpen(true)}
                                            className="bg-primary hover:bg-primary/90 text-white gap-1.5 shadow-sm"
                                        >
                                            <IconCheck className="h-4 w-4" />
                                            Setujui Semua yang Dipilih
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Stats Cards */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card className="border-border bg-card">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="font-sans text-sm font-medium text-muted-foreground">Menunggu</p>
                                                <p className="font-sans text-2xl font-bold text-foreground">{statsData.pending}</p>
                                            </div>
                                            <IconClock className="h-8 w-8 text-yellow-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-border bg-card">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="font-sans text-sm font-medium text-muted-foreground">Disetujui</p>
                                                <p className="font-sans text-2xl font-bold text-foreground">{statsData.approved}</p>
                                            </div>
                                            <IconCheck className="h-8 w-8 text-green-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-border bg-card">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="font-sans text-sm font-medium text-muted-foreground">Ditolak</p>
                                                <p className="font-sans text-2xl font-bold text-foreground">{statsData.rejected}</p>
                                            </div>
                                            <IconX className="h-8 w-8 text-red-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-border bg-card">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="font-sans text-sm font-medium text-muted-foreground">Terlambat</p>
                                                <p className="font-sans text-2xl font-bold text-foreground">{statsData.overdue}</p>
                                            </div>
                                            <IconAlertCircle className="h-8 w-8 text-orange-500" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Search and Filter */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-serif">Daftar Approval</CardTitle>
                                    <CardDescription className="font-sans">Dokumen yang memerlukan persetujuan Anda</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Search */}
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <IconSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                placeholder="Cari berdasarkan judul dokumen atau nomor dokumen..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="pl-10 font-sans"
                                            />
                                        </div>
                                        <Button type="submit" className="font-sans">
                                            Cari
                                        </Button>
                                    </form>

                                    {/* Tabs */}
                                    <Tabs value={selectedTab} onValueChange={handleTabChange}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <TabsList>
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

                                            {/* Select All Checkbox (Only for pending) */}
                                            {pendingApprovals.length > 0 && (
                                                <button
                                                    onClick={toggleSelectAll}
                                                    type="button"
                                                    className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-primary transition cursor-pointer self-start sm:self-auto"
                                                >
                                                    {isAllPendingSelected ? (
                                                        <CheckSquare className="h-4 w-4 text-primary" />
                                                    ) : (
                                                        <Square className="h-4 w-4 text-slate-400" />
                                                    )}
                                                    Pilih Semua Dokumen Menunggu ({pendingApprovals.length})
                                                </button>
                                            )}
                                        </div>

                                        <TabsContent value={selectedTab} className="mt-6 space-y-4">
                                            {approvalsData.length === 0 ? (
                                                <div className="py-12 text-center">
                                                    <IconFileText className="mx-auto h-12 w-12 text-muted-foreground" />
                                                    <h3 className="mt-4 font-serif text-lg font-semibold">Tidak ada dokumen</h3>
                                                    <p className="mt-2 font-sans text-sm text-muted-foreground">
                                                        Belum ada dokumen yang perlu di-approve pada kategori ini.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {approvalsData.map((approval) => {
                                                        const isPending = approval.approval_status === 'pending';
                                                        const isSelected = selectedApprovalIds.includes(approval.id);

                                                        return (
                                                            <Card
                                                                key={approval.id}
                                                                className={`transition-all duration-300 hover:shadow-md ${
                                                                    isSelected
                                                                        ? 'border-primary ring-1 ring-primary bg-primary/5'
                                                                        : updatedApprovalIds.has(approval.id)
                                                                          ? 'bg-green-50 shadow-md'
                                                                          : ''
                                                                }`}
                                                            >
                                                                <CardContent className="p-4">
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <div className="flex items-start gap-3 flex-1">
                                                                            {/* Selection Checkbox */}
                                                                            {isPending && (
                                                                                <div className="pt-1">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => toggleSelectApproval(approval.id)}
                                                                                        className="cursor-pointer text-slate-400 hover:text-primary focus:outline-none"
                                                                                    >
                                                                                        {isSelected ? (
                                                                                            <CheckSquare className="h-5 w-5 text-primary" />
                                                                                        ) : (
                                                                                            <Square className="h-5 w-5 text-slate-300" />
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                                                <IconFileText className="h-5 w-5 text-primary" />
                                                                            </div>

                                                                            <div className="flex-1 space-y-1">
                                                                                <h3 className="font-serif font-semibold text-base text-foreground">
                                                                                    {approval.dokumen.judul_dokumen}
                                                                                </h3>
                                                                                <p className="font-mono text-xs text-muted-foreground">
                                                                                    {approval.dokumen.nomor_dokumen}
                                                                                </p>

                                                                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                                                                                    <div className="flex items-center gap-1">
                                                                                        <IconUser className="h-3.5 w-3.5" />
                                                                                        <span className="font-sans">
                                                                                            {approval.dokumen.user?.name || '-'}
                                                                                        </span>
                                                                                    </div>

                                                                                    <div className="flex items-center gap-1">
                                                                                        <IconCalendar className="h-3.5 w-3.5" />
                                                                                        <span className="font-sans">
                                                                                            {formatDate(approval.dokumen.tgl_pengajuan)}
                                                                                        </span>
                                                                                    </div>

                                                                                    {approval.masterflow_step && (
                                                                                        <Badge variant="outline" className="font-sans text-[11px]">
                                                                                            Tahap {approval.masterflow_step.step_order}:{' '}
                                                                                            {approval.masterflow_step.step_name}
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>

                                                                                {approval.tgl_deadline && (
                                                                                    <div
                                                                                        className={`flex items-center gap-1 font-sans text-xs pt-1 ${
                                                                                            isOverdue(approval.tgl_deadline)
                                                                                                ? 'text-red-600 font-semibold'
                                                                                                : 'text-muted-foreground'
                                                                                        }`}
                                                                                    >
                                                                                        <IconClock className="h-3.5 w-3.5" />
                                                                                        <span>Deadline: {formatDate(approval.tgl_deadline)}</span>
                                                                                        {isOverdue(approval.tgl_deadline) && (
                                                                                            <Badge
                                                                                                variant="outline"
                                                                                                className="border-red-300 bg-red-50 text-red-700 text-[10px]"
                                                                                            >
                                                                                                Terlambat
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex shrink-0 flex-col items-end gap-2.5">
                                                                            {getStatusBadge(approval.approval_status)}

                                                                            <div className="flex items-center gap-1.5">
                                                                                {/* Quick Preview Button */}
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => openQuickPreview(approval)}
                                                                                    className="font-sans text-xs gap-1 h-8"
                                                                                    title="Quick Preview Dokumen"
                                                                                >
                                                                                    <IconEye className="h-3.5 w-3.5 text-blue-600" />
                                                                                    Preview
                                                                                </Button>

                                                                                {/* Detail Button */}
                                                                                <Button
                                                                                    size="sm"
                                                                                    onClick={() => handleViewDetail(approval.id)}
                                                                                    className="font-sans text-xs h-8"
                                                                                >
                                                                                    Detail
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        );
                                                    })}
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

                    {/* Quick Preview Modal */}
                    <Dialog open={isQuickPreviewOpen} onOpenChange={setIsQuickPreviewOpen}>
                        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                            <DialogHeader className="p-4 border-b shrink-0">
                                <DialogTitle className="font-serif flex items-center gap-2">
                                    <IconFileText className="h-5 w-5 text-primary" />
                                    Quick Preview: {quickPreviewTitle}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Pratinjau langsung dokumen tanpa meninggalkan halaman.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-hidden p-4 bg-slate-100">
                                {quickPreviewUrl && (
                                    <PDFViewer
                                        fileUrl={quickPreviewUrl}
                                        fileName={quickPreviewTitle}
                                        showControls={true}
                                        height="100%"
                                    />
                                )}
                            </div>

                            <DialogFooter className="p-4 border-t shrink-0">
                                <Button variant="outline" onClick={() => setIsQuickPreviewOpen(false)}>
                                    Tutup Preview
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Bulk Approve Confirmation & Signing Modal */}
                    <Dialog open={isBulkApproveModalOpen} onOpenChange={setIsBulkApproveModalOpen}>
                        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
                            <DialogHeader className="p-5 border-b shrink-0">
                                <DialogTitle className="font-serif text-lg flex items-center gap-2">
                                    <IconCheck className="h-5 w-5 text-primary" />
                                    Persetujuan Massal ({selectedApprovalIds.length} Dokumen)
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Anda akan menyetujui seluruh dokumen yang dipilih sekaligus dengan tanda tangan digital berikut.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {/* Type Selection: Signature vs QR Code */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Pilihan Format Tanda Tangan
                                    </Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div
                                            onClick={() => setBulkSignatureType('signature')}
                                            className={`p-3.5 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                                                bulkSignatureType === 'signature'
                                                    ? 'border-primary bg-primary/5 text-primary font-semibold'
                                                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                            }`}
                                        >
                                            <IconPencil className="h-5 w-5" />
                                            <div>
                                                <div className="text-sm">Tanda Tangan</div>
                                                <div className="text-[10px] text-muted-foreground font-normal">Goresan tangan digital</div>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setBulkSignatureType('qr_code')}
                                            className={`p-3.5 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                                                bulkSignatureType === 'qr_code'
                                                    ? 'border-primary bg-primary/5 text-primary font-semibold'
                                                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                            }`}
                                        >
                                            <QrCode className="h-5 w-5" />
                                            <div>
                                                <div className="text-sm">QR Code Digital</div>
                                                <div className="text-[10px] text-muted-foreground font-normal">Stempel QR verifikasi portal</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Signature Pad / QR Preview */}
                                {bulkSignatureType === 'signature' ? (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Tanda Tangan Anda
                                        </Label>
                                        {!bulkSignatureData && !showBulkSignaturePad ? (
                                            <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 bg-slate-50">
                                                <IconPencil className="h-8 w-8 text-slate-400 mx-auto" />
                                                <p className="text-xs text-muted-foreground">Belum ada tanda tangan</p>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setShowBulkSignaturePad(true)}
                                                >
                                                    Buat Tanda Tangan
                                                </Button>
                                            </div>
                                        ) : bulkSignatureData ? (
                                            <div className="border rounded-xl p-4 bg-white space-y-3">
                                                <div className="flex justify-center border rounded p-2 bg-slate-50">
                                                    <img src={bulkSignatureData} alt="Signature" className="h-20 object-contain" />
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-xs"
                                                    onClick={() => {
                                                        setBulkSignatureData(null);
                                                        setShowBulkSignaturePad(true);
                                                    }}
                                                >
                                                    Ganti Tanda Tangan
                                                </Button>
                                            </div>
                                        ) : (
                                            <SignaturePad
                                                onSignatureComplete={(sig) => {
                                                    setBulkSignatureData(sig);
                                                    setShowBulkSignaturePad(false);
                                                }}
                                                onCancel={() => setShowBulkSignaturePad(false)}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center gap-3.5">
                                        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                                            <QrCode className="h-6 w-6" />
                                        </div>
                                        <div className="text-xs text-emerald-900">
                                            <div className="font-semibold">QR Code Verifikasi Portal Aktif</div>
                                            <p className="text-emerald-700 mt-0.5">
                                                Setiap dokumen yang disetujui akan dibubuhi QR Code resmi yang langsung terhubung ke portal verifikasi dokumen publik.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Stamp Display Options */}
                                <div className="space-y-2 border rounded-xl p-4 bg-slate-50/60">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Opsi Tampilan Informasi Stampel
                                    </Label>
                                    <div className="space-y-2 pt-1 text-xs">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={bulkShowSignature}
                                                onChange={(e) => setBulkShowSignature(e.target.checked)}
                                                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                            />
                                            <span>Tampilkan Tanda Tangan / QR Code</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={bulkShowJabatan}
                                                onChange={(e) => setBulkShowJabatan(e.target.checked)}
                                                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                            />
                                            <span>Tampilkan Nama & Jabatan Approver (Otomatis)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={bulkShowDate}
                                                onChange={(e) => setBulkShowDate(e.target.checked)}
                                                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                            />
                                            <span>Tampilkan Tanggal & Waktu Persetujuan</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Comment Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="bulkComment" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Komentar / Catatan Persetujuan (Opsional)
                                    </Label>
                                    <Textarea
                                        id="bulkComment"
                                        placeholder="Tambahkan catatan persetujuan untuk seluruh dokumen ini..."
                                        value={bulkComment}
                                        onChange={(e) => setBulkComment(e.target.value)}
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="p-4 border-t shrink-0 flex items-center justify-between">
                                <Button variant="outline" onClick={() => setIsBulkApproveModalOpen(false)}>
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleBulkApproveSubmit}
                                    disabled={
                                        isSubmittingBulk ||
                                        (bulkSignatureType === 'signature' && !bulkSignatureData)
                                    }
                                    className="bg-primary hover:bg-primary/90 text-white gap-1.5"
                                >
                                    {isSubmittingBulk ? 'Memproses...' : `Setujui ${selectedApprovalIds.length} Dokumen`}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
