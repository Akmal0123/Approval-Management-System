import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Head, Link } from '@inertiajs/react';
import { IconArrowRight, IconClock, IconUpload, IconUser } from '@tabler/icons-react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, FilePlus, FileText, FileUp, PenSquare, Workflow, XCircle } from 'lucide-react';
import { useState } from 'react';

interface UserDashboardProps {
    user: {
        name: string;
        email: string;
        role: string;
        company: string;
        jabatan: string;
        profile?: {
            phone: string;
            address: string;
        };
    };
    statistics: {
        pending_documents: number;
        approved_documents: number;
        total_submitted: number;
        rejected_documents: number;
        pending_approvals?: number;
        processed_approvals?: number;
    };
    recent_documents?: Array<{
        id: number;
        name: string;
        status: string;
        submitted_at: string;
        category: string;
        size: string;
    }>;
    available_masterflows?: Array<{
        id: number;
        name: string;
        description: string;
        steps_count: number;
        company?: string;
    }>;
    recent_activity?: Array<{
        id: number;
        action: string;
        description: string;
        timestamp: string;
        user_name: string;
        document_name: string;
    }>;
    current_context?: {
        company: string;
        aplikasi: string;
        role: string;
    };
}

export default function UserDashboard({ user, statistics, available_masterflows = [], recent_activity = [] }: UserDashboardProps) {
    const ITEMS_PER_PAGE = 3;
    const [wfPage, setWfPage] = useState(1);
    const [activityPage, setActivityPage] = useState(1);

    const totalWfPages = Math.ceil((available_masterflows?.length || 0) / ITEMS_PER_PAGE);
    const currentWfs = (available_masterflows || []).slice((wfPage - 1) * ITEMS_PER_PAGE, wfPage * ITEMS_PER_PAGE);

    const totalActivityPages = Math.ceil((recent_activity?.length || 0) / ITEMS_PER_PAGE);
    const currentActivity = (recent_activity || []).slice((activityPage - 1) * ITEMS_PER_PAGE, activityPage * ITEMS_PER_PAGE);

    const getActivityIcon = (action: string) => {
        switch (action) {
            case 'approved':
                return <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" />;
            case 'rejected':
                return <XCircle className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />;
            case 'submitted':
                return <FileUp className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />;
            case 'created':
                return <FilePlus className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />;
            case 'revised':
                return <PenSquare className="mt-0.5 h-4 w-4 text-purple-500 shrink-0" />;
            default:
                return <Clock className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />;
        }
    };

    const hasApprovalDuties = ((statistics?.pending_approvals ?? 0) > 0 || (statistics?.processed_approvals ?? 0) > 0);

    return (
        <>
            <Head title="User Dashboard" />
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
                                            <IconUser className="h-5 w-5 text-primary shrink-0" />
                                            <span>Welcome back, {user?.name}</span>
                                        </h1>
                                        <Badge variant="outline" className="text-[11px] font-normal">
                                            {user?.role || 'User'} Access
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                        <span>Track & manage document submissions</span>
                                        <span>•</span>
                                        <span>Company: <strong className="text-foreground font-medium">{user?.company || 'No Company Assigned'}</strong></span>
                                        <span>•</span>
                                        <span>Position: <strong className="text-foreground font-medium">{user?.jabatan || 'No Position Assigned'}</strong></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link href="/dokumen">
                                        <Button size="sm" className="h-7 sm:h-8 text-xs">
                                            <IconUpload className="mr-1.5 h-3.5 w-3.5" />
                                            Upload Document
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Approver Duties Alert (if any) */}
                            {hasApprovalDuties && (
                                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                            <Clock className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                                                Approval Tasks
                                            </p>
                                            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                                                <span className="font-semibold text-amber-900 dark:text-amber-200">{statistics.pending_approvals || 0}</span> documents awaiting review • <span className="font-medium">{statistics.processed_approvals || 0}</span> processed
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {(statistics?.pending_approvals ?? 0) > 0 && (
                                            <Link href="/approvals">
                                                <Button size="sm" className="h-6.5 text-[11px] bg-amber-600 text-white hover:bg-amber-700">
                                                    Review ({statistics.pending_approvals})
                                                    <IconArrowRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            </Link>
                                        )}
                                        <Link href="/approvals?status=approved">
                                            <Button variant="outline" size="sm" className="h-6.5 text-[11px] border-amber-300/60 bg-white/70 hover:bg-amber-100/50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                                History
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Statistics Cards */}
                            <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                                <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                    <CardContent className="p-2.5 sm:p-3 sm:px-3.5">
                                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate" title="My Pending Documents">
                                                    Pending Documents
                                                </p>
                                                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                                                    {statistics?.pending_documents || 0}
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
                                                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate" title="Approved Documents">
                                                    Approved Documents
                                                </p>
                                                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                                                    {statistics?.approved_documents || 0}
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
                                                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate" title="Rejected Documents">
                                                    Rejected Documents
                                                </p>
                                                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                                                    {statistics?.rejected_documents || 0}
                                                </p>
                                            </div>
                                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                                <XCircle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
                                    <CardContent className="p-2.5 sm:p-3 sm:px-3.5">
                                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate" title="Total Submitted">
                                                    Total Submitted
                                                </p>
                                                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                                                    {statistics?.total_submitted || 0}
                                                </p>
                                            </div>
                                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Content Grid: Workflows & Activity */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 lg:min-h-0">
                                {/* Available Workflows */}
                                <Card className="flex flex-col border-border/60 shadow-sm justify-between flex-1 lg:min-h-0">
                                    <div className="flex flex-col lg:min-h-0">
                                        <CardHeader className="shrink-0 flex flex-row items-center justify-between border-b py-2 px-3 sm:px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <Workflow className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Available Workflows</CardTitle>
                                                    <CardDescription className="text-[11px] text-muted-foreground">Document workflows for your role</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 lg:overflow-y-auto">
                                            {currentWfs && currentWfs.length > 0 ? (
                                                currentWfs.map((masterflow) => (
                                                    <div
                                                        key={masterflow.id}
                                                        className="group flex items-center justify-between gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2 sm:p-2.5 hover:bg-muted/40 transition-colors"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <h4 className="text-xs sm:text-sm font-medium text-foreground truncate">{masterflow.name}</h4>
                                                                <Badge variant="secondary" className="text-[9px] sm:text-[10px] font-normal px-1.5 py-0 shrink-0">
                                                                    {masterflow.steps_count} steps
                                                                </Badge>
                                                            </div>
                                                            <p className="line-clamp-1 text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                                                                {masterflow.description || 'No description available'}
                                                            </p>
                                                        </div>
                                                        <Link href={`/dokumen?masterflow_id=${masterflow.id}`}>
                                                            <Button size="sm" variant="outline" className="h-6 sm:h-6.5 px-2.5 text-xs shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                                Use
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                                                    <Workflow className="h-7 w-7 opacity-40 mb-1.5" />
                                                    <p className="text-xs">No workflows available for your company.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </div>
                                    {totalWfPages > 1 && (
                                        <div className="shrink-0 flex items-center justify-between border-t px-3 sm:px-4 py-1.5 sm:py-2 bg-muted/10">
                                            <p className="text-[11px] text-muted-foreground">
                                                Halaman {wfPage} dari {totalWfPages}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-xs"
                                                    disabled={wfPage === 1}
                                                    onClick={() => setWfPage((prev) => Math.max(prev - 1, 1))}
                                                >
                                                    <ChevronLeft className="h-3 w-3" />
                                                </Button>
                                                {Array.from({ length: totalWfPages }, (_, i) => i + 1).map((page) => (
                                                    <Button
                                                        key={page}
                                                        variant={wfPage === page ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-6 min-w-6 px-1.5 text-xs"
                                                        onClick={() => setWfPage(page)}
                                                    >
                                                        {page}
                                                    </Button>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-xs"
                                                    disabled={wfPage === totalWfPages}
                                                    onClick={() => setWfPage((prev) => Math.min(prev + 1, totalWfPages))}
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
                                                    <IconClock className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Recent Activity</CardTitle>
                                                    <CardDescription className="text-[11px] text-muted-foreground">Document submissions & reviews</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 lg:overflow-y-auto">
                                            {currentActivity && currentActivity.length > 0 ? (
                                                currentActivity.map((activity) => (
                                                    <div
                                                        key={activity.id}
                                                        className="flex items-start gap-2.5 rounded-lg border border-border/40 p-2 sm:p-2.5 hover:bg-muted/30 transition-colors"
                                                    >
                                                        <div className="mt-0.5 shrink-0">{getActivityIcon(activity.action)}</div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-medium text-foreground leading-snug">{activity.description}</p>
                                                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{activity.timestamp}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                                                    <IconClock className="h-7 w-7 opacity-40 mb-1.5" />
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
