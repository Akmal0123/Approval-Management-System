import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/lib/toast';
import { Head, router, usePage } from '@inertiajs/react';
import { IconAlertCircle, IconCalendar, IconCheck, IconClock, IconEye, IconFileText, IconSearch, IconUser, IconX } from '@tabler/icons-react';
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
    id_dokumen?: string;
    nomor_dokumen: string;
    tipe_dokumen?: string;
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
    const [updatedApprovalIds, setUpdatedApprovalIds] = useState<Set<number>>(new Set()); // Track recently updated approvals

    // Update local state when props change (e.g., pagination, filter)
    useEffect(() => {
        setApprovalsData(approvals.data);
        setStatsData(stats);
    }, [approvals.data, stats]);

    // Real-time updates - Listen to all dokumen channels that user is approving
    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo && auth.user?.id) {
            console.log('📡 Setting up real-time listeners for approvals');

            // 1. Subscribe to user-specific approvals channel for NEW dokumen
            const userApprovalChannelName = `user.${auth.user.id}.approvals`;
            console.log('🔧 Subscribing to user approvals channel:', userApprovalChannelName);
            const userChannel = window.Echo.channel(userApprovalChannelName);

            // DIRECT BINDING to channel (not just Echo.listen)
            if (window.Echo.connector?.pusher) {
                const pusherChannel = window.Echo.connector.pusher.subscribe(userApprovalChannelName);

                pusherChannel.bind('approval.created', (event: any) => {
                    console.log('🎉🎉🎉 APPROVAL.CREATED EVENT RECEIVED VIA PUSHER! 🎉🎉🎉');
                    console.log('🆕 Event data:', event);

                    // Add new approval to the list
                    if (event.approval) {
                        setApprovalsData((prevApprovals) => {
                            // Check if approval already exists
                            const exists = prevApprovals.some((a) => a.id === event.approval.id);
                            if (exists) {
                                console.log('Approval already exists, skipping');
                                return prevApprovals;
                            }

                            console.log('✨ Adding new approval to list');
                            return [event.approval, ...prevApprovals]; // Add to beginning
                        });

                        // Update stats
                        setStatsData((prevStats) => ({
                            ...prevStats,
                            pending: prevStats.pending + 1,
                        }));

                        // Highlight new approval
                        setUpdatedApprovalIds((prev) => new Set(prev).add(event.approval.id));
                        setTimeout(() => {
                            setUpdatedApprovalIds((prev) => {
                                const newSet = new Set(prev);
                                newSet.delete(event.approval.id);
                                return newSet;
                            });
                        }, 3000); // Longer highlight for new approvals

                        // Show toast
                        if (event.approval.dokumen?.judul_dokumen) {
                            showToast.success(`🆕 Dokumen baru "${event.approval.dokumen.judul_dokumen}" perlu persetujuan Anda!`);
                        }
                    }
                });

                console.log('✅ Direct Pusher binding set for approval.created on channel:', userApprovalChannelName);
            }

            // ALSO use Echo.listen as fallback
            userChannel.listen('approval.created', (event: any) => {
                console.log('🎉 APPROVAL.CREATED via Echo.listen:', event);
            });

            userChannel.subscribed(() => {
                console.log('✅ Subscribed to user approvals channel:', userApprovalChannelName);
            });

            userChannel.error((error: any) => {
                console.error('❌ User approvals channel subscription error:', error);
            });

            // 2. Subscribe to each existing dokumen channel for UPDATES
            const dokumenChannels: string[] = [];

            if (approvalsData.length > 0) {
                approvalsData.forEach((approval) => {
                    const channelName = `dokumen.${approval.dokumen_id}`;
                    if (!dokumenChannels.includes(channelName)) {
                        dokumenChannels.push(channelName);

                        const channel = window.Echo.channel(channelName);

                        channel.listen('dokumen.updated', (event: any) => {
                            console.log('📡 Real-time dokumen update received on approvals page:', event);

                            // Update approvals state smoothly (no full refresh)
                            if (event.dokumen?.id) {
                                console.log('🔄 Updating approval state smoothly for dokumen ID:', event.dokumen.id);

                                setApprovalsData((prevApprovals) => {
                                    const updatedApprovals = prevApprovals.map((approval) => {
                                        if (approval.dokumen_id === event.dokumen.id) {
                                            console.log('✨ Found matching approval, updating dokumen data');

                                            // Find the matching approval in the event data
                                            const updatedApproval = event.dokumen.approvals?.find((a: any) => a.id === approval.id);

                                            return {
                                                ...approval,
                                                dokumen: {
                                                    ...approval.dokumen,
                                                    ...event.dokumen,
                                                    user: event.dokumen.user || approval.dokumen.user,
                                                    latest_version:
                                                        event.dokumen.latestVersion ||
                                                        event.dokumen.latest_version ||
                                                        approval.dokumen.latest_version,
                                                },
                                                approval_status: updatedApproval?.approval_status || approval.approval_status,
                                            };
                                        }
                                        return approval;
                                    });

                                    console.log('✅ Approvals state updated smoothly');
                                    return updatedApprovals;
                                });

                                // Update stats if approval status changed
                                if (event.dokumen.approvals) {
                                    const userApproval = event.dokumen.approvals.find((a: any) => a.user_id === auth.user.id);

                                    if (userApproval) {
                                        setStatsData((prevStats) => {
                                            // Find old status
                                            const oldApproval = approvalsData.find((a) => a.dokumen_id === event.dokumen.id);

                                            if (!oldApproval) return prevStats;

                                            const newStats = { ...prevStats };

                                            // Decrease old status count
                                            if (oldApproval.approval_status === 'pending') newStats.pending--;
                                            else if (oldApproval.approval_status === 'approved') newStats.approved--;
                                            else if (oldApproval.approval_status === 'rejected') newStats.rejected--;

                                            // Increase new status count
                                            if (userApproval.approval_status === 'pending') newStats.pending++;
                                            else if (userApproval.approval_status === 'approved') newStats.approved++;
                                            else if (userApproval.approval_status === 'rejected') newStats.rejected++;

                                            return newStats;
                                        });
                                    }
                                }

                                // Mark approval as recently updated for animation
                                const matchingApproval = approvalsData.find((a) => a.dokumen_id === event.dokumen.id);
                                if (matchingApproval) {
                                    setUpdatedApprovalIds((prev) => new Set(prev).add(matchingApproval.id));

                                    // Remove highlight after animation
                                    setTimeout(() => {
                                        setUpdatedApprovalIds((prev) => {
                                            const newSet = new Set(prev);
                                            newSet.delete(matchingApproval.id);
                                            return newSet;
                                        });
                                    }, 2000);
                                }
                            }

                            // Show toast
                            if (event.dokumen?.judul_dokumen) {
                                const statusText =
                                    event.dokumen.status === 'approved'
                                        ? 'telah disetujui'
                                        : event.dokumen.status === 'rejected'
                                          ? 'telah ditolak'
                                          : 'telah diupdate';
                                showToast.success(`📡 Dokumen "${event.dokumen.judul_dokumen}" ${statusText}!`);
                            }
                        });

                        channel.subscribed(() => {
                            console.log('✅ Subscribed to dokumen channel:', channelName);
                        });
                    }
                });

                console.log(`📻 Subscribed to ${dokumenChannels.length} dokumen channels`);
            }

            // Cleanup
            return () => {
                console.log('🔌 Leaving user approvals channel:', userApprovalChannelName);
                window.Echo.leave(userApprovalChannelName);

                dokumenChannels.forEach((channelName) => {
                    console.log('🔌 Leaving dokumen channel:', channelName);
                    window.Echo.leave(channelName);
                });
            };
        }
    }, [approvalsData.length, auth.user?.id]);

    // Handle search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('approvals.index'), { search, status: selectedTab !== 'all' ? selectedTab : undefined }, { preserveState: true });
    };

    // Handle tab change
    const handleTabChange = (value: string) => {
        setSelectedTab(value);
        router.get(route('approvals.index'), { status: value !== 'all' ? value : undefined, search }, { preserveState: true });
    };

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

    // Check if overdue
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
                <SidebarInset className="max-w-full overflow-x-hidden">
                    <SiteHeader />
                    <div className="flex flex-1 flex-col w-full max-w-full overflow-x-hidden">
                        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
                            {/* Header */}
                            <div className="space-y-2">
                                <h1 className="font-serif text-3xl font-bold">Approval Dokumen</h1>
                                <p className="font-sans text-muted-foreground">Kelola persetujuan dokumen yang memerlukan tindakan Anda</p>
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
                                                placeholder="Cari berdasarkan judul dokumen..."
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
                                    <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full max-w-full">
                                        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 flex-nowrap sm:flex-wrap">
                                            <TabsTrigger value="all" className="font-sans shrink-0 text-xs sm:text-sm">
                                                Semua
                                            </TabsTrigger>
                                            <TabsTrigger value="pending" className="font-sans shrink-0 text-xs sm:text-sm">
                                                Menunggu ({statsData.pending})
                                            </TabsTrigger>
                                            <TabsTrigger value="approved" className="font-sans shrink-0 text-xs sm:text-sm">
                                                Disetujui ({statsData.approved})
                                            </TabsTrigger>
                                            <TabsTrigger value="rejected" className="font-sans shrink-0 text-xs sm:text-sm">
                                                Ditolak ({statsData.rejected})
                                            </TabsTrigger>
                                        </TabsList>

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
                                                    {approvalsData.map((approval) => (
                                                        <Card
                                                            key={approval.id}
                                                            className={`transition-all duration-500 hover:shadow-md ${
                                                                updatedApprovalIds.has(approval.id)
                                                                    ? 'bg-green-50 shadow-md dark:bg-green-950/20'
                                                                    : ''
                                                            }`}
                                                        >
                                                            <CardContent className="p-4 sm:p-6">
    {/* ==========================================
        1. TAMPILAN KHUSUS HP / MOBILE
       ========================================== */}
    <div className="block md:hidden space-y-3 w-full max-w-full">
        <div className="flex items-start justify-between gap-2 w-full">
            <div className="flex items-start gap-2 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <IconFileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-serif font-semibold text-xs sm:text-sm truncate">
                        {approval.dokumen.judul_dokumen}
                    </h3>
                    {approval.dokumen.tipe_dokumen && (
                        <Badge variant="outline" className="font-sans text-[10px]">
                            {approval.dokumen.tipe_dokumen}
                        </Badge>
                    )}
                </div>
            </div>
            <div className="shrink-0">{getStatusBadge(approval.approval_status)}</div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border w-full">
            {approval.dokumen.id_dokumen && <p className="font-mono truncate">ID: {approval.dokumen.id_dokumen}</p>}
            {approval.dokumen.nomor_dokumen && <p className="font-mono truncate">{approval.dokumen.nomor_dokumen}</p>}
            <p className="font-sans truncate">Pengaju: {approval.dokumen.user?.name || '-'}</p>
            <p className="font-sans">Tanggal: {formatDate(approval.dokumen.tgl_pengajuan)}</p>
            {approval.tgl_deadline && (
                <p className={isOverdue(approval.tgl_deadline) ? 'text-red-600 font-medium' : ''}>
                    Deadline: {formatDate(approval.tgl_deadline)}
                </p>
            )}
        </div>

        <div className="pt-1 w-full">
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetail(approval.id)}
                className="font-sans w-full text-xs h-8"
            >
                <IconEye className="mr-1.5 h-3.5 w-3.5" />
                Lihat Detail
            </Button>
        </div>
    </div>

    {/* ==========================================
        2. TAMPILAN KHUSUS DESKTOP / LAPTOP
       ========================================== */}
    <div className="hidden md:flex items-start justify-between gap-4 w-full">
        <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <IconFileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1 min-w-0">
                <h3 className="font-serif font-semibold text-base truncate">
                    {approval.dokumen.judul_dokumen}
                </h3>
                {approval.dokumen.tipe_dokumen && (
                    <Badge variant="outline" className="font-sans text-xs">
                        {approval.dokumen.tipe_dokumen}
                    </Badge>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
                    {approval.dokumen.id_dokumen && (
                        <span className="font-mono">ID: {approval.dokumen.id_dokumen}</span>
                    )}
                    {approval.dokumen.nomor_dokumen && (
                        <span className="font-mono">{approval.dokumen.nomor_dokumen}</span>
                    )}
                    <div className="flex items-center gap-1">
                        <IconUser className="h-3.5 w-3.5" />
                        <span className="font-sans">{approval.dokumen.user?.name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <IconCalendar className="h-3.5 w-3.5" />
                        <span className="font-sans">{formatDate(approval.dokumen.tgl_pengajuan)}</span>
                    </div>
                </div>

                {approval.tgl_deadline && (
                    <div
                        className={`flex items-center gap-1.5 font-sans text-sm pt-1 ${
                            isOverdue(approval.tgl_deadline)
                                ? 'text-red-600 font-medium'
                                : 'text-muted-foreground'
                        }`}
                    >
                        <IconClock className="h-4 w-4 shrink-0" />
                        <span>Deadline: {formatDate(approval.tgl_deadline)}</span>
                        {isOverdue(approval.tgl_deadline) && (
                            <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 text-[10px] ml-1">
                                Terlambat
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
            {getStatusBadge(approval.approval_status)}
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetail(approval.id)}
                className="font-sans"
            >
                <IconEye className="mr-2 h-4 w-4" />
                Lihat Detail
            </Button>
        </div>
    </div>
</CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Pagination */}
                                            {approvals.last_page > 1 && (
                                                <div className="flex items-center justify-center pt-4 w-full max-w-full overflow-x-auto pb-2">
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {approvals.links.map((link, index) => (
                                                            <Button
                                                                key={index}
                                                                variant={link.active ? 'default' : 'outline'}
                                                                size="sm"
                                                                disabled={!link.url}
                                                                onClick={() => link.url && router.visit(link.url)}
                                                                className="font-sans text-xs h-7 px-2 min-w-[32px] shrink-0"
                                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
