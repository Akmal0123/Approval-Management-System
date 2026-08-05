import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Head, Link } from '@inertiajs/react';
import { IconCheck, IconClock, IconFileText, IconSparkles, IconUsers, IconX } from '@tabler/icons-react';
import { Activity, CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';

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

export default function AdminDashboard({ stats, recent_documents, recent_activity, current_context }: AdminDashboardProps) {
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="mt-0.5 h-4 w-4 text-red-500" />;
            case 'warning':
                return <Clock className="mt-0.5 h-4 w-4 text-orange-500" />;
            default:
                return <Activity className="mt-0.5 h-4 w-4 text-blue-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; className: string; icon: any }> = {
            draft: {
                label: 'Draft',
                className: 'bg-gray-100 text-gray-800 border-gray-300',
                icon: IconFileText,
            },
            pending: {
                label: 'Menunggu',
                className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: IconClock,
            },
            under_review: {
                label: 'Sedang Direview',
                className: 'bg-blue-100 text-blue-800 border-blue-300',
                icon: IconClock,
            },
            in_review: {
                label: 'Dalam Review',
                className: 'bg-blue-100 text-blue-800 border-blue-300',
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
            revision_requested: {
                label: 'Revisi Diminta',
                className: 'bg-orange-100 text-orange-800 border-orange-300',
                icon: IconClock,
            },
            completed: {
                label: 'Selesai',
                className: 'bg-green-100 text-green-800 border-green-300',
                icon: IconCheck,
            },
        };

        const defaultConfig = {
            label: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            className: 'bg-gray-100 text-gray-800 border-gray-300',
            icon: IconFileText,
        };
        const { label, className, icon: Icon } = config[status] || defaultConfig;

        return (
            <Badge variant="outline" className={`font-sans ${className}`}>
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
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                            <div className="space-y-8">
                                {/* Header Section */}
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-foreground">
                                            <IconSparkles className="h-6 w-6 text-primary" />
                                            Admin Dashboard
                                        </h1>
                                        <p className="font-sans text-sm text-muted-foreground">
                                            {current_context?.company} - {current_context?.aplikasi}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-sans text-xs">
                                            {current_context?.role}
                                        </Badge>
                                        <Link href="/dokumen">
                                            <Button size="sm" className="hidden font-sans sm:flex">
                                                <IconFileText className="mr-2 h-4 w-4" />
                                                New Document
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Pending Reviews</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">{stats?.pending_reviews ?? 0}</p>
                                                </div>
                                                <Clock className="h-8 w-8 text-orange-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Approved Today</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">{stats?.approved_today ?? 0}</p>
                                                </div>
                                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Total Documents</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">{stats?.total_documents ?? 0}</p>
                                                </div>
                                                <FileText className="h-8 w-8 text-blue-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Active Users</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">{stats?.active_users ?? 0}</p>
                                                </div>
                                                <IconUsers className="h-8 w-8 text-purple-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Recent Activity & Documents */}
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h2 className="font-serif text-lg font-semibold text-foreground">Recent Documents</h2>
                                                <Link href="/dokumen">
                                                    <Button variant="outline" size="sm" className="font-sans">
                                                        View All
                                                    </Button>
                                                </Link>
                                            </div>
                                            {recent_documents && recent_documents.length > 0 ? (
                                                <div className="space-y-2">
                                                    {recent_documents.slice(0, 5).map((doc) => (
                                                        <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium">{doc.judul_dokumen}</p>
                                                                    {getStatusBadge(doc.status)}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {doc.nomor_dokumen} • {doc.user_name} • {doc.created_at}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-dashed p-8 text-center">
                                                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                                    <p className="mt-2 text-sm text-muted-foreground">No documents yet</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">Recent Activity</h2>
                                            {recent_activity && recent_activity.length > 0 ? (
                                                <div className="space-y-3">
                                                    {recent_activity.map((activity) => (
                                                        <div
                                                            key={activity.id}
                                                            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                                                        >
                                                            {getActivityIcon(activity.type)}
                                                            <div className="flex-1 space-y-1">
                                                                <p className="font-sans text-sm font-medium text-foreground">{activity.title}</p>
                                                                <p className="font-sans text-xs text-muted-foreground">{activity.description}</p>
                                                            </div>
                                                            <span className="font-sans text-xs text-muted-foreground">{activity.time}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-dashed p-4 text-center">
                                                    <Activity className="mx-auto h-8 w-8 text-muted-foreground/50" />
                                                    <p className="mt-2 text-sm text-muted-foreground">No recent activity</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
