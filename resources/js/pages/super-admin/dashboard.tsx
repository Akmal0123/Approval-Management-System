import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Head, Link } from '@inertiajs/react';
import { IconFileText, IconSettings, IconShield, IconUsers } from '@tabler/icons-react';
import { Briefcase, Building2, Clock, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DashboardStats {
    total_users: number;
    total_documents: number;
    pending_approvals: number;
    system_health: number;
    total_storage: string;
    total_roles: number;
    total_companies: number;
    total_jabatans: number;
    total_aplikasis: number;
}

interface DashboardData {
    stats: DashboardStats;
    recent_documents: any[];
    charts: {
        documents_by_status: Record<string, number>;
        approvals_by_status: Record<string, number>;
    };
}

export default function SuperAdminDashboard() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            console.log('Fetching dashboard stats...');
            const response = await api.get('/dashboard/super-admin/stats');
            console.log('Dashboard response:', response.data);
            setDashboardData(response.data);
        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);
            console.error('Error response:', error.response);
            console.error('Error response data:', error.response?.data);
            showToast.error('❌ Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    return (
        <>
            <Head title="Super Admin Dashboard" />
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
                                    <div className="space-y-2">
                                        <h1 className="flex items-center gap-3 font-sans text-3xl font-bold tracking-tight text-foreground">
                                            <IconShield className="h-8 w-8 text-primary" />
                                            Super Admin Dashboard
                                        </h1>
                                        <p className="font-sans text-base text-muted-foreground">
                                            Kelola sistem secara menyeluruh dengan kontrol administrasi penuh.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className="border-primary/30 bg-primary/10 font-sans text-sm font-medium text-primary"
                                        >
                                            Super Admin Access
                                        </Badge>
                                        <Button size="sm" className="hidden font-sans font-medium sm:flex">
                                            <IconSettings className="mr-2 h-4 w-4" />
                                            System Settings
                                        </Button>
                                    </div>
                                </div>

                                {/* Stats Cards */}
                                <div>
                                    {isLoading ? (
                                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                            {[...Array(3)].map((_, i) => (
                                                <Card key={i} className="border-border bg-card">
                                                    <CardContent className="p-6">
                                                        <div className="flex items-center justify-between">
                                                            <div className="space-y-2">
                                                                <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
                                                                <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                                                            </div>
                                                            <div className="h-12 w-12 animate-pulse rounded-full bg-muted"></div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                            <Card className="border-border bg-card transition-shadow hover:shadow-md">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-2">
                                                            <p className="font-sans text-sm font-medium text-muted-foreground">Total Users</p>
                                                            <p className="font-sans text-3xl font-bold text-foreground">
                                                                {dashboardData?.stats.total_users ?? 0}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-full bg-primary/10 p-3">
                                                            <IconUsers className="h-6 w-6 text-primary" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card className="border-border bg-card transition-shadow hover:shadow-md">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-2">
                                                            <p className="font-sans text-sm font-medium text-muted-foreground">All Documents</p>
                                                            <p className="font-sans text-3xl font-bold text-foreground">
                                                                {dashboardData?.stats.total_documents ?? 0}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-full bg-accent/20 p-3">
                                                            <IconFileText className="h-6 w-6 text-accent-foreground" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card className="border-border bg-card transition-shadow hover:shadow-md">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-2">
                                                            <p className="font-sans text-sm font-medium text-muted-foreground">Pending Reviews</p>
                                                            <p className="font-sans text-3xl font-bold text-foreground">
                                                                {dashboardData?.stats.pending_approvals ?? 0}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-full bg-destructive/10 p-3">
                                                            <Clock className="h-6 w-6 text-destructive" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </div>

                                {/* Management Modules - Full Width */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="font-sans text-2xl font-bold text-foreground">Management Modules</h2>
                                        <p className="font-sans text-sm text-muted-foreground">Kelola semua komponen sistem</p>
                                    </div>
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                        {/* User Roles Management */}
                                        <Link href="/super-admin/role-management">
                                            <Card className="group h-full cursor-pointer border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
                                                <CardContent className="p-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
                                                                <IconShield className="h-6 w-6 text-primary" />
                                                            </div>
                                                            {isLoading ? (
                                                                <div className="h-8 w-12 animate-pulse rounded bg-muted"></div>
                                                            ) : (
                                                                <span className="font-sans text-3xl font-bold text-primary">
                                                                    {dashboardData?.stats.total_roles ?? 0}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="font-sans text-base font-semibold text-foreground">User Roles</h3>
                                                            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                                                                Kelola roles dan permissions pengguna
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>

                                        {/* Company Management */}
                                        <Link href="/super-admin/company-management">
                                            <Card className="group h-full cursor-pointer border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
                                                <CardContent className="p-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="rounded-lg bg-blue-500/10 p-3 transition-colors group-hover:bg-blue-500/20">
                                                                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            {isLoading ? (
                                                                <div className="h-8 w-12 animate-pulse rounded bg-muted"></div>
                                                            ) : (
                                                                <span className="font-sans text-3xl font-bold text-blue-600 dark:text-blue-400">
                                                                    {dashboardData?.stats.total_companies ?? 0}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="font-sans text-base font-semibold text-foreground">Companies</h3>
                                                            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                                                                Kelola perusahaan terdaftar
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>

                                        {/* Jabatan Management */}
                                        <Link href="/super-admin/jabatan-management">
                                            <Card className="group h-full cursor-pointer border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
                                                <CardContent className="p-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="rounded-lg bg-purple-500/10 p-3 transition-colors group-hover:bg-purple-500/20">
                                                                <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                                            </div>
                                                            {isLoading ? (
                                                                <div className="h-8 w-12 animate-pulse rounded bg-muted"></div>
                                                            ) : (
                                                                <span className="font-sans text-3xl font-bold text-purple-600 dark:text-purple-400">
                                                                    {dashboardData?.stats.total_jabatans ?? 0}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="font-sans text-base font-semibold text-foreground">Jabatan</h3>
                                                            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                                                                Kelola jabatan organisasi
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>

                                        {/* Aplikasi Management */}
                                        <Link href="/super-admin/aplikasi-management">
                                            <Card className="group h-full cursor-pointer border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
                                                <CardContent className="p-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="rounded-lg bg-green-500/10 p-3 transition-colors group-hover:bg-green-500/20">
                                                                <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
                                                            </div>
                                                            {isLoading ? (
                                                                <div className="h-8 w-12 animate-pulse rounded bg-muted"></div>
                                                            ) : (
                                                                <span className="font-sans text-3xl font-bold text-green-600 dark:text-green-400">
                                                                    {dashboardData?.stats.total_aplikasis ?? 0}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="font-sans text-base font-semibold text-foreground">Aplikasi</h3>
                                                            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                                                                Kelola aplikasi terintegrasi
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
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
