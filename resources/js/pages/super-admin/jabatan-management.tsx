import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Head } from '@inertiajs/react';
import { IconEdit, IconPlus, IconTrash, IconUserCheck } from '@tabler/icons-react';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

declare global {
    interface Window {
        Echo?: any;
    }
}

interface Jabatan {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

// Removed breadcrumbs as we're using SidebarProvider layout

export default function SuperAdminJabatanManagement() {
    const [jabatans, setJabatans] = useState<Jabatan[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingJabatan, setEditingJabatan] = useState<Jabatan | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
    });

    // Fetch jabatans from API
    useEffect(() => {
        fetchJabatans();
    }, []);

    // Setup realtime updates
    useEffect(() => {
        const channel = window.Echo?.channel('jabatan-management');

        if (channel) {
            channel.listen('jabatan.updated', (e: any) => {
                const { action, jabatan } = e;

                setJabatans((prevJabatans) => {
                    switch (action) {
                        case 'created':
                            showToast.realtime.created(jabatan.name, 'jabatan');
                            // Tambah di akhir array untuk urutan ascending berdasarkan created_at
                            return [...prevJabatans, jabatan];
                        case 'updated':
                            showToast.realtime.updated(jabatan.name, 'jabatan');
                            return prevJabatans.map((j) => (j.id === jabatan.id ? jabatan : j));
                        case 'deleted':
                            showToast.realtime.deleted('Jabatan');
                            return prevJabatans.filter((j) => j.id !== jabatan.id);
                        default:
                            return prevJabatans;
                    }
                });
            });
        }

        // Cleanup
        return () => {
            if (channel) {
                channel.stopListening('jabatan.updated');
            }
        };
    }, []);

    const fetchJabatans = async () => {
        try {
            const response = await api.get('/jabatans');
            setJabatans(response.data.jabatans);
        } catch (error) {
            showToast.error('❌ Failed to fetch jabatans. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingJabatan) {
                await api.put(`/jabatans/${editingJabatan.id}`, formData);
                showToast.success(`🎉 Jabatan "${formData.name}" updated successfully!`);
            } else {
                await api.post('/jabatans', formData);
                showToast.success(`🎉 Jabatan "${formData.name}" created successfully!`);
            }

            closeModal();
            fetchJabatans(); // Refresh the list
        } catch (error: any) {
            showToast.error(`❌ ${error.response?.data?.message || 'Something went wrong. Please try again.'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (jabatan: Jabatan) => {
        setEditingJabatan(jabatan);
        setFormData({
            name: jabatan.name,
        });
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (jabatanId: number, jabatanName: string) => {
        showToast.confirmDelete(
            jabatanName,
            async () => {
                try {
                    await api.delete(`/jabatans/${jabatanId}`);
                    showToast.success('🗑️ Jabatan deleted successfully!');
                    fetchJabatans();
                } catch (error: any) {
                    showToast.error(`❌ ${error.response?.data?.message || 'Failed to delete jabatan. Please try again.'}`);
                }
            },
            'jabatan',
        );
    };

    const handleCreate = () => {
        setEditingJabatan(null);
        setFormData({ name: '' });
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingJabatan(null);
        setFormData({ name: '' });
    };

    if (loading) {
        return (
            <>
                <Head title="Super Admin - Jabatan Management" />
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
                                        <p className="mt-2 text-sm text-gray-600">Loading data jabatan...</p>
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
            <Head title="Super Admin - Jabatan Management" />
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
                                    <h1 className="flex items-center gap-3 font-sans text-3xl font-bold tracking-tight text-foreground">
                                        <IconUserCheck className="h-8 w-8 text-primary" />
                                        Master Jabatan Management
                                    </h1>
                                    <p className="font-sans text-base text-muted-foreground">Kelola dan atur master jabatan/posisi dalam sistem</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="border-primary/30 bg-primary/10 font-sans text-sm font-medium text-primary">
                                        <Activity className="mr-1 h-3 w-3" />
                                        {jabatans.length} Jabatans
                                    </Badge>
                                    <Button onClick={handleCreate} className="gap-2 font-sans font-medium">
                                        <IconPlus className="h-4 w-4" />
                                        Tambah Jabatan
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
                                                    <TableHead className="font-sans">Nama Jabatan</TableHead>
                                                    <TableHead className="w-24 text-right font-sans">Aksi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {jabatans.length > 0 ? (
                                                    jabatans.map((jabatan, index) => (
                                                        <TableRow key={jabatan.id}>
                                                            <TableCell className="font-mono">{index + 1}</TableCell>
                                                            <TableCell className="font-sans font-medium">{jabatan.name}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleEdit(jabatan)}
                                                                        className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
                                                                    >
                                                                        <IconEdit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDelete(jabatan.id, jabatan.name)}
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
                                                        <TableCell colSpan={3} className="py-8 text-center font-sans text-gray-500">
                                                            Belum ada jabatan yang tersedia
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
                </SidebarInset>

                {/* Create/Edit Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <Card className="mx-4 w-full max-w-lg">
                            <CardHeader>
                                <CardTitle className="font-serif">{editingJabatan ? 'Edit Master Jabatan' : 'Tambah Master Jabatan Baru'}</CardTitle>
                                <CardDescription className="font-sans">
                                    {editingJabatan ? 'Perbarui informasi master jabatan/posisi' : 'Tambahkan master jabatan/posisi baru ke sistem'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="font-sans">
                                            Nama Jabatan <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                            placeholder="Masukkan nama jabatan"
                                            className="font-sans"
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" onClick={closeModal} disabled={submitting} className="font-sans">
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={submitting} className="bg-red-600 font-sans hover:bg-red-700">
                                            {submitting ? 'Menyimpan...' : editingJabatan ? 'Perbarui' : 'Simpan'}
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
