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
}

interface StepApprovers {
    userIds: number[];
    jenisGroup: 'all_required' | 'any_one' | 'majority' | null;
}

interface FormData {
    nomor_dokumen: string;
    judul_dokumen: string;
    aplikasi_id?: string | number;
    transaksi_id?: string | number;
    tipe_dokumen?: string;
    nominal_transaksi?: string;
    masterflow_id: number | '' | 'custom'; // 'custom' untuk custom approval
    tgl_pengajuan: string;
    tgl_deadline: string;
    deskripsi: string;
    file: File | null;
    approvers: Record<number, number | ''>; // stepId -> userId (for single approver mode)
    custom_approvers: CustomApprover[]; // for custom approvals
    step_approvers: Record<number, StepApprovers>; // stepId -> { userIds, jenisGroup } (for group mode)
    signature_positions: any[] | null;
}

const initialFormData: FormData = {
    nomor_dokumen: '',
    judul_dokumen: '',
    aplikasi_id: '',
    transaksi_id: '',
    tipe_dokumen: '',
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
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDokumen, setSelectedDokumen] = useState<Dokumen | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitType, setSubmitType] = useState<'draft' | 'submit'>('draft'); // Track button clicked
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedMasterflow, setSelectedMasterflow] = useState<Masterflow | null>(null);
    const [availableApprovers, setAvailableApprovers] = useState<Record<number, UserOption[]>>({});
    const [stepModes, setStepModes] = useState<Record<number, 'single' | 'group'>>({});
    const [updatedDokumenIds, setUpdatedDokumenIds] = useState<Set<number>>(new Set()); // Track recently updated documents

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
            console.log('Fetching dokumen...');
            setIsLoading(true);

            // Fetch only current user's documents
            const response = await api.get('/dokumen', {
                params: {
                    my_documents: true,
                },
            });

            console.log('Dokumen fetched:', response.data);
            const newDokumen = response.data.data || response.data;
            console.log('📊 Total dokumen received:', newDokumen.length);
            setDokumen(newDokumen);
        } catch (error) {
            console.error('Error fetching dokumen:', error);
            showToast.error('❌ Failed to load documents. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch aplikasi for dropdown
    const fetchAplikasi = async () => {
        try {
            console.log('Fetching aplikasi...');
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

    // Fetch masterflows for dropdown
    const fetchMasterflows = async () => {
        try {
            console.log('Fetching masterflows...');
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
            console.log('No authenticated user found, redirecting to home');
            showToast.error('❌ Please login first to access Documents.');
            window.location.href = '/';
            return;
        }
        console.log('Authenticated user found, loading data');
        fetchDokumen();
        fetchMasterflows();
        fetchAplikasi();
        fetchTransaksis();

        // Real-time updates dengan Laravel Reverb untuk user-specific dokumen
        if (typeof window !== 'undefined' && window.Echo && auth.user?.id) {
            console.log('📡 Setting up real-time listener for user dokumen:', auth.user.id);

            // Listen to user-specific channel untuk dokumen mereka
            const userChannelName = `user.${auth.user.id}.dokumen`;

            console.log('🔧 Creating channel:', userChannelName);
            const channel = window.Echo.channel(userChannelName);

            console.log('🔧 Channel object:', channel);
            console.log('🔧 Echo instance:', window.Echo);

            // ALTERNATIVE: Listen directly on Pusher channel
            if (window.Echo.connector?.pusher) {
                const pusherChannel = window.Echo.connector.pusher.subscribe(userChannelName);

                console.log('🔧 Pusher channel subscribed:', pusherChannel);

                // Listen on Pusher channel directly
                pusherChannel.bind('dokumen.updated', (event: any) => {
                    console.log('🎉🎉🎉 PUSHER DIRECT LISTENER TRIGGERED! 🎉🎉🎉');
                    console.log('📡 Real-time dokumen update received:', event);
                    console.log('📡 Event data:', JSON.stringify(event, null, 2));

                    // Update dokumen in state smoothly (no full refresh)
                    if (event.dokumen?.id) {
                        console.log('🔄 Updating dokumen state smoothly for ID:', event.dokumen.id);

                        setDokumen((prevDokumen) => {
                            const updatedDokumen = prevDokumen.map((doc) => {
                                if (doc.id === event.dokumen.id) {
                                    console.log('✨ Found matching dokumen, updating:', {
                                        oldStatus: doc.status,
                                        newStatus: event.dokumen.status,
                                        oldCurrentStep: doc.detailed_status?.current_step_description,
                                        newCurrentStep: event.dokumen.detailed_status?.current_step_description,
                                    });

                                    // Merge updated data with existing data
                                    return {
                                        ...doc,
                                        ...event.dokumen,
                                        // Preserve nested relations if not in event
                                        user: event.dokumen.user || doc.user,
                                        masterflow: event.dokumen.masterflow || doc.masterflow,
                                        latest_version: event.dokumen.latest_version || doc.latest_version,
                                        approvals: event.dokumen.approvals || doc.approvals,
                                        detailed_status: event.dokumen.detailed_status || doc.detailed_status,
                                    };
                                }
                                return doc;
                            });

                            console.log('✅ Dokumen state updated smoothly');
                            return updatedDokumen;
                        });

                        // Mark document as recently updated for animation
                        setUpdatedDokumenIds((prev) => new Set(prev).add(event.dokumen.id));

                        // Remove highlight after animation
                        setTimeout(() => {
                            setUpdatedDokumenIds((prev) => {
                                const newSet = new Set(prev);
                                newSet.delete(event.dokumen.id);
                                return newSet;
                            });
                        }, 2000); // Remove after 2 seconds
                    }

                    // Tampilkan notifikasi toast
                    console.log('🔔 Showing toast notification...');
                    if (event.dokumen?.judul_dokumen) {
                        const statusText = event.dokumen.status === 'approved' ? 'disetujui' : 'diupdate';
                        showToast.success(`📡 Dokumen "${event.dokumen.judul_dokumen}" telah ${statusText}!`);
                    } else {
                        showToast.success('📡 Daftar dokumen telah diupdate secara real-time!');
                    }
                    console.log('✅ Toast notification triggered');
                });

                pusherChannel.bind('pusher:subscription_succeeded', () => {
                    console.log('✅ Pusher subscription succeeded for:', userChannelName);
                });

                pusherChannel.bind('pusher:subscription_error', (error: any) => {
                    console.error('❌ Pusher subscription error:', error);
                });
            }

            // Subscribe to channel events FIRST before monitoring
            console.log('🎯 Attaching listener for event: dokumen.updated');
            channel.listen('dokumen.updated', (event: any) => {
                console.log('🎉🎉🎉 CHANNEL LISTENER TRIGGERED! 🎉🎉🎉');
                console.log('📡 Real-time dokumen update received:', event);
                console.log('📡 Event data:', JSON.stringify(event, null, 2));

                // Update dokumen in state smoothly (no full refresh)
                if (event.dokumen?.id) {
                    console.log('🔄 Updating dokumen state smoothly for ID:', event.dokumen.id);

                    setDokumen((prevDokumen) => {
                        const updatedDokumen = prevDokumen.map((doc) => {
                            if (doc.id === event.dokumen.id) {
                                console.log('✨ Found matching dokumen, updating:', {
                                    oldStatus: doc.status,
                                    newStatus: event.dokumen.status,
                                    oldCurrentStep: doc.detailed_status?.current_step_description,
                                    newCurrentStep: event.dokumen.detailed_status?.current_step_description,
                                });

                                // Merge updated data with existing data
                                return {
                                    ...doc,
                                    ...event.dokumen,
                                    // Preserve nested relations if not in event
                                    user: event.dokumen.user || doc.user,
                                    masterflow: event.dokumen.masterflow || doc.masterflow,
                                    latest_version: event.dokumen.latest_version || doc.latest_version,
                                    approvals: event.dokumen.approvals || doc.approvals,
                                    detailed_status: event.dokumen.detailed_status || doc.detailed_status,
                                };
                            }
                            return doc;
                        });

                        console.log('✅ Dokumen state updated smoothly');
                        return updatedDokumen;
                    });

                    // Mark document as recently updated for animation
                    setUpdatedDokumenIds((prev) => new Set(prev).add(event.dokumen.id));

                    // Remove highlight after animation
                    setTimeout(() => {
                        setUpdatedDokumenIds((prev) => {
                            const newSet = new Set(prev);
                            newSet.delete(event.dokumen.id);
                            return newSet;
                        });
                    }, 2000); // Remove after 2 seconds
                }

                // Tampilkan notifikasi toast
                console.log('🔔 Showing toast notification...');
                if (event.dokumen?.judul_dokumen) {
                    const statusText = event.dokumen.status === 'approved' ? 'disetujui' : 'diupdate';
                    showToast.success(`📡 Dokumen "${event.dokumen.judul_dokumen}" telah ${statusText}!`);
                } else {
                    showToast.success('📡 Daftar dokumen telah diupdate secara real-time!');
                }
                console.log('✅ Toast notification triggered');
            });

            // Monitor subscription success/error
            channel.subscribed(() => {
                console.log('✅ Successfully subscribed to channel:', userChannelName);
                console.log('✅ Ready to receive real-time updates for user:', auth.user.id);
            });

            channel.error((error: any) => {
                console.error('❌ Channel subscription error:', error);
            });

            // Monitor connection state
            if (window.Echo.connector?.pusher) {
                window.Echo.connector.pusher.connection.bind('connected', () => {
                    console.log('✅ WebSocket connected successfully');
                });

                window.Echo.connector.pusher.connection.bind('error', (err: any) => {
                    console.error('❌ WebSocket connection error:', err);
                });

                window.Echo.connector.pusher.connection.bind('disconnected', () => {
                    console.warn('⚠️ WebSocket disconnected');
                });

                // Monitor all events for debugging (filter out internal Pusher events)
                window.Echo.connector.pusher.bind_global((eventName: string, data: any) => {
                    // Ignore internal Pusher protocol events (heartbeat/keepalive)
                    if (eventName.startsWith('pusher:')) {
                        return;
                    }
                    console.log('🔔 Global event received:', eventName, data);
                    console.log('🔔 Event received on channel:', data?.channel || 'unknown');
                    console.log('🔔 Looking for listener on channel:', userChannelName);
                    console.log('🔔 Event name received:', eventName);
                    console.log('🔔 Expected event name: dokumen.updated');
                });
            }

            // Log subscription
            console.log('📻 Subscribed to channel:', userChannelName);

            // Cleanup saat component unmount
            return () => {
                console.log('🔌 Leaving channel:', userChannelName);
                if (window.Echo.connector?.pusher) {
                    window.Echo.connector.pusher.unsubscribe(userChannelName);
                }
                window.Echo.leave(userChannelName);
            };
        } else {
            if (!window.Echo) {
                console.error('❌ window.Echo not initialized! Check app.tsx');
            }
        }
    }, [auth.user]);

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: '',
            }));
        }
    };

    // Handle file input change
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
            
            // Create a local URL for the PDF preview in the signature placement dialog
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

    // Generate document number
    const generateDocumentNumber = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        return `${year}${month}${random}`;
    };

    // Handle masterflow select change (including 'custom' option)
    const handleMasterflowChange = async (value: string) => {
        // Check if user selected 'custom'
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
            approvers: {}, // Reset approvers
            custom_approvers: [], // Clear custom approvers
        }));

        if (errors.masterflow_id) {
            setErrors((prev) => ({
                ...prev,
                masterflow_id: '',
            }));
        }

        // Find selected masterflow with steps
        const selected = masterflows.find((mf) => mf.id === masterflowId);
        if (selected) {
            try {
                // Fetch masterflow details with steps
                const response = await api.get(`/masterflows/${masterflowId}/steps`);
                console.log('Masterflow steps:', response.data);

                const masterflowWithSteps = {
                    ...selected,
                    steps: response.data.steps || [],
                };
                setSelectedMasterflow(masterflowWithSteps);

                // Fetch available approvers for each step
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

    // Add new custom approver
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
            custom_approvers: prev.custom_approvers.filter((_, i) => i !== index).map((approver, idx) => ({ ...approver, order: idx + 1 })),
        }));
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

    // Toggle step mode between single and group
    const toggleStepMode = (stepId: number) => {
        setStepModes((prev) => {
            const currentMode = prev[stepId] || 'single';
            const newMode = currentMode === 'single' ? 'group' : 'single';

            // Clear data for the previous mode
            if (newMode === 'single') {
                // Switching to single mode - clear group data
                setFormData((prevForm) => {
                    const newStepApprovers = { ...prevForm.step_approvers };
                    delete newStepApprovers[stepId];
                    return {
                        ...prevForm,
                        step_approvers: newStepApprovers,
                    };
                });
            } else {
                // Switching to group mode - clear single approver
                setFormData((prevForm) => ({
                    ...prevForm,
                    approvers: {
                        ...prevForm.approvers,
                        [stepId]: '',
                    },
                }));
            }

            return {
                ...prev,
                [stepId]: newMode,
            };
        });
    };

    // Handle multiple approver selection for group mode
    const handleMultipleApproverChange = (stepId: number, userId: number, checked: boolean) => {
        setFormData((prev) => {
            const currentStepApprovers = prev.step_approvers[stepId] || { userIds: [], jenisGroup: null };
            const newUserIds = checked ? [...currentStepApprovers.userIds, userId] : currentStepApprovers.userIds.filter((id) => id !== userId);

            return {
                ...prev,
                step_approvers: {
                    ...prev.step_approvers,
                    [stepId]: {
                        ...currentStepApprovers,
                        userIds: newUserIds,
                    },
                },
            };
        });
    };

    // Handle jenis group selection
    const handleJenisGroupChange = (stepId: number, jenisGroup: 'all_required' | 'any_one' | 'majority') => {
        setFormData((prev) => {
            const currentStepApprovers = prev.step_approvers[stepId] || { userIds: [], jenisGroup: null };

            return {
                ...prev,
                step_approvers: {
                    ...prev.step_approvers,
                    [stepId]: {
                        ...currentStepApprovers,
                        jenisGroup,
                    },
                },
            };
        });
    };

    // Open create dialog
    const handleCreate = async () => {
        try {
            await fetch('/sanctum/csrf-cookie', {
                credentials: 'include',
            });
        } catch (error) {
            console.warn('Failed to refresh CSRF token:', error);
        }

        const defaultAppId = context?.current?.aplikasi?.id
            ? String(context.current.aplikasi.id)
            : accessibleAplikasiList.length === 1
                ? String(accessibleAplikasiList[0].id)
                : '';

        // Generate new document number
        const newFormData: FormData = {
            ...initialFormData,
            nomor_dokumen: generateDocumentNumber(),
            tgl_pengajuan: new Date().toISOString().split('T')[0],
            custom_approvers: [{ email: '', order: 1 }],
            aplikasi_id: defaultAppId,
            tipe_dokumen: 'manual',
        };

        setFormData(newFormData);
        setSelectedMasterflow(null);
        setAvailableApprovers({});
        setStepModes({}); // Reset step modes
        setSelectedAplikasiId(defaultAppId);
        setDocTypeMode('manual');
        setExternalDocKeyword('');
        setExternalFetchSuccess(null);
        setErrors({});
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
                        user: { name: app.email }
                    });
                }
            });
        } else if (selectedMasterflow && selectedMasterflow.steps) {
            selectedMasterflow.steps.forEach(step => {
                if (stepModes[step.id] === 'group') {
                    generatedApprovals.push({
                        id: `group_${step.id}`,
                        step_name: step.step_name,
                        jabatan_name: step.jabatan?.name || 'Group',
                        user: { name: `Group Approval (${step.step_name})` }
                    });
                } else {
                    const userId = formData.approvers[step.id];
                    const user = availableApprovers[step.id]?.find(u => u.id === userId);
                    if (userId) {
                        generatedApprovals.push({
                            id: `step_${step.id}_user_${userId}`,
                            step_name: step.step_name,
                            jabatan_name: step.jabatan?.name,
                            user: { name: user ? user.name : `Approver ${step.step_name}` }
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

    // Submit form to create document
    const handleSubmit = async (e: React.FormEvent, type: 'draft' | 'submit') => {
        e.preventDefault();
        setSubmitType(type);
        setIsSubmitting(true);
        setErrors({});

        try {
            // Force refresh CSRF token before submitting
            console.log('Refreshing CSRF token before form submission...');
            await fetch('/sanctum/csrf-cookie', {
                credentials: 'include',
            });

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('nomor_dokumen', formData.nomor_dokumen);
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

            // Add approvers based on masterflow type
            if (formData.masterflow_id === 'custom') {
                submitData.append('masterflow_id', 'custom');
                // Send custom approvers array
                formData.custom_approvers.forEach((approver, index) => {
                    submitData.append(`custom_approvers[${index}][email]`, approver.email);
                    submitData.append(`custom_approvers[${index}][order]`, approver.order.toString());
                });
            } else {
                submitData.append('masterflow_id', formData.masterflow_id.toString());

                // Send step_approvers for group mode steps
                Object.entries(formData.step_approvers).forEach(([stepId, stepApprover]) => {
                    if (stepApprover.userIds.length > 0 && stepApprover.jenisGroup) {
                        console.log(`Adding group approvers for step ${stepId}:`, stepApprover);
                        submitData.append(`step_approvers[${stepId}][jenis_group]`, stepApprover.jenisGroup);
                        stepApprover.userIds.forEach((userId, index) => {
                            submitData.append(`step_approvers[${stepId}][user_ids][${index}]`, userId.toString());
                        });
                    }
                });

                // Send single approvers for single mode steps
                Object.entries(formData.approvers).forEach(([stepId, userId]) => {
                    if (userId !== '' && !formData.step_approvers[Number(stepId)]) {
                        console.log(`Adding single approver for step ${stepId}:`, userId);
                        submitData.append(`approvers[${stepId}]`, userId.toString());
                    }
                });
            }

            console.log('Submitting document with type:', type);
            console.log('Form data summary:', {
                masterflow_id: formData.masterflow_id,
                step_approvers: formData.step_approvers,
                approvers: formData.approvers,
                stepModes: stepModes,
            });

            // Use Inertia router for form submission with file
            router.post('/api/dokumen', submitData, {
                forceFormData: true,
                preserveState: true,
                preserveScroll: false,
                onSuccess: (page) => {
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
                onError: (errors) => {
                    console.error('Form submission errors:', errors);
                    setErrors(errors);

                    // Show specific error message if available
                    const errorMessage = errors.error || 'Failed to create document. Please check the form.';
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
                showToast.error('❌ Session expired. Please refresh the page and try again.');
            } else {
                showToast.error(`❌ Failed to save document. ${error.response?.data?.message || error.message}`);
            }
        }
    };

    // Handle delete
    const handleDelete = (doc: Dokumen) => {
        setSelectedDokumen(doc);
        setIsDeleteDialogOpen(true);
    };

    // Confirm delete
    const confirmDelete = async () => {
        if (!selectedDokumen) return;

        try {
            await api.delete(`/dokumen/${selectedDokumen.id}`);
            showToast.success(`🎉 Dokumen "${selectedDokumen.judul_dokumen}" berhasil dihapus!`);
            setIsDeleteDialogOpen(false);
            setSelectedDokumen(null);
            fetchDokumen();
        } catch (error: any) {
            showToast.error(`❌ Failed to delete document. ${error.response?.data?.message || error.message}`);
        }
    };

    // Get status badge
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

    // Filter documents
    const filteredDokumen = dokumen.filter((doc) => {
        const matchesSearch =
            doc.judul_dokumen.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.masterflow?.name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Calculate stats
    const stats = {
        total: dokumen.length,
        draft: dokumen.filter((d) => d.status === 'draft').length,
        submitted: dokumen.filter((d) => d.status === 'submitted' || d.status === 'under_review').length,
        approved: dokumen.filter((d) => d.status === 'approved').length,
    };

    return (
        <>
            <Head title="My Documents" />
            <SidebarProvider>
                <NotificationListener />
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
                                                                    className={`transition-all duration-500 ${updatedDokumenIds.has(doc.id) ? 'bg-green-50 dark:bg-green-950/20' : ''
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
                                                                    <TableCell className="font-sans">{doc.masterflow?.name || '-'}</TableCell>
                                                                    <TableCell className="font-sans">{getStatusBadge(doc.status)}</TableCell>
                                                                    <TableCell className="font-sans">
                                                                        {doc.detailed_status?.current_step_description ? (
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {doc.detailed_status.current_step_description}
                                                                                </span>
                                                                            </div>
                                                                        ) : doc.detailed_status?.is_fully_approved ? (
                                                                            <span className="text-xs font-medium text-green-600">
                                                                                ✓ Semua sudah approve
                                                                            </span>
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
                                                                            <Link href={`/api/dokumen/${doc.id}`}>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
                                                                                >
                                                                                    <Eye className="h-4 w-4" />
                                                                                </Button>
                                                                            </Link>
                                                                            {doc.status === 'draft' && (
                                                                                <>
                                                                                    <Link href={`/dokumen/${doc.id}/edit`}>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="h-8 w-8 border-green-300 p-0 text-green-600 hover:bg-green-50"
                                                                                        >
                                                                                            <IconEdit className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </Link>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => handleDelete(doc)}
                                                                                        className="h-8 w-8 border-red-300 p-0 text-red-600 hover:bg-red-50"
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
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
                            <form onSubmit={(e) => e.preventDefault()}>
                                <DialogHeader>
                                    <DialogTitle className="font-serif">Buat Dokumen Baru</DialogTitle>
                                    <DialogDescription className="font-sans">
                                        Isi form di bawah untuk membuat dokumen baru. Klik simpan setelah selesai.
                                    </DialogDescription>
                                </DialogHeader>

                                {/* ===== SWITCHER TAB ===== */}
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
                                    {/* ===== FORM KHUSUS DOKUMEN TRANSAKSI ===== */}
                                    {docTypeMode === 'transaksi' && (
                                        <div className="space-y-3">
                                            {/* TARIK DATA & FILE PDF EKSTERNAL */}
                                            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 shadow-sm">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs flex-shrink-0">
                                                            <IconDownload className="h-4 w-4" />
                                                        </span>
                                                        <div>
                                                            <h4 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                                Tarik Data & File PDF
                                                                <span className="text-[10px] font-normal font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                                                                    Otomatis Template
                                                                </span>
                                                            </h4>
                                                            <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400">
                                                                Masukkan kode transaksi untuk menarik data dan menyusun dokumen PDF secara otomatis
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Input
                                                            placeholder="Ketik kode dokumen (misal: RQE-22001434, POE-22005020, CCA-00000002)..."
                                                            value={externalDocKeyword}
                                                            onChange={(e) => setExternalDocKeyword(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleFetchExternalData();
                                                                }
                                                            }}
                                                            className="font-mono text-xs uppercase bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 h-9 pr-8"
                                                        />
                                                        {externalDocKeyword && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setExternalDocKeyword('')}
                                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleFetchExternalData()}
                                                        disabled={isFetchingExternal || !externalDocKeyword.trim()}
                                                        className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs gap-1.5 shadow-sm"
                                                    >
                                                        {isFetchingExternal ? (
                                                            <>
                                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                                <span>Menarik...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <IconDownload className="h-4 w-4" />
                                                                <span>Tarik Data</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>

                                                {/* Quick selection sample chips */}
                                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">Contoh Dummy:</span>
                                                    {[
                                                        { code: 'RQE-22001434', label: 'RQE-22001434 (PR Kertas HVS)' },
                                                        { code: 'POE-22005020', label: 'POE-22005020 (PO Basa Jawa)' },
                                                        { code: 'CCA-00000002', label: 'CCA-00000002 (NPK Meja Jati)' },
                                                    ].map((sample) => (
                                                        <button
                                                            key={sample.code}
                                                            type="button"
                                                            onClick={() => {
                                                                setExternalDocKeyword(sample.code);
                                                                handleFetchExternalData(sample.code);
                                                            }}
                                                            disabled={isFetchingExternal}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors cursor-pointer"
                                                        >
                                                            <span>{sample.label}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Success Banner */}
                                                {externalFetchSuccess && (
                                                    <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs">
                                                                    ✓
                                                                </span>
                                                                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 font-sans">
                                                                    Template PDF Dokumen Berhasil Dibuat
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                                                                Rp {Number(externalFetchSuccess.nominal).toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-700 dark:text-slate-300 font-sans space-y-0.5">
                                                            <p><strong className="text-slate-900 dark:text-slate-100">No. Dokumen:</strong> {externalFetchSuccess.nomor_dokumen}</p>
                                                            <p><strong className="text-slate-900 dark:text-slate-100">Judul:</strong> {externalFetchSuccess.judul}</p>
                                                            <p><strong className="text-slate-900 dark:text-slate-100">File Terlampir:</strong> {externalFetchSuccess.filename} ({externalFetchSuccess.items_count} item transaksi)</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 pt-1 border-t border-dashed border-emerald-300 dark:border-emerald-700">
                                                            {localFileUrl && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => window.open(localFileUrl, '_blank')}
                                                                    className="h-7 text-xs font-sans border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 bg-white dark:bg-emerald-950 hover:bg-emerald-50 dark:hover:bg-emerald-900 gap-1 cursor-pointer"
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
                                                                className="h-7 text-xs font-sans bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600 gap-1 cursor-pointer"
                                                            >
                                                                <IconEdit className="h-3.5 w-3.5" />
                                                                Atur Posisi Tanda Tangan
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Aplikasi & Tipe Transaksi Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                                <div className="grid gap-2 min-w-0 overflow-hidden">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <Label htmlFor="aplikasi_id" className="font-sans text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                            Aplikasi Modul <span className="text-red-500">*</span>
                                                        </Label>
                                                        {!isSuperAdmin && (
                                                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shrink-0">
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
                                                        <SelectTrigger id="aplikasi_id" className="w-full min-w-0 font-sans bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 truncate">
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
                                                    <Label htmlFor="transaksi_id" className="font-sans text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                        Tipe Transaksi <span className="text-red-500">*</span>
                                                    </Label>
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
                                                                <SelectTrigger id="transaksi_id" className="w-full min-w-0 font-sans bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 truncate">
                                                                    <SelectValue placeholder={!currentAppId ? 'Pilih aplikasi terlebih dahulu' : '-- Pilih Transaksi --'} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {currentAppTrans.length > 0 ? (
                                                                        currentAppTrans.map((t) => (
                                                                            <SelectItem key={t.id} value={t.id.toString()} className="font-sans">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700 shrink-0">
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
                                    )}

                                    {/* Row 1: Nomor Dokumen & Tanggal Pengajuan */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="nomor_dokumen" className="font-sans">
                                                Nomor Dokumen
                                            </Label>
                                            <Input
                                                id="nomor_dokumen"
                                                name="nomor_dokumen"
                                                value={formData.nomor_dokumen}
                                                onChange={handleInputChange}
                                                className="font-mono"
                                                placeholder="Auto-generated"
                                                readOnly
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="tgl_pengajuan" className="font-sans">
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
                                            placeholder="Jurnal Besar Keuangan"
                                        />
                                        {errors.judul_dokumen && <p className="text-sm text-red-500">{errors.judul_dokumen}</p>}
                                    </div>

                                    {/* Deadline */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="tgl_deadline" className="font-sans">
                                            Deadline <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="tgl_deadline"
                                            name="tgl_deadline"
                                            type="date"
                                            value={formData.tgl_deadline}
                                            onChange={handleInputChange}
                                            className={errors.tgl_deadline ? 'border-red-500 font-sans' : 'font-sans'}
                                        />
                                        {errors.tgl_deadline && <p className="text-sm text-red-500">{errors.tgl_deadline}</p>}
                                    </div>

                                    {/* Masterflow Selection (includes Custom option) */}
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
                                                    ✨ Custom Approval
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.masterflow_id && <p className="text-sm text-red-500">{errors.masterflow_id}</p>}
                                    </div>

                                    {/* Approval Flow - Dynamic based on masterflow selection */}
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
                                                    .sort((a, b) => a.step_order - b.step_order)
                                                    .map((step, index) => (
                                                        <div key={step.id} className="space-y-3">
                                                            <div className="grid grid-cols-[80px_1fr_1fr_40px] items-center gap-3">
                                                                {/* Step Order */}
                                                                <div className="flex items-center justify-center">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-medium text-primary">
                                                                        {index + 1}
                                                                    </div>
                                                                </div>

                                                                {/* Jabatan */}
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-xs text-muted-foreground">Jabatan</span>
                                                                    <div className="rounded-md border border-border bg-background px-3 py-2 font-sans text-sm">
                                                                        {step.jabatan?.name || 'Sekertaris'}
                                                                    </div>
                                                                </div>

                                                                {/* Nama Approval - Toggle between Single/Group Mode */}
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
                                                                            {/* Group Type Selection */}
                                                                            <Select
                                                                                value={formData.step_approvers[step.id]?.jenisGroup || ''}
                                                                                onValueChange={(value) =>
                                                                                    handleJenisGroupChange(
                                                                                        step.id,
                                                                                        value as 'all_required' | 'any_one' | 'majority',
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

                                                                            {/* Multiple Approvers Selection */}
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
                                                                                                        e.target.checked,
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

                                                                            {/* Selected Count Badge */}
                                                                            {formData.step_approvers[step.id]?.userIds.length > 0 && (
                                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                    <Badge variant="secondary">
                                                                                        {formData.step_approvers[step.id].userIds.length} approver
                                                                                        dipilih
                                                                                    </Badge>
                                                                                    {formData.step_approvers[step.id]?.jenisGroup && (
                                                                                        <Badge variant="outline" className="border-blue-400">
                                                                                            {formData.step_approvers[step.id].jenisGroup ===
                                                                                                'all_required' && 'Semua'}
                                                                                            {formData.step_approvers[step.id].jenisGroup ===
                                                                                                'any_one' && 'Salah Satu'}
                                                                                            {formData.step_approvers[step.id].jenisGroup ===
                                                                                                'majority' && 'Mayoritas'}
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            )}
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

                                                                {/* Urutan Badge */}
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

                                    {/* Custom Approvers - Show when masterflow_id is 'custom' */}
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
                                                        {/* Step Order */}
                                                        <div className="flex items-center justify-center pt-2">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-medium text-primary">
                                                                {index + 1}
                                                            </div>
                                                        </div>

                                                        {/* Email Input */}
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

                                                        {/* Order Input */}
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

                                                        {/* Remove Button */}
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

                                    {/* Deskripsi / Tambahkan Komentar */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="deskripsi" className="font-sans">
                                            Tambahkan Komentar
                                        </Label>
                                        <Textarea
                                            id="deskripsi"
                                            name="deskripsi"
                                            value={formData.deskripsi}
                                            onChange={handleInputChange}
                                            className={errors.deskripsi ? 'border-red-500 font-sans' : 'font-sans'}
                                            placeholder="Lapor bapak,,"
                                            rows={4}
                                        />
                                        {errors.deskripsi && <p className="text-sm text-red-500">{errors.deskripsi}</p>}
                                    </div>

                                    {/* Upload File - HANYA UNTUK DOKUMEN MANUAL */}
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
                                            {errors.file && <p className="text-sm text-red-500">{errors.file}</p>}
                                            <p className="text-xs text-muted-foreground">
                                                📄 <strong>Hanya file PDF yang diterima.</strong> Sistem tanda tangan digital hanya mendukung format PDF.
                                                (Max 10MB)
                                            </p>
                                            {errors.file && <p className="text-sm text-red-500">{errors.file[0]}</p>}
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
                                            {isSubmitting && submitType === 'draft' ? (
                                                <>
                                                    <IconFileText className="mr-2 h-4 w-4 animate-spin" />
                                                    Menyimpan Draft...
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
                                                    Submit untuk Approval
                                                </>
                                            )}
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
                                setFormData(prev => ({
                                    ...prev,
                                    signature_positions: positions
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
                                    Apakah Anda yakin ingin menghapus dokumen "<strong>{selectedDokumen?.judul_dokumen}</strong>"? Tindakan ini tidak
                                    dapat dibatalkan.
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
