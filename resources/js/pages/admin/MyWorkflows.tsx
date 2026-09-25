import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Head, Link } from '@inertiajs/react';
import { IconFileText } from '@tabler/icons-react';

interface Masterflow {
    id: number;
    name: string;
    description: string | null;
    steps?: any[];
}

interface Props {
    masterflows: Masterflow[];
    auth: {
        user: any;
    };
}

export default function MyWorkflows({ masterflows, auth }: Props) {
    const breadcrumbs = [
        { label: 'Dashboard', href: '/admin/dashboard' },
        { label: 'My Workflow', href: '/admin/my-workflows' },
    ];

    return (
        <SidebarProvider>
            <Head title="My Workflows" />
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader breadcrumbs={breadcrumbs} />
                
                <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6 max-w-7xl mx-auto w-full">
                    <div className="space-y-1">
                        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                            My Workflows
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Masterflow/workflow yang dimiliki atau ditugaskan kepada Anda di dalam context saat ini.
                        </p>
                    </div>
                    
                    {masterflows && masterflows.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {masterflows.map((masterflow) => (
                                <Card key={masterflow.id} className="border-border bg-card">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-foreground">{masterflow.name}</h4>
                                            <p className="line-clamp-2 text-xs text-muted-foreground">
                                                {masterflow.description || 'No description available'}
                                            </p>
                                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
                                                <span className="text-xs text-muted-foreground">
                                                    {masterflow.steps?.length || 0} steps
                                                </span>
                                                <Button asChild variant="outline" size="sm" className="h-7 px-3 text-xs">
                                                    <Link href={`/admin/masterflows/${masterflow.id}`}>
                                                        Open
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-card/50">
                            <IconFileText className="w-12 h-12 mb-4 text-muted-foreground/50" />
                            <h3 className="text-lg font-medium text-foreground">No workflows found</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Anda belum memiliki atau ditugaskan pada workflow apapun di context ini.
                            </p>
                        </div>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
