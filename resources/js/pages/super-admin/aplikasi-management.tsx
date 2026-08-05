import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Head } from '@inertiajs/react';
import { IconEdit, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

declare global {
    interface Window {
        Echo?: any;
    }
}

interface Company {
    id: number;
    name: string;
}

interface Aplikasi {
    id: number;
    name: string;
    company_id: number;
    company: Company;
    created_at: string;
    updated_at: string;
}

// Removed breadcrumbs as we're using SidebarProvider layout

export default function SuperAdminAplikasiManagement() {
    const [aplikasis, setAplikasis] = useState<Aplikasi[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAplikasi, setEditingAplikasi] = useState<Aplikasi | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        company_id: '',
    });

    // Fetch aplikasis and companies from API
    useEffect(() => {
        fetchAplikasis();
    }, []);

    // Setup realtime updates
    useEffect(() => {
        const channel = window.Echo?.channel('aplikasi-management');

        if (channel) {
            channel.listen('aplikasi.updated', (e: any) => {
                const { action, aplikasi } = e;

                setAplikasis((prevAplikasis) => {
                    switch (action) {
                        case 'created':
                            showToast.realtime.created(aplikasi.name, 'aplikasi');
                            // Tambah di akhir array untuk urutan ascending berdasarkan created_at
                            return [...prevAplikasis, aplikasi];
                        case 'updated':
                            showToast.realtime.updated(aplikasi.name, 'aplikasi');
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

        // Cleanup
        return () => {
            if (channel) {
                channel.stopListening('aplikasi.updated');
            }
        };
    }, []);

    const fetchAplikasis = async () => {
        try {
            console.log('Fetching aplikasis...');
            const response = await api.get('/aplikasis');
            console.log('Aplikasis response:', response);
            setAplikasis(response.data.aplikasis);
            setCompanies(response.data.companies);
        } catch (error) {
            console.error('Aplikasis fetch error:', error);
            showToast.error('❌ Failed to fetch aplikasis. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                name: formData.name,
                company_id: parseInt(formData.company_id),
            };

            if (editingAplikasi) {
                await api.put(`/aplikasis/${editingAplikasi.id}`, payload);
                showToast.success(`🎉 Aplikasi "${formData.name}" updated successfully!`);
            } else {
                await api.post('/aplikasis', payload);
                showToast.success(`🎉 Aplikasi "${formData.name}" created successfully!`);
            }

            closeModal();
            fetchAplikasis(); // Refresh the list
        } catch (error: any) {
            showToast.error(`❌ ${error.response?.data?.message || 'Something went wrong. Please try again.'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (aplikasi: Aplikasi) => {
        setEditingAplikasi(aplikasi);
        setFormData({
            name: aplikasi.name,
            company_id: aplikasi.company_id.toString(),
        });
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (aplikasiId: number, aplikasiName: string) => {
        showToast.confirmDelete(
            aplikasiName,
            async () => {
                try {
                    await api.delete(`/aplikasis/${aplikasiId}`);
                    showToast.success('🗑️ Aplikasi deleted successfully!');
                    fetchAplikasis();
                } catch (error: any) {
                    showToast.error(`❌ ${error.response?.data?.message || 'Failed to delete aplikasi. Please try again.'}`);
                }
            },
            'aplikasi',
        );
    };

    const handleCreate = () => {
        setEditingAplikasi(null);
        setFormData({ name: '', company_id: '' });
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingAplikasi(null);
        setFormData({ name: '', company_id: '' });
    };

    if (loading) {
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
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                                        <p className="mt-2 text-sm text-gray-600">Loading data aplikasi...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </>
        );
    }

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
                                                        <TableHead className="font-sans">Perusahaan</TableHead>
                                                        <TableHead className="w-24 text-right font-sans">Aksi</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {aplikasis.length > 0 ? (
                                                        aplikasis.map((aplikasi, index) => (
                                                            <TableRow key={aplikasi.id}>
                                                                <TableCell className="font-mono">{index + 1}</TableCell>
                                                                <TableCell className="font-sans font-medium">{aplikasi.name}</TableCell>
                                                                <TableCell className="font-sans">{aplikasi.company.name}</TableCell>
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
                                                                            onClick={() => handleDelete(aplikasi.id, aplikasi.name)}
                                                                            className="h-8 w-8 border-red-300 p-0 text-red-600 hover:bg-red-50"
                                                                        >
                                                                            <IconTrash className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="py-8 text-center font-sans text-gray-500">
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

                {/* Create/Edit Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <Card className="mx-4 w-full max-w-lg">
                            <CardHeader>
                                <CardTitle className="font-serif">
                                    {editingAplikasi ? 'Edit Master Aplikasi' : 'Tambah Master Aplikasi Baru'}
                                </CardTitle>
                                <CardDescription className="font-sans">
                                    {editingAplikasi ? 'Perbarui informasi master aplikasi' : 'Tambahkan master aplikasi baru ke sistem'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
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
                                    <div className="space-y-2">
                                        <Label htmlFor="company_id" className="font-sans">
                                            Perusahaan <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.company_id}
                                            onValueChange={(value) => setFormData((prev) => ({ ...prev, company_id: value }))}
                                            required
                                        >
                                            <SelectTrigger className="font-sans">
                                                <SelectValue placeholder="Pilih perusahaan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {companies.map((company) => (
                                                    <SelectItem key={company.id} value={company.id.toString()} className="font-sans">
                                                        {company.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" onClick={closeModal} disabled={submitting} className="font-sans">
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={submitting} className="bg-red-600 font-sans hover:bg-red-700">
                                            {submitting ? 'Menyimpan...' : editingAplikasi ? 'Perbarui' : 'Simpan'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </SidebarProvider>
        </>
    );
}
