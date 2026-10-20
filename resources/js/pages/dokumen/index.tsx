import { AppSidebar } from '@/components/app-sidebar';
import CreateDocumentDialog from '@/components/create-document-dialog';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { IconAlertCircle, IconDownload, IconEdit, IconEye, IconFileText, IconPlus, IconTrash } from '@tabler/icons-react';
import { Activity, CalendarIcon, CheckCircle2, Eye, FileTextIcon, LayoutGrid, List, SearchIcon, UserIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Masterflow {
    id: number;
    name: string;
    transaksi_id?: number | null;
    description?: string;
    steps?: MasterflowStep[];
}

interface MasterflowStep {
    id: number;
    step_order: number;
    step_name: string;
    jabatan_id: number;
    min_nominal?: number | string | null;
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
    kode?: string; // ðŸ‘‡ TAMBAHAN: Untuk mengatasi error 't.kode'
    nama_transaksi: string;
    departemen?: string | null;
    deskripsi?: string | null;
    is_active: boolean;
    status?: string; // ðŸ‘‡ TAMBAHAN: Untuk mengatasi error 't.status'
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
    nominal?: number | string | null;
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

export default function UserDokumen() {
    const { auth, context } = usePage().props as any;
    const [dokumen, setDokumen] = useState<Dokumen[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDokumen, setSelectedDokumen] = useState<Dokumen | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dokumenViewMode, setDokumenViewMode] = useState<'card' | 'table'>('card');
    const [updatedDokumenIds, setUpdatedDokumenIds] = useState<Set<number>>(new Set()); // Track recently updated documents

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
            console.log('ðŸ“Š Total dokumen received:', newDokumen.length);
            setDokumen(newDokumen);
        } catch (error) {
            console.error('Error fetching dokumen:', error);
            showToast.error('âŒ Failed to load documents. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!auth.user) {
            console.log('No authenticated user found, redirecting to home');
            showToast.error('âŒ Please login first to access Documents.');
            window.location.href = '/';
            return;
        }
        console.log('Authenticated user found, loading data');
        fetchDokumen();

        // Real-time updates dengan Laravel Reverb untuk user-specific dokumen
        if (typeof window !== 'undefined' && window.Echo && auth.user?.id) {
            console.log('ðŸ“¡ Setting up real-time listener for user dokumen:', auth.user.id);

            // Listen to user-specific channel untuk dokumen mereka
            const userChannelName = `user.${auth.user.id}.dokumen`;

            console.log('ðŸ”§ Creating channel:', userChannelName);
            const channel = window.Echo.channel(userChannelName);

            console.log('ðŸ”§ Channel object:', channel);
            console.log('ðŸ”§ Echo instance:', window.Echo);

            // ALTERNATIVE: Listen directly on Pusher channel
            if (window.Echo.connector?.pusher) {
                const pusherChannel = window.Echo.connector.pusher.subscribe(userChannelName);

                console.log('ðŸ”§ Pusher channel subscribed:', pusherChannel);

                // Listen on Pusher channel directly
                pusherChannel.bind('dokumen.updated', (event: any) => {
                    console.log('ðŸŽ‰ðŸŽ‰ðŸŽ‰ PUSHER DIRECT LISTENER TRIGGERED! ðŸŽ‰ðŸŽ‰ðŸŽ‰');
                    console.log('ðŸ“¡ Real-time dokumen update received:', event);
                    console.log('ðŸ“¡ Event data:', JSON.stringify(event, null, 2));

                    // Update dokumen in state smoothly (no full refresh)
                    if (event.dokumen?.id) {
                        console.log('ðŸ”„ Updating dokumen state smoothly for ID:', event.dokumen.id);

                        setDokumen((prevDokumen) => {
                            const updatedDokumen = prevDokumen.map((doc) => {
                                if (doc.id === event.dokumen.id) {
                                    console.log('âœ¨ Found matching dokumen, updating:', {
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

                            console.log('âœ… Dokumen state updated smoothly');
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
                    console.log('ðŸ”” Showing toast notification...');
                    if (event.dokumen?.judul_dokumen) {
                        const statusText = event.dokumen.status === 'approved' ? 'disetujui' : 'diupdate';
                        showToast.success(`ðŸ“¡ Dokumen "${event.dokumen.judul_dokumen}" telah ${statusText}!`);
                    } else {
                        showToast.success('ðŸ“¡ Daftar dokumen telah diupdate secara real-time!');
                    }
                    console.log('âœ… Toast notification triggered');
                });

                pusherChannel.bind('pusher:subscription_succeeded', () => {
                    console.log('âœ… Pusher subscription succeeded for:', userChannelName);
                });

                pusherChannel.bind('pusher:subscription_error', (error: any) => {
                    console.error('âŒ Pusher subscription error:', error);
                });
            }

            // Subscribe to channel events FIRST before monitoring
            console.log('ðŸŽ¯ Attaching listener for event: dokumen.updated');
            channel.listen('dokumen.updated', (event: any) => {
                console.log('ðŸŽ‰ðŸŽ‰ðŸŽ‰ CHANNEL LISTENER TRIGGERED! ðŸŽ‰ðŸŽ‰ðŸŽ‰');
                console.log('ðŸ“¡ Real-time dokumen update received:', event);
                console.log('ðŸ“¡ Event data:', JSON.stringify(event, null, 2));

                // Update dokumen in state smoothly (no full refresh)
                if (event.dokumen?.id) {
                    console.log('ðŸ”„ Updating dokumen state smoothly for ID:', event.dokumen.id);

                    setDokumen((prevDokumen) => {
                        const updatedDokumen = prevDokumen.map((doc) => {
                            if (doc.id === event.dokumen.id) {
                                console.log('âœ¨ Found matching dokumen, updating:', {
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

                        console.log('âœ… Dokumen state updated smoothly');
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
                console.log('ðŸ”” Showing toast notification...');
                if (event.dokumen?.judul_dokumen) {
                    const statusText = event.dokumen.status === 'approved' ? 'disetujui' : 'diupdate';
                    showToast.success(`ðŸ“¡ Dokumen "${event.dokumen.judul_dokumen}" telah ${statusText}!`);
                } else {
                    showToast.success('ðŸ“¡ Daftar dokumen telah diupdate secara real-time!');
                }
                console.log('âœ… Toast notification triggered');
            });

            // Monitor subscription success/error
            channel.subscribed(() => {
                console.log('âœ… Successfully subscribed to channel:', userChannelName);
                console.log('âœ… Ready to receive real-time updates for user:', auth.user.id);
            });

            channel.error((error: any) => {
                console.error('âŒ Channel subscription error:', error);
            });

            // Monitor connection state
            if (window.Echo.connector?.pusher) {
                window.Echo.connector.pusher.connection.bind('connected', () => {
                    console.log('âœ… WebSocket connected successfully');
                });

                window.Echo.connector.pusher.connection.bind('error', (err: any) => {
                    console.error('âŒ WebSocket connection error:', err);
                });

                window.Echo.connector.pusher.connection.bind('disconnected', () => {
                    console.warn('âš ï¸ WebSocket disconnected');
                });

                // Monitor all events for debugging (filter out internal Pusher events)
                window.Echo.connector.pusher.bind_global((eventName: string, data: any) => {
                    // Ignore internal Pusher protocol events (heartbeat/keepalive)
                    if (eventName.startsWith('pusher:')) {
                        return;
                    }
                    console.log('ðŸ”” Global event received:', eventName, data);
                    console.log('ðŸ”” Event received on channel:', data?.channel || 'unknown');
                    console.log('ðŸ”” Looking for listener on channel:', userChannelName);
                    console.log('ðŸ”” Event name received:', eventName);
                    console.log('ðŸ”” Expected event name: dokumen.updated');
                });
            }

            // Log subscription
            console.log('ðŸ“» Subscribed to channel:', userChannelName);

            // Cleanup saat component unmount
            return () => {
                console.log('ðŸ”Œ Leaving channel:', userChannelName);
                if (window.Echo.connector?.pusher) {
                    window.Echo.connector.pusher.unsubscribe(userChannelName);
                }
                window.Echo.leave(userChannelName);
            };
        } else {
            if (!window.Echo) {
                console.error('âŒ window.Echo not initialized! Check app.tsx');
            }
        }
    }, [auth.user]);

    // Open create dialog
    const handleCreate = () => {
        setIsCreateDialogOpen(true);
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
            showToast.success(`ðŸŽ‰ Dokumen "${selectedDokumen.judul_dokumen}" berhasil dihapus!`);
            setIsDeleteDialogOpen(false);
            setSelectedDokumen(null);
            fetchDokumen();
        } catch (error: any) {
            showToast.error(`âŒ Failed to delete document. ${error.response?.data?.message || error.message}`);
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
                                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
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
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                        <CardContent className="p-3.5 sm:p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-sans text-xs font-medium text-muted-foreground truncate" title="Total Dokumen">Total Dokumen</p>
                                                    <p className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">{stats.total}</p>
                                                </div>
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                    <FileTextIcon className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                        <CardContent className="p-3.5 sm:p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-sans text-xs font-medium text-muted-foreground truncate" title="Draft">Draft</p>
                                                    <p className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">{stats.draft}</p>
                                                </div>
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400">
                                                    <UserIcon className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                        <CardContent className="p-3.5 sm:p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-sans text-xs font-medium text-muted-foreground truncate" title="Menunggu Persetujuan">Menunggu Persetujuan</p>
                                                    <p className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">{stats.submitted}</p>
                                                </div>
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                                    <CalendarIcon className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                        <CardContent className="p-3.5 sm:p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-sans text-xs font-medium text-muted-foreground truncate" title="Disetujui">Disetujui</p>
                                                    <p className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">{stats.approved}</p>
                                                </div>
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Search and Filter */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative flex-1">
                                        <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Cari dokumen..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 font-sans"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[160px] font-sans">
                                                <SelectValue placeholder="Filter Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="font-sans">Semua Status</SelectItem>
                                                <SelectItem value="draft" className="font-sans">Draft</SelectItem>
                                                <SelectItem value="submitted" className="font-sans">Submitted</SelectItem>
                                                <SelectItem value="approved" className="font-sans">Approved</SelectItem>
                                                <SelectItem value="rejected" className="font-sans">Rejected</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {/* View Mode Toggle */}
                                        <div className="flex items-center rounded-lg border bg-muted/40 p-1">
                                            <button
                                                type="button"
                                                onClick={() => setDokumenViewMode('card')}
                                                title="Tampilan Card"
                                                className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                                                    dokumenViewMode === 'card'
                                                        ? 'bg-background text-primary shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <LayoutGrid className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDokumenViewMode('table')}
                                                title="Tampilan Tabel"
                                                className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                                                    dokumenViewMode === 'table'
                                                        ? 'bg-background text-primary shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <List className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents List */}
                                <div className="space-y-4">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="text-center">
                                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                                                <p className="mt-2 text-sm text-gray-600">Loading dokumen...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                        {/* ===== DESKTOP TABLE VIEW ===== */}
                                        {dokumenViewMode === 'table' ? (
                                            <div className="hidden lg:block">
                                                {filteredDokumen.length === 0 ? (
                                                    <div className="rounded-lg border bg-card py-10 text-center font-sans text-sm text-muted-foreground">
                                                        {searchQuery || statusFilter !== 'all' ? 'Tidak ada dokumen yang sesuai dengan filter' : 'Belum ada dokumen. Klik "Buat Dokumen" untuk memulai.'}
                                                    </div>
                                                ) : (
                                                    <div className="overflow-hidden rounded-xl border">
                                                        <table className="w-full text-sm font-sans">
                                                            <thead className="bg-muted/50 text-left">
                                                                <tr>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide w-8">#</th>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Dokumen</th>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Status</th>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Masterflow</th>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Tgl Pengajuan</th>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">Nominal</th>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wide text-right">Aksi</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border bg-card">
                                                                {filteredDokumen.map((doc, index) => (
                                                                    <tr
                                                                        key={doc.id}
                                                                        className={`transition-colors hover:bg-muted/30 ${
                                                                            updatedDokumenIds.has(doc.id) ? 'bg-green-50 dark:bg-green-950/10' : ''
                                                                        }`}
                                                                    >
                                                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{index + 1}</td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="space-y-1">
                                                                                <p className="font-semibold text-foreground leading-tight line-clamp-1" title={doc.judul_dokumen}>{doc.judul_dokumen}</p>
                                                                                <div className="flex flex-wrap items-center gap-1">
                                                                                    {doc.nomor_dokumen && (
                                                                                        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground px-1 py-0">{doc.nomor_dokumen}</Badge>
                                                                                    )}
                                                                                    {doc.transaksi && (
                                                                                        <Badge className="border-emerald-300 bg-emerald-100 font-mono text-[10px] text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 px-1 py-0">{doc.transaksi.kode_transaksi}</Badge>
                                                                                    )}
                                                                                    {doc.aplikasi && (
                                                                                        <span className="rounded bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">{doc.aplikasi.name}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                                                                        <td className="px-4 py-3 text-sm text-muted-foreground">{doc.masterflow?.name || '-'}</td>
                                                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(doc.tgl_pengajuan).toLocaleDateString('id-ID')}</td>
                                                                        <td className="px-4 py-3">
                                                                            {Number(doc.nominal || 0) > 0 ? (
                                                                                <span className="font-mono text-xs font-semibold text-primary">Rp {Number(doc.nominal).toLocaleString('id-ID')}</span>
                                                                            ) : (
                                                                                <span className="text-xs text-muted-foreground">-</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex items-center justify-end gap-1.5">
                                                                                <Link href={`/dokumen/${doc.id}`}>
                                                                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-blue-600" title="Lihat dokumen">
                                                                                        <Eye className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </Link>
                                                                                {doc.status === 'draft' && (
                                                                                    <>
                                                                                        <Link href={`/dokumen/${doc.id}/edit`}>
                                                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-green-600" title="Edit dokumen">
                                                                                                <IconEdit className="h-3.5 w-3.5" />
                                                                                            </Button>
                                                                                        </Link>
                                                                                        <Button variant="outline" size="sm" onClick={() => handleDelete(doc)} className="h-7 w-7 p-0 text-red-600" title="Hapus dokumen">
                                                                                            <IconTrash className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                        <div className="hidden gap-4 lg:grid lg:grid-cols-3">
                                            {filteredDokumen.length > 0 ? (
                                                filteredDokumen.map((doc, index) => (
                                                    <Card
                                                        key={doc.id}
                                                        className={`min-w-0 border-border bg-card transition-colors ${
                                                            updatedDokumenIds.has(doc.id) ? 'bg-green-50 dark:bg-green-950/20' : ''
                                                        }`}
                                                    >
                                                        <CardContent className="space-y-4 p-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="font-mono text-xs font-medium text-muted-foreground">#{index + 1}</span>
                                                                {getStatusBadge(doc.status)}
                                                            </div>

                                                            <div className="min-w-0 space-y-2">
                                                                <h3 className="break-words font-sans text-base font-semibold leading-tight text-foreground">
                                                                    {doc.judul_dokumen}
                                                                </h3>
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {doc.nomor_dokumen && (
                                                                        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                                                                            {doc.nomor_dokumen}
                                                                        </Badge>
                                                                    )}
                                                                    {doc.transaksi && (
                                                                        <Badge className="border-emerald-300 bg-emerald-100 font-mono text-[10px] text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                                                            {doc.transaksi.kode_transaksi}
                                                                        </Badge>
                                                                    )}
                                                                    {doc.aplikasi && (
                                                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                                            {doc.aplikasi.name}
                                                                        </span>
                                                                    )}
                                                                    {Number(doc.nominal || 0) > 0 && (
                                                                        <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                                                                            Rp {Number(doc.nominal).toLocaleString('id-ID')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {doc.deskripsi && (
                                                                    <p className="line-clamp-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]" title={doc.deskripsi}>
                                                                        {doc.deskripsi}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="grid min-w-0 grid-cols-2 gap-3 border-t pt-3 font-sans">
                                                                <div className="min-w-0 space-y-1">
                                                                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Masterflow</p>
                                                                    <p className="break-words text-sm">{doc.masterflow?.name || '-'}</p>
                                                                </div>
                                                                <div className="min-w-0 space-y-1">
                                                                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Tanggal Pengajuan</p>
                                                                    <p className="text-sm text-muted-foreground">{new Date(doc.tgl_pengajuan).toLocaleDateString('id-ID')}</p>
                                                                </div>
                                                                <div className="col-span-2 min-w-0 space-y-1">
                                                                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Current Step</p>
                                                                    {doc.detailed_status?.current_step_description ? (
                                                                        <p className="break-words text-sm text-muted-foreground">{doc.detailed_status.current_step_description}</p>
                                                                    ) : doc.detailed_status?.is_fully_approved ? (
                                                                        <span className="text-sm font-medium text-green-600">Semua sudah approve</span>
                                                                    ) : doc.detailed_status?.is_rejected ? (
                                                                        <span className="text-sm font-medium text-red-600">Ditolak</span>
                                                                    ) : (
                                                                        <span className="text-sm text-muted-foreground">-</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-end gap-2 border-t pt-3">
                                                                <Link href={`/dokumen/${doc.id}`}>
                                                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-blue-600" title="Lihat dokumen" aria-label="Lihat dokumen">
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                                {doc.status === 'draft' && (
                                                                    <>
                                                                        <Link href={`/dokumen/${doc.id}/edit`}>
                                                                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-green-600" title="Edit dokumen" aria-label="Edit dokumen">
                                                                                <IconEdit className="h-4 w-4" />
                                                                            </Button>
                                                                        </Link>
                                                                        <Button variant="outline" size="sm" onClick={() => handleDelete(doc)} className="h-8 w-8 p-0 text-red-600" title="Hapus dokumen" aria-label="Hapus dokumen">
                                                                            <IconTrash className="h-4 w-4" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))
                                            ) : (
                                                <div className="col-span-2 rounded-lg border bg-card py-8 text-center font-sans text-sm text-muted-foreground">
                                                    {searchQuery || statusFilter !== 'all'
                                                        ? 'Tidak ada dokumen yang sesuai dengan filter'
                                                        : 'Belum ada dokumen. Klik "Buat Dokumen" untuk memulai.'}
                                                </div>
                                            )}
                                        </div>
                                        )}
                                        {/* ===== MOBILE: daftar card ===== */}
                                        <div className="space-y-3 lg:hidden">
                                            {filteredDokumen.length > 0 ? (
                                                filteredDokumen.map((doc, index) => (
                                                    <div
                                                        key={doc.id}
                                                        className={`space-y-3 rounded-xl border bg-card p-3 transition-all duration-500 ${
                                                            updatedDokumenIds.has(doc.id) ? 'bg-green-50 dark:bg-green-950/20' : ''
                                                        }`}
                                                    >
                                                        {/* Header: nomor urut + status */}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-mono text-xs font-medium text-muted-foreground">#{index + 1}</span>
                                                            {getStatusBadge(doc.status)}
                                                        </div>

                                                        {/* Judul + badge */}
                                                        <div className="min-w-0 space-y-1.5 font-sans">
                                                            <h4 className="text-sm leading-tight font-semibold break-words text-foreground">
                                                                {doc.judul_dokumen}
                                                            </h4>
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {doc.nomor_dokumen && (
                                                                    <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                                                                        {doc.nomor_dokumen}
                                                                    </Badge>
                                                                )}
                                                                {doc.transaksi && (
                                                                    <Badge className="border-emerald-300 bg-emerald-100 font-mono text-[10px] text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                                                        {doc.transaksi.kode_transaksi}
                                                                    </Badge>
                                                                )}
                                                                {doc.aplikasi && (
                                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                                        {doc.aplikasi.name}
                                                                    </span>
                                                                )}
                                                                {Number(doc.nominal || 0) > 0 && (
                                                                    <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                                                                        Rp {Number(doc.nominal).toLocaleString('id-ID')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {doc.deskripsi && (
                                                                <p className="text-xs break-words text-muted-foreground">
                                                                    {doc.deskripsi.substring(0, 80)}
                                                                    {doc.deskripsi.length > 80 ? '...' : ''}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Masterflow, current step, tanggal */}
                                                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-3 font-sans">
                                                            <div className="col-span-2 min-w-0">
                                                                <p className="text-[10px] text-muted-foreground uppercase">Masterflow</p>
                                                                <p className="text-xs font-medium break-words">{doc.masterflow?.name || '-'}</p>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] text-muted-foreground uppercase">Tanggal Pengajuan</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {new Date(doc.tgl_pengajuan).toLocaleDateString('id-ID')}
                                                                </p>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] text-muted-foreground uppercase">Current Step</p>
                                                                {doc.detailed_status?.current_step_description ? (
                                                                    <p className="text-xs break-words text-muted-foreground">
                                                                        {doc.detailed_status.current_step_description}
                                                                    </p>
                                                                ) : doc.detailed_status?.is_fully_approved ? (
                                                                    <span className="text-xs font-medium text-green-600">âœ“ Semua sudah approve</span>
                                                                ) : doc.detailed_status?.is_rejected ? (
                                                                    <span className="text-xs font-medium text-red-600">âœ— Ditolak</span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">-</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Aksi */}
                                                        <div className="flex items-center justify-end gap-2 border-t pt-3">
                                                            <Link href={`/dokumen/${doc.id}`}>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-9 w-9 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
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
                                                                            className="h-9 w-9 border-green-300 p-0 text-green-600 hover:bg-green-50"
                                                                        >
                                                                            <IconEdit className="h-4 w-4" />
                                                                        </Button>
                                                                    </Link>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDelete(doc)}
                                                                        className="h-9 w-9 border-red-300 p-0 text-red-600 hover:bg-red-50"
                                                                    >
                                                                        <IconTrash className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="rounded-xl border bg-card py-8 text-center font-sans text-sm text-gray-500">
                                                    {searchQuery || statusFilter !== 'all'
                                                        ? 'Tidak ada dokumen yang sesuai dengan filter'
                                                        : 'Belum ada dokumen. Klik "Buat Dokumen" untuk memulai.'}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Create Document Dialog */}
                    <CreateDocumentDialog
                        open={isCreateDialogOpen}
                        onOpenChange={setIsCreateDialogOpen}
                        onSuccess={fetchDokumen}
                    />

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
