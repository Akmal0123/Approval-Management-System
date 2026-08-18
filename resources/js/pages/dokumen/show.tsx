import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import PDFViewer from '@/components/pdf-viewer';
import { SiteHeader } from '@/components/site-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import RevisionHistory from '@/components/revision-history';
import { Head, router, usePage } from '@inertiajs/react';
import { IconDownload, IconEdit, IconEye, IconEyeOff, IconFileText, IconPencil, IconPrinter, IconRefresh, IconSend, IconTrash, IconUsers } from '@tabler/icons-react';
import { AlertCircleIcon, CalendarIcon, CheckCircle2, CheckCircle2Icon, ClockIcon, FileTextIcon, XCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Masterflow {
    id: number;
    name: string;
    description?: string;
    steps?: MasterflowStep[];
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
    // Call usePage at top level (before any conditional returns)
    const pageProps = usePage().props as any;
    const { auth } = pageProps;

    // Add null check and provide default
    if (!initialDokumen || !initialDokumen.id) {
        return (
            <>
                <Head title="Dokumen Not Found" />
                <SidebarProvider>
                    <NotificationListener />
                    <AppSidebar variant="inset" />
                    <SidebarInset>
                        <SiteHeader />
                        <div className="flex flex-1 flex-col items-center justify-center">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold">Dokumen Tidak Ditemukan</h1>
                                <p className="mt-2 text-muted-foreground">Data dokumen tidak tersedia</p>
                                <Button className="mt-4" onClick={() => router.visit('/dokumen')}>
                                    Kembali ke Daftar Dokumen
                                </Button>
                            </div>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </>
        );
    }

    const [dokumen, setDokumen] = useState<Dokumen>(initialDokumen);
    const [isNominalMasked, setIsNominalMasked] = useState(true);

    const formatNominalDisplay = (nominalVal: number | string | null | undefined) => {
        if (!nominalVal || Number(nominalVal) === 0) return null;
        const num = Number(nominalVal);
        if (isNominalMasked) {
            return 'Rp *.***.***';
        }
        return `Rp ${num.toLocaleString('id-ID')}`;
    };

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
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
        nomor_dokumen: dokumen?.nomor_dokumen || '',
        judul_dokumen: dokumen?.judul_dokumen || '',
        masterflow_id: dokumen?.masterflow_id || '',
        tgl_pengajuan: dokumen?.tgl_pengajuan || '',
        tgl_deadline: dokumen?.tgl_deadline || '',
        deskripsi: dokumen?.deskripsi || '',
        file: null,
        approvers: {},
        custom_approvers: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    // Debug log
    useEffect(() => {
        console.log('Dokumen data:', dokumen);
        console.log('Initial dokumen:', initialDokumen);
        console.log('Dokumen ID:', dokumen?.id);
        console.log('All props:', pageProps);
    }, []);

    // Fetch latest dokumen data
    const fetchDokumen = async () => {
        try {
            const response = await api.get(`/dokumen/${dokumen.id}`);
            console.log('Fetched dokumen:', response.data);

            const docData = response.data?.dokumen || response.data;

            // Check if response has dokumen data
            if (docData && docData.id) {
                setDokumen(docData);
                return docData;
            } else {
                console.warn('Invalid dokumen data received:', response.data);
                return null;
            }
        } catch (error) {
            console.error('Error fetching dokumen:', error);
            return null;
        }
    };

    // Fetch masterflows
    const fetchMasterflows = async () => {
        try {
            const response = await api.get('/masterflows');
            setMasterflows(response.data.masterflows || []);
        } catch (error) {
            console.error('Error fetching masterflows:', error);
        }
    };

    useEffect(() => {
        fetchMasterflows();

        // Real-time updates dengan Laravel Reverb (via Echo)
        if (typeof window !== 'undefined' && window.Echo && dokumen.id) {
            console.log('📡 Setting up real-time listener for dokumen:', dokumen.id);

            const channelName = `dokumen.${dokumen.id}`;

            window.Echo.channel(channelName).listen('dokumen.updated', (event: any) => {
                console.log('📡 Real-time update received:', event);

                // Update dokumen state dengan data terbaru
                if (event.dokumen && event.dokumen.id === dokumen.id) {
                    setDokumen(event.dokumen);

                    // Tampilkan notifikasi toast
                    showToast.success('📡 Dokumen telah diupdate secara real-time!');
                }
            });

            // Cleanup saat component unmount
            return () => {
                console.log('🔌 Leaving channel:', channelName);
                window.Echo.leave(channelName);
            };
        }
    }, [dokumen.id]);

    // Calculate approval progress
    const getApprovalProgress = () => {
        if (!dokumen.approvals || dokumen.approvals.length === 0) {
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
    const isCustomApproval = !dokumen.masterflow_id;

    const isSuperAdmin = pageProps.context?.is_super_admin || pageProps.auth?.user?.userAuths?.some((ua: any) => ua.role?.role_name === 'Super Admin') || false;

    // Find pending approval ONLY for assigned approver or Super Admin
    const activePendingApproval = (() => {
        if (!dokumen?.approvals || dokumen.approvals.length === 0) return null;

        // 1. Direct match by user_id or email
        const directApproval = dokumen.approvals.find(
            (a) =>
                (a.approval_status === 'pending' || a.approval_status === 'waiting') &&
                (a.user_id === auth?.user?.id ||
                    (a.approver_email && a.approver_email.toLowerCase() === auth?.user?.email?.toLowerCase())),
        );
        if (directApproval) return directApproval;

        // 2. If Super Admin, allow approving active pending step
        if (isSuperAdmin) {
            return dokumen.approvals.find((a) => a.approval_status === 'pending') || null;
        }

        // 3. Regular users who are NOT the assigned approver get null (no action card)
        return null;
    })();

    // Get status badge
    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
            draft: {
                label: 'Draft',
                icon: FileTextIcon,
                className: 'bg-gray-100 text-gray-800 border-gray-300',
            },
            pending: {
                label: 'Pending',
                icon: ClockIcon,
                className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            },
            submitted: {
                label: 'Submitted',
                icon: CheckCircle2Icon,
                className: 'bg-blue-100 text-blue-800 border-blue-300',
            },
            under_review: {
                label: 'Under Review',
                icon: AlertCircleIcon,
                className: 'bg-orange-100 text-orange-800 border-orange-300',
            },
            approved: {
                label: 'Approved',
                icon: CheckCircle2Icon,
                className: 'bg-green-100 text-green-800 border-green-300',
            },
            rejected: {
                label: 'Rejected',
                icon: XCircleIcon,
                className: 'bg-red-100 text-red-800 border-red-300',
            },
            revision_requested: {
                label: 'Perlu Revisi',
                icon: AlertCircleIcon,
                className: 'bg-orange-100 text-orange-800 border-orange-300',
            },
            needs_revision: {
                label: 'Perlu Revisi',
                icon: AlertCircleIcon,
                className: 'bg-orange-100 text-orange-800 border-orange-300',
            },
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

    // Get approval status badge
    const getApprovalStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            pending: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
            approved: { label: 'Disetujui', className: 'bg-green-100 text-green-800 border-green-300' },
            skipped: { label: 'Disetujui', className: 'bg-green-100 text-green-800 border-green-300' },
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

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    // Format date
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
        } catch (error) {
            return '-';
        }
    };

    // Handle edit
    const handleEdit = () => {
        if (!['draft', 'rejected', 'revision_requested', 'needs_revision'].includes(dokumen.status)) {
            showToast.error('❌ Hanya dokumen dengan status Draft, Ditolak, atau Perlu Revisi yang dapat diedit.');
            return;
        }

        // Format deadline date for HTML date input (YYYY-MM-DD)
        const formattedDeadline = dokumen.tgl_deadline
            ? (dokumen.tgl_deadline.includes('T') ? dokumen.tgl_deadline.split('T')[0] : dokumen.tgl_deadline)
            : '';

        // Populate form with current dokumen data
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

        // Load masterflow if exists
        if (dokumen.masterflow_id && dokumen.masterflow) {
            setSelectedMasterflow(dokumen.masterflow);
            fetchApproversForMasterflow(dokumen.masterflow_id);
        } else if (isCustomApproval && dokumen.approvals) {
            // Load custom approvers
            const customApprovers = dokumen.approvals.map((a) => ({
                email: a.approver_email || '',
                order: a.approval_order || 1,
            }));
            setFormData((prev) => ({
                ...prev,
                masterflow_id: 'custom',
                custom_approvers: customApprovers,
            }));
        }

        setIsEditDialogOpen(true);
    };

    // Fetch approvers for a specific masterflow
    const fetchApproversForMasterflow = async (masterflowId: number) => {
        try {
            const response = await api.get(`/masterflows/${masterflowId}/steps`);
            const masterflowWithSteps = {
                ...dokumen.masterflow,
                steps: response.data.steps || [],
            };
            setSelectedMasterflow(masterflowWithSteps as Masterflow);

            // Fetch available approvers for each step
            const approversData: Record<number, any[]> = {};
            for (const step of response.data.steps || []) {
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

            // Populate existing approvers
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

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: [],
            }));
        }
    };

    // Handle file change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file type - only PDF allowed
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                showToast.error('❌ Format file harus PDF! Silakan pilih file dengan format .pdf');
                e.target.value = ''; // Reset input
                return;
            }

            // Validate file size - max 10MB
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                showToast.error('❌ Ukuran file maksimal 10MB!');
                e.target.value = ''; // Reset input
                return;
            }

            setFormData((prev) => ({
                ...prev,
                file: file,
            }));

            if (errors.file) {
                setErrors((prev) => ({
                    ...prev,
                    file: [],
                }));
            }
        }
    };

    // Handle masterflow change in edit
    const handleMasterflowChange = async (value: string) => {
        if (value === 'custom') {
            setFormData((prev) => ({
                ...prev,
                masterflow_id: 'custom',
                approvers: {},
                custom_approvers: [{ email: '', order: 1 }],
            }));
            setSelectedMasterflow(null);
            setAvailableApprovers({});
            return;
        }

        const masterflowId = Number(value);
        setFormData((prev) => ({
            ...prev,
            masterflow_id: masterflowId,
            approvers: {},
            custom_approvers: [],
        }));

        fetchApproversForMasterflow(masterflowId);
    };

    // Handle approver selection
    const handleApproverChange = (stepId: number, userId: string) => {
        setFormData((prev) => ({
            ...prev,
            approvers: {
                ...prev.approvers,
                [stepId]: userId === '' ? '' : Number(userId),
            },
        }));
    };

    // Handle custom approver change
    const handleCustomApproverChange = (index: number, field: 'email' | 'order', value: string | number) => {
        setFormData((prev) => {
            const newCustomApprovers = [...prev.custom_approvers];
            newCustomApprovers[index] = {
                ...newCustomApprovers[index],
                [field]: value,
            };
            return {
                ...prev,
                custom_approvers: newCustomApprovers,
            };
        });
    };

    // Add custom approver
    const addCustomApprover = () => {
        setFormData((prev) => ({
            ...prev,
            custom_approvers: [...prev.custom_approvers, { email: '', order: prev.custom_approvers.length + 1 }],
        }));
    };

    // Remove custom approver
    const removeCustomApprover = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            custom_approvers: prev.custom_approvers.filter((_, i) => i !== index),
        }));
    };

    // Submit edit
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

            await api.post(`/dokumen/${dokumen.id}`, submitData);

            showToast.success('🎉 Dokumen berhasil diupdate!');
            setIsEditDialogOpen(false);
            fetchDokumen();
        } catch (error: any) {
            console.error('Form submission error:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                const firstKey = Object.keys(error.response.data.errors)[0];
                const firstVal = error.response.data.errors[firstKey];
                const errMsg = Array.isArray(firstVal) ? firstVal[0] : firstVal;
                showToast.error(`❌ Gagal update: ${errMsg}`);
            } else {
                const message = error.response?.data?.message || '❌ Gagal update dokumen. Silakan cek form.';
                showToast.error(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = () => {
        if (dokumen.status !== 'draft') {
            showToast.error('❌ Hanya dokumen dengan status Draft yang dapat dihapus.');
            return;
        }
        setIsDeleteDialogOpen(true);
    };

    // Confirm delete
    const confirmDelete = async () => {
        try {
            await api.delete(`/dokumen/${dokumen.id}`);
            showToast.success('🎉 Dokumen berhasil dihapus!');
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

    // Handle preview document (supports both signed & raw original PDF)
    const handlePreview = (version: DokumenVersion, mode: 'signed' | 'original' = 'signed') => {
        const fileType = version.tipe_file.toLowerCase();
        const isPDF = fileType === 'pdf' || fileType === 'application/pdf';

        if (!isPDF) {
            showToast.error('❌ Preview hanya tersedia untuk file PDF.');
            return;
        }

        const fileUrl = mode === 'original'
            ? `/api/dokumen/${dokumen.id}/signed-pdf/${version.id}?original=1`
            : `/api/dokumen/${dokumen.id}/signed-pdf/${version.id}`;

        setSelectedPreviewVersion(version);
        setPreviewMode(mode);
        setPreviewFileUrl(fileUrl);
        setPreviewFileName(version.nama_file);
        setIsPreviewDialogOpen(true);
    };

    // Toggle preview mode inside modal
    const togglePreviewMode = (newMode: 'signed' | 'original') => {
        if (!selectedPreviewVersion) return;
        setPreviewMode(newMode);
        const fileUrl = newMode === 'original'
            ? `/api/dokumen/${dokumen.id}/signed-pdf/${selectedPreviewVersion.id}?original=1`
            : `/api/dokumen/${dokumen.id}/signed-pdf/${selectedPreviewVersion.id}`;
        setPreviewFileUrl(fileUrl);
    };

    // Handle submit for approval (untuk draft dokumen)
    const handleSubmitForApproval = () => {
        if (dokumen.status !== 'draft') {
            showToast.error('❌ Hanya dokumen draft yang dapat disubmit.');
            return;
        }
        setIsSubmitDialogOpen(true);
    };

    // Confirm submit for approval
    const confirmSubmitForApproval = async () => {
        setIsSubmitting(true);

        try {
            await api.post(`/dokumen/${dokumen.id}/submit`);
            showToast.success('🎉 Dokumen berhasil disubmit untuk approval!');
            setIsSubmitDialogOpen(false);
            fetchDokumen();
        } catch (error: any) {
            console.error('Submit error:', error);
            const message = error.response?.data?.message || error.message || 'Silakan coba lagi.';
            showToast.error(`❌ Gagal submit dokumen: ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle upload revision for rejected/needs_revision document
    const handleUploadRevision = () => {
        if (!['rejected', 'revision_requested', 'needs_revision'].includes(dokumen.status)) {
            showToast.error('❌ Dokumen ini tidak sedang dalam status yang membutuhkan revisi.');
            return;
        }

        if (dokumen.user_id !== auth.user.id) {
            showToast.error('❌ Hanya pemilik dokumen yang dapat mengupload revisi.');
            return;
        }

        setRevisionFile(null);
        setRevisionComment('');
        setIsRevisionDialogOpen(true);
    };

    // Handle revision file change
    const handleRevisionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;

        if (file) {
            // Validate file type - only PDF allowed
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                showToast.error('❌ Format file harus PDF! Silakan pilih file dengan format .pdf');
                e.target.value = ''; // Reset input
                return;
            }

            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                showToast.error('❌ Ukuran file maksimal 10MB!');
                e.target.value = ''; // Reset input
                return;
            }
        }

        setRevisionFile(file);
    };

    // Confirm upload revision
    const confirmUploadRevision = async () => {
        if (!revisionFile) {
            showToast.error('❌ Silakan pilih file revisi terlebih dahulu.');
            return;
        }

        setIsUploadingRevision(true);

        try {
            const formData = new FormData();
            formData.append('file', revisionFile);
            if (revisionComment) {
                formData.append('comment', revisionComment);
            }

            const response = await api.post(`/dokumen/${dokumen.id}/upload-revision`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Use message from server response or fallback
            const message = response.data?.message || '🎉 Revisi dokumen berhasil diupload!';
            showToast.success(message);
            setIsRevisionDialogOpen(false);
            setRevisionFile(null);

            // Update dokumen state directly from response if available
            if (response.data?.dokumen) {
                setDokumen(response.data.dokumen);
            } else {
                // Fallback: Refresh dokumen data via fetch
                await fetchDokumen();
            }
        } catch (error: any) {
            console.error('Upload revision error:', error);
            showToast.error(`❌ Gagal upload revisi. ${error.response?.data?.message || error.message}`);
        } finally {
            setIsUploadingRevision(false);
        }
    };

    // Download file - uses on-demand signature generation
    const handleDownload = (versionId?: number) => {
        const url = versionId ? `/api/dokumen/${dokumen.id}/download/${versionId}` : `/api/dokumen/${dokumen.id}/download`;
        window.location.href = url;
    };

    // Download original file - download raw PDF without signatures
    const handleDownloadOriginal = (versionId?: number) => {
        const url = versionId ? `/api/dokumen/${dokumen.id}/download/${versionId}?original=1` : `/api/dokumen/${dokumen.id}/download?original=1`;
        window.location.href = url;
    };

    // Print file - opens PDF in new tab and triggers print
    const handlePrint = (version: DokumenVersion) => {
        const fileUrl = `/api/dokumen/${dokumen.id}/signed-pdf/${version.id}`;
        const printWindow = window.open(fileUrl, '_blank');
        if (printWindow) {
            printWindow.addEventListener('load', () => {
                printWindow.print();
            });
        }
    };

    // Sort approvals by order or step_order
    const sortedApprovals = [...(dokumen.approvals || [])].sort((a, b) => {
        // For custom approval (has approval_order)
        if (a.approval_order !== undefined && b.approval_order !== undefined) {
            return a.approval_order - b.approval_order;
        }
        // For existing masterflow (has masterflow_step)
        if (a.masterflow_step && b.masterflow_step) {
            return a.masterflow_step.step_order - b.masterflow_step.step_order;
        }
        return 0;
    });

    // Group approvals logic - improved to handle non-consecutive group members
    type TimelineItem =
        | { type: 'single'; data: DokumenApproval }
        | { type: 'group'; data: DokumenApproval[]; groupIndex: string; groupType: string; firstStepOrder: number };

    // First, separate grouped and single approvals
    const groupedApprovalsMap: Record<string, { approvals: DokumenApproval[]; firstStepOrder: number; groupType: string }> = {};
    const singleApprovals: { approval: DokumenApproval; stepOrder: number }[] = [];

    sortedApprovals.forEach((approval) => {
        const stepOrder = approval.masterflow_step?.step_order ?? approval.approval_order ?? 0;

        if (approval.group_index) {
            if (!groupedApprovalsMap[approval.group_index]) {
                groupedApprovalsMap[approval.group_index] = {
                    approvals: [],
                    firstStepOrder: stepOrder,
                    groupType: approval.jenis_group || 'parallel',
                };
            }
            groupedApprovalsMap[approval.group_index].approvals.push(approval);
            // Update firstStepOrder if this one is earlier
            if (stepOrder < groupedApprovalsMap[approval.group_index].firstStepOrder) {
                groupedApprovalsMap[approval.group_index].firstStepOrder = stepOrder;
            }
        } else {
            singleApprovals.push({ approval, stepOrder });
        }
    });

    // Build timeline items combining groups (at their first step position) and singles
    const timelineItems: TimelineItem[] = [];
    const processedGroups = new Set<string>();

    // Create a combined list of items with their effective step order
    const allItems: { item: TimelineItem; stepOrder: number }[] = [];

    // Add groups
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

    // Add singles
    singleApprovals.forEach(({ approval, stepOrder }) => {
        allItems.push({
            item: { type: 'single', data: approval },
            stepOrder,
        });
    });

    // Sort by step order and build final timeline
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
                <NotificationListener />
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
                                    <span>Detail</span>
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
                                        <span>{formatDate(dokumen?.tgl_pengajuan)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Primary Actions (Desktop) */}
                            <div className="hidden items-center gap-2 sm:flex">
                                {activePendingApproval && (
                                    <Button
                                        onClick={() => router.get(`/approvals/${activePendingApproval.id}`)}
                                        className="bg-emerald-600 hover:bg-emerald-700 font-sans font-medium text-white shadow-sm"
                                    >
                                        <CheckCircle2Icon className="mr-2 h-4 w-4" />
                                        ✍️ Proses TTD & Approval
                                    </Button>
                                )}
                                {dokumen?.status === 'draft' && (
                                    <Button onClick={handleSubmitForApproval} className="bg-green-600 hover:bg-green-700">
                                        <IconSend className="mr-2 h-4 w-4" />
                                        Submit Approval
                                    </Button>
                                )}
                                {['rejected', 'revision_requested', 'needs_revision'].includes(dokumen?.status || '') && dokumen?.user_id === auth.user.id && (
                                    <Button onClick={handleUploadRevision} className="bg-blue-600 hover:bg-blue-700 font-sans">
                                        <IconFileText className="mr-2 h-4 w-4" />
                                        Upload Revisi
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* LEFT COLUMN - Main Content */}
                            <div className="space-y-6 lg:col-span-2">
                                {/* Description & Details */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-serif text-lg">Informasi Dokumen</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid gap-6 sm:grid-cols-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                                    Tipe Dokumen
                                                </Label>
                                                <div className="font-medium">
                                                    {dokumen.tipe_dokumen === 'proposal' && '📊 Proposal'}
                                                    {dokumen.tipe_dokumen === 'pengadaan' && '📦 Pengadaan'}
                                                    {dokumen.tipe_dokumen === 'po' && '🛒 PO (Purchase Order)'}
                                                    {dokumen.tipe_dokumen === 'pr' && '📋 PR (Purchase Requisition)'}
                                                    {dokumen.tipe_dokumen === 'memo_internal' && '📝 Memo Internal'}
                                                    {!['proposal', 'pengadaan', 'po', 'pr', 'memo_internal'].includes(dokumen.tipe_dokumen || '') && (dokumen.tipe_dokumen || '-')}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                                    Masterflow
                                                </Label>
                                                <div className="font-medium">
                                                    {isCustomApproval ? (
                                                        <span className="flex items-center gap-2 text-primary">
                                                            <span>✨</span> Custom Approval
                                                        </span>
                                                    ) : (
                                                        dokumen.masterflow?.name || '-'
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Deadline</Label>
                                                <div className="font-medium">{dokumen.tgl_deadline ? formatDate(dokumen.tgl_deadline) : '-'}</div>
                                            </div>
                                            {['proposal', 'po', 'pr'].includes(dokumen.tipe_dokumen || '') && dokumen.nominal && Number(dokumen.nominal) > 0 && (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Nominal Transaksi</Label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsNominalMasked(!isNominalMasked)}
                                                            className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-200 transition-colors"
                                                            title={isNominalMasked ? "Buka Sensor Nominal" : "Sensor Nominal"}
                                                        >
                                                            {isNominalMasked ? <IconEyeOff className="h-3 w-3" /> : <IconEye className="h-3 w-3" />}
                                                            <span>{isNominalMasked ? "Buka" : "Sensor"}</span>
                                                        </button>
                                                    </div>
                                                    <div className="font-semibold text-foreground font-mono">
                                                        {formatNominalDisplay(dokumen.nominal)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {dokumen.deskripsi && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                                    Deskripsi
                                                </Label>
                                                <div className="rounded-md bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
                                                    {dokumen.deskripsi}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Approval Timeline */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-serif text-lg">Timeline Persetujuan</CardTitle>
                                        <CardDescription>Proses approval dokumen ini</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="relative space-y-0 pl-2">
                                            {/* Vertical Line */}
                                            <div className="absolute top-2 bottom-6 left-6 w-0.5 bg-border" />

                                            {timelineItems.map((item, index) => {
                                                if (item.type === 'single') {
                                                    const approval = item.data;
                                                    const isCompleted =
                                                        approval.approval_status === 'approved' || approval.approval_status === 'skipped';
                                                    const isRejected = approval.approval_status === 'rejected';
                                                    const isPending = approval.approval_status === 'pending';

                                                    return (
                                                        <div key={approval.id} className="relative flex gap-4 pb-8 last:pb-0">
                                                            {/* Status Dot */}
                                                            <div
                                                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ${isCompleted
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

                                                            {/* Content */}
                                                            <div className="flex-1 space-y-1.5 pt-1">
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div>
                                                                        <div className="font-medium">
                                                                            {isCustomApproval
                                                                                ? approval.approver_email || 'Unknown User'
                                                                                : approval.user?.name ||
                                                                                approval.masterflow_step?.jabatan?.name ||
                                                                                'Unknown Position'}
                                                                        </div>
                                                                        <div className="text-sm text-muted-foreground">
                                                                            {isCustomApproval
                                                                                ? `Order: ${approval.approval_order}`
                                                                                : approval.masterflow_step?.step_name || 'Approval Step'}
                                                                        </div>
                                                                    </div>
                                                                    {getApprovalStatusBadge(approval.approval_status)}
                                                                </div>

                                                                {/* Comments/Rejection Reason */}
                                                                {(approval.comment || approval.alasan_reject) && (
                                                                    <div className="mt-2 rounded-md bg-muted/40 p-3 text-sm">
                                                                        {approval.alasan_reject && (
                                                                            <div className="mb-1 font-medium text-red-600">
                                                                                Alasan: {approval.alasan_reject}
                                                                            </div>
                                                                        )}
                                                                        {approval.comment && (
                                                                            <div className="text-muted-foreground italic">"{approval.comment}"</div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Approval Date */}
                                                                {approval.tgl_approve && (
                                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <ClockIcon className="h-3 w-3" />
                                                                        {formatDate(approval.tgl_approve)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    // Group Rendering
                                                    const group = item;
                                                    const allApproved = group.data.every(
                                                        (a) => a.approval_status === 'approved' || a.approval_status === 'skipped',
                                                    );
                                                    const anyRejected = group.data.some((a) => a.approval_status === 'rejected');
                                                    const isCompleted = allApproved; // Logic might vary slightly based on group type, but for visual dot, use allApproved or custom logic?
                                                    // Actually if type is 'any_one' and one is approved, group is approved?
                                                    // Let's assume visual dot follows aggregate status.
                                                    const oneApproved = group.data.some((a) => a.approval_status === 'approved');
                                                    const isGroupApproved = group.groupType === 'any_one' ? oneApproved : allApproved;

                                                    const statusColor = isGroupApproved
                                                        ? 'border-green-600 text-green-600'
                                                        : anyRejected // If any rejected and type is all_required -> rejected.
                                                            ? 'border-red-600 text-red-600'
                                                            : 'border-yellow-500 text-yellow-500'; // Pending default

                                                    return (
                                                        <div key={`group-${group.groupIndex}`} className="relative flex gap-4 pb-8 last:pb-0">
                                                            {/* Group Status Dot */}
                                                            <div
                                                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ${statusColor}`}
                                                            >
                                                                <IconUsers className="h-4 w-4" />
                                                            </div>

                                                            {/* Group Content Box */}
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
                                                                        {group.data.map((approval) => {
                                                                            const isSkipped = approval.approval_status === 'skipped';

                                                                            return (
                                                                                <div key={approval.id} className="p-3">
                                                                                    {/* Main row: Name/Role on left, Status on right */}
                                                                                    <div className="flex items-start justify-between gap-4">
                                                                                        <div className="space-y-1">
                                                                                            <div className="text-sm font-medium">
                                                                                                {approval.user?.name ||
                                                                                                    approval.masterflow_step?.jabatan?.name ||
                                                                                                    'Unknown'}
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
                                                                                    {/* Skip note - full width below */}
                                                                                    {isSkipped && (
                                                                                        <div className="mt-1 text-[10px] text-muted-foreground italic">
                                                                                            *Otomatis di-skip karena grup sudah menyelesaikan
                                                                                            approval.
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Rejection/Comments - full width below */}
                                                                                    {(approval.comment || approval.alasan_reject) && (
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

                                {/* Version History */}
                                {dokumen.versions && dokumen.versions.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="font-serif text-lg">Riwayat Versi</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="divide-y rounded-md border">
                                                {dokumen.versions
                                                    .sort((a, b) => new Date(b.tgl_upload).getTime() - new Date(a.tgl_upload).getTime())
                                                    .map((version, index) => {
                                                        const isLatest = index === 0;
                                                        return (
                                                            <div
                                                                key={version.id}
                                                                className={`flex items-center justify-between p-4 ${isLatest ? 'bg-blue-50/30' : 'hover:bg-muted/30'}`}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div
                                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${isLatest ? 'border-blue-200 bg-blue-100 text-blue-700' : 'bg-background text-muted-foreground'}`}
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
                                                                            {version.signed_file_url && (
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="gap-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-50"
                                                                                >
                                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                                    Signed
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
                                                                <div className="flex gap-1">
                                                                    {(version.tipe_file.toLowerCase() === 'pdf' ||
                                                                        version.tipe_file.toLowerCase() === 'application/pdf') && (
                                                                            <>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => handlePreview(version)}
                                                                                    title="Lihat"
                                                                                >
                                                                                    <IconEye className="h-4 w-4" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => handlePrint(version)}
                                                                                    title="Print"
                                                                                >
                                                                                    <IconPrinter className="h-4 w-4" />
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDownloadOriginal(version.id)}
                                                                        title="Download File PDF Asli Mentah"
                                                                        className="h-8 border-gray-300 text-xs hover:bg-gray-100"
                                                                    >
                                                                        <IconDownload className="mr-1 h-3.5 w-3.5 text-gray-600" />
                                                                        PDF Asli
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDownload(version.id)}
                                                                        title="Download PDF Ber-Tanda Tangan"
                                                                        className="h-8 border-blue-300 bg-blue-50/50 text-xs text-blue-700 hover:bg-blue-100"
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

                                {/* Revision History Component */}
                                <RevisionHistory dokumenId={dokumen.id} />
                            </div>

                            {/* RIGHT COLUMN - Sidebar Actions & Status */}
                            <div className="space-y-6">
                                {/* Current Status Highlight */}
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
                                                <p className="text-sm leading-relaxed font-medium text-blue-800">
                                                    {dokumen.detailed_status.current_step_description}
                                                </p>

                                                {dokumen.detailed_status.next_approvers && dokumen.detailed_status.next_approvers.length > 0 && (
                                                    <div className="space-y-2 rounded-md bg-white/60 p-3">
                                                        <p className="text-xs font-semibold tracking-wide text-blue-700 uppercase">
                                                            Menunggu Response:
                                                        </p>
                                                        <div className="space-y-2">
                                                            {dokumen.detailed_status.next_approvers.map((approver, idx) => (
                                                                <div key={idx} className="flex items-center gap-2">
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
                                                                            <span className="text-[10px] text-muted-foreground">
                                                                                {approver.jabatan_name}
                                                                            </span>
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

                                {/* Approval Stats */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-medium">Statistik Approval</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">Total Progress</span>
                                                <span className="font-medium">{Math.round(progress.percentage)}%</span>
                                            </div>
                                            <Progress value={progress.percentage} className="h-2" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="rounded-md border bg-muted/20 p-2">
                                                <div className="text-lg font-bold text-green-600">{progress.approved}</div>
                                                <div className="text-[10px] text-muted-foreground">Approved</div>
                                            </div>
                                            <div className="rounded-md border bg-muted/20 p-2">
                                                <div className="text-lg font-bold text-yellow-600">{progress.pending}</div>
                                                <div className="text-[10px] text-muted-foreground">Pending</div>
                                            </div>
                                            <div className="rounded-md border bg-muted/20 p-2">
                                                <div className="text-lg font-bold text-red-600">{progress.rejected}</div>
                                                <div className="text-[10px] text-muted-foreground">Rejected</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Approval Action Card with 3 buttons */}
                                {activePendingApproval && (
                                    <Card className="border-primary shadow-md">
                                        <CardHeader className="bg-primary/5 pb-3">
                                            <CardTitle className="flex items-center gap-2 text-base font-bold text-primary sm:text-lg">
                                                <IconPencil className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                                                Tindakan Diperlukan
                                            </CardTitle>
                                            <CardDescription className="text-xs sm:text-sm">Dokumen ini membutuhkan persetujuan Anda.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pt-4">
                                            <Button
                                                onClick={() => router.get(`/approvals/${activePendingApproval.id}`)}
                                                className="w-full bg-green-600 hover:bg-green-700 font-sans font-bold text-white shadow-sm"
                                            >
                                                <CheckCircle2Icon className="mr-2 h-4 w-4" />
                                                Setujui Dokumen
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => router.get(`/approvals/${activePendingApproval.id}`)}
                                                className="w-full border-amber-300 text-amber-800 bg-amber-50/80 hover:bg-amber-100 hover:text-amber-900 font-sans font-bold shadow-sm"
                                            >
                                                <IconRefresh className="mr-2 h-4 w-4" />
                                                Minta Revisi
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => router.get(`/approvals/${activePendingApproval.id}`)}
                                                className="w-full border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 font-sans font-bold shadow-sm"
                                            >
                                                <XCircleIcon className="mr-2 h-4 w-4" />
                                                Tolak Dokumen
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Manage Actions */}
                                {(dokumen?.status === 'draft' || dokumen?.status === 'rejected') && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-medium">Kelola Dokumen</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {dokumen?.status === 'draft' && (
                                                <Button
                                                    onClick={handleSubmitForApproval}
                                                    className="w-full justify-start bg-green-600 hover:bg-green-700"
                                                >
                                                    <IconSend className="mr-2 h-4 w-4" />
                                                    Submit Approval
                                                </Button>
                                            )}
                                            {['rejected', 'revision_requested', 'needs_revision'].includes(dokumen?.status || '') && dokumen?.user_id === auth.user.id && (
                                                <Button onClick={handleUploadRevision} className="w-full justify-start bg-blue-600 hover:bg-blue-700 font-sans">
                                                    <IconFileText className="mr-2 h-4 w-4" />
                                                    Upload Revisi
                                                </Button>
                                            )}
                                            <Button variant="outline" onClick={handleEdit} className="w-full justify-start">
                                                <IconEdit className="mr-2 h-4 w-4" />
                                                Edit Informasi
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleDelete}
                                                className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                                            >
                                                <IconTrash className="mr-2 h-4 w-4" />
                                                Hapus Dokumen
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dialogs */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                            <form onSubmit={handleSubmitEdit}>
                                <DialogHeader>
                                    <DialogTitle className="font-serif">Edit Dokumen</DialogTitle>
                                    <DialogDescription className="font-sans">Ubah informasi dokumen Anda di sini.</DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="judul_dokumen" className="font-sans">
                                            Judul Dokumen <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="judul_dokumen"
                                            name="judul_dokumen"
                                            value={formData.judul_dokumen}
                                            onChange={handleInputChange}
                                            className={errors.judul_dokumen ? 'border-red-500 font-sans' : 'font-sans'}
                                        />
                                        {errors.judul_dokumen && <p className="text-sm text-red-500">{errors.judul_dokumen[0]}</p>}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="tgl_deadline" className="font-sans">
                                            Deadline
                                        </Label>
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
                                        <Label htmlFor="deskripsi" className="font-sans">
                                            Deskripsi
                                        </Label>
                                        <Textarea
                                            id="deskripsi"
                                            name="deskripsi"
                                            value={formData.deskripsi}
                                            onChange={handleInputChange}
                                            className="font-sans"
                                            rows={4}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="file" className="font-sans">
                                            Upload File Baru (Opsional)
                                        </Label>
                                        <Input id="file" name="file" type="file" onChange={handleFileChange} className="font-sans" />
                                        <p className="text-xs text-muted-foreground">
                                            📄 <strong>Hanya file PDF yang diterima.</strong> Kosongkan jika tidak ingin mengganti file. Max 10MB.
                                        </p>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsEditDialogOpen(false)}
                                        disabled={isSubmitting}
                                        className="font-sans"
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="font-sans">
                                        {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Hapus Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin menghapus dokumen "<strong>{dokumen.judul_dokumen}</strong>"? Tindakan ini tidak dapat
                                    dibatalkan.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="font-sans">
                                    Batal
                                </Button>
                                <Button type="button" variant="destructive" onClick={confirmDelete} className="font-sans">
                                    Hapus
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Submit Confirmation Dialog */}
                    <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Submit untuk Approval</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin mengirim dokumen "<strong>{dokumen.judul_dokumen}</strong>" untuk approval?
                                    <br />
                                    <br />
                                    Setelah disubmit, dokumen akan masuk ke proses approval dan tidak dapat diedit kecuali ditolak.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsSubmitDialogOpen(false)} className="font-sans">
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-green-600 font-sans hover:bg-green-700"
                                    onClick={confirmSubmitForApproval}
                                    disabled={isSubmitting}
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Mengirim...' : 'Ya, Submit Sekarang'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Upload Revision Dialog */}
                    <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="font-serif">Upload Revisi Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Upload versi terbaru dokumen "<strong>{dokumen.judul_dokumen}</strong>".
                                    <br />
                                    <br />
                                    Setelah upload, dokumen akan direset ke status "Under Review" dan approval akan dimulai dari awal dengan versi
                                    baru.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="revision-file" className="font-sans">
                                        File Revisi *
                                    </Label>
                                    <Input id="revision-file" type="file" onChange={handleRevisionFileChange} className="font-sans" />
                                    <p className="text-xs text-muted-foreground">
                                        📄 <strong>Hanya file PDF yang diterima.</strong> Sistem tanda tangan digital hanya mendukung format PDF.
                                        Maksimal 10MB.
                                    </p>
                                    {revisionFile && <p className="text-sm text-green-600">✓ File dipilih: {revisionFile.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="revision-comment" className="font-sans">
                                        Catatan Revisi (Opsional)
                                    </Label>
                                    <Textarea
                                        id="revision-comment"
                                        placeholder="Jelaskan perubahan yang dilakukan..."
                                        value={revisionComment}
                                        onChange={(e) => setRevisionComment(e.target.value)}
                                        className="font-sans"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsRevisionDialogOpen(false)} className="font-sans">
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-blue-600 font-sans hover:bg-blue-700"
                                    onClick={confirmUploadRevision}
                                    disabled={isUploadingRevision || !revisionFile}
                                >
                                    <IconFileText className="mr-2 h-4 w-4" />
                                    {isUploadingRevision ? 'Mengupload...' : 'Upload Revisi'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* PDF Preview Dialog */}
                    <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
                        <DialogContent className="flex h-[90vh] max-w-[90vw] flex-col p-0">
                            <DialogHeader className="shrink-0 border-b p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
                                    <div>
                                        <DialogTitle className="font-serif">Preview Dokumen</DialogTitle>
                                        <DialogDescription className="font-sans">{previewFileName}</DialogDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant={previewMode === 'signed' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => togglePreviewMode('signed')}
                                            className={`h-8 text-xs font-sans ${previewMode === 'signed' ? 'bg-blue-600 hover:bg-blue-700 text-white font-medium' : 'border-gray-300 text-gray-700'}`}
                                        >
                                            ✍️ Ber-TTD & QR
                                        </Button>
                                        <Button
                                            variant={previewMode === 'original' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => togglePreviewMode('original')}
                                            className={`h-8 text-xs font-sans ${previewMode === 'original' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium' : 'border-gray-300 text-gray-700'}`}
                                        >
                                            📄 PDF Asli (Tanpa TTD)
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
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
