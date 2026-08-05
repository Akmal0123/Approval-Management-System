import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import UserDocumentTable from '@/components/user-document-table';
import { Head, Link } from '@inertiajs/react';
import { IconClock, IconFileText, IconUpload, IconUser } from '@tabler/icons-react';
import { CheckCircle2, Clock, FilePlus, FileText, FileUp, PenSquare, Plus, XCircle } from 'lucide-react';

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
    recent_documents: Array<{
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
}

export default function UserDashboard({ user, statistics, recent_documents, available_masterflows, recent_activity = [] }: UserDashboardProps) {
    const getActivityIcon = (action: string) => {
        switch (action) {
            case 'approved':
                return <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />;
            case 'rejected':
                return <XCircle className="mt-0.5 h-4 w-4 text-red-500" />;
            case 'submitted':
                return <FileUp className="mt-0.5 h-4 w-4 text-orange-500" />;
            case 'created':
                return <FilePlus className="mt-0.5 h-4 w-4 text-blue-500" />;
            case 'revised':
                return <PenSquare className="mt-0.5 h-4 w-4 text-purple-500" />;
            default:
                return <Clock className="mt-0.5 h-4 w-4 text-gray-500" />;
        }
    };
    return (
        <>
            <Head title="User Dashboard" />
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
                                            <IconUser className="h-6 w-6 text-primary" />
                                            Welcome back, {user?.name}
                                        </h1>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Track and manage your document submissions.</p>
                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <strong>Company:</strong> {user?.company || 'No Company Assigned'}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <strong>Position:</strong> {user?.jabatan || 'No Position Assigned'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {user?.role} Access
                                        </Badge>
                                        <Link href="/dokumen">
                                            <Button size="sm" className="flex">
                                                <IconUpload className="mr-2 h-4 w-4" />
                                                Upload Document
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                {/* Approver Stats - Show if user has approval duties */}
                                {((statistics.pending_approvals ?? 0) > 0 || (statistics.processed_approvals ?? 0) > 0) && (
                                    <>
                                        <h2 className="mb-2 font-serif text-lg font-semibold text-foreground">My Approval Tasks</h2>
                                        <div className="mb-8 grid gap-4 md:grid-cols-2">
                                            <Card className="border-orange-200 bg-orange-50/50">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium text-orange-900">Pending Approvals</p>
                                                            <p className="text-3xl font-bold text-orange-700">{statistics.pending_approvals || 0}</p>
                                                        </div>
                                                        <IconFileText className="h-8 w-8 text-orange-500" />
                                                    </div>
                                                    <div className="mt-4">
                                                        <Link href="/approvals">
                                                            <Button size="sm" className="w-full bg-orange-600 text-white hover:bg-orange-700">
                                                                Review Documents
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card className="border-blue-200 bg-blue-50/50">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium text-blue-900">Processed Approvals</p>
                                                            <p className="text-3xl font-bold text-blue-700">{statistics.processed_approvals || 0}</p>
                                                        </div>
                                                        <CheckCircle2 className="h-8 w-8 text-blue-500" />
                                                    </div>
                                                    <div className="mt-4">
                                                        <Link href="/approvals?status=approved">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full border-blue-200 text-blue-700 hover:bg-blue-100"
                                                            >
                                                                View History
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </>
                                )}

                                <h2 className="mb-2 font-serif text-lg font-semibold text-foreground">My Documents</h2>
                                {/* Stats Cards */}
                                <div className="grid gap-4 md:grid-cols-4">
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-muted-foreground">My Pending Documents</p>
                                                    <p className="text-2xl font-bold text-foreground">{statistics?.pending_documents || 0}</p>
                                                </div>
                                                <Clock className="h-8 w-8 text-orange-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-muted-foreground">Approved Documents</p>
                                                    <p className="text-2xl font-bold text-foreground">{statistics?.approved_documents || 0}</p>
                                                </div>
                                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-muted-foreground">Rejected Documents</p>
                                                    <p className="text-2xl font-bold text-foreground">{statistics?.rejected_documents || 0}</p>
                                                </div>
                                                <XCircle className="h-8 w-8 text-red-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-muted-foreground">Total Submitted</p>
                                                    <p className="text-2xl font-bold text-foreground">{statistics?.total_submitted || 0}</p>
                                                </div>
                                                <FileText className="h-8 w-8 text-blue-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* My Documents */}
                                <div className="grid gap-6 lg:grid-cols-3">
                                    {/* Documents Table - Takes 2/3 of the space */}
                                    <div className="space-y-4 lg:col-span-2">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <h2 className="font-serif text-lg font-semibold text-foreground">My Documents</h2>
                                            <div className="flex gap-2">
                                                <Link href="/dokumen">
                                                    <Button variant="outline" size="sm" className="sm:hidden">
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href="/dokumen">
                                                    <Button size="sm" className="hidden sm:flex">
                                                        <IconUpload className="mr-2 h-4 w-4" />
                                                        Upload New
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                        <UserDocumentTable documents={recent_documents} />
                                    </div>

                                    {/* Sidebar - Takes 1/3 of the space */}
                                    <div className="space-y-6">
                                        {/* Recent Activity */}
                                        <Card className="border-border bg-card">
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                                                    <IconClock className="h-4 w-4" />
                                                    Recent Activity
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {recent_activity && recent_activity.length > 0 ? (
                                                    recent_activity.map((activity) => (
                                                        <div key={activity.id} className="flex items-start space-x-3">
                                                            <div className="flex-shrink-0">{getActivityIcon(activity.action)}</div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-foreground">{activity.description}</p>
                                                                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-4 text-center text-sm text-muted-foreground">No recent activity.</div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Available Workflows */}
                                        {available_masterflows && available_masterflows.length > 0 && (
                                            <Card className="border-border bg-card">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
                                                        <IconFileText className="h-4 w-4" />
                                                        Available Workflows
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    {available_masterflows.slice(0, 3).map((masterflow) => (
                                                        <div key={masterflow.id} className="rounded-md border border-border p-3">
                                                            <div className="space-y-1">
                                                                <h4 className="text-sm font-medium text-foreground">{masterflow.name}</h4>
                                                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                                                    {masterflow.description || 'No description available'}
                                                                </p>
                                                                <div className="flex items-center justify-between pt-1">
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {masterflow.steps_count} steps
                                                                    </span>
                                                                    <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                                                                        Use
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {available_masterflows.length > 3 && (
                                                        <Button variant="outline" size="sm" className="w-full text-xs">
                                                            View All ({available_masterflows.length} workflows)
                                                        </Button>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}
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
