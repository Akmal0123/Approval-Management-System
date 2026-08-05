import { Head, Link } from '@inertiajs/react';
import { IconArrowLeft, IconBuilding, IconCheck, IconEdit, IconSettings, IconUser, IconX } from '@tabler/icons-react';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

interface Jabatan {
    id: number;
    name: string;
}

interface MasterflowStep {
    id: number;
    step_order: number;
    step_name: string;
    description?: string;
    is_required: boolean;
    jabatan: Jabatan;
}

interface Company {
    id: number;
    name: string;
}

interface Masterflow {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    total_steps: number;
    created_at: string;
    updated_at: string;
    company: Company;
    steps: MasterflowStep[];
}

interface Props {
    masterflow: Masterflow;
    company: Company;
}

export default function Show({ masterflow, company }: Props) {
    return (
        <>
            <Head title={`Detail Masterflow - ${masterflow.name}`} />
            <SidebarProvider>
                <NotificationListener />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                            <div className="space-y-8">
                                {/* Header Section */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-foreground">
                                            <IconSettings className="h-6 w-6 text-primary" />
                                            {masterflow.name}
                                        </h1>
                                        <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
                                            <IconBuilding className="h-4 w-4" />
                                            {company?.name || 'Unknown Company'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link href={route('admin.masterflows.edit', masterflow.id)}>
                                            <Button className="font-sans">
                                                <IconEdit className="mr-2 h-4 w-4" />
                                                Edit Masterflow
                                            </Button>
                                        </Link>
                                        <Link href={route('admin.masterflows.index')}>
                                            <Button variant="outline" className="font-sans">
                                                <IconArrowLeft className="mr-2 h-4 w-4" />
                                                Kembali
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-3">
                                    {/* Masterflow Info */}
                                    <Card className="border-border bg-card md:col-span-1">
                                        <CardHeader>
                                            <CardTitle className="font-serif text-foreground">Informasi Masterflow</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <h4 className="font-sans text-sm font-medium text-muted-foreground">Status</h4>
                                                <Badge
                                                    variant={masterflow.is_active ? 'default' : 'secondary'}
                                                    className={
                                                        masterflow.is_active
                                                            ? 'bg-green-100 font-sans text-green-800 hover:bg-green-200'
                                                            : 'font-sans'
                                                    }
                                                >
                                                    {masterflow.is_active ? (
                                                        <>
                                                            <IconCheck className="mr-1 h-3 w-3" />
                                                            Aktif
                                                        </>
                                                    ) : (
                                                        <>
                                                            <IconX className="mr-1 h-3 w-3" />
                                                            Nonaktif
                                                        </>
                                                    )}
                                                </Badge>
                                            </div>

                                            <div>
                                                <h4 className="font-sans text-sm font-medium text-muted-foreground">Total Langkah</h4>
                                                <p className="font-sans text-2xl font-bold text-foreground">{masterflow.total_steps}</p>
                                            </div>

                                            <div>
                                                <h4 className="font-sans text-sm font-medium text-muted-foreground">Deskripsi</h4>
                                                <p className="font-sans text-sm text-foreground">
                                                    {masterflow.description || (
                                                        <span className="text-muted-foreground italic">Tidak ada deskripsi</span>
                                                    )}
                                                </p>
                                            </div>

                                            <Separator />

                                            <div>
                                                <h4 className="font-sans text-sm font-medium text-muted-foreground">Dibuat</h4>
                                                <p className="font-sans text-sm text-foreground">
                                                    {new Date(masterflow.created_at).toLocaleDateString('id-ID', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="font-sans text-sm font-medium text-muted-foreground">Terakhir Diperbarui</h4>
                                                <p className="font-sans text-sm text-foreground">
                                                    {new Date(masterflow.updated_at).toLocaleDateString('id-ID', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Flow Visualization */}
                                    <Card className="border-border bg-card md:col-span-2">
                                        <CardHeader>
                                            <CardTitle className="font-serif text-foreground">Alur Persetujuan</CardTitle>
                                            <CardDescription className="font-sans">
                                                Visualisasi langkah-langkah dalam proses approval.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {masterflow.steps.map((step, index) => (
                                                    <div key={step.id} className="flex items-start space-x-4">
                                                        {/* Step Number */}
                                                        <div className="flex-shrink-0">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-sans text-sm font-medium text-primary-foreground">
                                                                {step.step_order}
                                                            </div>
                                                        </div>

                                                        {/* Step Content */}
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center space-x-2">
                                                                <h4 className="font-sans text-sm font-semibold text-foreground">{step.step_name}</h4>
                                                                {step.is_required && (
                                                                    <Badge variant="secondary" className="font-sans text-xs">
                                                                        Wajib
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            <div className="mt-1 flex items-center space-x-2">
                                                                <IconUser className="h-4 w-4 text-muted-foreground" />
                                                                <span className="font-sans text-sm text-muted-foreground">{step.jabatan.name}</span>
                                                            </div>

                                                            {step.description && (
                                                                <p className="mt-2 font-sans text-sm text-muted-foreground">{step.description}</p>
                                                            )}
                                                        </div>

                                                        {/* Arrow (except for last item) */}
                                                        {index < masterflow.steps.length - 1 && (
                                                            <div className="ml-4 flex-shrink-0">
                                                                <div className="ml-4 h-12 w-px bg-border"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Steps Summary Table */}
                                <Card className="border-border bg-card">
                                    <CardHeader>
                                        <CardTitle className="font-serif text-foreground">Ringkasan Langkah</CardTitle>
                                        <CardDescription className="font-sans">Tabel ringkasan semua langkah dalam masterflow ini.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b border-border">
                                                        <th className="p-2 text-left font-sans font-medium text-muted-foreground">Urutan</th>
                                                        <th className="p-2 text-left font-sans font-medium text-muted-foreground">Nama Langkah</th>
                                                        <th className="p-2 text-left font-sans font-medium text-muted-foreground">Jabatan</th>
                                                        <th className="p-2 text-left font-sans font-medium text-muted-foreground">Deskripsi</th>
                                                        <th className="p-2 text-left font-sans font-medium text-muted-foreground">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {masterflow.steps.map((step) => (
                                                        <tr key={step.id} className="border-b border-border">
                                                            <td className="p-2">
                                                                <Badge variant="outline" className="font-sans">
                                                                    {step.step_order}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-2 font-sans font-medium text-foreground">{step.step_name}</td>
                                                            <td className="p-2 font-sans text-foreground">{step.jabatan.name}</td>
                                                            <td className="p-2 font-sans text-sm text-muted-foreground">
                                                                {step.description || <span className="italic">Tidak ada deskripsi</span>}
                                                            </td>
                                                            <td className="p-2">
                                                                {step.is_required ? (
                                                                    <Badge variant="secondary" className="font-sans text-xs">
                                                                        Wajib
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="font-sans text-xs">
                                                                        Opsional
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
