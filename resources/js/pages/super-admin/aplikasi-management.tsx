import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Head, router } from '@inertiajs/react';
import { IconEdit, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Company {
    id: number;
    name?: string;
    nama_perusahaan?: string;
}

interface Aplikasi {
    id: number;
    name?: string;
    nama_aplikasi?: string;
    transaksi_management?: string;
    company_id?: number;
    perusahaan_id?: number;
    company?: Company;
    perusahaan?: Company;
    created_at?: string;
    updated_at?: string;
}

interface PageProps {
    aplikasis?: Aplikasi[];
    companies?: Company[];
}

const TRANSAKSI_OPTIONS = [
    'HRIS (Cuti / Lembur)',
    'PO (Purchase Order)',
    'PR (Purchase Requisition)',
    'Proposal',
    'Internal Memo',
];

export default function SuperAdminAplikasiManagement({
    aplikasis: initialAplikasis = [],
    companies: initialCompanies = [],
}: PageProps) {
    const [aplikasis, setAplikasis] = useState<Aplikasi[]>(initialAplikasis);
    const [companies, setCompanies] = useState<Company[]>(initialCompanies);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAplikasi, setEditingAplikasi] = useState<Aplikasi | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        transaksi_management: '',
        name: '',
        company_id: '',
    });

    // Sinkronisasi state lokal ketika Inertia props diperbarui
    useEffect(() => {
        setAplikasis(initialAplikasis);
        setCompanies(initialCompanies);
    }, [initialAplikasis, initialCompanies]);

    // Listener Realtime Echo
    useEffect(() => {
        const channel = (window as any).Echo?.channel('aplikasi-management');

        if (channel) {
            channel.listen('aplikasi.updated', (e: any) => {
                const { action, aplikasi } = e;

                setAplikasis((prevAplikasis) => {
                    const appName = aplikasi.nama_aplikasi || aplikasi.name || 'Aplikasi';
                    switch (action) {
                        case 'created':
                            showToast.realtime.created(appName, 'aplikasi');
                            return [...prevAplikasis, aplikasi];
                        case 'updated':
                            showToast.realtime.updated(appName, 'aplikasi');
                            return prevAplikasis.map((a) => (a.id === aplikasi.id ? aplikasi : a));
                        case 'deleted':
                            showToast.realtime.deleted('Aplikasi');
                            return prevAplikasis.filter((a) => a.id !== aplikasi.id);
                        default:
                            return prevAplikasis;
                    }
                });
            });
        }

        return () => {
            if (channel) {
                channel.stopListening('aplikasi.updated');
            }
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                transaksi_management: formData.transaksi_management,
                name: formData.name,
                nama_aplikasi: formData.name,
                company_id: parseInt(formData.company_id),
                perusahaan_id: parseInt(formData.company_id),
            };

            if (editingAplikasi) {
                // Diubah dari /api/aplikasis/ ke /aplikasis/ untuk mencegah duplikasi prefix
                await api.put(`/aplikasis/${editingAplikasi.id}`, payload);
                showToast.success(`🎉 Aplikasi "${formData.name}" updated successfully!`);
            } else {
                // Diubah dari /api/aplikasis ke /aplikasis
                await api.post('/aplikasis', payload);
                showToast.success(`🎉 Aplikasi "${formData.name}" created successfully!`);
            }

            closeModal();
            router.reload({ only: ['aplikasis'] });
        } catch (error: any) {
            showToast.error(`❌ ${error.response?.data?.message || 'Something went wrong. Please try again.'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (aplikasi: Aplikasi) => {
        setEditingAplikasi(aplikasi);
        const compId =
            aplikasi.company_id ||
            aplikasi.perusahaan_id ||
            aplikasi.company?.id ||
            aplikasi.perusahaan?.id ||
            '';

        setFormData({
            transaksi_management: aplikasi.transaksi_management || '',
            name: aplikasi.nama_aplikasi || aplikasi.name || '',
            company_id: compId.toString(),
        });
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (aplikasiId: number, aplikasiName: string) => {
        showToast.confirmDelete(
            aplikasiName,
            async () => {
                try {
                    // Diubah dari /api/aplikasis/ ke /aplikasis/
                    await api.delete(`/aplikasis/${aplikasiId}`);
                    showToast.success('🗑️ Aplikasi deleted successfully!');
                    router.reload({ only: ['aplikasis'] });
                } catch (error: any) {
                    showToast.error(
                        `❌ ${error.response?.data?.message || 'Failed to delete aplikasi. Please try again.'}`
                    );
                }
            },
            'aplikasi'
        );
    };

    const handleCreate = () => {
        setEditingAplikasi(null);
        setFormData({ transaksi_management: '', name: '', company_id: '' });
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingAplikasi(null);
        setFormData({ transaksi_management: '', name: '', company_id: '' });
    };

    return (
        <>
            <Head title="Super Admin - Aplikasi Management" />
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
                                            <IconUsers className="h-8 w-8 text-primary" />
                                            Master Aplikasi Management
                                        </h1>
                                        <p className="font-sans text-base text-muted-foreground">
                                            Kelola dan atur master aplikasi berdasarkan perusahaan
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className="border-primary/30 bg-primary/10 font-sans text-sm font-medium text-primary"
                                        >
                                            <Activity className="mr-1 h-3 w-3" />
                                            {aplikasis.length} Aplikasis
                                        </Badge>
                                        <Button onClick={handleCreate} className="gap-2 font-sans font-medium">
                                            <IconPlus className="h-4 w-4" />
                                            Tambah Aplikasi
                                        </Button>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="space-y-6">
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-16 font-sans">No</TableHead>
                                                        <TableHead className="w-64 font-sans">Nama Aplikasi</TableHead>
                                                        <TableHead className="font-sans">Jenis Transaksi</TableHead>
                                                        <TableHead className="font-sans">Perusahaan</TableHead>
                                                        <TableHead className="w-24 text-right font-sans">Aksi</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {aplikasis.length > 0 ? (
                                                        aplikasis.map((aplikasi, index) => {
                                                            const appName =
                                                                aplikasi.nama_aplikasi ||
                                                                aplikasi.name ||
                                                                '-';
                                                            const compName =
                                                                aplikasi.company?.name ||
                                                                aplikasi.company?.nama_perusahaan ||
                                                                aplikasi.perusahaan?.nama_perusahaan ||
                                                                aplikasi.perusahaan?.name ||
                                                                '-';

                                                            return (
                                                                <TableRow key={aplikasi.id}>
                                                                    <TableCell className="font-mono">{index + 1}</TableCell>
                                                                    <TableCell className="font-sans font-semibold text-foreground">
                                                                        {appName}
                                                                    </TableCell>
                                                                    <TableCell className="font-sans">
                                                                        <Badge variant="secondary" className="font-normal">
                                                                            {aplikasi.transaksi_management || '-'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="font-sans">{compName}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <div className="flex justify-end gap-2">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleEdit(aplikasi)}
                                                                                className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
                                                                            >
                                                                                <IconEdit className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleDelete(aplikasi.id, appName)}
                                                                                className="h-8 w-8 border-red-300 p-0 text-red-600 hover:bg-red-50"
                                                                            >
                                                                                <IconTrash className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="py-8 text-center font-sans text-gray-500">
                                                                Belum ada aplikasi yang tersedia
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarInset>

                {/* Modal Create/Edit */}
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="font-sans">
                                {editingAplikasi ? 'Edit Master Aplikasi' : 'Tambah Master Aplikasi Baru'}
                            </DialogTitle>
                            <DialogDescription className="font-sans">
                                {editingAplikasi
                                    ? 'Perbarui informasi master aplikasi'
                                    : 'Tambahkan master aplikasi baru ke sistem'}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Dropdown Transaksi Management */}
                            <div className="space-y-2">
                                <Label htmlFor="transaksi_management" className="font-sans">
                                    Transaksi Management <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.transaksi_management}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({ ...prev, transaksi_management: value }))
                                    }
                                    required
                                >
                                    <SelectTrigger className="font-sans">
                                        <SelectValue placeholder="Pilih jenis transaksi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TRANSAKSI_OPTIONS.map((item) => (
                                            <SelectItem key={item} value={item} className="font-sans">
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Field Nama Aplikasi */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="font-sans">
                                    Nama Aplikasi <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="Masukkan nama aplikasi"
                                    className="font-sans"
                                    required
                                />
                            </div>

                            {/* Field Perusahaan */}
                            <div className="space-y-2">
                                <Label htmlFor="company_id" className="font-sans">
                                    Perusahaan <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.company_id}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({ ...prev, company_id: value }))
                                    }
                                    required
                                >
                                    <SelectTrigger className="font-sans">
                                        <SelectValue placeholder="Pilih perusahaan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map((company) => {
                                            const compName =
                                                company.name || company.nama_perusahaan || 'Perusahaan';
                                            return (
                                                <SelectItem
                                                    key={company.id}
                                                    value={company.id.toString()}
                                                    className="font-sans"
                                                >
                                                    {compName}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                    disabled={submitting}
                                    className="font-sans"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-red-600 font-sans hover:bg-red-700"
                                >
                                    {submitting ? 'Menyimpan...' : editingAplikasi ? 'Perbarui' : 'Simpan'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </SidebarProvider>
        </>
    );
}