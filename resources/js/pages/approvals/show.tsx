import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import PDFViewer from '@/components/pdf-viewer';
import SignaturePad from '@/components/signature-pad';
import { SiteHeader } from '@/components/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import { Head, router, useForm } from '@inertiajs/react';
import {
    IconAlertCircle,
    IconCalendar,
    IconCheck,
    IconClock,
    IconDownload,
    IconEye,
    IconFileText,
    IconPencil,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import { CheckCircle2Icon, XCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    profile?: {
        jabatan?: string;
    };
}

interface DokumenVersion {
    id: number;
    version: string;
    nama_file: string;
    tgl_upload: string;
    tipe_file: string;
    file_url: string;
    signed_file_url?: string;
    size_file: number;
}

interface Masterflow {
    id: number;
    name: string;
    description?: string;
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

interface Dokumen {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    status: string;
    tgl_pengajuan: string;
    tgl_deadline?: string;
    deskripsi?: string;
    user?: User;
    masterflow?: Masterflow;
    versions?: DokumenVersion[];
    revision_logs?: RevisionLog[];
}

interface RevisionLog {
    id: number;
    dokumen_version_id: number;
    action: string;
    notes?: string;
    user?: User;
    created_at: string;
}

interface DokumenApproval {
    id: number;
    dokumen_id: number;
    user_id: number;
    approval_status: string;
    tgl_deadline?: string;
    tgl_approve?: string;
    alasan_reject?: string;
    comment?: string;
    signature_path?: string;
    signature_url?: string;
    created_at: string;
    dokumen: Dokumen;
    masterflow_step?: MasterflowStep;
    dokumen_version?: DokumenVersion;
    user?: User;
    group_index?: string | null;
    jenis_group?: string | null;
}

interface Props {
    approval: DokumenApproval;
    allApprovals: DokumenApproval[];
    canApprove: boolean;
}

export default function ApproverShow({ approval, allApprovals, canApprove }: Props) {
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);

    const approveForm = useForm({
        comment: '',
        signature: '',
    });

    const rejectForm = useForm({
        alasan_reject: '',
        comment: '',
    });

    // Real-time updates - Listen to dokumen-specific channel
    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo && approval?.dokumen?.id) {
            console.log('📡 Setting up real-time listener for dokumen:', approval.dokumen.id);

            const channelName = `dokumen.${approval.dokumen.id}`;
            const channel = window.Echo.channel(channelName);

            // Listen for dokumen updates
            channel.listen('dokumen.updated', (event: any) => {
                console.log('📡 Real-time dokumen update received on approval page:', event);

                // Reload the page to get fresh approval data
                router.visit(window.location.href, { preserveScroll: true });

                // Show toast notification
                if (event.dokumen?.judul_dokumen) {
                    showToast.success(`📡 Dokumen "${event.dokumen.judul_dokumen}" telah diupdate!`);
                }
            });

            // Monitor subscription
            channel.subscribed(() => {
                console.log('✅ Successfully subscribed to channel:', channelName);
            });

            channel.error((error: any) => {
                console.error('❌ Channel subscription error:', error);
            });

            console.log('📻 Subscribed to channel:', channelName);

            // Cleanup
            return () => {
                console.log('🔌 Leaving channel:', channelName);
                window.Echo.leave(channelName);
            };
        } else {
            if (!window.Echo) {
                console.error('❌ window.Echo not initialized! Check app.tsx');
            }
        }
    }, [approval?.dokumen?.id]);

    // State for preview
    const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
    const [previewFileName, setPreviewFileName] = useState<string>('');
    const [previewVersionId, setPreviewVersionId] = useState<number | null>(null);

    // Handle signature complete
    const handleSignatureComplete = (signature: string) => {
        setSignatureData(signature);
        approveForm.setData('signature', signature);
        setShowSignaturePad(false);
        showToast.success('✅ Tanda tangan berhasil ditambahkan!');
    };

    // Handle approve
    const handleApprove = () => {
        if (!signatureData) {
            showToast.error('❌ Silakan tanda tangani dokumen terlebih dahulu');
            return;
        }

        console.log('Submitting approval with signature:', {
            signatureLength: signatureData.length,
            signaturePreview: signatureData.substring(0, 50) + '...',
            hasComment: !!approveForm.data.comment,
        });

        // Set signature to form data
        approveForm.data.signature = signatureData;

        approveForm.post(route('approvals.approve', approval.id), {
            preserveScroll: true,
            onSuccess: () => {
                showToast.success('✅ Dokumen berhasil disetujui!');
                setIsPreviewDialogOpen(false);
                setSignatureData(null);
                setShowSignaturePad(false);
            },
            onError: (errors: any) => {
                console.error('Approval error:', errors);
                const errorMessage = errors.error || errors.signature || errors.message || 'Gagal menyetujui dokumen';
                showToast.error(`❌ ${errorMessage}`);
            },
        });
    };

    // Handle reject
    const handleReject = () => {
        rejectForm.post(route('approvals.reject', approval.id), {
            preserveScroll: true,
            onSuccess: () => {
                showToast.success('✅ Dokumen berhasil ditolak!');
                setIsRejectDialogOpen(false);
            },
            onError: () => {
                showToast.error('❌ Gagal menolak dokumen.');
            },
        });
    };

    // Handle download - uses on-demand signature generation
    const handleDownload = () => {
        if (approval.dokumen_version) {
            window.location.href = `/api/dokumen/${approval.dokumen.id}/download/${approval.dokumen_version.id}`;
        }
    };

    // Handle preview
    const handlePreview = (version?: DokumenVersion) => {
        const targetVersion = version || approval.dokumen_version;
        if (!targetVersion) return;

        const fileType = targetVersion.tipe_file.toLowerCase();
        if (fileType === 'pdf' || fileType === 'application/pdf') {
            // Use streaming endpoint for on-demand signature rendering
            const url = `/api/dokumen/${approval.dokumen.id}/signed-pdf/${targetVersion.id}`;
            setPreviewFileUrl(url);
            setPreviewFileName(targetVersion.nama_file);
            setPreviewVersionId(targetVersion.id);
            setIsPreviewDialogOpen(true);
        } else {
            showToast.error('❌ Preview hanya tersedia untuk file PDF.');
        }
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

    // Format date with time (for timeline)
    const formatDateTime = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timeStr = date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        return `${dateStr}, ${timeStr} WIB`;
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    // Get status badge
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
            skipped: {
                label: 'Disetujui',
                className: 'bg-green-100 text-green-800 border-green-300',
                icon: IconCheck,
            },
            rejected: {
                label: 'Ditolak',
                className: 'bg-red-100 text-red-800 border-red-300',
                icon: IconX,
            },
            waiting: {
                label: 'Menunggu Giliran',
                className: 'bg-gray-100 text-gray-800 border-gray-300',
                icon: IconClock,
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

    // Check if overdue
    const isOverdue = approval.tgl_deadline && new Date(approval.tgl_deadline) < new Date();

    // Use signed PDF if available, otherwise use original
    // const fileUrl = approval.dokumen_version ? `/storage/${approval.dokumen_version.signed_file_url || approval.dokumen_version.file_url}` : '';

    // Sort approvals by step order
    const sortedApprovals = [...(allApprovals || [])].sort((a, b) => {
        if (a.masterflow_step && b.masterflow_step) {
            return a.masterflow_step.step_order - b.masterflow_step.step_order;
        }
        return 0;
    });

    // Group approvals logic - handles non-consecutive group members
    type TimelineItem =
        | { type: 'single'; data: DokumenApproval }
        | { type: 'group'; data: DokumenApproval[]; groupIndex: string; groupType: string; firstStepOrder: number };

    const groupedApprovalsMap: Record<string, { approvals: DokumenApproval[]; firstStepOrder: number; groupType: string }> = {};
    const singleApprovals: { approval: DokumenApproval; stepOrder: number }[] = [];

    sortedApprovals.forEach((app) => {
        const stepOrder = app.masterflow_step?.step_order ?? 0;

        if (app.group_index) {
            if (!groupedApprovalsMap[app.group_index]) {
                groupedApprovalsMap[app.group_index] = {
                    approvals: [],
                    firstStepOrder: stepOrder,
                    groupType: app.jenis_group || 'parallel',
                };
            }
            groupedApprovalsMap[app.group_index].approvals.push(app);
            if (stepOrder < groupedApprovalsMap[app.group_index].firstStepOrder) {
                groupedApprovalsMap[app.group_index].firstStepOrder = stepOrder;
            }
        } else {
            singleApprovals.push({ approval: app, stepOrder });
        }
    });

    // Build timeline items
    const allItems: { item: TimelineItem; stepOrder: number }[] = [];

    Object.entries(groupedApprovalsMap).forEach(([groupIndex, groupData]) => {
        allItems.push({
            item: {
                type: 'group',
                data: groupData.approvals,
                groupIndex,
                groupType: groupData.groupType,
                firstStepOrder: groupData.firstStepOrder,
            },
            stepOrder: groupData.firstStepOrder,
        });
    });

    singleApprovals.forEach(({ approval: app, stepOrder }) => {
        allItems.push({
            item: { type: 'single', data: app },
            stepOrder,
        });
    });

    allItems.sort((a, b) => a.stepOrder - b.stepOrder);
    const timelineItems: TimelineItem[] = allItems.map(({ item }) => item);

    const getGroupRequirementText = (type: string) => {
        switch (type) {
            case 'any_one':
                return 'Salah Satu Setuju';
            case 'all_required':
                return 'Semua Harus Setuju';
            case 'majority':
                return 'Mayoritas Setuju';
            default:
                return 'Harus Setuju';
        }
    };

    return (
        <>
            <Head title={`Approval - ${approval.dokumen.judul_dokumen}`} />
            <SidebarProvider>
                <NotificationListener />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />

                    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                        {/* Header Section */}
                        <div className="flex flex-col gap-3">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                                    <Button
                                        variant="link"
                                        className="h-auto p-0 text-xs text-muted-foreground sm:text-sm"
                                        onClick={() => router.visit(route('approvals.index'))}
                                    >
                                        Approval Saya
                                    </Button>
                                    <span>/</span>
                                    <span>Detail</span>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                    <h1 className="font-serif text-2xl leading-tight font-bold tracking-tight text-foreground sm:text-3xl">
                                        {approval.dokumen.judul_dokumen}
                                    </h1>
                                    <div className="shrink-0">{getStatusBadge(approval.approval_status)}</div>
                                </div>
                                <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4 sm:text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <IconFileText className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                                        <span className="truncate font-mono">{approval.dokumen.nomor_dokumen}</span>
                                    </div>
                                    <span className="hidden sm:inline">•</span>
                                    <div className="flex items-center gap-1.5">
                                        <IconCalendar className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                                        <span>Pengajuan: {formatDate(approval.dokumen.tgl_pengajuan)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deadline Alert */}
                        {isOverdue && approval.approval_status === 'pending' && (
                            <Card className="border-red-200 bg-red-50">
                                <CardContent className="flex items-center gap-3 p-4">
                                    <IconAlertCircle className="h-5 w-5 text-red-600" />
                                    <div>
                                        <p className="font-sans font-semibold text-red-900">Deadline Terlewat!</p>
                                        <p className="font-sans text-sm text-red-700">
                                            Approval ini melewati deadline pada {formatDate(approval.tgl_deadline)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* LEFT COLUMN - Main Content */}
                            <div className="space-y-6 lg:col-span-2">
                                {/* Document Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-serif text-lg">Informasi Dokumen</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid gap-6 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Pengaju</Label>
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback className="text-[10px]">
                                                            {approval.dokumen.user?.name?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span>{approval.dokumen.user?.name || '-'}</span>
                                                </div>
                                                {approval.dokumen.user?.profile?.jabatan && (
                                                    <p className="pl-8 text-xs text-muted-foreground">{approval.dokumen.user.profile.jabatan}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                                    Deadline Approval
                                                </Label>
                                                <div className="font-medium">
                                                    {approval.tgl_deadline ? (
                                                        <span className={isOverdue ? 'font-bold text-red-600' : ''}>
                                                            {formatDate(approval.tgl_deadline)}
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {approval.dokumen.deskripsi && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                                    Deskripsi
                                                </Label>
                                                <div className="rounded-md bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
                                                    {approval.dokumen.deskripsi}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* File Info & Preview */}
                                {approval.dokumen_version && (
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="font-serif text-lg">File Dokumen</CardTitle>
                                                {approval.dokumen_version.signed_file_url && (
                                                    <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                                                        <IconCheck className="mr-1 h-3 w-3" />
                                                        Sudah Ditandatangani
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-col gap-4 rounded-lg border bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex min-w-0 items-center gap-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                                        <IconFileText className="h-6 w-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p
                                                            className="truncate font-medium text-foreground"
                                                            title={approval.dokumen_version.nama_file}
                                                        >
                                                            {approval.dokumen_version.nama_file}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                            <span className="font-mono">v{approval.dokumen_version.version}</span>
                                                            <span>•</span>
                                                            <span>{approval.dokumen_version.tipe_file.toUpperCase()}</span>
                                                            <span>•</span>
                                                            <span>{formatFileSize(approval.dokumen_version.size_file)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 justify-end gap-2">
                                                    {(approval.dokumen_version.tipe_file.toLowerCase() === 'pdf' ||
                                                        approval.dokumen_version.tipe_file.toLowerCase() === 'application/pdf') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handlePreview(approval.dokumen_version)}
                                                            title="Preview"
                                                        >
                                                            <IconEye className="h-5 w-5" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
                                                        <IconDownload className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Version History */}
                                {approval.dokumen.versions && approval.dokumen.versions.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="font-serif text-lg">Riwayat Versi</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="divide-y rounded-md border">
                                                {approval.dokumen.versions
                                                    .sort((a: any, b: any) => new Date(b.tgl_upload).getTime() - new Date(a.tgl_upload).getTime())
                                                    .map((version: any, index: number) => {
                                                        const isLatest = index === 0;
                                                        const rejectionLog = approval.dokumen.revision_logs?.find(
                                                            (l: any) => l.dokumen_version_id === version.id && l.action === 'rejected',
                                                        );

                                                        return (
                                                            <div
                                                                key={version.id}
                                                                className={`flex flex-col gap-2 p-4 ${isLatest ? 'bg-blue-50/30' : 'hover:bg-muted/30'}`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <div
                                                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                                                                                isLatest
                                                                                    ? 'border-blue-200 bg-blue-100 text-blue-700'
                                                                                    : rejectionLog
                                                                                      ? 'border-red-200 bg-red-100 text-red-700'
                                                                                      : 'bg-background text-muted-foreground'
                                                                            }`}
                                                                        >
                                                                            <IconFileText className="h-5 w-5" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-medium">Versi {version.version}</span>
                                                                                {isLatest && (
                                                                                    <Badge
                                                                                        variant="secondary"
                                                                                        className="bg-blue-100 text-blue-700 hover:bg-blue-100"
                                                                                    >
                                                                                        Latest
                                                                                    </Badge>
                                                                                )}
                                                                                {rejectionLog && (
                                                                                    <Badge
                                                                                        variant="destructive"
                                                                                        className="border-red-200 bg-red-100 text-red-700 hover:bg-red-200"
                                                                                    >
                                                                                        Rejected
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                <span>{version.nama_file}</span>
                                                                                <span>•</span>
                                                                                <span>{formatFileSize(version.size_file)}</span>
                                                                                <span>•</span>
                                                                                <span>{formatDate(version.tgl_upload)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        {(version.tipe_file.toLowerCase() === 'pdf' ||
                                                                            version.tipe_file.toLowerCase() === 'application/pdf') && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => handlePreview(version)}
                                                                            >
                                                                                <IconEye className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() =>
                                                                                (window.location.href = `/dokumen/${approval.dokumen.id}/download/${version.id}`)
                                                                            }
                                                                        >
                                                                            <IconDownload className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* Rejection Reason */}
                                                                {rejectionLog && (
                                                                    <div className="ml-14 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                                                                        <div className="mb-1 flex items-center gap-1.5 font-semibold text-red-900">
                                                                            <XCircleIcon className="h-3.5 w-3.5" />
                                                                            <span>Ditolak oleh {rejectionLog.user?.name || 'Unknown'}</span>
                                                                        </div>
                                                                        <p className="leading-relaxed">{rejectionLog.notes}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Approval Timeline */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-serif text-lg">Timeline Persetujuan</CardTitle>
                                        <CardDescription>Proses approval untuk dokumen ini</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="relative space-y-0 pl-2">
                                            {timelineItems.map((item, index) => {
                                                const isLast = index === timelineItems.length - 1;

                                                if (item.type === 'single') {
                                                    const app = item.data;
                                                    const isCompleted = app.approval_status === 'approved' || app.approval_status === 'skipped';
                                                    const isRejected = app.approval_status === 'rejected';
                                                    const isPending = app.approval_status === 'pending';

                                                    return (
                                                        <div key={app.id} className="relative flex gap-4 pb-8 last:pb-0">
                                                            {!isLast && (
                                                                <div className="absolute top-8 bottom-0 left-[15px] -ml-px w-0.5 bg-border" />
                                                            )}

                                                            <div
                                                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ${
                                                                    isCompleted
                                                                        ? 'border-green-600 text-green-600'
                                                                        : isRejected
                                                                          ? 'border-red-600 text-red-600'
                                                                          : isPending
                                                                            ? 'border-yellow-500 text-yellow-500'
                                                                            : 'border-muted text-muted-foreground'
                                                                }`}
                                                            >
                                                                {isCompleted ? (
                                                                    <CheckCircle2Icon className="h-4 w-4" />
                                                                ) : isRejected ? (
                                                                    <XCircleIcon className="h-4 w-4" />
                                                                ) : (
                                                                    <span className="text-xs font-bold">{index + 1}</span>
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                                                                <div className="flex min-w-0 items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <div className="truncate font-sans text-sm font-semibold sm:text-base">
                                                                            {app.masterflow_step?.step_name || 'Custom Approver'}
                                                                        </div>
                                                                        <div className="truncate text-xs font-medium text-foreground sm:text-sm">
                                                                            {app.user?.name || app.user?.email || '-'}
                                                                        </div>
                                                                        {app.masterflow_step?.jabatan && (
                                                                            <div className="text-[10px] text-muted-foreground sm:text-xs">
                                                                                {app.masterflow_step.jabatan.name}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="shrink-0">{getStatusBadge(app.approval_status)}</div>
                                                                </div>

                                                                {app.tgl_approve && (
                                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
                                                                        <IconClock className="h-3 w-3 shrink-0" />
                                                                        <span>
                                                                            {isCompleted ? 'Disetujui' : 'Ditolak'} pada{' '}
                                                                            {formatDateTime(app.tgl_approve)}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {(app.comment || app.alasan_reject) && (
                                                                    <div
                                                                        className={`mt-2 rounded-md border p-3 text-sm ${isRejected ? 'border-red-200 bg-red-50 text-red-900' : 'border-border bg-muted/30'}`}
                                                                    >
                                                                        {app.alasan_reject && (
                                                                            <div className="mb-1">
                                                                                <span className="font-semibold text-red-700">Alasan Penolakan:</span>{' '}
                                                                                {app.alasan_reject}
                                                                            </div>
                                                                        )}
                                                                        {app.comment && (
                                                                            <div>
                                                                                <span className="font-medium">Komentar:</span> {app.comment}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {app.id === approval.id && (
                                                                    <div className="mt-2">
                                                                        <Badge variant="outline" className="border-primary text-[10px] text-primary">
                                                                            Posisi Anda
                                                                        </Badge>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    // GROUP RENDERING
                                                    const group = item;
                                                    const allApproved = group.data.every(
                                                        (a) => a.approval_status === 'approved' || a.approval_status === 'skipped',
                                                    );
                                                    const anyRejected = group.data.some((a) => a.approval_status === 'rejected');
                                                    const oneApproved = group.data.some((a) => a.approval_status === 'approved');
                                                    const isGroupApproved = group.groupType === 'any_one' ? oneApproved : allApproved;

                                                    const statusColor = isGroupApproved
                                                        ? 'border-green-600 text-green-600'
                                                        : anyRejected
                                                          ? 'border-red-600 text-red-600'
                                                          : 'border-yellow-500 text-yellow-500';

                                                    return (
                                                        <div key={`group-${group.groupIndex}`} className="relative flex gap-4 pb-8 last:pb-0">
                                                            {!isLast && (
                                                                <div className="absolute top-8 bottom-0 left-[15px] -ml-px w-0.5 bg-border" />
                                                            )}

                                                            <div
                                                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ${statusColor}`}
                                                            >
                                                                <IconUsers className="h-4 w-4" />
                                                            </div>

                                                            <div className="flex-1 pt-1">
                                                                <div className="mb-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                                                    <div className="flex items-center justify-between border-b bg-muted/20 p-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-semibold">
                                                                                {group.data[0]?.masterflow_step?.step_name || 'Group Approval'}
                                                                            </span>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="h-5 px-1.5 text-[10px] tracking-wide uppercase"
                                                                            >
                                                                                {getGroupRequirementText(group.groupType)}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                    <div className="divide-y p-0">
                                                                        {group.data.map((app) => {
                                                                            // Check if this member should show as auto-skipped
                                                                            const isAnyOneGroup = group.groupType === 'any_one';
                                                                            const someoneElseApproved = group.data.some(
                                                                                (a) => a.id !== app.id && a.approval_status === 'approved',
                                                                            );
                                                                            const isAutoSkipped =
                                                                                isAnyOneGroup &&
                                                                                someoneElseApproved &&
                                                                                app.approval_status === 'pending';

                                                                            // Check if this member is skipped (either from DB or auto-calculated)
                                                                            const isSkipped = app.approval_status === 'skipped' || isAutoSkipped;

                                                                            return (
                                                                                <div
                                                                                    key={app.id}
                                                                                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between"
                                                                                >
                                                                                    <div className="space-y-1">
                                                                                        <div className="text-sm font-medium">
                                                                                            {app.user?.name ||
                                                                                                app.masterflow_step?.jabatan?.name ||
                                                                                                'Unknown'}
                                                                                        </div>
                                                                                        <div className="text-xs text-muted-foreground">
                                                                                            {app.masterflow_step?.jabatan?.name}
                                                                                        </div>
                                                                                        {isSkipped && (
                                                                                            <div className="text-[10px] text-muted-foreground italic">
                                                                                                *Otomatis di-skip karena grup sudah menyelesaikan
                                                                                                approval.
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end gap-2">
                                                                                        {getStatusBadge(app.approval_status)}
                                                                                        {app.tgl_approve && (
                                                                                            <span className="text-[10px] text-muted-foreground">
                                                                                                {formatDateTime(app.tgl_approve)}
                                                                                            </span>
                                                                                        )}
                                                                                        {app.id === approval.id && (
                                                                                            <Badge
                                                                                                variant="outline"
                                                                                                className="border-primary text-[10px] text-primary"
                                                                                            >
                                                                                                Posisi Anda
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* RIGHT COLUMN - Sidebar Actions */}
                            <div className="space-y-6">
                                {/* Action Card */}
                                {canApprove && approval.approval_status === 'pending' ? (
                                    <Card className="border-primary shadow-md">
                                        <CardHeader className="bg-primary/5 pb-3">
                                            <CardTitle className="flex items-center gap-2 text-base font-bold text-primary sm:text-lg">
                                                <IconPencil className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                                                Tindakan Diperlukan
                                            </CardTitle>
                                            <CardDescription className="text-xs sm:text-sm">Dokumen ini menunggu persetujuan Anda.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pt-6">
                                            <Button onClick={() => handlePreview()} className="w-full bg-primary hover:bg-primary/90">
                                                <IconCheck className="mr-2 h-4 w-4" />
                                                Setujui Dokumen
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsRejectDialogOpen(true)}
                                                className="w-full border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                            >
                                                <IconX className="mr-2 h-4 w-4" />
                                                Tolak Dokumen
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card
                                        className={`border shadow-sm ${
                                            approval.approval_status === 'approved'
                                                ? 'border-green-200 bg-green-50/50'
                                                : approval.approval_status === 'rejected'
                                                  ? 'border-red-200 bg-red-50/50'
                                                  : approval.approval_status === 'waiting' || (approval.approval_status === 'pending' && !canApprove)
                                                    ? 'border-yellow-200 bg-yellow-50/50'
                                                    : 'border-dashed bg-muted/30'
                                        }`}
                                    >
                                        <CardHeader className="pb-3">
                                            <CardTitle
                                                className={`flex items-center gap-2 text-base font-bold ${
                                                    approval.approval_status === 'approved'
                                                        ? 'text-green-700'
                                                        : approval.approval_status === 'rejected'
                                                          ? 'text-red-700'
                                                          : approval.approval_status === 'waiting' ||
                                                              (approval.approval_status === 'pending' && !canApprove)
                                                            ? 'text-yellow-700'
                                                            : 'text-muted-foreground'
                                                }`}
                                            >
                                                {approval.approval_status === 'approved' ? (
                                                    <IconCheck className="h-5 w-5" />
                                                ) : approval.approval_status === 'rejected' ? (
                                                    <IconX className="h-5 w-5" />
                                                ) : approval.approval_status === 'waiting' ||
                                                  (approval.approval_status === 'pending' && !canApprove) ? (
                                                    <IconClock className="h-5 w-5" />
                                                ) : (
                                                    <IconAlertCircle className="h-5 w-5" />
                                                )}
                                                Status Anda
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-col items-start gap-1">
                                                {approval.approval_status === 'approved' && (
                                                    <>
                                                        <p className="font-semibold text-green-900">Disetujui</p>
                                                        <p className="text-sm text-green-700">
                                                            Anda telah menyetujui dokumen ini pada {formatDate(approval.tgl_approve)}
                                                        </p>
                                                    </>
                                                )}
                                                {approval.approval_status === 'rejected' && (
                                                    <>
                                                        <p className="font-semibold text-red-900">Ditolak</p>
                                                        <p className="text-sm text-red-700">
                                                            Anda menolak dokumen ini pada {formatDate(approval.tgl_approve)}
                                                        </p>
                                                    </>
                                                )}
                                                {(approval.approval_status === 'waiting' ||
                                                    (approval.approval_status === 'pending' && !canApprove)) && (
                                                    <>
                                                        <p className="font-semibold text-yellow-900">Menunggu Giliran</p>
                                                        <p className="text-sm text-yellow-700">
                                                            Anda belum dapat melakukan persetujuan karena tahap sebelumnya belum selesai.
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Helper Info */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">Bantuan</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-xs text-muted-foreground">
                                        <p>• Preview dokumen untuk membaca isi lengkap sebelum menyetujui.</p>
                                        <p>• Anda wajib membubuhkan tanda tangan digital saat menyetujui.</p>
                                        <p>• Jika menolak, Anda wajib menyertakan alasan penolakan.</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Reject Dialog */}
                    <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Tolak Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Silakan berikan alasan penolakan dokumen "{approval.dokumen.judul_dokumen}"
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="alasan_reject" className="font-sans">
                                        Alasan Penolakan <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="alasan_reject"
                                        placeholder="Jelaskan alasan penolakan dokumen..."
                                        value={rejectForm.data.alasan_reject}
                                        onChange={(e) => rejectForm.setData('alasan_reject', e.target.value)}
                                        className="font-sans"
                                        rows={4}
                                        required
                                    />
                                    {rejectForm.errors.alasan_reject && (
                                        <p className="font-sans text-sm text-red-600">{rejectForm.errors.alasan_reject}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reject_comment" className="font-sans">
                                        Komentar Tambahan (Opsional)
                                    </Label>
                                    <Textarea
                                        id="reject_comment"
                                        placeholder="Tambahkan komentar jika diperlukan..."
                                        value={rejectForm.data.comment}
                                        onChange={(e) => rejectForm.setData('comment', e.target.value)}
                                        className="font-sans"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsRejectDialogOpen(false)} className="font-sans">
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={rejectForm.processing || !rejectForm.data.alasan_reject}
                                    className="border-red-300 bg-red-600 font-sans hover:bg-red-700"
                                >
                                    {rejectForm.processing ? 'Memproses...' : 'Tolak Dokumen'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* PDF Preview Dialog with Signature */}
                    <Dialog
                        open={isPreviewDialogOpen}
                        onOpenChange={(open) => {
                            setIsPreviewDialogOpen(open);
                            if (!open) {
                                setShowSignaturePad(false);
                                setSignatureData(null);
                            }
                        }}
                    >
                        <DialogContent className="flex h-[90vh] max-w-[90vw] flex-col p-0">
                            <DialogHeader className="shrink-0 border-b p-4">
                                <div className="space-y-1">
                                    <DialogTitle className="font-serif">Preview Dokumen</DialogTitle>
                                    <DialogDescription className="font-sans">
                                        {previewFileName || approval.dokumen_version?.nama_file}
                                    </DialogDescription>
                                    {/* Show status info */}
                                    {approval.approval_status !== 'pending' && (
                                        <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-700">
                                            Dokumen ini sudah {approval.approval_status === 'approved' ? 'disetujui' : 'ditolak'}.
                                        </div>
                                    )}
                                    {!canApprove && approval.approval_status === 'pending' && (
                                        <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-700">
                                            Approval ini bukan untuk Anda atau sedang menunggu giliran.
                                        </div>
                                    )}
                                </div>
                            </DialogHeader>

                            <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
                                {/* PDF Preview - Left Side */}
                                <div
                                    className={`${
                                        canApprove && approval.approval_status === 'pending' ? 'min-h-[300px] flex-1 lg:h-auto' : 'w-full'
                                    } overflow-auto rounded-lg border`}
                                >
                                    {previewFileUrl && (
                                        <PDFViewer
                                            fileUrl={previewFileUrl}
                                            fileName={previewFileName || 'document.pdf'}
                                            showControls={true}
                                            height="100%"
                                        />
                                    )}
                                </div>

                                {/* Signature Panel - Right Side - Only show for pending approvals that user can approve AND viewing current version */}
                                {canApprove &&
                                    approval.approval_status === 'pending' &&
                                    (previewVersionId === approval.dokumen_version?.id || !previewVersionId) && (
                                        <div className="w-full shrink-0 space-y-4 overflow-auto rounded-lg border bg-muted/20 p-4 lg:w-[400px]">
                                            <div>
                                                <h3 className="font-serif text-lg font-semibold">Tanda Tangan Persetujuan</h3>
                                                <p className="font-sans text-sm text-muted-foreground">Tanda tangani dokumen untuk menyetujuinya</p>
                                            </div>

                                            <Separator />

                                            {!showSignaturePad && !signatureData ? (
                                                <div className="space-y-3">
                                                    <Card className="border-dashed">
                                                        <CardContent className="flex flex-col items-center justify-center py-8">
                                                            <IconPencil className="h-12 w-12 text-muted-foreground" />
                                                            <p className="mt-2 text-center font-sans text-sm text-muted-foreground">
                                                                Belum ada tanda tangan
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                    <Button
                                                        type="button"
                                                        onClick={() => setShowSignaturePad(true)}
                                                        className="w-full font-sans"
                                                        variant="outline"
                                                    >
                                                        <IconPencil className="mr-2 h-4 w-4" />
                                                        Tambah Tanda Tangan
                                                    </Button>
                                                </div>
                                            ) : signatureData ? (
                                                <div className="space-y-3">
                                                    <Card>
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center justify-center rounded border bg-white p-4">
                                                                <img
                                                                    src={signatureData}
                                                                    alt="Signature"
                                                                    className="max-h-24 max-w-full object-contain"
                                                                />
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSignatureData(null);
                                                                setShowSignaturePad(true);
                                                            }}
                                                            className="flex-1 font-sans"
                                                        >
                                                            Ganti
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSignatureData(null);
                                                                approveForm.setData('signature', '');
                                                            }}
                                                            className="font-sans text-red-600 hover:bg-red-50"
                                                        >
                                                            <IconX className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <SignaturePad
                                                    onSignatureComplete={handleSignatureComplete}
                                                    onCancel={() => setShowSignaturePad(false)}
                                                />
                                            )}

                                            {signatureData && (
                                                <>
                                                    <Separator />

                                                    <div className="space-y-3">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="preview-comment" className="font-sans">
                                                                Komentar (Opsional)
                                                            </Label>
                                                            <Textarea
                                                                id="preview-comment"
                                                                placeholder="Tambahkan komentar jika diperlukan..."
                                                                value={approveForm.data.comment}
                                                                onChange={(e) => approveForm.setData('comment', e.target.value)}
                                                                className="font-sans"
                                                                rows={3}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Button
                                                                type="button"
                                                                onClick={handleApprove}
                                                                disabled={approveForm.processing}
                                                                className="w-full font-sans"
                                                            >
                                                                <IconCheck className="mr-2 h-4 w-4" />
                                                                {approveForm.processing ? 'Memproses...' : 'Setujui Dokumen'}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => setIsPreviewDialogOpen(false)}
                                                                className="w-full font-sans"
                                                                disabled={approveForm.processing}
                                                            >
                                                                Batal
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
