import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Head, Link } from '@inertiajs/react';
import { IconCheck, IconClock, IconFileText, IconSparkles, IconUsers, IconX } from '@tabler/icons-react';
import { Activity, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileText, XCircle } from 'lucide-react';
import { useState } from 'react';

interface Stats {
    pending_reviews: number;
    approved_today: number;
    total_documents: number;
    active_users: number;
}

interface RecentDocument {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    status: string;
    status_current: string;
    tgl_pengajuan: string | null;
    tgl_deadline: string | null;
    user_name: string;
    masterflow_name: string;
    created_at: string;
}

interface RecentActivity {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description: string;
    time: string;
}

interface ContextInfo {
    company: string;
    aplikasi: string;
    role: string;
}

interface AdminDashboardProps {
    stats: Stats;
    recent_documents: RecentDocument[];
    recent_activity: RecentActivity[];
    current_context: ContextInfo;
}

export default function AdminDashboard({ stats, recent_documents = [], recent_activity = [], current_context }: AdminDashboardProps) {
    const ITEMS_PER_PAGE = 3;
    const [docPage, setDocPage] = useState(1);
    const [activityPage, setActivityPage] = useState(1);

    const totalDocPages = Math.ceil((recent_documents?.length || 0) / ITEMS_PER_PAGE);
    const currentDocs = (recent_documents || []).slice((docPage - 1) * ITEMS_PER_PAGE, docPage * ITEMS_PER_PAGE);

    const totalActivityPages = Math.ceil((recent_activity?.length || 0) / ITEMS_PER_PAGE);
    const currentActivity = (recent_activity || []).slice((activityPage - 1) * ITEMS_PER_PAGE, activityPage * ITEMS_PER_PAGE);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" />;
            case 'error':
                return <XCircle className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />;
            case 'warning':
                return <Clock className="mt-0.5 h-4 w-4 text-orange-500 shrink-0" />;
            default:
                return <Activity className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; className: string; icon: any }> = {
            draft: {
                label: 'Draft',
                className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
                icon: IconFileText,
            },
            pending: {
                label: 'Menunggu',
                className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300',
                icon: IconClock,
            },
            under_review: {
                label: 'Sedang Direview',
                className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
                icon: IconClock,
            },
            in_review: {
                label: 'Dalam Review',
                className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
                icon: IconClock,
            },
            approved: {
                label: 'Disetujui',
                className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/40 dark:text-green-300',
                icon: IconCheck,
            },
            rejected: {
                label: 'Ditolak',
                className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300',
                icon: IconX,
            },
            revision_requested: {
                label: 'Revisi Diminta',
                className: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300',
                icon: IconClock,
            },
            completed: {
                label: 'Selesai',
                className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/40 dark:text-green-300',
                icon: IconCheck,
            },
        };

        const defaultConfig = {
            label: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
            icon: IconFileText,
        };
        const { label, className, icon: Icon } = config[status] || defaultConfig;

        return (
            <Badge variant="outline" className={`font-sans text-[10px] sm:text-[11px] px-1.5 py-0 ${className}`}>
                <Icon className="mr-1 h-3 w-3" />
                {label}
            </Badge>
        );
    };

    return (
        <>
            <Head title="Admin Dashboard" />
            <SidebarProvider>
                <NotificationListener />
                <AppSidebar variant="inset" />
                <SidebarInset className="min-h-svh lg:max-h-screen lg:overflow-hidden">
                    <SiteHeader />
                    <div className="flex flex-1 flex-col overflow-y-auto lg:overflow-hidden lg:h-[calc(100vh-3rem)]">
                        <div className="flex flex-1 flex-col gap-2.5 sm:gap-3 p-3 sm:p-4 lg:px-6 lg:py-3.5 lg:h-full lg:min-h-0">
                            {/* Header Section */}
                            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-2 sm:pb-2.5">
                                <div className="space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h1 className="flex items-center gap-2 font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground">
                                            <IconSparkles className="h-5 w-5 text-primary shrink-0" />
                                            <span>Admin Dashboard</span>
                                        </h1>
                                        <Badge variant="outline" className="font-sans text-[11px]">
                                            {current_context?.role}
                                        </Badge>
                                    </div>
                                    <p className="font-sans text-xs text-muted-foreground">
                                        {current_context?.company} - {current_context?.aplikasi}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link href="/dokumen">
                                        <Button size="sm" className="h-7 sm:h-8 text-xs font-sans">
                                            <IconFileText className="mr-1.5 h-3.5 w-3.5" />
                                            <span>New Document</span>
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                                <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                    <CardContent className="p-2.5 sm:p-3 sm:px-3.5">
                                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                            <div className="min-w-0">
                                                <p className="font-sans text-[11px] sm:text-xs font-medium text-muted-foreground truncate" title="Pending Reviews">
                                                    Pending Reviews
                                                </p>
                                                <p className="font-sans text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                                                    {stats?.pending_reviews ?? 0}
                                                </p>
                                            </div>
                                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                                <Clock className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                    <CardContent className="p-2.5 sm:p-3 sm:px-3.5">
                                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                            <div className="min-w-0">
                                                <p className="font-sans text-[11px] sm:text-xs font-medium text-muted-foreground truncate" title="Approved Today">
                                                    Approved Today
                                                </p>
                                                <p className="font-sans text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                                                    {stats?.approved_today ?? 0}
                                                </p>
                                            </div>
                                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                    <CardContent className="p-2.5 sm:p-3 sm:px-3.5">
                                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                            <div className="min-w-0">
                                                <p className="font-sans text-[11px] sm:text-xs font-medium text-muted-foreground truncate" title="Total Documents">
                                                    Total Documents
                                                </p>
                                                <p className="font-sans text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                                                    {stats?.total_documents ?? 0}
                                                </p>
                                            </div>
                                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                    <CardContent className="p-2.5 sm:p-3 sm:px-3.5">
                                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                            <div className="min-w-0">
                                                <p className="font-sans text-[11px] sm:text-xs font-medium text-muted-foreground truncate" title="Active Users">
                                                    Active Users
                                                </p>
                                                <p className="font-sans text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                                                    {stats?.active_users ?? 0}
                                                </p>
                                            </div>
                                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                <IconUsers className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Content Grid: Recent Documents & Recent Activity */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 lg:min-h-0">
                                {/* Recent Documents */}
                                <Card className="flex flex-col border-border/60 shadow-sm justify-between flex-1 lg:min-h-0">
                                    <div className="flex flex-col lg:min-h-0">
                                        <CardHeader className="shrink-0 flex flex-row items-center justify-between border-b py-2 px-3 sm:px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <FileText className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Recent Documents</CardTitle>
                                                    <CardDescription className="text-[11px] text-muted-foreground">Latest documents submitted</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 lg:overflow-y-auto">
                                            {currentDocs && currentDocs.length > 0 ? (
                                                currentDocs.map((doc) => (
                                                    <div
                                                        key={doc.id}
                                                        className="flex items-center justify-between gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2 sm:p-2.5 hover:bg-muted/40 transition-colors"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <p className="text-xs font-medium text-foreground truncate max-w-[200px] sm:max-w-none">{doc.judul_dokumen}</p>
                                                                {getStatusBadge(doc.status)}
                                                            </div>
                                                            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                                                                {doc.nomor_dokumen || '#'} • {doc.user_name} • {doc.created_at}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                                                    <FileText className="h-7 w-7 opacity-40 mb-1.5" />
                                                    <p className="text-xs">No documents yet.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </div>
                                    {totalDocPages > 1 && (
                                        <div className="shrink-0 flex items-center justify-between border-t px-3 sm:px-4 py-1.5 sm:py-2 bg-muted/10">
                                            <p className="text-[11px] text-muted-foreground">
                                                Halaman {docPage} dari {totalDocPages}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-xs"
                                                    disabled={docPage === 1}
                                                    onClick={() => setDocPage((prev) => Math.max(prev - 1, 1))}
                                                >
                                                    <ChevronLeft className="h-3 w-3" />
                                                </Button>
                                                {Array.from({ length: totalDocPages }, (_, i) => i + 1).map((page) => (
                                                    <Button
                                                        key={page}
                                                        variant={docPage === page ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-6 min-w-6 px-1.5 text-xs"
                                                        onClick={() => setDocPage(page)}
                                                    >
                                                        {page}
                                                    </Button>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-xs"
                                                    disabled={docPage === totalDocPages}
                                                    onClick={() => setDocPage((prev) => Math.min(prev + 1, totalDocPages))}
                                                >
                                                    <ChevronRight className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card>

                                {/* Recent Activity */}
                                <Card className="flex flex-col border-border/60 shadow-sm justify-between flex-1 lg:min-h-0">
                                    <div className="flex flex-col lg:min-h-0">
                                        <CardHeader className="shrink-0 flex flex-row items-center justify-between border-b py-2 px-3 sm:px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <Clock className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Recent Activity</CardTitle>
                                                    <CardDescription className="text-[11px] text-muted-foreground">System logs & actions</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 lg:overflow-y-auto">
                                            {currentActivity && currentActivity.length > 0 ? (
                                                currentActivity.map((activity) => (
                                                    <div
                                                        key={activity.id}
                                                        className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2 sm:p-2.5 hover:bg-muted/40 transition-colors"
                                                    >
                                                        <div className="mt-0.5 shrink-0">{getActivityIcon(activity.type)}</div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-medium text-foreground leading-snug">{activity.title}</p>
                                                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{activity.description}</p>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground shrink-0">{activity.time}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                                                    <Activity className="h-7 w-7 opacity-40 mb-1.5" />
                                                    <p className="text-xs">No recent activity.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </div>
                                    {totalActivityPages > 1 && (
                                        <div className="shrink-0 flex items-center justify-between border-t px-3 sm:px-4 py-1.5 sm:py-2 bg-muted/10">
                                            <p className="text-[11px] text-muted-foreground">
                                                Halaman {activityPage} dari {totalActivityPages}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-xs"
                                                    disabled={activityPage === 1}
                                                    onClick={() => setActivityPage((prev) => Math.max(prev - 1, 1))}
                                                >
                                                    <ChevronLeft className="h-3 w-3" />
                                                </Button>
                                                {Array.from({ length: totalActivityPages }, (_, i) => i + 1).map((page) => (
                                                    <Button
                                                        key={page}
                                                        variant={activityPage === page ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-6 min-w-6 px-1.5 text-xs"
                                                        onClick={() => setActivityPage(page)}
                                                    >
                                                        {page}
                                                    </Button>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-xs"
                                                    disabled={activityPage === totalActivityPages}
                                                    onClick={() => setActivityPage((prev) => Math.min(prev + 1, totalActivityPages))}
                                                >
                                                    <ChevronRight className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
