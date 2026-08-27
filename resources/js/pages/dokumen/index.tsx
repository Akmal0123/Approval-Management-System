import { AppSidebar } from '@/components/app-sidebar';
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
import { IconEdit, IconFileText, IconPlus, IconRefresh, IconTrash, IconX } from '@tabler/icons-react';
import { Activity, CalendarIcon, CheckCircle2, ClipboardList, Eye, FileCheck, FileTextIcon, Lightbulb, Receipt, SearchIcon, ShoppingCart, Store, UserIcon, Users, QrCode } from 'lucide-react';
import SignaturePositionModal, { ApproverBox, QRBox } from '@/components/SignaturePositionModal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface PageProps {
    auth: {
        user: User | null;
    };
    [key: string]: unknown;
}

interface AplikasiManagement {
    id: number;
    nama_aplikasi?: string;
    name?: string;
    transaksi_management?: string;
    perusahaan_id?: number;
    perusahaan?: {
        id: number;
        nama_perusahaan: string;
    };
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

interface Masterflow {
    id: number;
    name: string;
    description?: string;
    steps?: MasterflowStep[];
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

interface Dokumen {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    tipe_dokumen?: string;
    jenis_pengajuan?: 'manual' | 'transaksi';
    modul_transaksi?: 'hris' | 'pr' | 'po' | 'internal_memo' | 'proposal';
    aplikasi_unit_id?: number | null;
    aplikasi_management?: AplikasiManagement;
    nominal?: number | string;
    qr_code_path?: string;
    qr_code_hash?: string;
    user_id: number;
    masterflow_id: number | null;
    status: string;
    tgl_pengajuan: string;
    deskripsi?: string;
    status_current: string;
    user?: User;
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
}

interface StepApprovers {
    userIds: number[];
    jenisGroup: 'all_required' | 'any_one' | 'majority' | null;
}

interface ItemTransaksi {
    nama_item: string;
    qty: number;
    harga_satuan: number;
    total: number;
}

interface FormData {
    jenis_pengajuan: 'manual' | 'transaksi';
    modul_transaksi: 'hris' | 'pr' | 'po' | 'internal_memo' | 'proposal';
    aplikasi_unit_id: number | null;
    nomor_dokumen: string;
    judul_dokumen: string;
    tipe_dokumen: string;
    kategori_hris: string;
    nama_karyawan_nip: string;
    vendor_name: string;
    payment_terms: string;
    urgensi_memo: string;
    kategori_transaksi: string;
    metode_pembayaran: string;
    rekening_vendor: string;
    nominal: string;
    items_transaksi: ItemTransaksi[];
    masterflow_id: number | '' | 'custom';
    tgl_pengajuan: string;
    tgl_deadline: string;
    deskripsi: string;
    file: File | null;
    approvers: Record<number, number | ''>;
    custom_approvers: CustomApprover[];
    step_approvers: Record<number, StepApprovers>;
    approver_positions?: Record<string, { x: number; y: number; page: string }>;
    custom_approver_positions?: Record<string, { x: number; y: number; page: string }>;
    is_qr_active?: boolean;
    qr_pos_x?: number;
    qr_pos_y?: number;
    qr_page?: string;
}

const initialFormData: FormData = {
    jenis_pengajuan: 'manual',
    modul_transaksi: 'po',
    aplikasi_unit_id: null,
    nomor_dokumen: '',
    judul_dokumen: '',
    tipe_dokumen: 'proposal',
    kategori_hris: 'reimbursement',
    nama_karyawan_nip: '',
    vendor_name: '',
    payment_terms: 'net_30',
    urgensi_memo: 'biasa',
    kategori_transaksi: 'operasional',
    metode_pembayaran: 'transfer',
    rekening_vendor: '',
    nominal: '0',
    items_transaksi: [{ nama_item: '', qty: 1, harga_satuan: 0, total: 0 }],
    masterflow_id: '',
    tgl_pengajuan: new Date().toISOString().split('T')[0],
    tgl_deadline: '',
    deskripsi: '',
    file: null,
    approvers: {},
    custom_approvers: [{ email: '', order: 1 }],
    step_approvers: {},
    approver_positions: {},
    custom_approver_positions: {},
    is_qr_active: false,
    qr_pos_x: 80,
    qr_pos_y: 80,
    qr_page: 'last',
};

export default function UserDokumen() {
    const { auth } = usePage<PageProps>().props;
    const [dokumen, setDokumen] = useState<Dokumen[]>([]);
    const [masterflows, setMasterflows] = useState<Masterflow[]>([]);
    const [aplikasiList, setAplikasiList] = useState<AplikasiManagement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDokumen, setSelectedDokumen] = useState<Dokumen | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitType, setSubmitType] = useState<'draft' | 'submit'>('draft');
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedMasterflow, setSelectedMasterflow] = useState<Masterflow | null>(null);
    const [availableApprovers, setAvailableApprovers] = useState<Record<number, UserOption[]>>({});
    const [stepModes, setStepModes] = useState<Record<number, 'single' | 'group'>>({});
    const [updatedDokumenIds, setUpdatedDokumenIds] = useState<Set<number>>(new Set());
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [isSigModalOpen, setIsSigModalOpen] = useState(false);

    const isNeedsPayment = useMemo(() => {
        if (formData.jenis_pengajuan === 'transaksi' && formData.modul_transaksi === 'hris') {
            // HRIS: hanya kategori reimbursement & kasbon yang memerlukan nominal
            return ['reimbursement', 'kasbon'].includes(formData.kategori_hris);
        }
        // Semua modul lain (PO, PR, Internal Memo, Proposal) = tampilkan nominal
        return true;
    }, [formData.jenis_pengajuan, formData.modul_transaksi, formData.kategori_hris]);

    const clearPdfPreview = useCallback(() => {
        setPdfPreviewUrl((prevUrl) => {
            if (prevUrl) {
                URL.revokeObjectURL(prevUrl);
            }
            return null;
        });
    }, []);

    const generateDocumentNumber = useCallback(
        (overrides?: Partial<FormData>) => {
            const currentJenis = overrides?.jenis_pengajuan ?? formData.jenis_pengajuan;
            const currentModul = overrides?.modul_transaksi ?? formData.modul_transaksi;
            const currentAppId = overrides?.aplikasi_unit_id ?? formData.aplikasi_unit_id;

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const random = Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, '0');

            if (currentJenis === 'transaksi') {
                const selectedApp = aplikasiList.find((app) => app.id === currentAppId);
                const appName = selectedApp ? (selectedApp.nama_aplikasi || selectedApp.name || '') : '';
                const prefixUnit = appName
                    ? appName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
                    : 'HOLDING';

                let prefixModul = 'TRX';
                switch (currentModul) {
                    case 'hris':
                        prefixModul = 'HRIS';
                        break;
                    case 'pr':
                        prefixModul = 'PR';
                        break;
                    case 'po':
                        prefixModul = 'PO';
                        break;
                    case 'internal_memo':
                        prefixModul = 'MEMO';
                        break;
                    case 'proposal':
                        prefixModul = 'PROP';
                        break;
                }
                return `${prefixUnit}/${prefixModul}/${year}${month}/${random}`;
            }

            return `DOC/${year}${month}/${random}`;
        },
        [formData.jenis_pengajuan, formData.modul_transaksi, formData.aplikasi_unit_id, aplikasiList]
    );

    const startsWithWord = (text: string | null | undefined, query: string): boolean => {
        if (!text || !query) return false;
        const cleanText = text.trim().toLowerCase();
        const cleanQuery = query.trim().toLowerCase();

        if (cleanText.startsWith(cleanQuery)) return true;
        const words = cleanText.split(/[\s\-_\/]+/);
        return words.some((word) => word.startsWith(cleanQuery));
    };

    const suggestions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [];

        return dokumen
            .filter((item) => {
                const titleMatch = startsWithWord(item.judul_dokumen, query);
                const numberMatch = startsWithWord(item.nomor_dokumen, query);
                const descMatch = startsWithWord(item.deskripsi, query);
                const fileName = item.latest_version?.nama_file;
                const fileMatch = startsWithWord(fileName, query);
                return titleMatch || numberMatch || descMatch || fileMatch;
            })
            .slice(0, 5);
    }, [dokumen, searchQuery]);

    const fetchDokumen = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/dokumen', { params: { my_documents: true } });
            const newDokumen = Array.isArray(response.data) ? response.data : response.data.data || [];
            setDokumen(newDokumen);
        } catch (error) {
            console.error('Error fetching dokumen:', error);
            showToast.error('❌ Gagal memuat daftar dokumen. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMasterflows = async () => {
        try {
            const response = await api.get('/masterflows');
            setMasterflows(response.data.masterflows || response.data || []);
        } catch (error) {
            console.error('Error fetching masterflows:', error);
            showToast.error('❌ Gagal memuat masterflow.');
        }
    };

    const fetchAplikasiManagement = async () => {
        try {
            const response = await api.get('/aplikasis');
            console.log('API /aplikasis response:', response.data);
            let apps = [];
            if (Array.isArray(response.data)) {
                apps = response.data;
            } else if (response.data.data) {
                apps = response.data.data;
            } else if (response.data.aplikasis) {
                apps = response.data.aplikasis;
            }
            console.log('Parsed apps:', apps);
            setAplikasiList(apps);
            if (apps.length > 0 && !formData.aplikasi_unit_id) {
                setFormData((prev) => ({ ...prev, aplikasi_unit_id: apps[0].id }));
            }
        } catch (error) {
            console.error('Error fetching aplikasi management:', error);
        }
    };

    useEffect(() => {
        if (!auth?.user) {
            showToast.error('❌ Silakan login terlebih dahulu untuk mengakses Dokumen.');
            window.location.href = '/';
            return;
        }

        fetchDokumen();
        fetchMasterflows();
        fetchAplikasiManagement();

        if (typeof window !== 'undefined' && (window as unknown as { Echo?: any }).Echo && auth.user?.id) {
            const echo = (window as unknown as { Echo: any }).Echo;
            const userChannelName = `user.${auth.user.id}.dokumen`;
            const channel = echo.channel(userChannelName);

            const handleDokumenUpdated = (event: any) => {
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

                if (event.dokumen?.judul_dokumen) {
                    const statusText = event.dokumen.status === 'approved' ? 'disetujui' : 'diupdate';
                    showToast.success(`📡 Dokumen "${event.dokumen.judul_dokumen}" telah ${statusText}!`);
                } else {
                    showToast.success('📡 Daftar dokumen telah diupdate secara real-time!');
                }
            };

            channel.listen('dokumen.updated', handleDokumenUpdated);

            return () => {
                echo.leave(userChannelName);
            };
        }
    }, [auth]);

    useEffect(() => {
        return () => {
            clearPdfPreview();
        };
    }, [clearPdfPreview]);



    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev) => {
                const newErrs = { ...prev };
                delete newErrs[name];
                return newErrs;
            });
        }
    };

    const handleItemChange = (index: number, field: keyof ItemTransaksi, value: string | number) => {
        setFormData((prev) => {
            const newItems = [...prev.items_transaksi];
            const currentItem = { ...newItems[index], [field]: value };

            if (field === 'qty' || field === 'harga_satuan') {
                const qty = Number(currentItem.qty) || 0;
                const harga = Number(currentItem.harga_satuan) || 0;
                currentItem.total = qty * harga;
            }

            newItems[index] = currentItem;
            const grandTotal = newItems.reduce((acc, item) => acc + (item.total || 0), 0);

            return {
                ...prev,
                items_transaksi: newItems,
                nominal: grandTotal.toString(),
            };
        });
    };

    const addItemTransaksi = () => {
        setFormData((prev) => ({
            ...prev,
            items_transaksi: [...prev.items_transaksi, { nama_item: '', qty: 1, harga_satuan: 0, total: 0 }],
        }));
    };

    const removeItemTransaksi = (index: number) => {
        if (formData.items_transaksi.length <= 1) return;
        setFormData((prev) => {
            const newItems = prev.items_transaksi.filter((_, i) => i !== index);
            const grandTotal = newItems.reduce((acc, item) => acc + (item.total || 0), 0);
            return {
                ...prev,
                items_transaksi: newItems,
                nominal: grandTotal.toString(),
            };
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                showToast.error('❌ Format file harus PDF! Silakan pilih file dengan format .pdf');
                e.target.value = '';
                return;
            }

            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                showToast.error('❌ Ukuran file maksimal 10MB!');
                e.target.value = '';
                return;
            }

            clearPdfPreview();
            setFormData((prev) => ({ ...prev, file }));

            try {
                const objectUrl = URL.createObjectURL(file);
                setPdfPreviewUrl(objectUrl);
            } catch (err) {
                console.warn('Gagal membuat object URL untuk pratinjau PDF:', err);
            }

            if (errors.file) {
                setErrors((prev) => {
                    const newErrs = { ...prev };
                    delete newErrs.file;
                    return newErrs;
                });
            }
        }
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
            setErrors((prev) => {
                const newErrs = { ...prev };
                delete newErrs.masterflow_id;
                return newErrs;
            });
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
                        } catch (error) {
                            console.error(`Error fetching users for jabatan ${step.jabatan_id}:`, error);
                            approversData[step.id] = [];
                        }
                    }
                }
                setAvailableApprovers(approversData);
            } catch (error) {
                console.error('Error fetching masterflow steps:', error);
                setSelectedMasterflow({ ...selected, steps: [] });
            }
        } else {
            setSelectedMasterflow(null);
            setAvailableApprovers({});
        }
    };

    const handleCustomApproverChange = (index: number, field: 'email' | 'order', value: string | number) => {
        setFormData((prev) => {
            const newCustomApprovers = [...prev.custom_approvers];
            newCustomApprovers[index] = {
                ...newCustomApprovers[index],
                [field]: value,
            };
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
            custom_approvers: prev.custom_approvers.filter((_, i) => i !== index).map((approver, idx) => ({ ...approver, order: idx + 1 })),
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

    const handleCreate = () => {
        clearPdfPreview();
        const defaultAppId = aplikasiList.length > 0 ? aplikasiList[0].id : null;
        const initForm = {
            ...initialFormData,
            aplikasi_unit_id: defaultAppId,
            tgl_pengajuan: new Date().toISOString().split('T')[0],
            custom_approvers: [{ email: '', order: 1 }],
        };

        setFormData({
            ...initForm,
            nomor_dokumen: generateDocumentNumber(initForm),
        });
        setSelectedMasterflow(null);
        setAvailableApprovers({});
        setStepModes({});
        setErrors({});
        setIsCreateDialogOpen(true);
    };

    const handleOpenSigModal = () => {
        setIsSigModalOpen(true);
    };

    const handleSavePositions = (approvers: ApproverBox[], qr: QRBox) => {
        const newApproverPositions: Record<string, any> = {};
        const newCustomPositions: Record<string, any> = {};

        approvers.forEach(app => {
            if (app.id.startsWith('custom_')) {
                const idx = app.id.replace('custom_', '');
                newCustomPositions[idx] = { x: app.x, y: app.y, page: app.page };
            } else {
                newApproverPositions[app.id] = { x: app.x, y: app.y, page: app.page };
            }
        });

        setFormData(prev => ({
            ...prev,
            approver_positions: newApproverPositions,
            custom_approver_positions: newCustomPositions,
            is_qr_active: qr.active,
            qr_pos_x: qr.x,
            qr_pos_y: qr.y,
            qr_page: qr.page
        }));
    };

    const buildInitialApprovers = (): ApproverBox[] => {
        const list: ApproverBox[] = [];
        
        if (formData.masterflow_id === 'custom') {
            formData.custom_approvers.forEach((app, idx) => {
                if (!app.email) return;
                const existing = formData.custom_approver_positions?.[idx];
                list.push({
                    id: `custom_${idx}`,
                    label: `Custom ${idx + 1}`,
                    subLabel: app.email,
                    x: existing?.x || 70,
                    y: existing?.y || (20 + idx * 10),
                    page: existing?.page || 'last',
                    color: '#3b82f6'
                });
            });
        } else if (selectedMasterflow && selectedMasterflow.steps) {
            selectedMasterflow.steps.forEach((step, idx) => {
                const existing = formData.approver_positions?.[step.id];
                list.push({
                    id: step.id.toString(),
                    label: step.step_name,
                    subLabel: step.jabatan?.name || 'Approver',
                    x: existing?.x || 70,
                    y: existing?.y || (20 + idx * 10),
                    page: existing?.page || 'last',
                    color: '#10b981'
                });
            });
        }

        return list;
    };


    const renderError = (err: unknown) => {
        if (!err) return null;
        if (Array.isArray(err)) return err[0];
        return String(err);
    };

    const handleSubmit = async (e: React.FormEvent, type: 'draft' | 'submit') => {
        e.preventDefault();

        const validationErrors: Record<string, string> = {};
        if (!formData.judul_dokumen.trim()) {
            validationErrors.judul_dokumen = 'Judul pengajuan wajib diisi.';
        }
        if (formData.jenis_pengajuan === 'manual' && !formData.file) {
            validationErrors.file = 'File dokumen (PDF) wajib diunggah pada mode Manual.';
        }
        if (formData.jenis_pengajuan === 'transaksi' && !formData.aplikasi_unit_id) {
            validationErrors.aplikasi_unit_id = 'Pilih Unit Aplikasi terlebih dahulu.';
        }
        if (!formData.tgl_deadline) {
            validationErrors.tgl_deadline = 'Tanggal deadline wajib diisi.';
        }
        if (formData.masterflow_id === '') {
            validationErrors.masterflow_id = 'Pilih Masterflow atau Custom Approval.';
        }

        if (Object.keys(validationErrors).length > 0) {
            const formattedErrs: Record<string, string[]> = {};
            Object.entries(validationErrors).forEach(([key, val]) => {
                formattedErrs[key] = [val];
            });
            setErrors(formattedErrs);
            showToast.error(`❌ ${Object.values(validationErrors)[0]}`);
            return;
        }

        setSubmitType(type);
        setIsSubmitting(true);
        setErrors({});

        try {
            await api.get('/sanctum/csrf-cookie');
            await new Promise((resolve) => setTimeout(resolve, 100));

            const submitData = new FormData();
            submitData.append('jenis_pengajuan', formData.jenis_pengajuan);
            submitData.append('nomor_dokumen', formData.nomor_dokumen || generateDocumentNumber());
            submitData.append('judul_dokumen', formData.judul_dokumen);
            submitData.append('tipe_dokumen', formData.tipe_dokumen || 'proposal');

            if (formData.jenis_pengajuan === 'transaksi') {
                submitData.append('modul_transaksi', formData.modul_transaksi);
                if (formData.aplikasi_unit_id) {
                    submitData.append('aplikasi_unit_id', formData.aplikasi_unit_id.toString());
                }
                submitData.append('kategori_hris', formData.kategori_hris);
                submitData.append('nama_karyawan_nip', formData.nama_karyawan_nip);
                submitData.append('vendor_name', formData.vendor_name);
                submitData.append('payment_terms', formData.payment_terms);
                submitData.append('urgensi_memo', formData.urgensi_memo);
                submitData.append('kategori_transaksi', formData.kategori_transaksi);
                submitData.append('metode_pembayaran', formData.metode_pembayaran);
                submitData.append('rekening_vendor', formData.rekening_vendor);
                submitData.append('nominal', formData.nominal || '0');

                const filteredItems = formData.items_transaksi.filter((item) => item.nama_item.trim() !== '');
                submitData.append('items_transaksi', JSON.stringify(filteredItems));
            } else {
                submitData.append('nominal', formData.nominal || '0');
            }

            submitData.append('tgl_pengajuan', formData.tgl_pengajuan);
            submitData.append('tgl_deadline', formData.tgl_deadline);
            submitData.append('deskripsi', formData.deskripsi || '');
            submitData.append('submit_type', type);

            if (formData.is_qr_active !== undefined) {
                submitData.append('is_qr_active', formData.is_qr_active ? '1' : '0');
                submitData.append('qr_pos_x', formData.qr_pos_x?.toString() || '80');
                submitData.append('qr_pos_y', formData.qr_pos_y?.toString() || '80');
                submitData.append('qr_page', formData.qr_page || 'last');
            }

            if (formData.approver_positions) {
                Object.entries(formData.approver_positions).forEach(([key, pos]) => {
                    submitData.append(`approver_positions[${key}][x]`, pos.x.toString());
                    submitData.append(`approver_positions[${key}][y]`, pos.y.toString());
                    submitData.append(`approver_positions[${key}][page]`, pos.page);
                });
            }

            if (formData.custom_approver_positions) {
                Object.entries(formData.custom_approver_positions).forEach(([key, pos]) => {
                    submitData.append(`custom_approver_positions[${key}][x]`, pos.x.toString());
                    submitData.append(`custom_approver_positions[${key}][y]`, pos.y.toString());
                    submitData.append(`custom_approver_positions[${key}][page]`, pos.page);
                });
            }

            if (formData.file) {
                submitData.append('file', formData.file);
            }

            if (formData.masterflow_id === 'custom') {
                submitData.append('masterflow_id', 'custom');
                formData.custom_approvers.forEach((approver, index) => {
                    if (approver.email) {
                        submitData.append(`custom_approvers[${index}][email]`, approver.email);
                        submitData.append(`custom_approvers[${index}][order]`, approver.order.toString());
                    }
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
                preserveState: false,
                preserveScroll: false,
                onSuccess: () => {
                    const message =
                        type === 'draft'
                            ? `📝 Pengajuan "${formData.judul_dokumen}" berhasil disimpan sebagai draft!`
                            : `🎉 Pengajuan "${formData.judul_dokumen}" berhasil disubmit untuk approval!`;
                    showToast.success(message);
                    setIsCreateDialogOpen(false);

                    clearPdfPreview();
                    setFormData(initialFormData);
                    setStepModes({});
                    fetchDokumen();
                },
                onError: (errs) => {
                    console.error('Form submission errors:', errs);

                    // Format ulang error dari Record<string, string> ke Record<string, string[]>
                    const formattedErrors: Record<string, string[]> = {};
                    Object.entries(errs).forEach(([key, val]) => {
                        formattedErrors[key] = Array.isArray(val) ? val : [val as string];
                    });

                    setErrors(formattedErrors);

                    const firstVal = Object.values(errs)[0];
                    const errorMessage = typeof firstVal === 'string'
                        ? firstVal
                        : 'Gagal membuat dokumen. Silakan periksa formulir.';

                    showToast.error(`❌ ${errorMessage}`);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            });
        } catch (error: any) {
            console.error('Form submission error:', error);
            setIsSubmitting(false);

            if (error.response?.status === 419) {
                showToast.error('❌ Sesi telah berakhir. Silakan muat ulang halaman dan coba lagi.');
            } else {
                showToast.error(`❌ Gagal menyimpan dokumen. ${error.response?.data?.message || error.message}`);
            }
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
            showToast.success(`🎉 Dokumen "${selectedDokumen.judul_dokumen}" berhasil dihapus!`);
            setIsDeleteDialogOpen(false);
            setSelectedDokumen(null);
            fetchDokumen();
        } catch (error: any) {
            showToast.error(`❌ Gagal menghapus dokumen. ${error.response?.data?.message || error.message}`);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800 border-gray-300' },
            submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-800 border-blue-300' },
            under_review: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
            approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-300' },
            rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-300' },
            revision_requested: { label: 'Perlu Revisi', className: 'bg-orange-100 text-orange-800 border-orange-300' },
            needs_revision: { label: 'Perlu Revisi', className: 'bg-orange-100 text-orange-800 border-orange-300' },
        };

        const config = statusConfig[status] || statusConfig.draft;
        return (
            <Badge variant="outline" className={`font-sans ${config.className}`}>
                {config.label}
            </Badge>
        );
    };

    const filteredDokumen = dokumen.filter((doc) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
            !query ||
            startsWithWord(doc.judul_dokumen, query) ||
            startsWithWord(doc.nomor_dokumen, query) ||
            startsWithWord(doc.deskripsi, query) ||
            startsWithWord(doc.masterflow?.name, query) ||
            (query.length >= 3 && doc.judul_dokumen?.toLowerCase().includes(query));

        const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const stats = useMemo(() => {
        return {
            total: dokumen.length,
            draft: dokumen.filter((d) => d.status === 'draft').length,
            submitted: dokumen.filter((d) => d.status === 'submitted' || d.status === 'under_review').length,
            approved: dokumen.filter((d) => d.status === 'approved').length,
        };
    }, [dokumen]);

    return (
        <>
            <Head title="My Documents" />
            <SidebarProvider>
                <NotificationListener userId={auth?.user?.id} />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                            <div className="space-y-8">
                                {/* Header Section */}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-foreground">
                                            <IconFileText className="h-6 w-6 text-primary" />
                                            Transaction Management & Dokumen Saya
                                        </h1>
                                        <p className="font-sans text-sm text-muted-foreground">
                                            Kelola pengajuan HRIS, PO, PR, Memo & Proposal berbasis Unit Aplikasi Management
                                        </p>
                                    </div>
                                    <Button onClick={handleCreate} className="font-sans">
                                        <IconPlus className="mr-2 h-4 w-4" />
                                        Buat Pengajuan Baru
                                    </Button>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid gap-4 md:grid-cols-4">
                                    <Card className="border-border bg-card">
                                        <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                                            <h3 className="font-sans text-sm font-medium text-muted-foreground">Total Pengajuan</h3>
                                            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <CardContent>
                                            <div className="font-sans text-2xl font-bold text-foreground">{stats.total}</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                                            <h3 className="font-sans text-sm font-medium text-muted-foreground">Draft</h3>
                                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <CardContent>
                                            <div className="font-sans text-2xl font-bold text-foreground">{stats.draft}</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                                            <h3 className="font-sans text-sm font-medium text-muted-foreground">Menunggu Persetujuan</h3>
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <CardContent>
                                            <div className="font-sans text-2xl font-bold text-foreground">{stats.submitted}</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                                            <h3 className="font-sans text-sm font-medium text-muted-foreground">Disetujui</h3>
                                            <Activity className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <CardContent>
                                            <div className="font-sans text-2xl font-bold text-foreground">{stats.approved}</div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Search and Filter */}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative flex-1">
                                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Cari berdasarkan judul, nomor, atau modul/aplikasi..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setIsDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsDropdownOpen(true)}
                                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                            className="pl-10 pr-10 font-sans"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                title="Hapus pencarian"
                                            >
                                                <IconX className="h-4 w-4" />
                                            </button>
                                        )}

                                        {/* Live Recommendation Dropdown */}
                                        {isDropdownOpen && suggestions.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-blue-300 bg-[#f4f8fb] p-2.5 shadow-2xl backdrop-blur-md">
                                                <div className="mb-1.5 flex items-center justify-between rounded-xl bg-blue-100/90 px-3 py-1.5 text-[11px] font-bold tracking-wider text-blue-900 uppercase">
                                                    <span>💡 REKOMENDASI BERKAS DOKUMEN SAYA ({suggestions.length})</span>
                                                    <span className="text-[10px] font-medium text-blue-700">Awalan kata: "{searchQuery}"</span>
                                                </div>
                                                <div className="divide-y divide-blue-100/80">
                                                    {suggestions.map((item) => {
                                                        const fileName = item.latest_version?.nama_file;
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                onMouseDown={() => {
                                                                    setSearchQuery(item.judul_dokumen || '');
                                                                    setIsDropdownOpen(false);
                                                                    router.visit(`/dokumen/${item.id}`);
                                                                }}
                                                                className="group flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition-all hover:bg-blue-100/80"
                                                            >
                                                                <div className="flex min-w-0 items-center gap-3">
                                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                                                                        <IconFileText className="h-5 w-5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-xs font-bold text-blue-950 group-hover:text-blue-800 sm:text-sm">
                                                                            {item.judul_dokumen}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[11px] font-medium text-blue-800/80">
                                                                            {item.nomor_dokumen && <span>{item.nomor_dokumen}</span>}
                                                                            {fileName && <span className="max-w-[220px] truncate">📁 {fileName}</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 pl-2 text-xs font-bold text-blue-700 transition-transform group-hover:translate-x-1">
                                                                    Lihat →
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[180px] font-sans">
                                            <SelectValue placeholder="Filter Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="font-sans">
                                                Semua Status
                                            </SelectItem>
                                            <SelectItem value="draft" className="font-sans">
                                                Draft
                                            </SelectItem>
                                            <SelectItem value="submitted" className="font-sans">
                                                Submitted
                                            </SelectItem>
                                            <SelectItem value="approved" className="font-sans">
                                                Approved
                                            </SelectItem>
                                            <SelectItem value="rejected" className="font-sans">
                                                Rejected
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Documents Table */}
                                <div className="space-y-6">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="text-center">
                                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                                                <p className="mt-2 text-sm text-gray-600">Loading pengajuan...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <Card className="border-border bg-card">
                                            <CardContent className="p-0">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/40 text-sm font-semibold">
                                                            <TableHead className="w-12 text-center font-sans">No</TableHead>
                                                            <TableHead className="w-56 font-sans">Judul, Unit & Modul</TableHead>
                                                            <TableHead className="w-40 font-sans">Masterflow</TableHead>
                                                            <TableHead className="w-32 font-sans">Status</TableHead>
                                                            <TableHead className="w-52 font-sans">Current Step</TableHead>
                                                            <TableHead className="w-32 font-sans">Tanggal</TableHead>
                                                            <TableHead className="w-24 pr-4 text-right font-sans">Aksi</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredDokumen.length > 0 ? (
                                                            filteredDokumen.map((doc, index) => (
                                                                <TableRow
                                                                    key={doc.id}
                                                                    className={`transition-all duration-300 ${updatedDokumenIds.has(doc.id) ? 'bg-green-50 dark:bg-green-950/20' : ''
                                                                        }`}
                                                                >
                                                                    <TableCell className="text-center font-mono text-sm font-medium">{index + 1}</TableCell>
                                                                    <TableCell className="font-sans">
                                                                        <div className="flex max-w-[220px] flex-col gap-1">
                                                                            <span className="truncate text-sm font-semibold text-foreground" title={doc.judul_dokumen}>
                                                                                {doc.judul_dokumen}
                                                                            </span>
                                                                            <div className="flex flex-wrap items-center gap-1">
                                                                                {doc.jenis_pengajuan === 'transaksi' ? (
                                                                                    <>
                                                                                        {doc.aplikasi_management && (
                                                                                            <Badge className="bg-purple-100 text-[9px] uppercase text-purple-800 hover:bg-purple-100">
                                                                                                🏢 {doc.aplikasi_management.nama_aplikasi}
                                                                                            </Badge>
                                                                                        )}
                                                                                        <Badge className="bg-emerald-100 text-[9px] uppercase text-emerald-800 hover:bg-emerald-100">
                                                                                            <Receipt className="mr-1 h-2.5 w-2.5" /> {doc.modul_transaksi || 'TRX'}
                                                                                        </Badge>
                                                                                    </>
                                                                                ) : (
                                                                                    <Badge className="bg-blue-100 text-[9px] text-blue-800 hover:bg-blue-100">
                                                                                        <IconFileText className="mr-1 h-2.5 w-2.5" /> Manual PDF
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="font-sans text-sm">
                                                                        <div
                                                                            className="max-w-[150px] truncate font-medium text-foreground/90"
                                                                            title={doc.masterflow?.name || (doc.masterflow_id === null ? '✨ Custom Approval' : '-')}
                                                                        >
                                                                            {doc.masterflow?.name || (doc.masterflow_id === null ? '✨ Custom Approval' : '-')}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="font-sans text-sm">{getStatusBadge(doc.status)}</TableCell>
                                                                    <TableCell className="font-sans text-sm">
                                                                        {doc.detailed_status?.current_step_description ? (
                                                                            <div
                                                                                className="line-clamp-2 max-w-[200px] text-xs font-medium leading-snug text-foreground/80"
                                                                                title={doc.detailed_status.current_step_description}
                                                                            >
                                                                                {doc.detailed_status.current_step_description}
                                                                            </div>
                                                                        ) : doc.detailed_status?.is_fully_approved ? (
                                                                            <span className="text-xs font-semibold text-green-600">
                                                                                ✓ Semua disetujui
                                                                            </span>
                                                                        ) : doc.detailed_status?.is_rejected ? (
                                                                            <span className="text-xs font-semibold text-red-600">✗ Ditolak</span>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400">-</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="whitespace-nowrap font-sans text-sm font-medium">
                                                                        {new Date(doc.tgl_pengajuan).toLocaleDateString('id-ID')}
                                                                    </TableCell>
                                                                    <TableCell className="pr-4 text-right">
                                                                        <div className="flex justify-end gap-1.5">
                                                                            <Link href={`/dokumen/${doc.id}`}>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
                                                                                    title="Lihat Detail Dokumen"
                                                                                >
                                                                                    <Eye className="h-4 w-4" />
                                                                                </Button>
                                                                            </Link>
                                                                            {(doc.status === 'needs_revision' || doc.status === 'revision_requested') && (
                                                                                <Link href={`/dokumen/${doc.id}`}>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="h-8 border-amber-400 bg-amber-50 px-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
                                                                                        title="Unggah Berkas Revisi Baru"
                                                                                    >
                                                                                        <IconRefresh className="mr-1 h-3.5 w-3.5" />
                                                                                        Revisi
                                                                                    </Button>
                                                                                </Link>
                                                                            )}
                                                                            {doc.status === 'draft' && (
                                                                                <>
                                                                                    <Link href={`/dokumen/${doc.id}`}>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="h-8 w-8 border-green-300 p-0 text-green-600 hover:bg-green-50"
                                                                                            title="Edit Informasi Dokumen"
                                                                                        >
                                                                                            <IconEdit className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </Link>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => handleDelete(doc)}
                                                                                        className="h-8 w-8 border-red-300 p-0 text-red-600 hover:bg-red-50"
                                                                                        title="Hapus Draft Dokumen"
                                                                                    >
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
                                                                        ? 'Tidak ada pengajuan yang sesuai dengan filter'
                                                                        : 'Belum ada pengajuan. Klik "Buat Pengajuan Baru" untuk memulai.'}
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

                    {/* Create Document / Transaction Dialog */}
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[850px]">
                            <DialogHeader>
                                <DialogTitle className="font-serif text-xl">Buat Pengajuan Baru</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Pilih jenis pengajuan terlebih dahulu, lalu lengkapi rincian formulir di bawah ini.
                                </DialogDescription>
                            </DialogHeader>

                            {/* Mode Pengajuan */}
                            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newForm = { ...formData, jenis_pengajuan: 'manual' as const };
                                        setFormData({
                                            ...newForm,
                                            nomor_dokumen: generateDocumentNumber(newForm),
                                        });
                                    }}
                                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${formData.jenis_pengajuan === 'manual'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <IconFileText className="h-4 w-4 text-blue-600" />
                                    📄 Dokumen Manual (Upload PDF)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newForm = { ...formData, jenis_pengajuan: 'transaksi' as const };
                                        setFormData({
                                            ...newForm,
                                            nomor_dokumen: generateDocumentNumber(newForm),
                                        });
                                    }}
                                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${formData.jenis_pengajuan === 'transaksi'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Receipt className="h-4 w-4 text-emerald-600" />
                                    💳 Form Transaksi Direct
                                </button>
                            </div>

                            {/* PILIHAN UNIT APLIKASI */}
                            {formData.jenis_pengajuan === 'transaksi' && (
                                <>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {/* PILIHAN UNIT APLIKASI */}
                                        <div className="space-y-2 rounded-xl border border-purple-200 bg-purple-50/50 p-3">
                                            <Label className="text-xs font-bold text-purple-950">PILIH UNIT APLIKASI / UNIT BISNIS:</Label>
                                            {aplikasiList.length > 0 ? (
                                                <Select
                                                    value={formData.aplikasi_unit_id?.toString() || ''}
                                                    onValueChange={(val) => {
                                                        const appId = Number(val);
                                                        const app = aplikasiList.find((a) => a.id === appId);
                                                        let newModul = formData.modul_transaksi;
                                                        
                                                        if (app?.transaksi_management) {
                                                            const tr = app.transaksi_management.toLowerCase();
                                                            if (tr.includes('hris')) newModul = 'hris';
                                                            else if (tr.includes('po ') || tr === 'po') newModul = 'po';
                                                            else if (tr.includes('pr ') || tr === 'pr') newModul = 'pr';
                                                            else if (tr.includes('internal memo')) newModul = 'internal_memo';
                                                            else if (tr.includes('proposal')) newModul = 'proposal';
                                                        }

                                                        const newForm = { 
                                                            ...formData, 
                                                            aplikasi_unit_id: appId,
                                                            modul_transaksi: newModul 
                                                        };
                                                        setFormData({
                                                            ...newForm,
                                                            nomor_dokumen: generateDocumentNumber(newForm),
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-white font-sans text-xs">
                                                        <SelectValue placeholder="Pilih Unit Aplikasi / Bisnis" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {aplikasiList.map((app) => (
                                                            <SelectItem key={app.id} value={app.id.toString()} className="font-sans">
                                                                <div className="flex items-center gap-2">
                                                                    <Store className="h-4 w-4" />
                                                                    <span>{app.nama_aplikasi || app.name || '-'}</span>
                                                                    {app.transaksi_management && (
                                                                        <span className="ml-2 inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-800">
                                                                            {app.transaksi_management}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="rounded-lg border border-dashed border-purple-300 p-2 text-center text-xs text-purple-700">
                                                    Belum ada master aplikasi management. Silakan tambahkan melalui menu Master Aplikasi Management.
                                                </div>
                                            )}
                                            {errors.aplikasi_unit_id && <p className="text-sm text-red-500">{renderError(errors.aplikasi_unit_id)}</p>}
                                        </div>

                                        {/* Pilihan Modul Transaksi */}
                                        <div className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50/60 p-3">
                                            <Label className="text-xs font-bold text-emerald-950">PILIH MODUL TRANSAKSI MANAGEMENT:</Label>
                                            <Select
                                                value={formData.modul_transaksi}
                                                onValueChange={(val: any) => {
                                                    const newForm = { ...formData, modul_transaksi: val };
                                                    setFormData({
                                                        ...newForm,
                                                        nomor_dokumen: generateDocumentNumber(newForm),
                                                    });
                                                }}
                                            >
                                                <SelectTrigger className="bg-white font-sans text-xs">
                                                    <SelectValue placeholder="Pilih Modul Transaksi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[
                                                        { id: 'hris', label: 'HRIS', icon: Users },
                                                        { id: 'pr', label: 'PR (Requisition)', icon: ClipboardList },
                                                        { id: 'po', label: 'PO (Purchase Order)', icon: ShoppingCart },
                                                        { id: 'internal_memo', label: 'Internal Memo', icon: FileCheck },
                                                        { id: 'proposal', label: 'Proposal', icon: Lightbulb },
                                                    ].filter((item) => {
                                                        const selectedApp = aplikasiList.find(a => a.id === formData.aplikasi_unit_id);
                                                        const allowedModulStr = selectedApp?.transaksi_management?.toLowerCase() || '';
                                                        if (!allowedModulStr) return true; // Show all if no strict mapping
                                                        
                                                        if (item.id === 'hris' && allowedModulStr.includes('hris')) return true;
                                                        if (item.id === 'po' && (allowedModulStr.includes('po ') || allowedModulStr === 'po')) return true;
                                                        if (item.id === 'pr' && (allowedModulStr.includes('pr ') || allowedModulStr === 'pr')) return true;
                                                        if (item.id === 'internal_memo' && allowedModulStr.includes('internal memo')) return true;
                                                        if (item.id === 'proposal' && allowedModulStr.includes('proposal')) return true;
                                                        
                                                        return false;
                                                    }).map((item) => {
                                                        const IconComp = item.icon;
                                                        return (
                                                            <SelectItem key={item.id} value={item.id} className="font-sans">
                                                                <div className="flex items-center gap-2">
                                                                    <IconComp className="h-4 w-4" />
                                                                    <span>{item.label}</span>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="grid gap-4 py-2">
                                {/* Nomor & Tanggal Pengajuan */}
                                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nomor_dokumen" className="font-sans font-medium">
                                            Nomor Pengajuan
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="nomor_dokumen"
                                                name="nomor_dokumen"
                                                value={formData.nomor_dokumen}
                                                onChange={handleInputChange}
                                                className="font-mono"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    const autoNum = generateDocumentNumber();
                                                    setFormData((prev) => ({ ...prev, nomor_dokumen: autoNum }));
                                                    showToast.success('⚡ Nomor otomatis diperbarui');
                                                }}
                                                className="shrink-0 border-blue-200 font-sans text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                            >
                                                ⚡ Auto
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="tgl_pengajuan" className="font-sans font-medium">
                                            Tanggal Pengajuan
                                        </Label>
                                        <Input
                                            id="tgl_pengajuan"
                                            name="tgl_pengajuan"
                                            type="date"
                                            value={formData.tgl_pengajuan}
                                            onChange={handleInputChange}
                                            className="font-sans"
                                        />
                                    </div>
                                </div>

                                {/* Judul Pengajuan */}
                                <div className="grid gap-2">
                                    <Label htmlFor="judul_dokumen" className="font-sans">
                                        {formData.jenis_pengajuan === 'transaksi' ? 'Nama Transaksi / Perihal Pengajuan' : 'Judul Dokumen'}{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="judul_dokumen"
                                        name="judul_dokumen"
                                        value={formData.judul_dokumen}
                                        onChange={handleInputChange}
                                        className={errors.judul_dokumen ? 'border-red-500 font-sans' : 'font-sans'}
                                        placeholder="Perihal / Judul Pengajuan Transaksi..."
                                    />
                                    {errors.judul_dokumen && <p className="text-sm text-red-500">{renderError(errors.judul_dokumen)}</p>}
                                </div>

                                {/* FORM INPUT DINAMIS TRANSAKSI */}
                                {formData.jenis_pengajuan === 'transaksi' && (
                                    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                                        {formData.modul_transaksi === 'hris' && (
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label className="font-sans text-xs">Kategori Pengajuan HRIS</Label>
                                                    <Select
                                                        value={formData.kategori_hris}
                                                        onValueChange={(val) => setFormData((prev) => ({ ...prev, kategori_hris: val }))}
                                                    >
                                                        <SelectTrigger className="bg-white font-sans text-xs">
                                                            <SelectValue placeholder="Pilih Kategori HRIS" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="reimbursement" className="font-sans">🩺 Medical / Travel Reimbursement</SelectItem>
                                                            <SelectItem value="cuti_paid" className="font-sans">🌴 Cuti / Izin Paid</SelectItem>
                                                            <SelectItem value="overtime" className="font-sans">⏰ Klaim Lembur (Overtime)</SelectItem>
                                                            <SelectItem value="kasbon" className="font-sans">💵 Pinjaman / Kasbon Karyawan</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="font-sans text-xs">Nama Karyawan / NIP</Label>
                                                    <Input
                                                        name="nama_karyawan_nip"
                                                        value={formData.nama_karyawan_nip}
                                                        onChange={handleInputChange}
                                                        placeholder="Nama Karyawan / NIP"
                                                        className="bg-white font-sans text-xs"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {(formData.modul_transaksi === 'po' || formData.modul_transaksi === 'pr') && (
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label className="font-sans text-xs">Nama Vendor / Supplier Target</Label>
                                                    <Input
                                                        name="vendor_name"
                                                        value={formData.vendor_name}
                                                        onChange={handleInputChange}
                                                        placeholder="Nama Vendor / Supplier Target"
                                                        className="bg-white font-sans text-xs"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="font-sans text-xs">Syarat Pembayaran (Payment Terms)</Label>
                                                    <Select
                                                        value={formData.payment_terms}
                                                        onValueChange={(val) => setFormData((prev) => ({ ...prev, payment_terms: val }))}
                                                    >
                                                        <SelectTrigger className="bg-white font-sans text-xs">
                                                            <SelectValue placeholder="Pilih Terms" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="net_30" className="font-sans">📅 Net 30 Hari</SelectItem>
                                                            <SelectItem value="cod" className="font-sans">💵 COD / Tunai</SelectItem>
                                                            <SelectItem value="dp_50" className="font-sans">💳 DP 50% & Pelunasan</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}

                                        {(formData.modul_transaksi === 'internal_memo' || formData.modul_transaksi === 'proposal') && (
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label className="font-sans text-xs">Tingkat Urgensi</Label>
                                                    <Select
                                                        value={formData.urgensi_memo}
                                                        onValueChange={(val) => setFormData((prev) => ({ ...prev, urgensi_memo: val }))}
                                                    >
                                                        <SelectTrigger className="bg-white font-sans text-xs">
                                                            <SelectValue placeholder="Pilih Urgensi" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="biasa" className="font-sans">🟢 Biasa / Normal</SelectItem>
                                                            <SelectItem value="penting" className="font-sans">🟡 Penting</SelectItem>
                                                            <SelectItem value="sangat_penting" className="font-sans">🔴 Sangat Urgent / Prioritas Utama</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="font-sans text-xs">Estimasi Nominal Anggaran (Rp)</Label>
                                                    <Input
                                                        name="nominal"
                                                        type="number"
                                                        value={formData.nominal}
                                                        onChange={handleInputChange}
                                                        className="bg-white font-sans text-xs"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {isNeedsPayment && (
                                            <>
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div className="grid gap-2">
                                                        <Label className="font-sans text-xs">Metode Pembayaran</Label>
                                                        <Select
                                                            value={formData.metode_pembayaran}
                                                            onValueChange={(val) => setFormData((prev) => ({ ...prev, metode_pembayaran: val }))}
                                                        >
                                                            <SelectTrigger className="bg-white font-sans text-xs">
                                                                <SelectValue placeholder="Pilih Metode" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="transfer" className="font-sans">🏦 Transfer Bank</SelectItem>
                                                                <SelectItem value="cash" className="font-sans">💵 Cash / Tunai</SelectItem>
                                                                <SelectItem value="ewallet" className="font-sans">📱 E-Wallet</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label className="font-sans text-xs">
                                                            {formData.modul_transaksi === 'hris' ? 'Rekening Penerima / Karyawan' : 'Rekening Vendor / Penerima Transfer'}
                                                        </Label>
                                                        <Input
                                                            name="rekening_vendor"
                                                            value={formData.rekening_vendor}
                                                            onChange={handleInputChange}
                                                            placeholder={formData.modul_transaksi === 'hris' ? 'BCA 123456789 a/n Nama Karyawan' : 'BCA 123456789 a/n Vendor'}
                                                            className="bg-white font-sans text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="font-sans text-xs font-semibold">Rincian Barang / Jasa / Item Anggaran</Label>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={addItemTransaksi}
                                                            className="h-7 bg-white text-xs font-semibold"
                                                        >
                                                            <IconPlus className="mr-1 h-3 w-3" /> Tambah Item
                                                        </Button>
                                                    </div>

                                                    <div className="rounded-lg border bg-white p-2">
                                                        {formData.items_transaksi.map((item, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="mb-2 grid grid-cols-[1fr_80px_120px_120px_32px] items-center gap-2 border-b pb-2 last:border-b-0 last:pb-0"
                                                            >
                                                                <Input
                                                                    placeholder="Nama Item / Deskripsi"
                                                                    value={item.nama_item}
                                                                    onChange={(e) => handleItemChange(idx, 'nama_item', e.target.value)}
                                                                    className="h-8 text-xs"
                                                                />
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    placeholder="Qty"
                                                                    value={item.qty}
                                                                    onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                                                                    className="h-8 text-xs"
                                                                />
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Harga Satuan"
                                                                    value={item.harga_satuan}
                                                                    onChange={(e) => handleItemChange(idx, 'harga_satuan', Number(e.target.value))}
                                                                    className="h-8 text-xs"
                                                                />
                                                                <div className="pr-1 text-right font-mono text-xs font-bold text-emerald-800">
                                                                    Rp {item.total ? item.total.toLocaleString('id-ID') : 0}
                                                                </div>
                                                                {formData.items_transaksi.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeItemTransaksi(idx)}
                                                                        className="text-red-500 hover:text-red-700"
                                                                    >
                                                                        <IconTrash className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}

                                                        <div className="flex items-center justify-between rounded-b-md border-t bg-emerald-50/80 p-2">
                                                            <span className="text-xs font-bold text-emerald-950">TOTAL NOMINAL TRANSAKSI:</span>
                                                            <span className="font-mono text-sm font-black text-emerald-800">
                                                                Rp {Number(formData.nominal || 0).toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* FORM MANUAL */}
                                {formData.jenis_pengajuan === 'manual' && (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="tipe_dokumen" className="font-sans">
                                                Tipe Dokumen <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.tipe_dokumen}
                                                onValueChange={(val) => setFormData((prev) => ({ ...prev, tipe_dokumen: val }))}
                                            >
                                                <SelectTrigger className="font-sans">
                                                    <SelectValue placeholder="Pilih Tipe Dokumen" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="proposal" className="font-sans">📊 Proposal</SelectItem>
                                                    <SelectItem value="pengadaan" className="font-sans">📦 Pengadaan</SelectItem>
                                                    <SelectItem value="po" className="font-sans">🛒 PO (Purchase Order)</SelectItem>
                                                    <SelectItem value="pr" className="font-sans">📋 PR (Purchase Requisition)</SelectItem>
                                                    <SelectItem value="memo_internal" className="font-sans font-medium">📝 Memo Internal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="nominal" className="font-sans">
                                                Nominal Transaksi (Rp)
                                            </Label>
                                            <Input
                                                id="nominal"
                                                name="nominal"
                                                type="number"
                                                placeholder="Contoh: 4500000"
                                                value={formData.nominal}
                                                onChange={handleInputChange}
                                                className="font-sans"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Deadline */}
                                <div className="grid gap-2">
                                    <Label htmlFor="tgl_deadline" className="font-sans">
                                        Deadline Persetujuan <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="tgl_deadline"
                                        name="tgl_deadline"
                                        type="date"
                                        value={formData.tgl_deadline}
                                        onChange={handleInputChange}
                                        className={errors.tgl_deadline ? 'border-red-500 font-sans' : 'font-sans'}
                                    />
                                    {errors.tgl_deadline && <p className="text-sm text-red-500">{renderError(errors.tgl_deadline)}</p>}
                                </div>

                                {/* Masterflow Selection */}
                                <div className="grid gap-2">
                                    <Label htmlFor="masterflow_id" className="font-sans">
                                        Masterflow Approval <span className="text-red-500">*</span>
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
                                                ✨ Custom Approval
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.masterflow_id && <p className="text-sm text-red-500">{renderError(errors.masterflow_id)}</p>}
                                </div>

                                {/* Dynamic Approval Flow Render */}
                                {formData.masterflow_id !== '' &&
                                    formData.masterflow_id !== 'custom' &&
                                    selectedMasterflow &&
                                    selectedMasterflow.steps &&
                                    selectedMasterflow.steps.length > 0 && (
                                        <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="font-sans font-semibold">Alur Persetujuan</Label>
                                                <span className="text-xs text-muted-foreground">
                                                    {selectedMasterflow.steps.length} tahap persetujuan
                                                </span>
                                            </div>

                                            {selectedMasterflow.steps
                                                .slice()
                                                .sort((a, b) => a.step_order - b.step_order)
                                                .map((step, index) => (
                                                    <div key={step.id} className="space-y-3">
                                                        <div className="grid grid-cols-[80px_1fr_1fr_40px] items-center gap-3">
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
                                                                        {stepModes[step.id] === 'group' ? 'Group Approval' : 'Nama Approval'}
                                                                    </span>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => toggleStepMode(step.id)}
                                                                        className="h-6 px-2 text-xs"
                                                                    >
                                                                        {stepModes[step.id] === 'group' ? '👤 Single' : '👥 Group'}
                                                                    </Button>
                                                                </div>

                                                                {stepModes[step.id] === 'group' ? (
                                                                    <div className="space-y-2">
                                                                        <Select
                                                                            value={formData.step_approvers[step.id]?.jenisGroup || ''}
                                                                            onValueChange={(value) =>
                                                                                handleJenisGroupChange(
                                                                                    step.id,
                                                                                    value as 'all_required' | 'any_one' | 'majority'
                                                                                )
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="font-sans">
                                                                                <SelectValue placeholder="Pilih jenis group" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="all_required" className="font-sans">
                                                                                    ✓ Semua Harus Approve
                                                                                </SelectItem>
                                                                                <SelectItem value="any_one" className="font-sans">
                                                                                    1️⃣ Salah Satu Saja
                                                                                </SelectItem>
                                                                                <SelectItem value="majority" className="font-sans">
                                                                                    📊 Mayoritas ({'>'} 50%)
                                                                                </SelectItem>
                                                                            </SelectContent>
                                                                        </Select>

                                                                        <div className="rounded-md border border-border bg-background">
                                                                            <div className="max-h-40 space-y-1 overflow-y-auto p-2">
                                                                                {(availableApprovers[step.id] || []).map((user) => (
                                                                                    <label
                                                                                        key={user.id}
                                                                                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={
                                                                                                formData.step_approvers[
                                                                                                    step.id
                                                                                                ]?.userIds.includes(user.id) || false
                                                                                            }
                                                                                            onChange={(e) =>
                                                                                                handleMultipleApproverChange(
                                                                                                    step.id,
                                                                                                    user.id,
                                                                                                    e.target.checked
                                                                                                )
                                                                                            }
                                                                                            className="h-4 w-4 rounded border-gray-300"
                                                                                        />
                                                                                        <span className="text-sm">{user.name}</span>
                                                                                    </label>
                                                                                ))}
                                                                                {(availableApprovers[step.id] || []).length === 0 && (
                                                                                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                                                                                        Tidak ada approver tersedia
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <Select
                                                                        value={
                                                                            formData.approvers[step.id] === ''
                                                                                ? ''
                                                                                : formData.approvers[step.id]?.toString() || ''
                                                                        }
                                                                        onValueChange={(value) => handleApproverChange(step.id, value)}
                                                                    >
                                                                        <SelectTrigger className="font-sans">
                                                                            <SelectValue placeholder="Pilih approver" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {(availableApprovers[step.id] || []).map((user) => (
                                                                                <SelectItem
                                                                                    key={user.id}
                                                                                    value={user.id.toString()}
                                                                                    className="font-sans"
                                                                                >
                                                                                    {user.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center justify-center">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="h-8 w-8 justify-center border-primary/30 font-mono text-xs"
                                                                >
                                                                    {index + 1}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                {/* Custom Approvers */}
                                {formData.masterflow_id === 'custom' && (
                                    <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-sans font-semibold">Custom Approval Flow</Label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={addCustomApprover}
                                                className="h-8 font-sans"
                                            >
                                                <IconPlus className="mr-1 h-3 w-3" />
                                                Tambah Approver
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

                                        <p className="text-xs text-muted-foreground">
                                            * Masukkan email approver dan atur tingkat persetujuan (1 = tingkat pertama, 2 = tingkat kedua, dst.)
                                        </p>
                                    </div>
                                )}

                                {/* Deskripsi / Catatan */}
                                <div className="grid gap-2">
                                    <Label htmlFor="deskripsi" className="font-sans">
                                        Catatan / Komentar Tambahan
                                    </Label>
                                    <Textarea
                                        id="deskripsi"
                                        name="deskripsi"
                                        value={formData.deskripsi}
                                        onChange={handleInputChange}
                                        className={errors.deskripsi ? 'border-red-500 font-sans' : 'font-sans'}
                                        placeholder="Tambahkan penjelasan rinci mengenai pengajuan ini..."
                                        rows={3}
                                    />
                                    {errors.deskripsi && <p className="text-sm text-red-500">{renderError(errors.deskripsi)}</p>}
                                </div>

                                {/* Upload File PDF */}
                                <div className="grid gap-2">
                                    <Label htmlFor="file" className="font-sans">
                                        Upload File PDF {formData.jenis_pengajuan === 'manual' ? <span className="text-red-500">*</span> : '(Opsional)'}
                                    </Label>
                                    <Input
                                        id="file"
                                        name="file"
                                        type="file"
                                        onChange={handleFileChange}
                                        className={errors.file ? 'border-red-500 font-sans' : 'font-sans'}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        📄 <strong>File PDF (Maksimal 10MB).</strong> Tanda tangan digital akan ditempatkan pada halaman PDF ini.
                                    </p>

                                    {/* Tombol Atur Posisi Tanda Tangan */}
                                    {pdfPreviewUrl && (
                                        <div className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm flex flex-col items-center justify-center">
                                            <FileTextIcon className="h-10 w-10 text-blue-400 mb-2" />
                                            <p className="text-sm text-blue-900 font-medium text-center">
                                                File PDF berhasil diupload. Selanjutnya, atur posisi tanda tangan approver dan QR code.
                                            </p>
                                            <Button 
                                                type="button" 
                                                onClick={handleOpenSigModal}
                                                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-sans"
                                            >
                                                Atur Posisi Tanda Tangan
                                            </Button>
                                        </div>
                                    )}
                                    {errors.file && <p className="text-sm text-red-500">{renderError(errors.file)}</p>}
                                </div>
                            </div>

                            <DialogFooter className="sm:justify-between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        clearPdfPreview();
                                        setIsCreateDialogOpen(false);
                                    }}
                                    disabled={isSubmitting}
                                    className="font-sans"
                                >
                                    Batal
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={(e) => handleSubmit(e, 'draft')}
                                        disabled={isSubmitting}
                                        className="border-gray-300 font-sans hover:bg-gray-50"
                                    >
                                        {isSubmitting && submitType === 'draft' ? (
                                            <>
                                                <IconFileText className="mr-2 h-4 w-4 animate-spin" />
                                                Menimpan Draft...
                                            </>
                                        ) : (
                                            <>
                                                <IconFileText className="mr-2 h-4 w-4" />
                                                Simpan sebagai Draft
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={(e) => handleSubmit(e, 'submit')}
                                        disabled={isSubmitting}
                                        className="bg-green-600 font-sans hover:bg-green-700"
                                    >
                                        {isSubmitting && submitType === 'submit' ? (
                                            <>
                                                <CheckCircle2 className="mr-2 h-4 w-4 animate-spin" />
                                                Mengirim...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                Submit Pengajuan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Hapus Dokumen</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin menghapus dokumen "<strong>{selectedDokumen?.judul_dokumen}</strong>"? Tindakan ini tidak dapat dibatalkan.
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
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}