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
import { IconEdit, IconFileText, IconPlus, IconTrash } from '@tabler/icons-react';
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
    total_steps?: number;
    steps_count?: number;
    aplikasi_id?: number;
    transaksi_id?: number;
    departemen?: string;
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

interface Dokumen {
    id: number;
    judul_dokumen: string;
    user_id: number;
    masterflow_id: number;
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

interface Aplikasi {
    id: number;
    name: string;
    description?: string;
}

interface Transaksi {
    id: number;
    aplikasi_id: number;
    kode_transaksi: string;
    nama_transaksi: string;
    departemen?: string;
    deskripsi?: string;
    is_active?: boolean;
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
    aplikasi_id: number | '' | 'custom';
    transaksi_id: number | '';
    departemen: string;
    nominal: string;
    tipe_dokumen: string;
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
    departemen: '',
    nominal: '',
    tipe_dokumen: '',
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
    const { auth } = usePage().props as any;
    const [dokumen, setDokumen] = useState<Dokumen[]>([]);
    const [masterflows, setMasterflows] = useState<Masterflow[]>([]);
    const [aplikasis, setAplikasis] = useState<Aplikasi[]>([]);
    const [transaksis, setTransaksis] = useState<Transaksi[]>([]);
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
            setDokumen(newDokumen);
        } catch (error) {
            console.error('Error fetching dokumen:', error);
            showToast.error('❌ Failed to load documents. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch form master options (aplikasi, transaksi, masterflow)
    const fetchFormOptions = async () => {
        try {
            console.log('Fetching form options (aplikasis, transaksis, masterflows)...');
            const [appRes, trxRes, mfRes] = await Promise.all([
                api.get('/aplikasis').catch(() => ({ data: { data: [] } })),
                api.get('/transaksis').catch(() => ({ data: { data: [] } })),
                api.get('/masterflows').catch(() => ({ data: { masterflows: [] } })),
            ]);

            const appsRaw = appRes.data;
            const apps = Array.isArray(appsRaw?.data) ? appsRaw.data : (Array.isArray(appsRaw?.aplikasis) ? appsRaw.aplikasis : (Array.isArray(appsRaw) ? appsRaw : []));

            const trxsRaw = trxRes.data;
            const trxs = Array.isArray(trxsRaw?.data) ? trxsRaw.data : (Array.isArray(trxsRaw) ? trxsRaw : []);

            const mfsRaw = mfRes.data;
            const mfs = Array.isArray(mfsRaw?.masterflows) ? mfsRaw.masterflows : (Array.isArray(mfsRaw?.data) ? mfsRaw.data : (Array.isArray(mfsRaw) ? mfsRaw : []));

            setAplikasis(apps);
            setTransaksis(trxs);
            setMasterflows(mfs);
        } catch (error) {
            console.error('Error fetching form options:', error);
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
        fetchFormOptions();

        // Check if create param is present in URL
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('create') === 'true' || urlParams.get('create') === '1') {
                handleCreate();
            }
        }

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

    // Handle aplikasi / kategori change
    const handleAplikasiChange = (value: string) => {
        if (value === 'custom') {
            setFormData((prev) => ({
                ...prev,
                aplikasi_id: 'custom',
                transaksi_id: '',
                masterflow_id: 'custom',
                custom_approvers: [{ email: '', order: 1 }],
                approvers: {},
            }));
            setSelectedMasterflow(null);
            setAvailableApprovers({});
            return;
        }

        const appVal = value === '' ? '' : Number(value);
        setFormData((prev) => ({
            ...prev,
            aplikasi_id: appVal,
            transaksi_id: '',
            masterflow_id: '',
            approvers: {},
            custom_approvers: [],
        }));
        setSelectedMasterflow(null);
    };

    // Handle transaksi select change with automatic workflow detection
    const handleTransaksiChange = async (value: string) => {
        if (value === '') {
            setFormData((prev) => ({
                ...prev,
                transaksi_id: '',
                masterflow_id: '',
                departemen: '',
            }));
            setSelectedMasterflow(null);
            return;
        }

        const trxId = Number(value);
        const trx = transaksis.find((t) => t.id === trxId);
        const dep = trx?.departemen || '';
        const defaultTitle = trx ? `${trx.nama_transaksi} - ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` : '';

        setFormData((prev) => ({
            ...prev,
            transaksi_id: trxId,
            departemen: dep || prev.departemen,
            tipe_dokumen: trx?.nama_transaksi || prev.tipe_dokumen,
            judul_dokumen: prev.judul_dokumen ? prev.judul_dokumen : defaultTitle,
        }));

        // Auto-detect Masterflow from database matching this transaction or aplikasi
        const matchedMf = masterflows.find(
            (mf: any) =>
                mf.transaksi_id === trxId ||
                (trx && mf.name && mf.name.toLowerCase().includes(trx.nama_transaksi.toLowerCase())) ||
                (trx && mf.aplikasi_id === trx.aplikasi_id)
        );

        if (matchedMf) {
            console.log('✨ Auto-detected Masterflow for transaksi:', matchedMf);
            await handleMasterflowChange(matchedMf.id.toString());
        }
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

        // Generate new document number
        const newFormData = {
            ...initialFormData,
            nomor_dokumen: generateDocumentNumber(),
            tgl_pengajuan: new Date().toISOString().split('T')[0],
            custom_approvers: [{ email: '', order: 1 }],
        };

        setFormData(newFormData);
        setSelectedMasterflow(null);
        setAvailableApprovers({});
        setStepModes({}); // Reset step modes
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
                    generatedApprovals.push({
                        id: userId ? `step_${step.id}_user_${userId}` : `step_${step.id}`,
                        step_name: step.step_name,
                        jabatan_name: step.jabatan?.name || 'Approver',
                        user: { name: user ? user.name : (step.jabatan?.name || step.step_name) }
                    });
                }
            });
        }
        
        if (generatedApprovals.length === 0) {
            showToast.error('Silakan tentukan transaksi atau alur approval terlebih dahulu.');
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

            if (formData.aplikasi_id && formData.aplikasi_id !== 'custom') {
                submitData.append('aplikasi_id', formData.aplikasi_id.toString());
            }
            if (formData.transaksi_id) {
                submitData.append('transaksi_id', formData.transaksi_id.toString());
            }
            if (formData.departemen) {
                submitData.append('departemen', formData.departemen);
            }
            if (formData.nominal) {
                submitData.append('nominal', formData.nominal);
            }
            if (formData.tipe_dokumen) {
                submitData.append('tipe_dokumen', formData.tipe_dokumen);
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
            } else if (formData.masterflow_id) {
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
            doc.judul_dokumen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.masterflow?.name?.toLowerCase().includes(searchQuery.toLowerCase());

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
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="font-medium">{doc.judul_dokumen}</span>
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

                                <div className="grid gap-4 py-4">
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

                                    {/* Row 2: Kategori Aplikasi & Jenis Transaksi */}
                                    <div className="grid grid-cols-2 gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="aplikasi_id" className="font-sans font-medium text-primary">
                                                Kategori / Aplikasi <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.aplikasi_id === '' ? '' : formData.aplikasi_id.toString()}
                                                onValueChange={handleAplikasiChange}
                                            >
                                                <SelectTrigger className="bg-background font-sans">
                                                    <SelectValue placeholder="Pilih Kategori / Aplikasi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {aplikasis.map((app) => (
                                                        <SelectItem key={app.id} value={app.id.toString()} className="font-sans">
                                                            {app.name}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="custom" className="font-sans font-semibold text-primary">
                                                        ✨ Custom Approval (Alur Bebas)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {formData.aplikasi_id !== 'custom' && (
                                            <div className="grid gap-2">
                                                <Label htmlFor="transaksi_id" className="font-sans font-medium text-primary">
                                                    Jenis Transaksi <span className="text-red-500">*</span>
                                                </Label>
                                                <Select
                                                    value={formData.transaksi_id === '' ? '' : formData.transaksi_id.toString()}
                                                    onValueChange={handleTransaksiChange}
                                                    disabled={formData.aplikasi_id === ''}
                                                >
                                                    <SelectTrigger className="bg-background font-sans">
                                                        <SelectValue placeholder={formData.aplikasi_id === '' ? 'Pilih Aplikasi dulu' : 'Pilih Jenis Transaksi'} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {transaksis
                                                            .filter((t) => !formData.aplikasi_id || t.aplikasi_id === Number(formData.aplikasi_id))
                                                            .map((t) => (
                                                                <SelectItem key={t.id} value={t.id.toString()} className="font-sans">
                                                                    {t.kode_transaksi ? `[${t.kode_transaksi}] ` : ''}{t.nama_transaksi}
                                                                </SelectItem>
                                                            ))}
                                                        {transaksis.filter((t) => !formData.aplikasi_id || t.aplikasi_id === Number(formData.aplikasi_id)).length === 0 && (
                                                            <SelectItem value="none" disabled className="font-sans text-muted-foreground">
                                                                Belum ada transaksi untuk aplikasi ini
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Row 3: Departemen & Nominal (Opsional) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="departemen" className="font-sans">
                                                Departemen
                                            </Label>
                                            <Input
                                                id="departemen"
                                                name="departemen"
                                                value={formData.departemen}
                                                onChange={handleInputChange}
                                                className="font-sans"
                                                placeholder="Contoh: Pengadaan, Keuangan, HRD"
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="nominal" className="font-sans">
                                                Nominal Transaksi (Opsional)
                                            </Label>
                                            <Input
                                                id="nominal"
                                                name="nominal"
                                                type="number"
                                                value={formData.nominal}
                                                onChange={handleInputChange}
                                                className="font-sans"
                                                placeholder="Rp 0"
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
                                            placeholder="Contoh: Purchase Request Pengadaan Laptop"
                                        />
                                        {errors.judul_dokumen && <p className="text-sm text-red-500">{errors.judul_dokumen}</p>}
                                    </div>

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
                                        {errors.tgl_deadline && <p className="text-sm text-red-500">{errors.tgl_deadline}</p>}
                                    </div>

                                    {/* Deskripsi / Keterangan */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="deskripsi" className="font-sans">
                                            Deskripsi / Keterangan
                                        </Label>
                                        <Textarea
                                            id="deskripsi"
                                            name="deskripsi"
                                            value={formData.deskripsi}
                                            onChange={handleInputChange}
                                            className="font-sans"
                                            placeholder="Tuliskan keterangan tambahan atau catatan pengajuan..."
                                            rows={2}
                                        />
                                    </div>

                                    {/* Auto-detected Workflow Banner or Manual Override */}
                                    {formData.aplikasi_id !== 'custom' && (
                                        <div className="grid gap-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="masterflow_id" className="font-sans font-semibold">
                                                    Alur Approval (Masterflow) <span className="text-red-500">*</span>
                                                </Label>
                                                {selectedMasterflow && (
                                                    <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30">
                                                        ✓ Terdeteksi Otomatis
                                                    </Badge>
                                                )}
                                            </div>
                                            <Select
                                                value={formData.masterflow_id === '' ? '' : formData.masterflow_id.toString()}
                                                onValueChange={handleMasterflowChange}
                                            >
                                                <SelectTrigger className={errors.masterflow_id ? 'border-red-500 font-sans' : 'font-sans'}>
                                                    <SelectValue placeholder="Pilih atau sesuaikan masterflow..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {masterflows.map((mf) => (
                                                        <SelectItem key={mf.id} value={mf.id.toString()} className="font-sans">
                                                            {mf.name} {mf.total_steps ? `(${mf.total_steps} Tingkat)` : ''}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="custom" className="font-sans font-medium text-primary">
                                                        ✨ Custom Approval
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.masterflow_id && <p className="text-sm text-red-500">{errors.masterflow_id}</p>}
                                        </div>
                                    )}

                                    {/* Approval Flow Steps Visual Display (By Jabatan) */}
                                    {formData.masterflow_id !== '' &&
                                        formData.masterflow_id !== 'custom' &&
                                        selectedMasterflow &&
                                        selectedMasterflow.steps &&
                                        selectedMasterflow.steps.length > 0 && (
                                            <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Label className="font-sans font-semibold">Urutan Alur Persetujuan (Workflow)</Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            Persetujuan akan diproses berurutan sesuai tingkat Jabatan di bawah ini.
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary" className="font-mono">
                                                        {selectedMasterflow.steps.length} Tahap
                                                    </Badge>
                                                </div>

                                                <div className="space-y-3 pt-2">
                                                    {selectedMasterflow.steps
                                                        .sort((a, b) => a.step_order - b.step_order)
                                                        .map((step, index) => (
                                                            <div key={step.id} className="rounded-lg border border-border/80 bg-card p-3 shadow-sm">
                                                                <div className="grid grid-cols-[50px_1fr_1fr] items-center gap-3">
                                                                    {/* Step Order Number */}
                                                                    <div className="flex items-center justify-center">
                                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
                                                                            {index + 1}
                                                                        </div>
                                                                    </div>

                                                                    {/* Jabatan Info */}
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                                            {step.step_name || `Tahap ${index + 1}`}
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="outline" className="font-sans text-xs font-medium border-primary/40 bg-primary/5">
                                                                                Jabatan: {step.jabatan?.name || 'Pejabat Berwenang'}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>

                                                                    {/* Approver Selection or Auto Assignment */}
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {stepModes[step.id] === 'group' ? 'Group Approval' : 'Approver (Opsional)'}
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
                                                                                            value as 'all_required' | 'any_one' | 'majority',
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <SelectTrigger className="font-sans h-8 text-xs">
                                                                                        <SelectValue placeholder="Pilih jenis group" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="all_required" className="font-sans text-xs">
                                                                                            ✓ Semua Harus Approve
                                                                                        </SelectItem>
                                                                                        <SelectItem value="any_one" className="font-sans text-xs">
                                                                                            1️⃣ Salah Satu Saja
                                                                                        </SelectItem>
                                                                                        <SelectItem value="majority" className="font-sans text-xs">
                                                                                            📊 Mayoritas ({'>'} 50%)
                                                                                        </SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>

                                                                                <div className="rounded-md border border-border bg-background p-1.5 max-h-28 overflow-y-auto">
                                                                                    {(availableApprovers[step.id] || []).map((user) => (
                                                                                        <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-muted text-xs">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={formData.step_approvers[step.id]?.userIds.includes(user.id) || false}
                                                                                                onChange={(e) => handleMultipleApproverChange(step.id, user.id, e.target.checked)}
                                                                                                className="h-3.5 w-3.5 rounded"
                                                                                            />
                                                                                            <span>{user.name}</span>
                                                                                        </label>
                                                                                    ))}
                                                                                    {(availableApprovers[step.id] || []).length === 0 && (
                                                                                        <span className="text-xs text-muted-foreground block py-1 text-center">Auto-assign sistem</span>
                                                                                    )}
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
                                                                                <SelectTrigger className="font-sans h-9 text-xs">
                                                                                    <SelectValue placeholder="Otomatis (Berdasarkan Jabatan)" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="" className="font-sans text-xs text-muted-foreground">
                                                                                        ⚡ Otomatis (Pejabat yang Menjabat)
                                                                                    </SelectItem>
                                                                                    {(availableApprovers[step.id] || []).map((user) => (
                                                                                        <SelectItem key={user.id} value={user.id.toString()} className="font-sans text-xs">
                                                                                            {user.name} ({user.email})
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
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

                                    {/* Upload File */}
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
