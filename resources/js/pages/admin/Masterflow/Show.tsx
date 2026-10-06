import { Head, Link, usePage } from '@inertiajs/react';
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
    min_nominal?: number | string | null;
    jabatan: Jabatan;
}

interface Company {
    id: number;
    name: string;
}

interface Transaksi {
    id: number;
    kode_transaksi: string;
    nama_transaksi: string;
    departemen?: string | null;
    aplikasi?: {
        id: number;
        name: string;
    };
}

interface Masterflow {
    id: number;
    name: string;
    transaksi_id?: number | null;
    description?: string;
    is_active: boolean;
    total_steps: number;
    created_at: string;
    updated_at: string;
    company: Company;
    transaksi?: Transaksi;
    steps: MasterflowStep[];
}

interface Props {
    masterflow: Masterflow;
    company: Company;
}

export default function Show({ masterflow, company }: Props) {
    const { auth } = usePage().props as any;
    
    // Check if user is Admin or Super Admin
    const roleName = auth?.context?.role?.role_name || '';
    const isAdmin = roleName.toLowerCase() === 'admin' || roleName.toLowerCase() === 'super admin';

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
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 space-y-1">
                                        <h1 className="flex min-w-0 items-center gap-2 font-serif text-xl font-bold tracking-tight break-words text-foreground sm:text-2xl">
                                            <IconSettings className="h-6 w-6 shrink-0 text-primary" />
                                            {masterflow.name}
                                        </h1>
                                        <p className="flex min-w-0 items-center gap-2 font-sans text-sm text-muted-foreground">
                                            <IconBuilding className="h-4 w-4" />
                                            {masterflow.company?.name || company?.name || 'Unknown Company'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        {isAdmin && (
                                            <Link href={route('admin.masterflows.edit', masterflow.id)}>
                                                <Button className="font-sans">
                                                    <IconEdit className="mr-2 h-4 w-4" />
                                                    Edit Masterflow
                                                </Button>
                                            </Link>
                                        )}
                                        <Link href={isAdmin ? route('admin.masterflows.index') : route('admin.my-workflows')}>
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
                                                <h4 className="font-sans text-sm font-medium text-muted-foreground">Jenis Transaksi</h4>
                                                {masterflow.transaksi ? (
                                                    <div className="mt-1 flex flex-col gap-0.5">
                                                        <span className="font-sans font-semibold text-foreground">
                                                            {masterflow.transaksi.nama_transaksi}{' '}
                                                            <span className="font-mono text-xs text-muted-foreground">({masterflow.transaksi.kode_transaksi})</span>
                                                        </span>
                                                        {masterflow.transaksi.aplikasi && (
                                                            <span className="font-sans text-xs text-primary font-medium">
                                                                Aplikasi: {masterflow.transaksi.aplikasi.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground italic text-sm">-</span>
                                                )}
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
                                                                {step.min_nominal && (
                                                                    <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 bg-primary/5">
                                                                        ≥ Rp {Number(step.min_nominal).toLocaleString('id-ID')}
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
                                        <div className="space-y-3 md:hidden">
                                            {masterflow.steps.map((step) => (
                                                <div key={step.id} className="space-y-3 rounded-md border border-border p-3">
                                                    <div className="flex min-w-0 items-start justify-between gap-2">
                                                        <div className="flex min-w-0 items-start gap-2">
                                                            <Badge variant="outline" className="shrink-0 font-sans">
                                                                {step.step_order}
                                                            </Badge>
                                                            <span className="min-w-0 break-words font-sans text-sm font-semibold text-foreground">
                                                                {step.step_name}
                                                            </span>
                                                        </div>
                                                        {step.is_required ? (
                                                            <Badge variant="secondary" className="shrink-0 font-sans text-xs">
                                                                Wajib
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="shrink-0 font-sans text-xs">
                                                                Opsional
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="grid min-w-0 grid-cols-2 gap-3 text-sm">
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-muted-foreground">Jabatan</p>
                                                            <p className="break-words font-sans text-foreground">{step.jabatan.name}</p>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-muted-foreground">Min. Nominal</p>
                                                            {step.min_nominal ? (
                                                                <p className="break-words font-mono text-sm font-semibold text-primary">
                                                                    Rp {Number(step.min_nominal).toLocaleString('id-ID')}
                                                                </p>
                                                            ) : (
                                                                <p className="text-muted-foreground">-</p>
                                                            )}
                                                        </div>
                                                        <div className="col-span-2 min-w-0">
                                                            <p className="text-xs text-muted-foreground">Deskripsi</p>
                                                            <p className="break-words font-sans text-sm text-foreground">
                                                                {step.description || <span className="text-muted-foreground italic">Tidak ada deskripsi</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="hidden overflow-x-auto md:block">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b border-border">
                                                        <th className="p-2 text-left font-sans font-medium text-muted-foreground">Urutan</th>
                                                        <th className="p-2 text-left font-sans font-medium text-muted-foreground">Nama Langkah</th>
                                                        <th className="p-2 text-left font-sans font-medium text-muted-foreground">Jabatan</th>
                                                        <th className="p-2 text-left font-sans font-medium text-muted-foreground">Min. Nominal</th>
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
                                                            <td className="p-2 font-mono text-sm text-foreground">
                                                                {step.min_nominal ? (
                                                                    <span className="font-semibold text-primary">
                                                                        Rp {Number(step.min_nominal).toLocaleString('id-ID')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">-</span>
                                                                )}
                                                            </td>
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
