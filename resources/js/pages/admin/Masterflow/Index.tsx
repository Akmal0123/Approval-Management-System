import { Head, Link, router } from '@inertiajs/react';
import { IconBuilding, IconCheck, IconEdit, IconEye, IconPlus, IconSettings, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/lib/toast';

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
    masterflows: Masterflow[];
    company: Company;
}

export default function Index({ masterflows, company }: Props) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; masterflow: Masterflow | null }>({
        open: false,
        masterflow: null,
    });

    const handleDelete = (masterflow: Masterflow) => {
        setDeleteDialog({ open: true, masterflow });
    };

    const confirmDelete = () => {
        if (deleteDialog.masterflow) {
            router.delete(route('admin.masterflows.destroy', deleteDialog.masterflow.id), {
                onSuccess: () => {
                    showToast.success('Masterflow berhasil dihapus.');
                    setDeleteDialog({ open: false, masterflow: null });
                },
                onError: () => {
                    showToast.error('Gagal menghapus masterflow.');
                },
            });
        }
    };

    const toggleStatus = (masterflow: Masterflow) => {
        router.patch(
            route('admin.masterflows.toggle-status', masterflow.id),
            {},
            {
                onSuccess: () => {
                    const status = masterflow.is_active ? 'dinonaktifkan' : 'diaktifkan';
                    showToast.success(`Masterflow berhasil ${status}.`);
                },
                onError: () => {
                    showToast.error('Gagal mengubah status masterflow.');
                },
            },
        );
    };

    return (
        <>
            <Head title="Masterflow Management" />
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
                                            Masterflow Management
                                        </h1>
                                        <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
                                            <IconBuilding className="h-4 w-4" />
                                            {company?.name || 'Unknown Company'}
                                        </p>
                                    </div>
                                    <Link href={route('admin.masterflows.create')}>
                                        <Button className="font-sans">
                                            <IconPlus className="mr-2 h-4 w-4" />
                                            Tambah Masterflow
                                        </Button>
                                    </Link>
                                </div>

                                <Card className="border-border bg-card">
                                    <CardHeader>
                                        <CardTitle className="font-serif text-foreground">Daftar Masterflow</CardTitle>
                                        <CardDescription className="font-sans">
                                            Kelola template skema approval dokumen untuk company Anda.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {masterflows.length === 0 ? (
                                            <div className="py-8 text-center">
                                                <IconSettings className="mx-auto h-12 w-12 text-muted-foreground" />
                                                <h3 className="mt-4 font-sans text-lg font-semibold">Belum ada masterflow</h3>
                                                <p className="mt-2 font-sans text-sm text-muted-foreground">
                                                    Mulai dengan membuat masterflow pertama untuk company Anda.
                                                </p>
                                                <div className="mt-4">
                                                    <Link href={route('admin.masterflows.create')}>
                                                        <Button className="font-sans">
                                                            <IconPlus className="mr-2 h-4 w-4" />
                                                            Tambah Masterflow
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="font-sans font-semibold text-foreground">Nama</TableHead>
                                                        <TableHead className="font-sans font-semibold text-foreground">Deskripsi</TableHead>
                                                        <TableHead className="font-sans font-semibold text-foreground">Total Steps</TableHead>
                                                        <TableHead className="font-sans font-semibold text-foreground">Status</TableHead>
                                                        <TableHead className="font-sans font-semibold text-foreground">Dibuat</TableHead>
                                                        <TableHead className="text-right font-sans font-semibold text-foreground">Aksi</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {masterflows.map((masterflow) => (
                                                        <TableRow key={masterflow.id}>
                                                            <TableCell className="font-sans font-medium text-foreground">
                                                                <div>
                                                                    <div className="font-semibold">{masterflow.name}</div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {masterflow.steps.map((step, index) => (
                                                                            <span key={step.id}>
                                                                                {step.jabatan.name}
                                                                                {index < masterflow.steps.length - 1 && ' → '}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="font-sans text-muted-foreground">
                                                                {masterflow.description || <span className="text-muted-foreground">-</span>}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="secondary" className="font-sans">
                                                                    {masterflow.total_steps}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
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
                                                            </TableCell>
                                                            <TableCell className="font-sans text-muted-foreground">
                                                                {new Date(masterflow.created_at).toLocaleDateString('id-ID')}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Link href={route('admin.masterflows.show', masterflow.id)}>
                                                                        <Button variant="ghost" size="sm">
                                                                            <IconEye className="h-4 w-4" />
                                                                        </Button>
                                                                    </Link>
                                                                    <Link href={route('admin.masterflows.edit', masterflow.id)}>
                                                                        <Button variant="ghost" size="sm">
                                                                            <IconEdit className="h-4 w-4" />
                                                                        </Button>
                                                                    </Link>
                                                                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(masterflow)}>
                                                                        {masterflow.is_active ? (
                                                                            <IconX className="h-4 w-4" />
                                                                        ) : (
                                                                            <IconCheck className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(masterflow)}>
                                                                        <IconTrash className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-serif">Konfirmasi Hapus</DialogTitle>
                                <DialogDescription className="font-sans">
                                    Apakah Anda yakin ingin menghapus masterflow "{deleteDialog.masterflow?.name}"? Tindakan ini tidak dapat
                                    dibatalkan.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteDialog({ open: false, masterflow: null })} className="font-sans">
                                    Batal
                                </Button>
                                <Button variant="destructive" onClick={confirmDelete} className="font-sans">
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
