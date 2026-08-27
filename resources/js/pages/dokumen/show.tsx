import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import PDFViewer from '@/components/pdf-viewer';
import RevisionHistory from '@/components/revision-history';
import { SiteHeader } from '@/components/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Head, router, usePage } from '@inertiajs/react';
import {
    IconDownload,
    IconEdit,
    IconEye,
    IconEyeOff,
    IconFileText,
    IconInfoCircle,
    IconPencil,
    IconPlus,
    IconPrinter,
    IconRefresh,
    IconSend,
    IconTrash,
    IconUsers,
} from '@tabler/icons-react';
import { AlertCircleIcon, CalendarIcon, CheckCircle2, CheckCircle2Icon, ClockIcon, FileTextIcon, XCircleIcon } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface MasterflowStep {
    id: number;
    step_order: number;
    step_name: string;
    jabatan_id: number;
    jabatan?: {
        id: number;
        name: string;
    };
    group_index?: string | null;
    jenis_group?: string | null;
}

interface Masterflow {
    id: number;
    name: string;
    description?: string;
    steps?: MasterflowStep[];
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
    status: string;
}

interface DokumenApproval {
    id: number;
    dokumen_id: number;
    user_id?: number;
    approver_email?: string;
    approval_order?: number;
    masterflow_step_id?: number;
    approval_status: string;
    group_index?: string | null;
    jenis_group?: string | null;
    tgl_approve?: string;
    tgl_deadline?: string;
    alasan_reject?: string;
    comment?: string;
    user?: User;
    masterflow_step?: MasterflowStep;
}

interface NextApprover {
    id: number;
    user?: User;
    approver_email?: string;
    step_name?: string;
    jabatan_name?: string;
    approval_order?: number;
    group_index?: string | null;
    jenis_group?: string | null;
    tgl_deadline?: string;
}

interface DetailedStatus {
    status: string;
    status_current: string;
    is_fully_approved: boolean;
    is_rejected: boolean;
    next_approvers: NextApprover[];
    current_step_description: string | null;
    approval_progress: number;
}

interface Dokumen {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    tipe_dokumen?: string | null;
    nominal?: number | string | null;
    user_id: number;
    company_id?: number;
    aplikasi_id?: number;
    masterflow_id?: number;
    status: string;
    tgl_pengajuan: string;
    tgl_deadline?: string;
    deskripsi?: string;
    status_current: string;
    user?: User;
    masterflow?: Masterflow;
    versions?: DokumenVersion[];
    approvals?: DokumenApproval[];
    detailed_status?: DetailedStatus;
    created_at: string;
    updated_at: string;
}

interface CustomApprover {
    email: string;
    order: number;
}

interface FormData {
    nomor_dokumen: string;
    judul_dokumen: string;
    masterflow_id: number | '' | 'custom';
    tgl_pengajuan: string;
    tgl_deadline: string;
    deskripsi: string;
    file: File | null;
    approvers: Record<number, number | ''>;
    custom_approvers: CustomApprover[];
}

export default function DokumenDetail({ dokumen: initialDokumen }: { dokumen: Dokumen }) {
    const pageProps = usePage().props as any;
    const auth = pageProps.auth;

    const [dokumen, setDokumen] = useState<Dokumen>(initialDokumen);
    const [isNominalMasked, setIsNominalMasked] = useState(true);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);

    // State Modal Keputusan Approver
    const [isApprovalActionOpen, setIsApprovalActionOpen] = useState(false);
    const [approvalActionType, setApprovalActionType] = useState<'approved' | 'revision_requested' | 'rejected'>('approved');
    const [approvalComment, setApprovalComment] = useState('');
    const [approvalReason, setApprovalReason] = useState('');
    const [isProcessingApproval, setIsProcessingApproval] = useState(false);

    const [previewMode, setPreviewMode] = useState<'signed' | 'original'>('signed');
    const [selectedPreviewVersion, setSelectedPreviewVersion] = useState<DokumenVersion | null>(null);
    const [previewFileUrl, setPreviewFileUrl] = useState<string>('');
    const [previewFileName, setPreviewFileName] = useState<string>('');

    const [revisionFile, setRevisionFile] = useState<File | null>(null);
    const [revisionComment, setRevisionComment] = useState('');
    const [isUploadingRevision, setIsUploadingRevision] = useState(false);

    const [masterflows, setMasterflows] = useState<Masterflow[]>([]);
    const [selectedMasterflow, setSelectedMasterflow] = useState<Masterflow | null>(null);
    const [availableApprovers, setAvailableApprovers] = useState<Record<number, any[]>>({});

    const [formData, setFormData] = useState<FormData>({
        nomor_dokumen: initialDokumen?.nomor_dokumen || '',
        judul_dokumen: initialDokumen?.judul_dokumen || '',
        masterflow_id: initialDokumen?.masterflow_id || '',
        tgl_pengajuan: initialDokumen?.tgl_pengajuan || '',
        tgl_deadline: initialDokumen?.tgl_deadline || '',
        deskripsi: initialDokumen?.deskripsi || '',
        file: null,
        approvers: {},
        custom_approvers: [],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const fetchDokumen = useCallback(async () => {
        if (!dokumen?.id) return null;
        try {
            const response = await api.get(`/dokumen/${dokumen.id}`);
            const docData = response.data?.dokumen || response.data;
            if (docData && docData.id) {
                setDokumen(docData);
                return docData;
            }
        } catch (error) {
            console.error('Error fetching dokumen:', error);
        }
        return null;
    }, [dokumen?.id]);

    const fetchMasterflows = useCallback(async () => {
        try {
            const response = await api.get('/masterflows');
            setMasterflows(response.data.masterflows || response.data || []);
        } catch (error) {
            console.error('Error fetching masterflows:', error);
        }
    }, []);

    useEffect(() => {
        fetchMasterflows();

        if (typeof window !== 'undefined' && (window as any).Echo && dokumen?.id) {
            const channelName = `dokumen.${dokumen.id}`;
            const channel = (window as any).Echo.channel(channelName);

            channel.listen('dokumen.updated', () => {
                fetchDokumen();
                showToast.success('📡 Dokumen telah diperbarui secara real-time!');
            });

            return () => {
                (window as any).Echo.leave(channelName);
            };
        }
    }, [dokumen?.id, fetchDokumen, fetchMasterflows]);

    if (!initialDokumen || !initialDokumen.id) {
        return (
            <>
                <Head title="Dokumen Not Found" />
                <SidebarProvider>
                    <NotificationListener />
                    <AppSidebar variant="inset" />
                    <SidebarInset>
                        <SiteHeader />
                        <div className="flex flex-1 flex-col items-center justify-center p-6">
                            <div className="space-y-3 text-center">
                                <h1 className="font-serif text-2xl font-bold">Dokumen Tidak Ditemukan</h1>
                                <p className="font-sans text-sm text-muted-foreground">
                                    Data dokumen tidak tersedia, mungkin telah dihapus atau Anda tidak memiliki akses.
                                </p>
                                <Button className="mt-2 font-sans" onClick={() => router.visit('/dokumen')}>
                                    Kembali ke Daftar Dokumen
                                </Button>
                            </div>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </>
        );
    }

    const formatNominalDisplay = (nominalVal: number | string | null | undefined) => {
        if (!nominalVal || Number(nominalVal) === 0) return null;
        const num = Number(nominalVal);
        if (isNominalMasked) {
            return 'Rp *.***.***';
        }
        return `Rp ${num.toLocaleString('id-ID')}`;
    };

    const getApprovalProgress = () => {
        if (!dokumen?.approvals || dokumen.approvals.length === 0) {
            return { percentage: 0, approved: 0, total: 0, pending: 0, rejected: 0 };
        }

        const total = dokumen.approvals.length;
        const approved = dokumen.approvals.filter((a) => a.approval_status === 'approved' || a.approval_status === 'skipped').length;
        const pending = dokumen.approvals.filter((a) => a.approval_status === 'pending').length;
        const rejected = dokumen.approvals.filter((a) => a.approval_status === 'rejected').length;
        const percentage = (approved / total) * 100;

        return { percentage, approved, total, pending, rejected };
    };

    const progress = getApprovalProgress();
    const isCustomApproval = !dokumen?.masterflow_id;
    const isSuperAdmin = pageProps.context?.is_super_admin || auth?.user?.userAuths?.some((ua: any) => ua.role?.role_name === 'Super Admin') || false;

    const activePendingApproval = (() => {
        if (['approved', 'rejected'].includes(dokumen?.status)) return null;
        if (!dokumen?.approvals || dokumen.approvals.length === 0) return null;

        const directApproval = dokumen.approvals.find(
            (a) =>
                a.approval_status === 'pending' &&
                (a.user_id === auth?.user?.id || (a.approver_email && a.approver_email.toLowerCase() === auth?.user?.email?.toLowerCase()))
        );
        if (directApproval) return directApproval;

        if (isSuperAdmin) {
            return dokumen.approvals.find((a) => a.approval_status === 'pending') || null;
        }

        return null;
    })();

    const handleOpenApprovalModal = (type: 'approved' | 'revision_requested' | 'rejected') => {
        setApprovalActionType(type);
        setApprovalComment('');
        setApprovalReason('');
        setIsApprovalActionOpen(true);
    };

    const handleConfirmApprovalAction = async () => {
        if (!activePendingApproval) return;

        if (approvalActionType === 'rejected' && !approvalReason.trim()) {
            showToast.error('❌ Alasan penolakan wajib diisi!');
            return;
        }

        if (approvalActionType === 'revision_requested' && !approvalComment.trim()) {
            showToast.error('❌ Catatan revisi wajib diisi!');
            return;
        }

        setIsProcessingApproval(true);

        try {
            await api.post(`/approvals/${activePendingApproval.id}/process`, {
                status: approvalActionType,
                comment: approvalComment,
                alasan_reject: approvalReason,
            });

            showToast.success(
                approvalActionType === 'approved'
                    ? '🎉 Dokumen berhasil disetujui!'
                    : approvalActionType === 'revision_requested'
                        ? '🔄 Permintaan revisi berhasil dikirim!'
                        : '❌ Dokumen telah ditolak.'
            );

            setIsApprovalActionOpen(false);
            fetchDokumen();
        } catch (error: any) {
            console.error('Approval process error:', error);
            showToast.error(`❌ Gagal memproses tindakan: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsProcessingApproval(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
            draft: { label: 'Draft', icon: FileTextIcon, className: 'bg-gray-100 text-gray-800 border-gray-300' },
            pending: { label: 'Pending', icon: ClockIcon, className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
            submitted: { label: 'Submitted', icon: CheckCircle2Icon, className: 'bg-blue-100 text-blue-800 border-blue-300' },
            under_review: { label: 'Under Review', icon: AlertCircleIcon, className: 'bg-orange-100 text-orange-800 border-orange-300' },
            approved: { label: 'Approved', icon: CheckCircle2Icon, className: 'bg-green-100 text-green-800 border-green-300' },
            rejected: { label: 'Rejected', icon: XCircleIcon, className: 'bg-red-100 text-red-800 border-red-300' },
            revision_requested: { label: 'Perlu Revisi', icon: AlertCircleIcon, className: 'bg-orange-100 text-orange-800 border-orange-300' },
            needs_revision: { label: 'Perlu Revisi', icon: AlertCircleIcon, className: 'bg-orange-100 text-orange-800 border-orange-300' },
        };

        const config = statusConfig[status] || statusConfig.draft;
        const IconComponent = config.icon;

        return (
            <Badge variant="outline" className={`font-sans ${config.className}`}>
                <IconComponent className="mr-1 h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const getHeaderStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="border border-emerald-300 bg-emerald-100 px-3 py-1 font-sans text-xs font-medium text-emerald-800">
                        ✓ Disetujui Sepenuhnya
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="border border-red-300 bg-red-100 px-3 py-1 font-sans text-xs font-medium text-red-800">
                        ✕ Ditolak
                    </Badge>
                );
            case 'revision_requested':
            case 'needs_revision':
                return (
                    <Badge className="border border-amber-300 bg-amber-100 px-3 py-1 font-sans text-xs font-medium text-amber-800">
                        🔄 Membutuhkan Revisi Berkas
                    </Badge>
                );
            case 'pending':
            case 'submitted':
            case 'under_review':
                return (
                    <Badge className="border border-yellow-300 bg-yellow-100 px-3 py-1 font-sans text-xs font-medium text-yellow-800">
                        ⏳ Menunggu Persetujuan
                    </Badge>
                );
            default:
                return (
                    <Badge className="border border-gray-300 bg-gray-100 px-3 py-1 font-sans text-xs font-medium text-gray-800">
                        📄 Draft
                    </Badge>
                );
        }
    };

    const getApprovalStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            pending: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
            approved: { label: 'Disetujui', className: 'bg-green-100 text-green-800 border-green-300' },
            skipped: { label: 'Dilewati', className: 'bg-blue-100 text-blue-800 border-blue-300' },
            rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-800 border-red-300' },
            waiting: { label: 'Menunggu Giliran', className: 'bg-gray-100 text-gray-800 border-gray-300' },
        };

        const config = statusConfig[status] || statusConfig.pending;
        return (
            <Badge variant="outline" className={`font-sans ${config.className}`}>
                {config.label}
            </Badge>
        );
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return '-';
        }
    };

    const fetchApproversForMasterflow = async (masterflowId: number) => {
        try {
            const response = await api.get(`/masterflows/${masterflowId}/steps`);
            const flowSteps = response.data.steps || [];

            const matchedFlow = masterflows.find((mf) => mf.id === masterflowId) || dokumen.masterflow;
            const masterflowWithSteps = {
                ...matchedFlow,
                steps: flowSteps,
            };
            setSelectedMasterflow(masterflowWithSteps as Masterflow);

            const approversData: Record<number, any[]> = {};
            for (const step of flowSteps) {
                if (step.jabatan_id) {
                    try {
                        const usersResponse = await api.get(`/users-by-jabatan/${step.jabatan_id}`);
                        approversData[step.id] = usersResponse.data || [];
                    } catch (error) {
                        console.error(`Error fetching users for jabatan ${step.jabatan_id}:`, error);
                        approversData[step.id] = [];
                    }
                }
            }
            setAvailableApprovers(approversData);

            if (dokumen.approvals) {
                const existingApprovers: Record<number, number> = {};
                dokumen.approvals.forEach((approval) => {
                    if (approval.masterflow_step_id && approval.user_id) {
                        existingApprovers[approval.masterflow_step_id] = approval.user_id;
                    }
                });
                setFormData((prev) => ({
                    ...prev,
                    approvers: existingApprovers,
                }));
            }
        } catch (error) {
            console.error('Error fetching approvers:', error);
        }
    };

    const handleMasterflowSelectChange = (value: string) => {
        if (value === 'custom') {
            setFormData((prev) => ({
                ...prev,
                masterflow_id: 'custom',
                approvers: {},
                custom_approvers: prev.custom_approvers.length > 0 ? prev.custom_approvers : [{ email: '', order: 1 }],
            }));
            setSelectedMasterflow(null);
        } else if (value) {
            const mId = Number(value);
            setFormData((prev) => ({
                ...prev,
                masterflow_id: mId,
                custom_approvers: [],
            }));
            fetchApproversForMasterflow(mId);
        } else {
            setFormData((prev) => ({
                ...prev,
                masterflow_id: '',
                approvers: {},
                custom_approvers: [],
            }));
            setSelectedMasterflow(null);
        }
    };

    const handleApproverSelectChange = (stepId: number, userId: string) => {
        setFormData((prev) => ({
            ...prev,
            approvers: {
                ...prev.approvers,
                [stepId]: userId ? Number(userId) : '',
            },
        }));
    };

    const handleAddCustomApprover = () => {
        setFormData((prev) => ({
            ...prev,
            custom_approvers: [
                ...prev.custom_approvers,
                { email: '', order: prev.custom_approvers.length + 1 },
            ],
        }));
    };

    const handleRemoveCustomApprover = (index: number) => {
        setFormData((prev) => {
            const updated = prev.custom_approvers.filter((_, i) => i !== index);
            const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
            return { ...prev, custom_approvers: reordered };
        });
    };

    const handleCustomApproverChange = (index: number, email: string) => {
        setFormData((prev) => {
            const updated = [...prev.custom_approvers];
            updated[index] = { ...updated[index], email };
            return { ...prev, custom_approvers: updated };
        });
    };

    const handleEdit = () => {
        if (!['draft', 'rejected', 'revision_requested', 'needs_revision'].includes(dokumen.status)) {
            showToast.error('❌ Hanya dokumen dengan status Draft, Ditolak, atau Perlu Revisi yang dapat diedit.');
            return;
        }

        const formattedDeadline = dokumen.tgl_deadline
            ? dokumen.tgl_deadline.includes('T')
                ? dokumen.tgl_deadline.split('T')[0]
                : dokumen.tgl_deadline
            : '';

        setFormData({
            nomor_dokumen: dokumen.nomor_dokumen,
            judul_dokumen: dokumen.judul_dokumen,
            masterflow_id: dokumen.masterflow_id || '',
            tgl_pengajuan: dokumen.tgl_pengajuan,
            tgl_deadline: formattedDeadline,
            deskripsi: dokumen.deskripsi || '',
            file: null,
            approvers: {},
            custom_approvers: [],
        });

        if (dokumen.masterflow_id) {
            fetchApproversForMasterflow(dokumen.masterflow_id);
        } else if (isCustomApproval && dokumen.approvals) {
            const customApprovers = dokumen.approvals.map((a) => ({
                email: a.approver_email || '',
                order: a.approval_order || 1,
            }));
            setFormData((prev) => ({
                ...prev,
                masterflow_id: 'custom',
                custom_approvers: customApprovers.length > 0 ? customApprovers : [{ email: '', order: 1 }],
            }));
        }

        setIsEditDialogOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: [] }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                showToast.error('❌ Format file harus PDF! Silakan pilih file berformat .pdf');
                e.target.value = '';
                return;
            }

            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                showToast.error('❌ Ukuran file maksimal 10MB!');
                e.target.value = '';
                return;
            }

            setFormData((prev) => ({ ...prev, file }));
            if (errors.file) {
                setErrors((prev) => ({ ...prev, file: [] }));
            }
        }
    };

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        try {
            const submitData = new FormData();
            submitData.append('_method', 'PUT');
            submitData.append('judul_dokumen', formData.judul_dokumen);
            submitData.append('deskripsi', formData.deskripsi || '');
            if (formData.tgl_deadline) {
                submitData.append('tgl_deadline', formData.tgl_deadline);
            }
            if (formData.file) {
                submitData.append('file', formData.file);
            }

            if (formData.masterflow_id === 'custom') {
                submitData.append('is_custom_approval', '1');
                submitData.append('custom_approvers', JSON.stringify(formData.custom_approvers));
            } else if (formData.masterflow_id) {
                submitData.append('masterflow_id', String(formData.masterflow_id));
                submitData.append('approvers', JSON.stringify(formData.approvers));
            }

            await api.post(`/dokumen/${dokumen.id}`, submitData);

            showToast.success('🎉 Informasi dokumen berhasil diperbarui!');
            setIsEditDialogOpen(false);
            fetchDokumen();
        } catch (error: any) {
            console.error('Form submission error:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                const firstKey = Object.keys(error.response.data.errors)[0];
                const firstVal = error.response.data.errors[firstKey];
                const errMsg = Array.isArray(firstVal) ? firstVal[0] : firstVal;
                showToast.error(`❌ Gagal memperbarui: ${errMsg}`);
            } else {
                const message = error.response?.data?.message || '❌ Gagal mengedit dokumen. Silakan periksa kembali isian form Anda.';
                showToast.error(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (dokumen.status !== 'draft') {
            showToast.error('❌ Hanya dokumen berstatus Draft yang dapat dihapus.');
            return;
        }
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/dokumen/${dokumen.id}`);
            showToast.success('🎉 Dokumen berhasil dihapus dari sistem!');
            router.visit('/dokumen');
        } catch (error: any) {
            if (error.response?.status === 404) {
                showToast.info('ℹ️ Dokumen sudah tidak ditemukan atau telah dihapus sebelumnya.');
                router.visit('/dokumen');
                return;
            }
            showToast.error(`❌ Gagal menghapus dokumen. ${error.response?.data?.message || error.message}`);
        }
    };

    const handlePreview = (version: DokumenVersion, mode: 'signed' | 'original' = 'signed') => {
        const fileType = version.tipe_file.toLowerCase();
        const isPDF = fileType === 'pdf' || fileType === 'application/pdf';

        if (!isPDF) {
            showToast.error('❌ Pratinjau berkas hanya tersedia untuk dokumen berformat PDF.');
            return;
        }

        const fileUrl =
            mode === 'original'
                ? `/api/dokumen/${dokumen.id}/signed-pdf/${version.id}?original=1`
                : `/api/dokumen/${dokumen.id}/signed-pdf/${version.id}`;

        setSelectedPreviewVersion(version);
        setPreviewMode(mode);
        setPreviewFileUrl(fileUrl);
        setPreviewFileName(version.nama_file);
        setIsPreviewDialogOpen(true);
    };

    const togglePreviewMode = (newMode: 'signed' | 'original') => {
        if (!selectedPreviewVersion) return;
        setPreviewMode(newMode);
        const fileUrl =
            newMode === 'original'
                ? `/api/dokumen/${dokumen.id}/signed-pdf/${selectedPreviewVersion.id}?original=1`
                : `/api/dokumen/${dokumen.id}/signed-pdf/${selectedPreviewVersion.id}`;
        setPreviewFileUrl(fileUrl);
    };

    const handleSubmitForApproval = () => {
        if (dokumen.status !== 'draft') {
            showToast.error('❌ Hanya dokumen berstatus Draft yang dapat disubmit untuk persetujuan.');
            return;
        }
        setIsSubmitDialogOpen(true);
    };

    const confirmSubmitForApproval = async () => {
        setIsSubmitting(true);
        try {
            await api.post(`/dokumen/${dokumen.id}/submit`);
            showToast.success('🎉 Dokumen berhasil disubmit ke alur approval!');
            setIsSubmitDialogOpen(false);
            fetchDokumen();
        } catch (error: any) {
            console.error('Submit error:', error);
            const message = error.response?.data?.message || error.message || 'Silakan coba beberapa saat lagi.';
            showToast.error(`❌ Gagal submit dokumen: ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUploadRevision = () => {
        if (!['rejected', 'revision_requested', 'needs_revision'].includes(dokumen.status)) {
            showToast.error('❌ Dokumen ini tidak sedang memerlukan revisi.');
            return;
        }

        if (dokumen.user_id !== auth?.user?.id) {
            showToast.error('❌ Hanya pembuat dokumen yang memiliki wewenang untuk mengunggah berkas revisi.');
            return;
        }

        setRevisionFile(null);
        setRevisionComment('');
        setIsRevisionDialogOpen(true);
    };

    const handleRevisionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                showToast.error('❌ Format file harus PDF! Silakan pilih file berformat .pdf');
                e.target.value = '';
                return;
            }

            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                showToast.error('❌ Ukuran file maksimal 10MB!');
                e.target.value = '';
                return;
            }
        }
        setRevisionFile(file);
    };

    const confirmUploadRevision = async () => {
        if (!revisionFile) {
            showToast.error('❌ Silakan pilih berkas PDF revisi terlebih dahulu.');
            return;
        }

        setIsUploadingRevision(true);

        try {
            const formDataObj = new FormData();
            formDataObj.append('file', revisionFile);
            if (revisionComment) {
                formDataObj.append('comment', revisionComment);
            }

            const response = await api.post(`/dokumen/${dokumen.id}/upload-revision`, formDataObj, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const message = response.data?.message || '🎉 Berkas revisi berhasil diunggah!';
            showToast.success(message);
            setIsRevisionDialogOpen(false);
            setRevisionFile(null);

            if (response.data?.dokumen) {
                setDokumen(response.data.dokumen);
            } else {
                await fetchDokumen();
            }
        } catch (error: any) {
            console.error('Upload revision error:', error);
            showToast.error(`❌ Gagal mengunggah berkas revisi: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsUploadingRevision(false);
        }
    };

    const handleDownload = (versionId?: number) => {
        const url = versionId ? `/api/dokumen/${dokumen.id}/download/${versionId}` : `/api/dokumen/${dokumen.id}/download`;
        window.location.href = url;
    };

    const handleDownloadOriginal = (versionId?: number) => {
        const url = versionId ? `/api/dokumen/${dokumen.id}/download/${versionId}?original=1` : `/api/dokumen/${dokumen.id}/download?original=1`;
        window.location.href = url;
    };

    const handlePrint = (version: DokumenVersion) => {
        const fileUrl = `/api/dokumen/${dokumen.id}/signed-pdf/${version.id}`;
        const printWindow = window.open(fileUrl, '_blank');
        if (printWindow) {
            printWindow.addEventListener('load', () => {
                printWindow.print();
            });
        }
    };

    const latestVersion = dokumen.versions && dokumen.versions.length > 0
        ? [...dokumen.versions].sort((a, b) => new Date(b.tgl_upload).getTime() - new Date(a.tgl_upload).getTime())[0]
        : null;

    const sortedApprovals = [...(dokumen.approvals || [])].sort((a, b) => {
        const orderA = a.approval_order ?? a.masterflow_step?.step_order ?? 0;
        const orderB = b.approval_order ?? b.masterflow_step?.step_order ?? 0;
        return orderA - orderB;
    });

    type TimelineItem =
        | { type: 'single'; data: DokumenApproval }
        | { type: 'group'; data: DokumenApproval[]; groupIndex: string; groupType: string; firstStepOrder: number };

    const groupedApprovalsMap: Record<string, { approvals: DokumenApproval[]; firstStepOrder: number; groupType: string }> = {};
    const singleApprovals: { approval: DokumenApproval; stepOrder: number }[] = [];

    sortedApprovals.forEach((approval) => {
        const stepOrder = approval.approval_order ?? approval.masterflow_step?.step_order ?? 0;

        if (approval.group_index) {
            if (!groupedApprovalsMap[approval.group_index]) {
                groupedApprovalsMap[approval.group_index] = {
                    approvals: [],
                    firstStepOrder: stepOrder,
                    groupType: approval.jenis_group || 'parallel',
                };
            }
            groupedApprovalsMap[approval.group_index].approvals.push(approval);
            if (stepOrder < groupedApprovalsMap[approval.group_index].firstStepOrder) {
                groupedApprovalsMap[approval.group_index].firstStepOrder = stepOrder;
            }
        } else {
            singleApprovals.push({ approval, stepOrder });
        }
    });

    const timelineItems: TimelineItem[] = [];
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

    singleApprovals.forEach(({ approval, stepOrder }) => {
        allItems.push({
            item: { type: 'single', data: approval },
            stepOrder,
        });
    });

    allItems.sort((a, b) => a.stepOrder - b.stepOrder);
    allItems.forEach(({ item }) => timelineItems.push(item));

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
            <Head title={dokumen?.judul_dokumen || 'Detail Dokumen'} />

            <SidebarProvider>
                <NotificationListener userId={auth?.user?.id} />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />

                    <div className="flex flex-1 flex-col gap-6 p-6">
                        {/* Header Section */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Button variant="link" className="h-auto p-0 text-muted-foreground" onClick={() => router.visit('/dokumen')}>
                                        Dokumen Saya
                                    </Button>
                                    <span>/</span>
                                    <span>Detail Dokumen</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">{dokumen?.judul_dokumen}</h1>
                                    {getStatusBadge(dokumen?.status || 'draft')}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <IconFileText className="h-4 w-4" />
                                        <span className="font-mono">{dokumen?.nomor_dokumen || '-'}</span>
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon className="h-4 w-4" />
                                        <span>Tanggal Pengajuan: {formatDate(dokumen?.tgl_pengajuan)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div>{getHeaderStatusBadge(dokumen?.status || 'draft')}</div>

                                <div className="hidden items-center gap-2 sm:flex">
                                    {activePendingApproval && (
                                        <Button
                                            onClick={() => handleOpenApprovalModal('approved')}
                                            className="bg-emerald-600 font-sans font-medium text-white shadow-sm hover:bg-emerald-700"
                                        >
                                            <CheckCircle2Icon className="mr-2 h-4 w-4" />
                                            Proses TTD & Approval
                                        </Button>
                                    )}
                                    {dokumen?.status === 'draft' && (
                                        <Button onClick={handleSubmitForApproval} className="bg-green-600 font-sans hover:bg-green-700">
                                            <IconSend className="mr-2 h-4 w-4" />
                                            Submit Approval
                                        </Button>
                                    )}
                                    {['rejected', 'revision_requested', 'needs_revision'].includes(dokumen?.status || '') &&
                                        dokumen?.user_id === auth?.user?.id && (
                                            <Button onClick={handleUploadRevision} className="bg-blue-600 font-sans hover:bg-blue-700">
                                                <IconFileText className="mr-2 h-4 w-4" />
                                                Upload Berkas Revisi
                                            </Button>
                                        )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* LEFT COLUMN */}
                            <div className="space-y-6 lg:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-serif text-lg">Informasi Utama Dokumen</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid gap-6 sm:grid-cols-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                    Tipe Dokumen
                                                </Label>
                                                <div className="font-medium">
                                                    {dokumen.tipe_dokumen === 'proposal' && '📊 Proposal'}
                                                    {dokumen.tipe_dokumen === 'pengadaan' && '📦 Pengadaan'}
                                                    {dokumen.tipe_dokumen === 'po' && '🛒 PO (Purchase Order)'}
                                                    {dokumen.tipe_dokumen === 'pr' && '📋 PR (Purchase Requisition)'}
                                                    {dokumen.tipe_dokumen === 'memo_internal' && '📝 Memo Internal'}
                                                    {!['proposal', 'pengadaan', 'po', 'pr', 'memo_internal'].includes(
                                                        dokumen.tipe_dokumen || ''
                                                    ) && (dokumen.tipe_dokumen || '-')}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                    Alur Persetujuan
                                                </Label>
                                                <div className="font-medium">
                                                    {isCustomApproval ? (
                                                        <span className="flex items-center gap-2 text-primary">
                                                            Custom Approval
                                                        </span>
                                                    ) : (
                                                        dokumen.masterflow?.name || '-'
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                    Batas Waktu (Deadline)
                                                </Label>
                                                <div className="font-medium">{dokumen.tgl_deadline ? formatDate(dokumen.tgl_deadline) : '-'}</div>
                                            </div>
                                            {['proposal', 'po', 'pr'].includes(dokumen.tipe_dokumen || '') &&
                                                dokumen.nominal &&
                                                Number(dokumen.nominal) > 0 && (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                                Nominal
                                                            </Label>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsNominalMasked(!isNominalMasked)}
                                                                className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 transition-colors hover:bg-blue-200"
                                                                title={isNominalMasked ? 'Buka Sensor Nominal' : 'Sensor Nominal'}
                                                            >
                                                                {isNominalMasked ? (
                                                                    <IconEyeOff className="h-3 w-3" />
                                                                ) : (
                                                                    <IconEye className="h-3 w-3" />
                                                                )}
                                                                <span>{isNominalMasked ? 'Buka' : 'Sensor'}</span>
                                                            </button>
                                                        </div>
                                                        <div className="font-mono font-semibold text-foreground">
                                                            {formatNominalDisplay(dokumen.nominal)}
                                                        </div>
                                                    </div>
                                                )}
                                        </div>

                                        {dokumen.deskripsi && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                    Deskripsi Tambahan / Catatan
                                                </Label>
                                                <div className="rounded-md bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
                                                    {dokumen.deskripsi}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Timeline */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-serif text-lg">Timeline & Alur Persetujuan</CardTitle>
                                        <CardDescription>Rincian alur persetujuan pejabat dan status tiap tahapan</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="relative space-y-0 pl-2">
                                            <div className="absolute top-2 bottom-6 left-6 w-0.5 bg-border" />

                                            {timelineItems.map((item, index) => {
                                                if (item.type === 'single') {
                                                    const approval = item.data;
                                                    const isSkipped = approval.approval_status === 'skipped';
                                                    const isCompleted = approval.approval_status === 'approved' || isSkipped;
                                                    const isRejected = approval.approval_status === 'rejected';
                                                    const isPending = approval.approval_status === 'pending';

                                                    return (
                                                        <div key={`approval-${approval.id}`} className="relative flex gap-4 pb-8 last:pb-0">
                                                            <div
                                                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ${isSkipped
                                                                    ? 'border-blue-500 text-blue-500'
                                                                    : isCompleted
                                                                        ? 'border-green-600 text-green-600'
                                                                        : isRejected
                                                                            ? 'border-red-600 text-red-600'
                                                                            : isPending
                                                                                ? 'border-yellow-500 text-yellow-500'
                                                                                : 'border-muted text-muted-foreground'
                                                                    }`}
                                                            >
                                                                {isCompleted && !isSkipped ? (
                                                                    <CheckCircle2Icon className="h-4 w-4" />
                                                                ) : isRejected ? (
                                                                    <XCircleIcon className="h-4 w-4" />
                                                                ) : (
                                                                    <span className="text-xs font-bold">{index + 1}</span>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 space-y-1.5 pt-1">
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div>
                                                                        <div className="font-medium">
                                                                            {isCustomApproval
                                                                                ? approval.approver_email || 'Unknown User'
                                                                                : approval.user?.name ||
                                                                                approval.masterflow_step?.jabatan?.name ||
                                                                                'Jabatan Tidak Terdefinisi'}
                                                                        </div>
                                                                        <div className="text-sm text-muted-foreground">
                                                                            {isCustomApproval
                                                                                ? `Urutan Ke-${approval.approval_order}`
                                                                                : approval.masterflow_step?.step_name || 'Tahap Approval'}
                                                                        </div>
                                                                    </div>
                                                                    {getApprovalStatusBadge(approval.approval_status)}
                                                                </div>

                                                                {(approval.comment || approval.alasan_reject) && !isSkipped && (
                                                                    <div className="mt-2 rounded-md bg-muted/40 p-3 text-sm">
                                                                        {approval.alasan_reject && (
                                                                            <div className="mb-1 font-medium text-red-600">
                                                                                Alasan Penolakan: {approval.alasan_reject}
                                                                            </div>
                                                                        )}
                                                                        {approval.comment && (
                                                                            <div className="italic text-muted-foreground">Catatan: "{approval.comment}"</div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {approval.tgl_approve && (
                                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <ClockIcon className="h-3 w-3" />
                                                                        <span>Disetujui pada {formatDate(approval.tgl_approve)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    const group = item;
                                                    const allApproved = group.data.every(
                                                        (a) => a.approval_status === 'approved' || a.approval_status === 'skipped'
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
                                                            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ${statusColor}`}>
                                                                <IconUsers className="h-4 w-4" />
                                                            </div>

                                                            <div className="flex-1 pt-1">
                                                                <div className="mb-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                                                    <div className="flex items-center justify-between border-b bg-muted/20 p-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-semibold">
                                                                                {group.data[0]?.masterflow_step?.step_name || 'Persetujuan Kelompok'}
                                                                            </span>
                                                                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase tracking-wide">
                                                                                {getGroupRequirementText(group.groupType)}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                    <div className="divide-y p-0">
                                                                        {group.data.map((approval) => {
                                                                            const isSkipped = approval.approval_status === 'skipped';

                                                                            return (
                                                                                <div key={`grp-approval-${approval.id}`} className="p-3">
                                                                                    <div className="flex items-start justify-between gap-4">
                                                                                        <div className="space-y-1">
                                                                                            <div className="text-sm font-medium">
                                                                                                {approval.user?.name || approval.masterflow_step?.jabatan?.name || 'Unknown'}
                                                                                            </div>
                                                                                            <div className="text-xs text-muted-foreground">
                                                                                                {approval.masterflow_step?.jabatan?.name}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex flex-col items-end gap-1">
                                                                                            {getApprovalStatusBadge(approval.approval_status)}
                                                                                            {approval.tgl_approve && (
                                                                                                <span className="text-[10px] text-muted-foreground">
                                                                                                    {formatDate(approval.tgl_approve)}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {isSkipped && (
                                                                                        <div className="mt-1 text-[10px] italic text-muted-foreground">
                                                                                            *Otomatis dilewati karena syarat grup sudah terpenuhi.
                                                                                        </div>
                                                                                    )}

                                                                                    {(approval.comment || approval.alasan_reject) && !isSkipped && (
                                                                                        <div className="mt-2 rounded bg-muted/40 p-2 text-xs">
                                                                                            {approval.alasan_reject && (
                                                                                                <div className="font-medium text-red-600">
                                                                                                    Alasan Penolakan: {approval.alasan_reject}
                                                                                                </div>
                                                                                            )}
                                                                                            {approval.comment && (
                                                                                                <div className="text-muted-foreground">
                                                                                                    Komentar: "{approval.comment}"
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
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

                                {/* Riwayat Versi Dokumen */}
                                {dokumen.versions && dokumen.versions.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="font-serif text-lg">Riwayat Versi Berkas</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="divide-y rounded-md border">
                                                {dokumen.versions
                                                    .sort((a, b) => new Date(b.tgl_upload).getTime() - new Date(a.tgl_upload).getTime())
                                                    .map((version, index) => {
                                                        const isLatest = index === 0;
                                                        return (
                                                            <div
                                                                key={`version-${version.id}`}
                                                                className={`flex items-center justify-between p-4 ${isLatest ? 'bg-blue-50/30' : 'hover:bg-muted/30'}`}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div
                                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${isLatest
                                                                            ? 'border-blue-200 bg-blue-100 text-blue-700'
                                                                            : 'bg-background text-muted-foreground'
                                                                            }`}
                                                                    >
                                                                        <IconFileText className="h-5 w-5" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium">Versi {version.version}</span>
                                                                            {isLatest && (
                                                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                                                    Terbaru
                                                                                </Badge>
                                                                            )}
                                                                            {version.signed_file_url && (
                                                                                <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-50">
                                                                                    <CheckCircle2 className="h-3 w-3" /> Digital Signed
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                            <span>{version.nama_file}</span>
                                                                            <span>•</span>
                                                                            <span>{formatFileSize(version.size_file)}</span>
                                                                            <span>•</span>
                                                                            <span>Diunggah pada {formatDate(version.tgl_upload)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    {(version.tipe_file.toLowerCase() === 'pdf' || version.tipe_file.toLowerCase() === 'application/pdf') && (
                                                                        <>
                                                                            <Button variant="ghost" size="icon" onClick={() => handlePreview(version)} title="Lihat">
                                                                                <IconEye className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button variant="ghost" size="icon" onClick={() => handlePrint(version)} title="Cetak Berkas">
                                                                                <IconPrinter className="h-4 w-4" />
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDownloadOriginal(version.id)}
                                                                        className="h-8 border-gray-300 font-sans text-xs hover:bg-gray-100"
                                                                    >
                                                                        <IconDownload className="mr-1 h-3.5 w-3.5 text-gray-600" />
                                                                        PDF Asli
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDownload(version.id)}
                                                                        className="h-8 border-blue-300 bg-blue-50/50 font-sans text-xs text-blue-700 hover:bg-blue-100"
                                                                    >
                                                                        <IconDownload className="mr-1 h-3.5 w-3.5 text-blue-600" />
                                                                        Signed PDF
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <RevisionHistory dokumenId={dokumen.id} />
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="space-y-6">
                                {dokumen?.detailed_status?.current_step_description &&
                                    !dokumen?.detailed_status?.is_fully_approved &&
                                    !dokumen?.detailed_status?.is_rejected && (
                                        <Card className="border-blue-200 bg-blue-50 shadow-sm">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="flex items-center gap-2 text-base text-blue-900">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200">
                                                        <ClockIcon className="h-3.5 w-3.5 text-blue-700" />
                                                    </div>
                                                    Status Saat Ini
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <p className="text-sm font-medium leading-relaxed text-blue-800">
                                                    {dokumen.detailed_status.current_step_description}
                                                </p>

                                                {dokumen.detailed_status.next_approvers && dokumen.detailed_status.next_approvers.length > 0 && (
                                                    <div className="space-y-2 rounded-md bg-white/60 p-3">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Menunggu Respon Dari:</p>
                                                        <div className="space-y-2">
                                                            {dokumen.detailed_status.next_approvers.map((approver, idx) => (
                                                                <div key={`next-app-${idx}`} className="flex items-center gap-2">
                                                                    <Avatar className="h-6 w-6 border border-white shadow-sm">
                                                                        <AvatarFallback className="bg-blue-100 text-[10px] text-blue-700">
                                                                            {approver.user?.name?.substring(0, 2).toUpperCase() || '??'}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-medium text-foreground">
                                                                            {approver.user?.name || approver.approver_email}
                                                                        </span>
                                                                        {approver.jabatan_name && (
                                                                            <span className="text-[10px] text-muted-foreground">{approver.jabatan_name}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-medium">Statistik Approval</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">Total Progres Persetujuan</span>
                                                <span className="font-medium">{Math.round(progress.percentage)}%</span>
                                            </div>
                                            <Progress value={progress.percentage} className="h-2" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="rounded-md border bg-muted/20 p-2">
                                                <div className="text-lg font-bold text-green-600">{progress.approved}</div>
                                                <div className="text-[10px] text-muted-foreground">Disetujui</div>
                                            </div>
                                            <div className="rounded-md border bg-muted/20 p-2">
                                                <div className="text-lg font-bold text-yellow-600">{progress.pending}</div>
                                                <div className="text-[10px] text-muted-foreground">Menunggu</div>
                                            </div>
                                            <div className="rounded-md border bg-muted/20 p-2">
                                                <div className="text-lg font-bold text-red-600">{progress.rejected}</div>
                                                <div className="text-[10px] text-muted-foreground">Ditolak</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-medium">Berkas Dokumen</CardTitle>
                                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                                                Signed PDF
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-xs text-muted-foreground">Unduh atau tinjau berkas PDF resmi yang telah terverifikasi oleh sistem.</p>

                                        {latestVersion ? (
                                            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-600">
                                                        <IconFileText className="h-5 w-5" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="truncate text-xs font-semibold text-foreground">{latestVersion.nama_file}</p>
                                                        <p className="text-[10px] text-muted-foreground">Versi {latestVersion.version} • {formatFileSize(latestVersion.size_file)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                                                <IconFileText className="h-5 w-5 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Berkas belum diunggah</span>
                                            </div>
                                        )}

                                        <div className="space-y-2 pt-1">
                                            <Button onClick={() => handleDownload()} className="w-full bg-emerald-600 font-sans text-xs font-bold text-white shadow-sm hover:bg-emerald-700">
                                                <IconDownload className="mr-2 h-4 w-4" />
                                                Unduh Signed PDF
                                            </Button>

                                            {latestVersion && (
                                                <Button variant="outline" onClick={() => handlePreview(latestVersion)} className="w-full font-sans text-xs font-semibold">
                                                    <IconEye className="mr-2 h-4 w-4" />
                                                    Pratinjau Dokumen
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Kartu Aksi Approval */}
                                {activePendingApproval && (
                                    <Card className="border-primary shadow-md">
                                        <CardHeader className="bg-primary/5 pb-3">
                                            <CardTitle className="flex items-center gap-2 text-base font-bold text-primary sm:text-lg">
                                                <IconPencil className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" /> Tindakan Diperlukan
                                            </CardTitle>
                                            <CardDescription className="text-xs sm:text-sm">Silakan pilih keputusan permohonan persetujuan di bawah ini.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-4">
                                            <div className="space-y-1.5 rounded-lg border border-green-200 bg-green-50/50 p-3">
                                                <Button onClick={() => handleOpenApprovalModal('approved')} className="w-full bg-green-600 font-sans font-bold text-white shadow-sm hover:bg-green-700">
                                                    <CheckCircle2Icon className="mr-2 h-4 w-4" /> Setujui Dokumen
                                                </Button>
                                                <p className="text-[11px] leading-tight text-green-800">
                                                    Pilih tombol ini untuk menyetujui pengajuan dan menyematkan tanda tangan digital ke lembar dokumen.
                                                </p>
                                            </div>

                                            <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                                                <Button variant="outline" onClick={() => handleOpenApprovalModal('revision_requested')} className="w-full border-amber-300 bg-amber-100/80 font-sans font-bold text-amber-900 shadow-sm hover:bg-amber-200 hover:text-amber-950">
                                                    <IconRefresh className="mr-2 h-4 w-4" /> Minta Revisi Berkas
                                                </Button>
                                                <p className="text-[11px] leading-tight text-amber-800">
                                                    Meminta pembuat dokumen mengunggah berkas perbaikan terbaru. <strong>*Wajib menyertakan catatan poin revisi.</strong>
                                                </p>
                                            </div>

                                            <div className="space-y-1.5 rounded-lg border border-red-200 bg-red-50/50 p-3">
                                                <Button variant="outline" onClick={() => handleOpenApprovalModal('rejected')} className="w-full border-red-300 bg-red-100/80 font-sans font-bold text-red-700 shadow-sm hover:bg-red-200 hover:text-red-800">
                                                    <XCircleIcon className="mr-2 h-4 w-4" /> Tolak Pengajuan
                                                </Button>
                                                <p className="text-[11px] leading-tight text-red-800">
                                                    Membatalkan alur pengajuan secara permanen. <strong>*Wajib memberikan alasan penolakan.</strong>
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {(dokumen?.status === 'draft' || dokumen?.status === 'rejected') && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-medium">Pengelolaan Dokumen</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {dokumen?.status === 'draft' && (
                                                <Button onClick={handleSubmitForApproval} className="w-full justify-start bg-green-600 font-sans hover:bg-green-700">
                                                    <IconSend className="mr-2 h-4 w-4" /> Submit untuk Approval
                                                </Button>
                                            )}
                                            {['rejected', 'revision_requested', 'needs_revision'].includes(dokumen?.status || '') &&
                                                dokumen?.user_id === auth?.user?.id && (
                                                    <Button onClick={handleUploadRevision} className="w-full justify-start bg-blue-600 font-sans hover:bg-blue-700">
                                                        <IconFileText className="mr-2 h-4 w-4" /> Upload Berkas Revisi
                                                    </Button>
                                                )}
                                            <Button variant="outline" onClick={handleEdit} className="w-full justify-start font-sans">
                                                <IconEdit className="mr-2 h-4 w-4" /> Edit Informasi & Alur
                                            </Button>
                                            <Button variant="outline" onClick={handleDelete} className="w-full justify-start font-sans text-red-600 hover:bg-red-50 hover:text-red-700">
                                                <IconTrash className="mr-2 h-4 w-4" /> Hapus Dokumen Ini
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dialog Modal Edit Dokumen */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
                            <form onSubmit={handleSubmitEdit}>
                                <DialogHeader>
                                    <DialogTitle className="font-serif text-xl">Edit Informasi & Alur Dokumen</DialogTitle>
                                    <DialogDescription className="font-sans">
                                        Perbarui data dokumen, jadwal batas waktu (deadline), berkas PDF pendukung, serta penentuan pejabat persetujuan.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="judul_dokumen" className="font-sans">
                                            Judul Dokumen <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="judul_dokumen"
                                            name="judul_dokumen"
                                            placeholder="Masukkan judul dokumen pengajuan..."
                                            value={formData.judul_dokumen}
                                            onChange={handleInputChange}
                                            className={errors.judul_dokumen ? 'border-red-500 font-sans' : 'font-sans'}
                                        />
                                        {errors.judul_dokumen && <p className="text-xs text-red-500">{errors.judul_dokumen[0]}</p>}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="tgl_deadline" className="font-sans">Batas Waktu Persetujuan (Deadline)</Label>
                                        <Input
                                            id="tgl_deadline"
                                            name="tgl_deadline"
                                            type="date"
                                            value={formData.tgl_deadline}
                                            onChange={handleInputChange}
                                            className="font-sans"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="deskripsi" className="font-sans">Deskripsi Tambahan / Catatan Pengajuan</Label>
                                        <Textarea
                                            id="deskripsi"
                                            name="deskripsi"
                                            placeholder="Tuliskan keterangan lengkap atau latar belakang pengajuan dokumen..."
                                            value={formData.deskripsi}
                                            onChange={handleInputChange}
                                            className="font-sans"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="masterflow_id" className="font-sans">Alur Persetujuan (Masterflow)</Label>
                                        <Select
                                            value={formData.masterflow_id === 'custom' ? 'custom' : formData.masterflow_id ? String(formData.masterflow_id) : ''}
                                            onValueChange={handleMasterflowSelectChange}
                                        >
                                            <SelectTrigger className="font-sans">
                                                <SelectValue placeholder="Pilih Alur Persetujuan (Masterflow)" />
                                            </SelectTrigger>
                                            <SelectContent className="font-sans">
                                                <SelectItem value="custom">Custom Approval (Berdasarkan Urutan Email)</SelectItem>
                                                {masterflows.map((mf) => (
                                                    <SelectItem key={`mf-${mf.id}`} value={String(mf.id)}>
                                                        {mf.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.masterflow_id !== 'custom' && selectedMasterflow && selectedMasterflow.steps && selectedMasterflow.steps.length > 0 && (
                                        <div className="mt-2 space-y-3 rounded-lg border bg-muted/20 p-4">
                                            <div className="flex items-center gap-2">
                                                <IconInfoCircle className="h-4 w-4 text-blue-600" />
                                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penetapan Pejabat Approver Per Tahapan</h4>
                                            </div>
                                            {selectedMasterflow.steps.map((step) => (
                                                <div key={`step-${step.id}`} className="grid gap-1.5">
                                                    <Label className="text-xs font-medium">
                                                        Tahap {step.step_order}: {step.step_name} ({step.jabatan?.name || 'Jabatan'})
                                                    </Label>
                                                    <Select
                                                        value={formData.approvers[step.id] ? String(formData.approvers[step.id]) : ''}
                                                        onValueChange={(val) => handleApproverSelectChange(step.id, val)}
                                                    >
                                                        <SelectTrigger className="h-9 font-sans text-xs">
                                                            <SelectValue placeholder={`Pilih ${step.jabatan?.name || 'Pejabat'}`} />
                                                        </SelectTrigger>
                                                        <SelectContent className="font-sans">
                                                            {(availableApprovers[step.id] || []).map((usr) => (
                                                                <SelectItem key={`user-${usr.id}`} value={String(usr.id)}>
                                                                    {usr.name} ({usr.email})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {formData.masterflow_id === 'custom' && (
                                        <div className="mt-2 space-y-3 rounded-lg border bg-muted/20 p-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daftar Penyetujui (Custom Approvers)</h4>
                                                <Button type="button" variant="outline" size="sm" onClick={handleAddCustomApprover} className="h-7 text-xs font-sans">
                                                    <IconPlus className="mr-1 h-3 w-3" /> Tambah Penerima
                                                </Button>
                                            </div>

                                            {formData.custom_approvers.map((customApp, idx) => (
                                                <div key={`custom-app-${idx}`} className="flex items-center gap-2">
                                                    <span className="w-6 text-center text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                                                    <Input
                                                        type="email"
                                                        placeholder="email.approver@perusahaan.com"
                                                        value={customApp.email}
                                                        onChange={(e) => handleCustomApproverChange(idx, e.target.value)}
                                                        className="h-9 font-sans text-xs"
                                                    />
                                                    {formData.custom_approvers.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveCustomApprover(idx)}
                                                            className="h-9 w-9 text-red-500 hover:bg-red-50"
                                                        >
                                                            <IconTrash className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid gap-2">
                                        <Label htmlFor="file" className="font-sans">Ganti Berkas Dokumen (Opsional)</Label>
                                        <Input id="file" name="file" type="file" onChange={handleFileChange} className="font-sans" />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting} className="font-sans">
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="font-sans">
                                        {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Konfirmasi Hapus Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin menghapus dokumen "<strong>{dokumen.judul_dokumen}</strong>"? Seluruh berkas dan riwayat pengajuan akan dihapus permanen.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="font-sans">Batal</Button>
                                <Button type="button" variant="destructive" onClick={confirmDelete} className="font-sans">Ya, Hapus Dokumen</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Submit untuk Approval</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin mengajukan dokumen "<strong>{dokumen.judul_dokumen}</strong>" ke alur pemeriksaan?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsSubmitDialogOpen(false)} className="font-sans">Batal</Button>
                                <Button type="button" className="bg-green-600 font-sans hover:bg-green-700" onClick={confirmSubmitForApproval} disabled={isSubmitting}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Mengirimkan...' : 'Ya, Submit Sekarang'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="font-serif">Upload Berkas Revisi</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Unggah berkas PDF perbaikan terbaru untuk dokumen "<strong>{dokumen.judul_dokumen}</strong>".
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="revision-file" className="font-sans">Berkas PDF Revisi *</Label>
                                    <Input id="revision-file" type="file" onChange={handleRevisionFileChange} className="font-sans" />
                                    {revisionFile && <p className="text-sm font-medium text-green-600">✓ Berkas terpilih: {revisionFile.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="revision-comment" className="font-sans">Catatan Revisi / Keterangan Perbaikan</Label>
                                    <Textarea
                                        id="revision-comment"
                                        placeholder="Tuliskan ringkasan poin-poin yang telah Anda perbaiki pada berkas ini..."
                                        value={revisionComment}
                                        onChange={(e) => setRevisionComment(e.target.value)}
                                        className="font-sans"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsRevisionDialogOpen(false)} className="font-sans">Batal</Button>
                                <Button type="button" className="bg-blue-600 font-sans hover:bg-blue-700" onClick={confirmUploadRevision} disabled={isUploadingRevision || !revisionFile}>
                                    <IconFileText className="mr-2 h-4 w-4" />
                                    {isUploadingRevision ? 'Mengunggah Berkas...' : 'Unggah Revisi'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
                        <DialogContent className="flex h-[90vh] max-w-[90vw] flex-col p-0">
                            <DialogHeader className="shrink-0 border-b p-4">
                                <div className="flex flex-col gap-3 pr-6 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <DialogTitle className="font-serif">Pratinjau Berkas Dokumen</DialogTitle>
                                        <DialogDescription className="font-sans">{previewFileName}</DialogDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant={previewMode === 'signed' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => togglePreviewMode('signed')}
                                            className={`h-8 text-xs font-sans ${previewMode === 'signed' ? 'bg-blue-600 font-medium text-white hover:bg-blue-700' : 'border-gray-300 text-gray-700'}`}
                                        >
                                            ✍️ Tanda Tangan & QR Code
                                        </Button>
                                        <Button
                                            variant={previewMode === 'original' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => togglePreviewMode('original')}
                                            className={`h-8 text-xs font-sans ${previewMode === 'original' ? 'bg-emerald-600 font-medium text-white hover:bg-emerald-700' : 'border-gray-300 text-gray-700'}`}
                                        >
                                            📄 Dokumen Asli (Tanpa TTD)
                                        </Button>
                                    </div>
                                </div>
                            </DialogHeader>
                            <div className="flex-1 overflow-auto p-4">
                                {previewFileUrl && (
                                    <PDFViewer fileUrl={previewFileUrl} fileName={previewFileName} showControls={true} height="100%" />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Dialog Modal Keputusan Approver */}
                    <Dialog open={isApprovalActionOpen} onOpenChange={setIsApprovalActionOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="font-serif">
                                    {approvalActionType === 'approved' && 'Konfirmasi Persetujuan Dokumen'}
                                    {approvalActionType === 'revision_requested' && 'Minta Revisi Dokumen'}
                                    {approvalActionType === 'rejected' && 'Tolak Pengajuan Dokumen'}
                                </DialogTitle>
                                <DialogDescription className="font-sans">
                                    {approvalActionType === 'approved' && 'Apakah Anda yakin ingin menyetujui dokumen ini? Tanda tangan digital Anda akan disematkan secara otomatis.'}
                                    {approvalActionType === 'revision_requested' && 'Tuliskan catatan poin perbaikan agar pembuat dokumen dapat memperbaiki berkas.'}
                                    {approvalActionType === 'rejected' && 'Tuliskan alasan penolakan pengajuan dokumen ini.'}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-3 font-sans">
                                {approvalActionType === 'rejected' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="alasan_reject" className="text-xs font-semibold">
                                            Alasan Penolakan <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            id="alasan_reject"
                                            placeholder="Contoh: Anggaran biaya melebihi batas yang disepakati..."
                                            value={approvalReason}
                                            onChange={(e) => setApprovalReason(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                )}

                                {approvalActionType === 'revision_requested' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="comment_revision" className="text-xs font-semibold">
                                            Catatan Poin Revisi <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            id="comment_revision"
                                            placeholder="Contoh: Mohon perbaiki lampiran halaman 3 dan perbarui tanggal pengajuan..."
                                            value={approvalComment}
                                            onChange={(e) => setApprovalComment(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                )}

                                {approvalActionType === 'approved' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="comment_approval" className="text-xs font-semibold">
                                            Catatan Tambahan (Opsional)
                                        </Label>
                                        <Textarea
                                            id="comment_approval"
                                            placeholder="Tuliskan catatan/pesan singkat (opsional)..."
                                            value={approvalComment}
                                            onChange={(e) => setApprovalComment(e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsApprovalActionOpen(false)} disabled={isProcessingApproval}>
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    disabled={isProcessingApproval}
                                    onClick={handleConfirmApprovalAction}
                                    className={
                                        approvalActionType === 'approved'
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : approvalActionType === 'revision_requested'
                                                ? 'bg-amber-600 hover:bg-amber-700'
                                                : 'bg-red-600 hover:bg-red-700'
                                    }
                                >
                                    {isProcessingApproval ? 'Memproses...' : 'Kirim Keputusan'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </SidebarInset>
            </SidebarProvider>
        </>
    );
}