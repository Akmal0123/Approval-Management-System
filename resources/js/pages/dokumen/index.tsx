import { AppSidebar } from '@/components/app-sidebar';
import SignaturePlacementDialog from '@/components/signature-placement-dialog';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { IconDownload, IconEdit, IconEye, IconFileText, IconPlus, IconTrash } from '@tabler/icons-react';
import { Activity, CalendarIcon, CheckCircle2, Eye, FileTextIcon, SearchIcon, UserIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Aplikasi {
    id: number;
    nama_aplikasi?: string;
    name?: string;
    kode_aplikasi?: string;
    tipe_transaksi?: string;
    company?: {
        name: string;
    };
}

interface MasterTransaksiItem {
    id: number;
    aplikasi_id: number;
    kode_transaksi: string;
    nama_transaksi: string;
    kategori?: string;
    deskripsi?: string;
    aplikasi?: Aplikasi;
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
    jenis_group?: 'all_required' | 'any_one' | 'majority' | null;
    users_in_group?: number[] | null;
}

interface UserOption {
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
    status: string;
}

interface DokumenApproval {
    id: number;
    approval_status: string;
    tgl_approve?: string;
    tgl_deadline?: string;
    user?: User;
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

interface TransaksiItem {
    id: number;
    aplikasi_id: number;
    kode_transaksi: string;
    nama_transaksi: string;
    departemen?: string | null;
    deskripsi?: string | null;
    is_active: boolean;
    aplikasi?: {
        id: number;
        name: string;
    };
}

interface Dokumen {
    id: number;
    nomor_dokumen?: string;
    judul_dokumen: string;
    user_id: number;
    company_id?: number;
    aplikasi_id?: number;
    transaksi_id?: number | null;
    tipe_dokumen?: string;
    masterflow_id: number;
    status: string;
    tgl_pengajuan: string;
    tgl_deadline?: string;
    deskripsi?: string;
    status_current: string;
    user?: User;
    aplikasi?: { id: number; name: string };
    transaksi?: TransaksiItem;
    masterflow?: Masterflow;
    latest_version?: DokumenVersion;
    approvals?: DokumenApproval[];
    detailed_status?: DetailedStatus;
    created_at: string;
    updated_at: string;
}

interface CustomApprover {
    email: string;
    order: number;
    name?: string;
    jabatan?: string;
}

interface StepApprovers {
    userIds: number[];
    jenisGroup: 'all_required' | 'any_one' | 'majority' | null;
}

interface FormData {
    id_dokumen: string;
    nomor_dokumen: string;
    kategori_dokumen: 'manual' | 'transaksi';
    metode_dokumen: 'template' | 'upload_manual';
    aplikasi_id: string | number;
    transaksi_id?: string | number;
    master_transaksi_id: number | '';
    tipe_dokumen: string;
    judul_dokumen: string;
    nominal_transaksi?: string;
    masterflow_id: number | '' | 'custom';
    tgl_pengajuan: string;
    tgl_deadline: string;
    deskripsi: string;
    file: File | null;
    approvers: Record<number, number | ''>;
    custom_approvers: CustomApprover[];
    step_approvers: Record<number, StepApprovers>;
    signature_positions: any[] | null;
}

const initialFormData: FormData = {
    id_dokumen: '',
    nomor_dokumen: '',
    kategori_dokumen: 'manual',
    metode_dokumen: 'upload_manual',
    aplikasi_id: '',
    transaksi_id: '',
    master_transaksi_id: '',
    tipe_dokumen: '',
    judul_dokumen: '',
    nominal_transaksi: '',
    masterflow_id: '',
    tgl_pengajuan: new Date().toISOString().split('T')[0],
    tgl_deadline: '',
    deskripsi: '',
    file: null,
    approvers: {},
    custom_approvers: [{ email: '', order: 1 }],
    step_approvers: {},
    signature_positions: null,
};

export default function UserDokumen() {
    const { auth, context } = usePage().props as any;
    const [dokumen, setDokumen] = useState<Dokumen[]>([]);
    const [aplikasiList, setAplikasiList] = useState<any[]>([]);
    const [transaksis, setTransaksis] = useState<TransaksiItem[]>([]);
    const [selectedAplikasiId, setSelectedAplikasiId] = useState<string>('');
    const [docTypeMode, setDocTypeMode] = useState<'manual' | 'transaksi'>('manual');
    const [masterflows, setMasterflows] = useState<Masterflow[]>([]);
    const [masterTransaksis, setMasterTransaksis] = useState<MasterTransaksiItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDokumen, setSelectedDokumen] = useState<Dokumen | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitType, setSubmitType] = useState<'draft' | 'submit'>('draft');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedMasterflow, setSelectedMasterflow] = useState<Masterflow | null>(null);
    const [availableApprovers, setAvailableApprovers] = useState<Record<number, UserOption[]>>({});
    const [stepModes, setStepModes] = useState<Record<number, 'single' | 'group'>>({});
    const [updatedDokumenIds, setUpdatedDokumenIds] = useState<Set<number>>(new Set());

    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
    const [pendingApprovalsForDialog, setPendingApprovalsForDialog] = useState<any[]>([]);

    // State for Tarik Data & File PDF Eksternal
    const [externalDocKeyword, setExternalDocKeyword] = useState('');
    const [isFetchingExternal, setIsFetchingExternal] = useState(false);
    const [externalFetchSuccess, setExternalFetchSuccess] = useState<{
        nomor_dokumen: string;
        judul: string;
        nominal: number;
        items_count: number;
        filename: string;
    } | null>(null);

    // Determine user profile & accessible aplikasis
    const isSuperAdmin = Boolean(
        context?.is_super_admin ||
        auth.user?.userAuths?.some((ua: any) => ua.role?.role_name?.toLowerCase() === 'super admin') ||
        auth.user?.user_auths?.some((ua: any) => ua.role?.role_name?.toLowerCase() === 'super admin')
    );

    const userAuthsList = auth.user?.userAuths || auth.user?.user_auths || [];
    const userAplikasiIds = new Set<number>();
    userAuthsList.forEach((ua: any) => {
        if (ua.aplikasi_id) userAplikasiIds.add(Number(ua.aplikasi_id));
        if (ua.aplikasi?.id) userAplikasiIds.add(Number(ua.aplikasi.id));
    });
    if (context?.current?.aplikasi?.id) {
        userAplikasiIds.add(Number(context.current.aplikasi.id));
    }

    const accessibleAplikasiList = (isSuperAdmin || userAplikasiIds.size === 0)
        ? aplikasiList
        : aplikasiList.filter((app) => userAplikasiIds.has(Number(app.id)));

    // Fetch dokumen from backend
    const fetchDokumen = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/dokumen', {
                params: { my_documents: true },
            });
            const newDokumen = response.data.data || response.data;
            console.log('📊 Total dokumen received:', newDokumen.length);
            setDokumen(newDokumen);
        } catch (error) {
            console.error('Error fetching dokumen:', error);
            showToast.error('❌ Gagal memuat daftar dokumen.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch aplikasi for dropdown
    const fetchAplikasi = async () => {
        try {
            const response = await api.get('/aplikasis');
            setAplikasiList(response.data.aplikasis || response.data.data || []);
        } catch (error) {
            console.error('Error fetching aplikasi:', error);
        }
    };

    // Fetch transaksis from backend
    const fetchTransaksis = async () => {
        try {
            console.log('Fetching transaksis...');
            const response = await api.get('/transaksis', {
                params: { is_active: true },
            });
            setTransaksis(response.data.transaksis || response.data.data || []);
        } catch (error) {
            console.error('Error fetching transaksis:', error);
        }
    };

    // Handle saat dropdown Aplikasi dipilih
    const handleAplikasiChange = (value: string) => {
        setSelectedAplikasiId(value);
        setFormData((prev) => ({
            ...prev,
            aplikasi_id: value,
            transaksi_id: '',
        }));
    };

    // Handle Tarik Data & File PDF Eksternal via kode dokumen
    const handleFetchExternalData = async (keywordToUse?: string) => {
        const query = (keywordToUse || externalDocKeyword).trim();
        if (!query) {
            showToast.error('Masukkan kode dokumen transaksi terlebih dahulu (misal: RQE-22001434)');
            return;
        }

        setIsFetchingExternal(true);
        try {
            const response = await api.post('/dokumen/lookup-external', {
                keyword: query,
                aplikasi_id: formData.aplikasi_id || selectedAplikasiId || null,
                transaksi_id: formData.transaksi_id || null,
            });

            if (response.data.status === 'success') {
                const data = response.data.data;
                showToast.success('✓ Data & Template PDF berhasil ditarik!');

                // Convert base64 PDF to File object
                const byteCharacters = atob(data.pdf_base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const file = new File([blob], data.filename || `${query}.pdf`, { type: 'application/pdf' });

                // Update local preview URL
                if (localFileUrl) {
                    URL.revokeObjectURL(localFileUrl);
                }
                const newFileUrl = URL.createObjectURL(file);
                setLocalFileUrl(newFileUrl);

                // Try to find matching transaksi_id if not selected yet
                let matchedTransaksiId = formData.transaksi_id;
                if (!matchedTransaksiId && transaksis.length > 0) {
                    const currentAppId = String(formData.aplikasi_id || selectedAplikasiId || '');
                    const appTrans = transaksis.filter((t) => !currentAppId || String(t.aplikasi_id) === currentAppId);
                    const found = appTrans.find((t) => {
                        const tk = t.kode_transaksi.toUpperCase();
                        const dtype = (data.tipe || '').toUpperCase();
                        return (
                            tk === dtype ||
                            (dtype === 'PR' && (tk.includes('PR') || tk.includes('RQE'))) ||
                            (dtype === 'PO' && (tk.includes('PO') || tk.includes('POE'))) ||
                            (dtype === 'CCA' && (tk.includes('CCA') || tk.includes('NPK')))
                        );
                    });
                    if (found) {
                        matchedTransaksiId = String(found.id);
                    }
                }

                setFormData((prev) => ({
                    ...prev,
                    nomor_dokumen: data.nomor_dokumen || prev.nomor_dokumen,
                    judul_dokumen: data.judul || prev.judul_dokumen,
                    tgl_pengajuan: data.tanggal || prev.tgl_pengajuan,
                    deskripsi: data.deskripsi ? data.deskripsi : prev.deskripsi,
                    transaksi_id: matchedTransaksiId || prev.transaksi_id,
                    file: file,
                }));

                setExternalFetchSuccess({
                    nomor_dokumen: data.nomor_dokumen,
                    judul: data.judul,
                    nominal: data.nominal,
                    items_count: data.items_count,
                    filename: data.filename,
                });
            }
        } catch (error: any) {
            console.error('Error fetching external transaction data:', error);
            const msg = error.response?.data?.message || 'Data transaksi tidak ditemukan.';
            showToast.error(`❌ ${msg}`);
        } finally {
            setIsFetchingExternal(false);
        }
    };

    // Fetch masterflows
    const fetchMasterflows = async () => {
        try {
            const response = await api.get('/masterflows');
            console.log('Masterflows fetched:', response.data);
            setMasterflows(response.data.masterflows || []);
        } catch (error) {
            console.error('Error fetching masterflows:', error);
            showToast.error('❌ Failed to load masterflows.');
        }
    };

    useEffect(() => {
        if (!auth.user) {
            showToast.error('❌ Please login first to access Documents.');
            window.location.href = '/';
            return;
        }

        fetchDokumen();
        fetchMasterflows();
        fetchAplikasi();
        fetchTransaksis();

        // Real-time updates dengan Laravel Reverb
        if (typeof window !== 'undefined' && window.Echo && auth.user?.id) {
            const userChannelName = `user.${auth.user.id}.dokumen`;
            const channel = window.Echo.channel(userChannelName);

            channel.listen('dokumen.updated', (event: any) => {
                if (event.dokumen?.id) {
                    setDokumen((prevDokumen) =>
                        prevDokumen.map((doc) =>
                            doc.id === event.dokumen.id
                                ? {
                                      ...doc,
                                      ...event.dokumen,
                                      user: event.dokumen.user || doc.user,
                                      masterflow: event.dokumen.masterflow || doc.masterflow,
                                      latest_version: event.dokumen.latest_version || doc.latest_version,
                                      approvals: event.dokumen.approvals || doc.approvals,
                                      detailed_status: event.dokumen.detailed_status || doc.detailed_status,
                                  }
                                : doc
                        )
                    );

                    setUpdatedDokumenIds((prev) => new Set(prev).add(event.dokumen.id));
                    setTimeout(() => {
                        setUpdatedDokumenIds((prev) => {
                            const newSet = new Set(prev);
                            newSet.delete(event.dokumen.id);
                            return newSet;
                        });
                    }, 2000);
                }

                const statusText = event.dokumen?.status === 'approved' ? 'disetujui' : 'diupdate';
                showToast.success(`📡 Dokumen "${event.dokumen?.judul_dokumen || ''}" telah ${statusText}!`);
            });

            return () => {
                window.Echo.leave(userChannelName);
            };
        }
    }, [auth.user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: '',
            }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                showToast.error('❌ Format file harus PDF!');
                e.target.value = '';
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast.error('❌ Ukuran file maksimal 10MB!');
                e.target.value = '';
                return;
            }

            setFormData((prev) => ({
                ...prev,
                file: file,
            }));

            if (localFileUrl) {
                URL.revokeObjectURL(localFileUrl);
            }
            setLocalFileUrl(URL.createObjectURL(file));

            if (errors.file) {
                setErrors((prev) => ({
                    ...prev,
                    file: '',
                }));
            }
        }
    };

    const generateDocumentNumber = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        return `${year}${month}${random}`;
    };

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

        if (errors.masterflow_id) {
            setErrors((prev) => ({
                ...prev,
                masterflow_id: '',
            }));
        }

        const selected = masterflows.find((mf) => mf.id === masterflowId);
        if (selected) {
            try {
                const response = await api.get(`/masterflows/${masterflowId}/steps`);
                const masterflowWithSteps = {
                    ...selected,
                    steps: response.data.steps || [],
                };
                setSelectedMasterflow(masterflowWithSteps);

                const approversData: Record<number, UserOption[]> = {};
                for (const step of masterflowWithSteps.steps || []) {
                    if (step.jabatan_id) {
                        try {
                            const usersResponse = await api.get(`/users-by-jabatan/${step.jabatan_id}`);
                            approversData[step.id] = usersResponse.data || [];
                        } catch {
                            approversData[step.id] = [];
                        }
                    }
                }
                setAvailableApprovers(approversData);
            } catch {
                setSelectedMasterflow({ ...selected, steps: [] });
            }
        }
    };

    const handleCustomApproverChange = (index: number, field: 'email' | 'order', value: string | number) => {
        setFormData((prev) => {
            const newCustomApprovers = [...prev.custom_approvers];
            newCustomApprovers[index] = { ...newCustomApprovers[index], [field]: value };
            return { ...prev, custom_approvers: newCustomApprovers };
        });
    };

    const addCustomApprover = () => {
        setFormData((prev) => ({
            ...prev,
            custom_approvers: [...prev.custom_approvers, { email: '', order: prev.custom_approvers.length + 1 }],
        }));
    };

    const removeCustomApprover = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            custom_approvers: prev.custom_approvers.filter((_, i) => i !== index).map((a, idx) => ({ ...a, order: idx + 1 })),
        }));
    };

    const handleApproverChange = (stepId: number, userId: string) => {
        setFormData((prev) => ({
            ...prev,
            approvers: {
                ...prev.approvers,
                [stepId]: userId === '' ? '' : Number(userId),
            },
        }));
    };

    const toggleStepMode = (stepId: number) => {
        setStepModes((prev) => {
            const currentMode = prev[stepId] || 'single';
            const newMode = currentMode === 'single' ? 'group' : 'single';

            if (newMode === 'single') {
                setFormData((prevForm) => {
                    const newStepApprovers = { ...prevForm.step_approvers };
                    delete newStepApprovers[stepId];
                    return { ...prevForm, step_approvers: newStepApprovers };
                });
            } else {
                setFormData((prevForm) => ({
                    ...prevForm,
                    approvers: { ...prevForm.approvers, [stepId]: '' },
                }));
            }

            return { ...prev, [stepId]: newMode };
        });
    };

    const handleMultipleApproverChange = (stepId: number, userId: number, checked: boolean) => {
        setFormData((prev) => {
            const currentStepApprovers = prev.step_approvers[stepId] || { userIds: [], jenisGroup: null };
            const newUserIds = checked ? [...currentStepApprovers.userIds, userId] : currentStepApprovers.userIds.filter((id) => id !== userId);
            return {
                ...prev,
                step_approvers: {
                    ...prev.step_approvers,
                    [stepId]: { ...currentStepApprovers, userIds: newUserIds },
                },
            };
        });
    };

    const handleJenisGroupChange = (stepId: number, jenisGroup: 'all_required' | 'any_one' | 'majority') => {
        setFormData((prev) => {
            const currentStepApprovers = prev.step_approvers[stepId] || { userIds: [], jenisGroup: null };
            return {
                ...prev,
                step_approvers: {
                    ...prev.step_approvers,
                    [stepId]: { ...currentStepApprovers, jenisGroup },
                },
            };
        });
    };

    const handleCreate = async () => {
        try {
            await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
        } catch {
            // ignore
        }

        const defaultAppId = context?.current?.aplikasi?.id
            ? String(context.current.aplikasi.id)
            : accessibleAplikasiList.length === 1
                ? String(accessibleAplikasiList[0].id)
                : '';

        // Generate new document number
        const newFormData: FormData = {
            ...initialFormData,
            id_dokumen: generateDocumentNumber(),
            nomor_dokumen: '',
            tipe_dokumen: '',
            tgl_pengajuan: new Date().toISOString().split('T')[0],
            custom_approvers: [{ email: '', order: 1 }],
            aplikasi_id: defaultAppId,
            tipe_dokumen: 'manual',
        };
        setSelectedMasterflow(null);
        setAvailableApprovers({});
        setStepModes({}); // Reset step modes
        setSelectedAplikasiId(defaultAppId);
        setDocTypeMode('manual');
        setExternalDocKeyword('');
        setExternalFetchSuccess(null);
        setErrors({});
        setFormData(newFormData);
        setIsCreateDialogOpen(true);
    };

    const openSignatureDialog = () => {
        if (!formData.file || !localFileUrl) {
            showToast.error('Silakan upload file PDF terlebih dahulu.');
            return;
        }

        const generatedApprovals: any[] = [];

        if (formData.masterflow_id === 'custom') {
            formData.custom_approvers.forEach((app, idx) => {
                if (app.email) {
                    generatedApprovals.push({
                        id: `custom_${idx}`,
                        approver_email: app.email,
                        step_name: `Tingkat ${app.order}`,
                        user: { name: app.email },
                    });
                }
            });
        } else if (selectedMasterflow && selectedMasterflow.steps) {
            selectedMasterflow.steps.forEach((step) => {
                if (stepModes[step.id] === 'group') {
                    generatedApprovals.push({
                        id: `group_${step.id}`,
                        step_name: step.step_name,
                        jabatan_name: step.jabatan?.name || 'Group',
                        user: { name: `Group Approval (${step.step_name})` },
                    });
                } else {
                    const userId = formData.approvers[step.id];
                    const user = availableApprovers[step.id]?.find((u) => u.id === userId);
                    if (userId) {
                        generatedApprovals.push({
                            id: `step_${step.id}_user_${userId}`,
                            step_name: step.step_name,
                            jabatan_name: step.jabatan?.name,
                            user: { name: user ? user.name : `Approver ${step.step_name}` },
                        });
                    }
                }
            });
        }

        if (generatedApprovals.length === 0) {
            showToast.error('Silakan tentukan minimal 1 approver terlebih dahulu.');
            return;
        }

        setPendingApprovalsForDialog(generatedApprovals);
        setSignatureDialogOpen(true);
    };

    const renderError = (err: any) => {
        if (!err) return null;
        if (Array.isArray(err)) return err[0];
        return String(err);
    };

    const handleSubmit = async (e: React.FormEvent, type: 'draft' | 'submit') => {
        e.preventDefault();

        const validationErrors: Record<string, string> = {};
        if (!formData.judul_dokumen.trim()) {
            validationErrors.judul_dokumen = 'Judul dokumen wajib diisi.';
        }

        const isFileWajib =
            formData.kategori_dokumen === 'manual' ||
            (formData.kategori_dokumen === 'transaksi' && formData.metode_dokumen === 'upload_manual');

        if (isFileWajib && !formData.file) {
            validationErrors.file = 'File dokumen utama (PDF) wajib diunggah.';
        }

        if (!formData.tgl_deadline) {
            validationErrors.tgl_deadline = 'Tanggal deadline wajib diisi.';
        }
        if (formData.masterflow_id === '') {
            validationErrors.masterflow_id = 'Pilih Masterflow atau Custom Approval.';
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            const firstMsg = Object.values(validationErrors)[0];
            showToast.error(`❌ ${firstMsg}`);
            return;
        }

        setSubmitType(type);
        setIsSubmitting(true);
        setErrors({});

        try {
            await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
            await new Promise((resolve) => setTimeout(resolve, 100));

            const submitData = new FormData();
            submitData.append('id_dokumen', formData.id_dokumen || generateDocumentNumber());
            submitData.append('nomor_dokumen', formData.nomor_dokumen || '');
            submitData.append('kategori_dokumen', formData.kategori_dokumen || 'manual');
            submitData.append('metode_dokumen', formData.metode_dokumen || 'upload_manual');
            if (formData.master_transaksi_id) {
                submitData.append('master_transaksi_id', String(formData.master_transaksi_id));
            }
            submitData.append('tipe_dokumen', formData.tipe_dokumen || '');
            submitData.append('judul_dokumen', formData.judul_dokumen);
            submitData.append('tgl_pengajuan', formData.tgl_pengajuan);
            submitData.append('tgl_deadline', formData.tgl_deadline);
            submitData.append('deskripsi', formData.deskripsi);
            submitData.append('submit_type', type); // Add submit type: 'draft' or 'submit'
            submitData.append('tipe_dokumen', docTypeMode);

            if (docTypeMode === 'transaksi') {
                if (formData.aplikasi_id) submitData.append('aplikasi_id', formData.aplikasi_id.toString());
                if (formData.transaksi_id) submitData.append('transaksi_id', formData.transaksi_id.toString());
            }

            if (formData.file) {
                submitData.append('file', formData.file);
            }

            if (formData.signature_positions && formData.signature_positions.length > 0) {
                submitData.append('signature_positions', JSON.stringify(formData.signature_positions));
            }

            if (formData.masterflow_id === 'custom') {
                submitData.append('masterflow_id', 'custom');
                const validCustomApprovers = formData.custom_approvers.filter((a) => a.email && a.email.trim() !== '');
                validCustomApprovers.forEach((approver, index) => {
                    submitData.append(`custom_approvers[${index}][email]`, approver.email.trim());
                    submitData.append(`custom_approvers[${index}][order]`, String(approver.order || index + 1));
                    if (approver.name) submitData.append(`custom_approvers[${index}][name]`, approver.name);
                    if (approver.jabatan) submitData.append(`custom_approvers[${index}][jabatan]`, approver.jabatan);
                });
            } else {
                submitData.append('masterflow_id', formData.masterflow_id.toString());
                Object.entries(formData.step_approvers).forEach(([stepId, stepApprover]) => {
                    if (stepApprover.userIds && stepApprover.userIds.length > 0 && stepApprover.jenisGroup) {
                        submitData.append(`step_approvers[${stepId}][jenis_group]`, stepApprover.jenisGroup);
                        stepApprover.userIds.forEach((userId, index) => {
                            submitData.append(`step_approvers[${stepId}][user_ids][${index}]`, userId.toString());
                        });
                    }
                });

                Object.entries(formData.approvers).forEach(([stepId, userId]) => {
                    if (userId !== '' && !formData.step_approvers[Number(stepId)]) {
                        submitData.append(`approvers[${stepId}]`, userId.toString());
                    }
                });
            }

            router.post('/api/dokumen', submitData, {
                forceFormData: true,
                preserveState: true,
                preserveScroll: false,
                onSuccess: () => {
                    const message =
                        type === 'draft'
                            ? `📝 Dokumen "${formData.judul_dokumen}" berhasil disimpan sebagai draft!`
                            : `🎉 Dokumen "${formData.judul_dokumen}" berhasil disubmit untuk approval!`;
                    showToast.success(message);
                    setIsCreateDialogOpen(false);
                    setFormData(initialFormData);
                    setStepModes({});
                    fetchDokumen();
                },
                onError: (errs: any) => {
                    console.error('Form submission errors:', errs);
                    setErrors(errs);
                    const errorMessage = errs.error || 'Failed to create document. Please check the form.';
                    showToast.error(`❌ ${errorMessage}`);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            });
        } catch (error: any) {
            setIsSubmitting(false);
            showToast.error(`❌ Gagal menyimpan dokumen. ${error.message}`);
        }
    };

    const handleDelete = (doc: Dokumen) => {
        setSelectedDokumen(doc);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedDokumen) return;
        try {
            await api.delete(`/dokumen/${selectedDokumen.id}`);
            showToast.success(`🎉 Dokumen berhasil dihapus!`);
            setIsDeleteDialogOpen(false);
            setSelectedDokumen(null);
            fetchDokumen();
        } catch {
            showToast.error(`❌ Gagal menghapus dokumen.`);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800 border-gray-300' },
            submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-800 border-blue-300' },
            under_review: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
            approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-300' },
            rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-300' },
            needs_revision: { label: 'Perlu Revisi', className: 'bg-purple-100 text-purple-800 border-purple-300' },
        };

        const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-800 border-gray-300' };
        return (
            <Badge variant="outline" className={`font-sans ${config.className}`}>
                {config.label}
            </Badge>
        );
    };

    const filteredDokumen = dokumen.filter((doc) => {
        const matchesSearch =
            doc.judul_dokumen.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.masterflow?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: dokumen.length,
        draft: dokumen.filter((d) => d.status === 'draft').length,
        submitted: dokumen.filter((d) => d.status === 'submitted' || d.status === 'under_review').length,
        approved: dokumen.filter((d) => d.status === 'approved').length,
    };

    const filteredTransaksis = formData.aplikasi_id
        ? masterTransaksis.filter((t: any) => {
              const appId = t.aplikasi_id || t.aplikasi?.id || t.master_aplikasi_id;
              return String(appId) === String(formData.aplikasi_id);
          })
        : masterTransaksis;

    return (
        <>
            <Head title="My Documents" />
            <SidebarProvider>
                <NotificationListener />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col w-full max-w-full overflow-x-hidden">
                        <div className="@container/main flex flex-1 flex-col gap-2 p-3 sm:p-6 w-full max-w-full overflow-x-hidden">
                            <div className="space-y-8">
                                {/* Header Section */}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-foreground">
                                            <IconFileText className="h-6 w-6 text-primary" />
                                            Dokumen Saya
                                        </h1>
                                        <p className="font-sans text-sm text-muted-foreground">Kelola dan ajukan dokumen untuk persetujuan</p>
                                    </div>
                                    <Button onClick={handleCreate} className="font-sans">
                                        <IconPlus className="mr-2 h-4 w-4" />
                                        Buat Dokumen
                                    </Button>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid gap-4 md:grid-cols-4">
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Total Dokumen</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">{stats.total}</p>
                                                </div>
                                                <FileTextIcon className="h-8 w-8 text-blue-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Draft</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">{stats.draft}</p>
                                                </div>
                                                <UserIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Menunggu Persetujuan</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">{stats.submitted}</p>
                                                </div>
                                                <CalendarIcon className="h-8 w-8 text-orange-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Disetujui</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">{stats.approved}</p>
                                                </div>
                                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Search and Filter */}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative flex-1">
                                        <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Cari dokumen..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 font-sans"
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[180px] font-sans">
                                            <SelectValue placeholder="Filter Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="font-sans">Semua Status</SelectItem>
                                            <SelectItem value="draft" className="font-sans">Draft</SelectItem>
                                            <SelectItem value="submitted" className="font-sans">Submitted</SelectItem>
                                            <SelectItem value="under_review" className="font-sans">Under Review</SelectItem>
                                            <SelectItem value="approved" className="font-sans">Approved</SelectItem>
                                            <SelectItem value="rejected" className="font-sans">Rejected</SelectItem>
                                            <SelectItem value="needs_revision" className="font-sans">Perlu Revisi</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Documents Table */}
                                <div className="space-y-6">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="text-center">
                                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                                                <p className="mt-2 text-sm text-gray-600">Loading dokumen...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <Card className="border-border bg-card">
                                            <CardContent className="p-0">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-16 font-sans">No</TableHead>
                                                            <TableHead className="min-w-64 font-sans">Judul Dokumen</TableHead>
                                                            <TableHead className="w-48 font-sans">Masterflow</TableHead>
                                                            <TableHead className="w-40 font-sans">Status</TableHead>
                                                            <TableHead className="min-w-64 font-sans">Current Step</TableHead>
                                                            <TableHead className="w-40 font-sans">Tanggal Pengajuan</TableHead>
                                                            <TableHead className="w-32 text-right font-sans">Aksi</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredDokumen.length > 0 ? (
                                                            filteredDokumen.map((doc, index) => (
                                                                <TableRow
                                                                    key={doc.id}
                                                                    className={`transition-all duration-500 ${
                                                                        updatedDokumenIds.has(doc.id) ? 'bg-green-50 dark:bg-green-950/20' : ''
                                                                    }`}
                                                                >
                                                                    <TableCell className="font-mono">{index + 1}</TableCell>
                                                                    <TableCell className="font-sans">
                                                                        <div className="flex flex-col gap-1.5">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="font-medium text-foreground">{doc.judul_dokumen}</span>
                                                                                {doc.nomor_dokumen && (
                                                                                    <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                                                                                        {doc.nomor_dokumen}
                                                                                    </Badge>
                                                                                )}
                                                                                {doc.transaksi && (
                                                                                    <Badge className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 text-[10px] font-mono">
                                                                                        {doc.transaksi.kode_transaksi}
                                                                                    </Badge>
                                                                                )}
                                                                                {doc.aplikasi && (
                                                                                    <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                                        {doc.aplikasi.name}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {doc.deskripsi && (
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {doc.deskripsi.substring(0, 80)}
                                                                                    {doc.deskripsi.length > 80 ? '...' : ''}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="font-sans">
                                                                        {doc.masterflow?.name || (doc.masterflow_id === null ? '✨ Custom Approval' : '-')}
                                                                    </TableCell>
                                                                    <TableCell className="font-sans">{getStatusBadge(doc.status)}</TableCell>
                                                                    <TableCell className="font-sans">
                                                                        {doc.detailed_status?.current_step_description ? (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {doc.detailed_status.current_step_description}
                                                                            </span>
                                                                        ) : doc.detailed_status?.is_fully_approved ? (
                                                                            <span className="text-xs font-medium text-green-600">✓ Semua sudah approve</span>
                                                                        ) : doc.detailed_status?.is_rejected ? (
                                                                            <span className="text-xs font-medium text-red-600">✗ Ditolak</span>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400">-</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="font-sans">
                                                                        {new Date(doc.tgl_pengajuan).toLocaleDateString('id-ID')}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <div className="flex justify-end gap-2">
                                                                            <Link href={`/dokumen/${doc.id}`}>
                                                                                <Button variant="outline" size="sm" className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50">
                                                                                    <Eye className="h-4 w-4" />
                                                                                </Button>
                                                                            </Link>
                                                                            {doc.status === 'draft' && (
                                                                                <>
                                                                                    <Link href={`/dokumen/${doc.id}/edit`}>
                                                                                        <Button variant="outline" size="sm" className="h-8 w-8 border-green-300 p-0 text-green-600 hover:bg-green-50">
                                                                                            <IconEdit className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </Link>
                                                                                    <Button variant="outline" size="sm" onClick={() => handleDelete(doc)} className="h-8 w-8 border-red-300 p-0 text-red-600 hover:bg-red-50">
                                                                                        <IconTrash className="h-4 w-4" />
                                                                                    </Button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={7} className="py-8 text-center font-sans text-gray-500">
                                                                    {searchQuery || statusFilter !== 'all'
                                                                        ? 'Tidak ada dokumen yang sesuai dengan filter'
                                                                        : 'Belum ada dokumen. Klik "Buat Dokumen" untuk memulai.'}
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Create Document Dialog */}
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] max-w-[500px] p-4 sm:p-6 mx-auto rounded-xl box-border overflow-x-hidden">
                            <form onSubmit={(e) => e.preventDefault()} className="w-full space-y-4">
                                <DialogHeader>
                                    <DialogTitle className="font-serif">Buat Dokumen Baru</DialogTitle>
                                    <DialogDescription className="font-sans">
                                        Isi formulir di bawah untuk membuat dokumen baru.
                                    </DialogDescription>
                                </DialogHeader>

                                {/* SWITCHER TAB */}
                                <div className="flex bg-slate-100 dark:bg-muted/50 p-1 rounded-lg border my-3">
                                    <button
                                        type="button"
                                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                                            docTypeMode === 'manual'
                                                ? 'bg-white dark:bg-background text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold'
                                                : 'text-slate-500 hover:text-slate-800 dark:text-muted-foreground dark:hover:text-foreground'
                                        }`}
                                        onClick={() => {
                                            setDocTypeMode('manual');
                                            setFormData((prev) => ({
                                                ...prev,
                                                tipe_dokumen: 'manual',
                                            }));
                                        }}
                                    >
                                        Dokumen Manual
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                                            docTypeMode === 'transaksi'
                                                ? 'bg-white dark:bg-background text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold'
                                                : 'text-slate-500 hover:text-slate-800 dark:text-muted-foreground dark:hover:text-foreground'
                                        }`}
                                        onClick={() => {
                                            setDocTypeMode('transaksi');
                                            const defaultApp = formData.aplikasi_id
                                                ? String(formData.aplikasi_id)
                                                : context?.current?.aplikasi?.id
                                                    ? String(context.current.aplikasi.id)
                                                    : accessibleAplikasiList.length > 0
                                                        ? String(accessibleAplikasiList[0].id)
                                                        : '';
                                            setFormData((prev) => ({
                                                ...prev,
                                                aplikasi_id: defaultApp,
                                                tipe_dokumen: 'transaksi',
                                            }));
                                            if (defaultApp) {
                                                setSelectedAplikasiId(defaultApp);
                                            }
                                        }}
                                    >
                                        Dokumen Transaksi
                                    </button>
                                </div>

                                <div className="grid gap-4 py-2">
                                    {/* FORM KHUSUS DOKUMEN TRANSAKSI */}
                                    {docTypeMode === 'transaksi' && (
                                        <div className="space-y-3">
                                            {/* TARIK DATA & FILE PDF EKSTERNAL */}
<div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 w-full max-w-full overflow-hidden box-border">
    <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
            <IconDownload className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
            <Label className="font-sans font-semibold text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                <span>Tarik Data & File PDF</span>
                <span className="text-[9px] font-normal font-mono px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                    Otomatis
                </span>
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Masukkan kode transaksi untuk menarik data dan menyusun dokumen PDF secara otomatis
            </p>
        </div>
    </div>

    {/* Input & Tombol Tarik (Dipaksa Sejajar tapi Aman) */}
    <div className="flex items-center gap-1.5 w-full">
        <div className="relative flex-1 min-w-0">
            <Input
                placeholder="Ketik kode (cth: RQE-22001434)"
                value={externalDocKeyword}
                onChange={(e) => setExternalDocKeyword(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFetchExternalData();
                    }
                }}
                className="font-mono text-[11px] uppercase h-8 px-2 pr-6 w-full min-w-0 truncate"
            />
            {externalDocKeyword && (
                <button
                    type="button"
                    onClick={() => setExternalDocKeyword('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                    ✕
                </button>
            )}
        </div>
        <Button
            type="button"
            onClick={() => handleFetchExternalData()}
            disabled={isFetchingExternal || !externalDocKeyword.trim()}
            className="h-8 px-2.5 font-sans text-xs gap-1 shrink-0"
        >
            <IconDownload className="h-3 w-3" />
            <span>Tarik</span>
        </Button>
    </div>

                                                {/* Quick selection sample chips */}
                                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                                    <span className="text-[10px] text-muted-foreground font-sans">Contoh:</span>
                                                    {[
                                                        { code: 'RQE-22001434', label: 'RQE-22001434' },
                                                        { code: 'POE-22005020', label: 'POE-22005020' },
                                                        { code: 'CCA-00000002', label: 'CCA-00000002' },
                                                    ].map((sample) => (
                                                        <button
                                                            key={sample.code}
                                                            type="button"
                                                            onClick={() => {
                                                                setExternalDocKeyword(sample.code);
                                                                handleFetchExternalData(sample.code);
                                                            }}
                                                            disabled={isFetchingExternal}
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-border bg-background text-foreground hover:bg-muted"
                                                        >
                                                            <span>{sample.label}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Success Banner */}
                                                {externalFetchSuccess && (
                                                    <div className="rounded-md border border-border bg-background p-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary">
                                                                    ✓
                                                                </div>
                                                                <span className="text-sm font-semibold text-foreground font-sans">
                                                                    Template PDF Berhasil Dibuat
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-[11px] font-bold text-foreground bg-muted px-2 py-0.5 rounded border border-border">
                                                                Rp {Number(externalFetchSuccess.nominal).toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground font-sans space-y-0.5">
                                                            <p><strong className="text-foreground">No. Dokumen:</strong> {externalFetchSuccess.nomor_dokumen}</p>
                                                            <p><strong className="text-foreground">Judul:</strong> {externalFetchSuccess.judul}</p>
                                                            <p><strong className="text-foreground">File Terlampir:</strong> {externalFetchSuccess.filename} ({externalFetchSuccess.items_count} item transaksi)</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 pt-1 border-t border-border">
                                                            {localFileUrl && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => window.open(localFileUrl, '_blank')}
                                                                    className="h-7 text-xs font-sans gap-1 cursor-pointer"
                                                                >
                                                                    <IconEye className="h-3.5 w-3.5" />
                                                                    Pratinjau PDF
                                                                </Button>
                                                            )}
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={openSignatureDialog}
                                                                className="h-7 text-xs font-sans gap-1 cursor-pointer"
                                                            >
                                                                <IconEdit className="h-3.5 w-3.5" />
                                                                Atur Posisi Tanda Tangan
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Aplikasi & Tipe Transaksi Grid */}
                                            <div className="grid gap-4 rounded-lg border border-border bg-muted/30 30 p-3 sm:p-4 w-full max-w-full overflow-hidden">
                                                <Label className="font-sans font-semibold">Aplikasi & Tipe Transaksi</Label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="grid gap-2 min-w-0 overflow-hidden">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-xs text-muted-foreground">
                                                                Aplikasi Modul <span className="text-destructive">*</span>
                                                            </span>
                                                            {!isSuperAdmin && (
                                                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
                                                                    Sesuai Profil
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Select
                                                            value={String(formData.aplikasi_id || selectedAplikasiId || '')}
                                                            onValueChange={(value) => {
                                                                handleAplikasiChange(value);
                                                            }}
                                                        >
                                                            <SelectTrigger id="aplikasi_id" className="w-full min-w-0 font-sans truncate">
                                                                <SelectValue placeholder="-- Pilih Aplikasi --" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {accessibleAplikasiList && accessibleAplikasiList.length > 0 ? (
                                                                    accessibleAplikasiList.map((app) => (
                                                                        <SelectItem key={app.id} value={app.id.toString()} className="font-sans">
                                                                            {app.name} {app.company ? `(${app.company.name})` : ''}
                                                                        </SelectItem>
                                                                    ))
                                                                ) : (
                                                                    <SelectItem value="empty" disabled className="font-sans">
                                                                        {aplikasiList.length === 0 ? 'Memuat data aplikasi...' : 'Tidak ada aplikasi untuk profil Anda'}
                                                                    </SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="grid gap-2 min-w-0 overflow-hidden">
                                                        <span className="text-xs text-muted-foreground">
                                                            Tipe Transaksi <span className="text-destructive">*</span>
                                                        </span>
                                                        {(() => {
                                                            const currentAppId = String(formData.aplikasi_id || selectedAplikasiId || '');
                                                            const currentAppTrans = transaksis.filter(
                                                                (t) => String(t.aplikasi_id) === currentAppId && t.is_active
                                                            );

                                                            return (
                                                                <Select
                                                                    value={String(formData.transaksi_id || '')}
                                                                    onValueChange={(value) => {
                                                                        const chosen = currentAppTrans.find((t) => String(t.id) === value);
                                                                        setFormData((prev) => ({
                                                                            ...prev,
                                                                            transaksi_id: value,
                                                                            judul_dokumen: !prev.judul_dokumen || prev.judul_dokumen === 'Jurnal Besar Keuangan'
                                                                                ? (chosen ? chosen.nama_transaksi : prev.judul_dokumen)
                                                                                : prev.judul_dokumen,
                                                                            deskripsi: prev.deskripsi ? prev.deskripsi : (chosen?.deskripsi || prev.deskripsi),
                                                                        }));
                                                                    }}
                                                                    disabled={!currentAppId}
                                                                >
                                                                    <SelectTrigger id="transaksi_id" className="w-full min-w-0 font-sans truncate">
                                                                        <SelectValue placeholder={!currentAppId ? 'Pilih aplikasi terlebih dahulu' : '-- Pilih Transaksi --'} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {currentAppTrans.length > 0 ? (
                                                                            currentAppTrans.map((t) => (
                                                                                <SelectItem key={t.id} value={t.id.toString()} className="font-sans">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                                                                                            {t.kode_transaksi}
                                                                                        </span>
                                                                                        <span>{t.nama_transaksi}</span>
                                                                                        {t.departemen && (
                                                                                            <span className="text-xs text-muted-foreground">({t.departemen})</span>
                                                                                        )}
                                                                                    </div>
                                                                                </SelectItem>
                                                                            ))
                                                                        ) : (
                                                                            <SelectItem value="empty" disabled className="font-sans">
                                                                                {!currentAppId ? 'Pilih aplikasi terlebih dahulu' : 'Belum ada transaksi aktif untuk aplikasi ini'}
                                                                            </SelectItem>
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Row 1: Nomor Dokumen & Tanggal Pengajuan */}
                                    <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full min-w-0">
                                        <div className="grid gap-1.5 min-w-0">
                                            <Label htmlFor="id_dokumen" className="font-sans text-xs sm:text-sm">ID Dokumen</Label>
                                            <Input
                                                id="id_dokumen"
                                                value={formData.id_dokumen}
                                                readOnly
                                                className="font-mono bg-muted/40 text-xs sm:text-sm w-full min-w-0 truncate"
                                            />
                                        </div>

                                        <div className="grid gap-1.5 min-w-0">
                                            <Label htmlFor="nomor_dokumen" className="font-sans text-xs sm:text-sm">
                                                Nomor Dokumen <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="nomor_dokumen"
                                                value={formData.nomor_dokumen}
                                                onChange={handleInputChange}
                                                placeholder="Contoh: 001/SK..."
                                                className="font-sans text-xs sm:text-sm w-full min-w-0 truncate"
                                            />
                                        </div>
                                    </div>

                                    {/* Pilihan Manual Tipe Dokumen */}
                                    {docTypeMode === 'manual' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="tipe_dokumen" className="font-sans">
                                                Tipe Dokumen <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.tipe_dokumen}
                                                onValueChange={(value) => setFormData((prev) => ({ ...prev, tipe_dokumen: value }))}
                                            >
                                                <SelectTrigger className={errors.tipe_dokumen ? 'border-red-500 font-sans' : 'font-sans'}>
                                                    <SelectValue placeholder="Pilih jenis dokumen manual" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Surat Keputusan" className="font-sans">Surat Keputusan (SK)</SelectItem>
                                                    <SelectItem value="Proposal" className="font-sans">Proposal</SelectItem>
                                                    <SelectItem value="Memo Internal" className="font-sans">Memo Internal</SelectItem>
                                                    <SelectItem value="Surat Jalan" className="font-sans">Surat Jalan / Berkas Eksternal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Tanggal Pengajuan & Deadline */}
                                    <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full min-w-0">
    <div className="grid gap-1.5 min-w-0">
        <Label htmlFor="tgl_pengajuan" className="font-sans text-xs sm:text-sm">
            Tgl Pengajuan <span className="text-red-500">*</span>
        </Label>
        <Input
            id="tgl_pengajuan"
            type="date"
            value={formData.tgl_pengajuan}
            onChange={handleInputChange}
            className="font-sans text-xs sm:text-sm w-full min-w-0"
        />
    </div>

    <div className="grid gap-1.5 min-w-0">
        <Label htmlFor="tgl_deadline" className="font-sans text-xs sm:text-sm">
            Deadline <span className="text-red-500">*</span>
        </Label>
        <Input
            id="tgl_deadline"
            type="date"
            value={formData.tgl_deadline}
            onChange={handleInputChange}
            className="font-sans text-xs sm:text-sm w-full min-w-0"
        />
         {errors.tgl_deadline && <p className="text-sm text-red-500">{errors.tgl_deadline}</p>}
    </div>
</div>

                                    {/* Judul Dokumen */}
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
                                            placeholder="Masukkan judul pengajuan..."
                                        />
                                        {errors.judul_dokumen && <p className="text-sm text-red-500">{renderError(errors.judul_dokumen)}</p>}
                                    </div>

                                    {/* Masterflow */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="masterflow_id" className="font-sans">
                                            Masterflow <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.masterflow_id === '' ? '' : formData.masterflow_id.toString()}
                                            onValueChange={handleMasterflowChange}
                                        >
                                            <SelectTrigger className={errors.masterflow_id ? 'border-red-500 font-sans' : 'font-sans'}>
                                                <SelectValue placeholder="Pilih masterflow" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {masterflows.map((mf) => (
                                                    <SelectItem key={mf.id} value={mf.id.toString()} className="font-sans">
                                                        {mf.name}
                                                    </SelectItem>
                                                ))}
                                                <SelectItem value="custom" className="font-sans font-medium text-primary">
                                                    Custom Approval
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.masterflow_id && <p className="text-sm text-red-500">{errors.masterflow_id}</p>}
                                    </div>

                                    {/* Masterflow Steps Selection */}
                                    {formData.masterflow_id !== '' && formData.masterflow_id !== 'custom' && selectedMasterflow?.steps && selectedMasterflow.steps.length > 0 && (
                                        <div className="grid gap-4 rounded-lg border border-border bg-muted/30 30 p-3 sm:p-4 w-full max-w-full overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <Label className="font-sans font-semibold">Alur Persetujuan</Label>
                                                <span className="text-xs text-muted-foreground">{selectedMasterflow.steps.length} tahap persetujuan</span>
                                            </div>

                                            {selectedMasterflow.steps.sort((a, b) => a.step_order - b.step_order).map((step, index) => (
                                                <div key={step.id} className="grid grid-cols-[80px_1fr_1fr_40px] items-center gap-3">
                                                    <div className="flex items-center justify-center">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-medium text-primary">
                                                            {index + 1}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs text-muted-foreground">Jabatan</span>
                                                        <div className="rounded-md border border-border bg-background px-3 py-2 font-sans text-sm">
                                                            {step.jabatan?.name || 'Sekretaris'}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-muted-foreground">
                                                                {stepModes[step.id] === 'group' ? 'Group Approval' : 'Nama Approver'}
                                                            </span>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => toggleStepMode(step.id)}
                                                                className="h-6 px-2 text-xs"
                                                            >
                                                                {stepModes[step.id] === 'group' ? 'Single' : 'Group'}
                                                            </Button>
                                                        </div>

                                                        {stepModes[step.id] === 'group' ? (
                                                            <div className="space-y-2">
                                                                <Select
                                                                    value={formData.step_approvers[step.id]?.jenisGroup || ''}
                                                                    onValueChange={(value) => handleJenisGroupChange(step.id, value as 'all_required' | 'any_one' | 'majority')}
                                                                >
                                                                    <SelectTrigger className="font-sans">
                                                                        <SelectValue placeholder="Pilih jenis group" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all_required" className="font-sans">Semua Harus Approve</SelectItem>
                                                                        <SelectItem value="any_one" className="font-sans">Salah Satu Saja</SelectItem>
                                                                        <SelectItem value="majority" className="font-sans">Mayoritas (&gt; 50%)</SelectItem>
                                                                    </SelectContent>
                                                                </Select>

                                                                <div className="rounded-md border border-border bg-background">
                                                                    <div className="max-h-40 space-y-1 overflow-y-auto p-2">
                                                                        {(availableApprovers[step.id] || []).map((user) => (
                                                                            <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={formData.step_approvers[step.id]?.userIds.includes(user.id) || false}
                                                                                    onChange={(e) => handleMultipleApproverChange(step.id, user.id, e.target.checked)}
                                                                                    className="h-4 w-4 rounded border-gray-300"
                                                                                />
                                                                                <span className="text-sm">{user.name}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Select
                                                                value={formData.approvers[step.id]?.toString() || ''}
                                                                onValueChange={(value) => handleApproverChange(step.id, value)}
                                                            >
                                                                <SelectTrigger className="font-sans">
                                                                    <SelectValue placeholder="Pilih approver" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {(availableApprovers[step.id] || []).map((user) => (
                                                                        <SelectItem key={user.id} value={user.id.toString()} className="font-sans">
                                                                            {user.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-center">
                                                        <Badge variant="outline" className="h-8 w-8 justify-center border-primary/30 font-mono text-xs">
                                                            {index + 1}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Custom Approvers Flow */}
                                    {formData.masterflow_id === 'custom' && (
                                        <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="font-sans font-semibold">Custom Approval Flow</Label>
                                                <Button type="button" size="sm" variant="outline" onClick={addCustomApprover} className="h-8 font-sans">
                                                    <IconPlus className="mr-1 h-3 w-3" /> Tambah Approver
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                {formData.custom_approvers.map((approver, index) => (
                                                    <div key={index} className="grid grid-cols-[80px_1fr_100px_40px] items-start gap-3">
                                                        <div className="flex items-center justify-center pt-2">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-medium text-primary">
                                                                {index + 1}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs text-muted-foreground">Email Approver</span>
                                                            <Input
                                                                type="email"
                                                                value={approver.email}
                                                                onChange={(e) => handleCustomApproverChange(index, 'email', e.target.value)}
                                                                placeholder="approver@example.com"
                                                                className="font-sans"
                                                            />
                                                        </div>

                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs text-muted-foreground">Tingkat</span>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={approver.order}
                                                                onChange={(e) => handleCustomApproverChange(index, 'order', Number(e.target.value))}
                                                                className="font-sans"
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-center pt-6">
                                                            {formData.custom_approvers.length > 1 && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => removeCustomApprover(index)}
                                                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                >
                                                                    <IconTrash className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Komentar / Keterangan */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="deskripsi" className="font-sans">
                                            Komentar / Keterangan
                                        </Label>
                                        <Textarea
                                            id="deskripsi"
                                            name="deskripsi"
                                            value={formData.deskripsi}
                                            onChange={handleInputChange}
                                            className={errors.deskripsi ? 'border-red-500 font-sans' : 'font-sans'}
                                            placeholder="Tuliskan catatan pengajuan..."
                                            rows={3}
                                        />
                                        {errors.deskripsi && <p className="text-sm text-red-500">{errors.deskripsi}</p>}
                                    </div>

                                    {/* Upload File - KHUSUS DOKUMEN MANUAL */}
                                    {docTypeMode === 'manual' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="file" className="font-sans">
                                                Upload File <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="file"
                                                name="file"
                                                type="file"
                                                onChange={handleFileChange}
                                                className={errors.file ? 'border-red-500 font-sans' : 'font-sans'}
                                            />
                                            {errors.file && <p className="text-sm text-red-500">{renderError(errors.file)}</p>}
                                            <p className="text-xs text-muted-foreground">
                                                📄 <strong>Hanya file PDF yang diterima.</strong> Sistem tanda tangan digital hanya mendukung format PDF. (Max 10MB)
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="sm:justify-between">
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsCreateDialogOpen(false)}
                                            disabled={isSubmitting}
                                            className="font-sans"
                                        >
                                            Batal
                                        </Button>
                                        {(docTypeMode === 'manual' || (docTypeMode === 'transaksi' && formData.file)) && (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={openSignatureDialog}
                                                disabled={isSubmitting || !formData.file}
                                                className="font-sans text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                            >
                                                <IconEdit className="mr-2 h-4 w-4" />
                                                Atur Posisi Tanda Tangan
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={(e) => handleSubmit(e, 'draft')}
                                            disabled={isSubmitting}
                                            className="border-gray-300 font-sans hover:bg-gray-50"
                                        >
                                            {isSubmitting && submitType === 'draft' ? 'Menyimpan...' : 'Simpan sebagai Draft'}
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={(e) => handleSubmit(e, 'submit')}
                                            disabled={isSubmitting}
                                            className="bg-green-600 font-sans hover:bg-green-700"
                                        >
                                            {isSubmitting && submitType === 'submit' ? 'Mengirim...' : 'Submit untuk Approval'}
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Signature Placement Dialog (Offline Mode) */}
                    {localFileUrl && (
                        <SignaturePlacementDialog
                            open={signatureDialogOpen}
                            onOpenChange={setSignatureDialogOpen}
                            fileUrl={localFileUrl}
                            approvals={pendingApprovalsForDialog}
                            initialPositions={formData.signature_positions || []}
                            onSaved={(positions) => {
                                setFormData((prev) => ({
                                    ...prev,
                                    signature_positions: positions,
                                }));
                            }}
                        />
                    )}

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Hapus Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin menghapus dokumen "<strong>{selectedDokumen?.judul_dokumen}</strong>"? Tindakan ini tidak dapat dibatalkan.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting} className="font-sans w-full sm:w-auto">
                                        Batal
                                    </Button>
                                    {(docTypeMode === 'manual' || (docTypeMode === 'transaksi' && formData.file)) && (
                                        <Button type="button" variant="secondary" onClick={openSignatureDialog} disabled={isSubmitting || !formData.file} className="font-sans text-blue-600 bg-blue-50 border-blue-200 w-full sm:w-auto">
                                            <IconEdit className="mr-2 h-4 w-4" /> Atur Posisi Tanda Tangan
                                        </Button>
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <Button type="button" variant="outline" onClick={(e) => handleSubmit(e, 'draft')} disabled={isSubmitting} className="font-sans w-full sm:w-auto">
                                        {isSubmitting && submitType === 'draft' ? 'Menyimpan...' : 'Simpan sebagai Draft'}
                                    </Button>
                                    <Button type="button" onClick={(e) => handleSubmit(e, 'submit')} disabled={isSubmitting} className="bg-green-600 font-sans hover:bg-green-700 w-full sm:w-auto">
                                        {isSubmitting && submitType === 'submit' ? 'Mengirim...' : 'Submit untuk Approval'}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}