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
import { Head, usePage } from '@inertiajs/react';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { Activity, Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

declare global {
    interface Window {
        Echo: any;
    }
}

interface Company {
    id: number;
    name: string;
    base_url?: string | null;
}

interface Aplikasi {
    id: number;
    name: string;
    company_id: number;
    company: Company;
    path_api?: string | null;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    auth: {
        user: {
            name: string;
            email: string;
        } | null;
    };
    context: {
        current: {
            company?: { id: number; name: string } | null;
            role?: { name: string } | null;
        } | null;
        is_super_admin: boolean;
    };
    [key: string]: unknown;
}

export default function AdminAplikasiManagement() {
    const { props: pageProps } = usePage<PageProps>();
    const context = pageProps.context;
    const currentCompany = context?.current?.company ?? null;

    const [aplikasis, setAplikasis] = useState<Aplikasi[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAplikasi, setEditingAplikasi] = useState<Aplikasi | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        path_api: '',
    });

    // Fetch aplikasis from API (scoped to admin's company by backend)
    useEffect(() => {
        fetchAplikasis();
    }, []);

    // Setup realtime updates
    useEffect(() => {
        const channel = window.Echo?.channel('aplikasi-management');

        if (channel) {
            channel.listen('aplikasi.updated', (e: any) => {
                const { action, aplikasi } = e;

                // Only react to events that belong to admin's company
                if (currentCompany && aplikasi.company_id !== currentCompany.id) return;

                setAplikasis((prevAplikasis) => {
                    switch (action) {
                        case 'created':
                            showToast.realtime.created(aplikasi.name, 'aplikasi');
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

        return () => {
            if (channel) {
                channel.stopListening('aplikasi.updated');
            }
        };
    }, [currentCompany]);

    const fetchAplikasis = async () => {
        try {
            const response = await api.get('/aplikasis');
            setAplikasis(response.data.aplikasis);
        } catch (error) {
            console.error('Aplikasis fetch error:', error);
            showToast.error('❌ Gagal memuat data aplikasi. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentCompany) {
            showToast.error('❌ Konteks perusahaan tidak ditemukan. Harap pilih konteks terlebih dahulu.');
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                name: formData.name,
                company_id: currentCompany.id,
                path_api: formData.path_api,
            };

            if (editingAplikasi) {
                await api.put(`/aplikasis/${editingAplikasi.id}`, payload);
                showToast.success(`🎉 Aplikasi "${formData.name}" berhasil diperbarui!`);
            } else {
                await api.post('/aplikasis', payload);
                showToast.success(`🎉 Aplikasi "${formData.name}" berhasil ditambahkan!`);
            }

            closeModal();
            fetchAplikasis();
        } catch (error: any) {
            showToast.error(`❌ ${error.response?.data?.message || 'Terjadi kesalahan. Silakan coba lagi.'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (aplikasi: Aplikasi) => {
        setEditingAplikasi(aplikasi);
        setFormData({
            name: aplikasi.name,
            path_api: aplikasi.path_api || '',
        });
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (aplikasiId: number, aplikasiName: string) => {
        showToast.confirmDelete(
            aplikasiName,
            async () => {
                try {
                    await api.delete(`/aplikasis/${aplikasiId}`);
                    showToast.success('🗑️ Aplikasi berhasil dihapus!');
                    fetchAplikasis();
                } catch (error: any) {
                    showToast.error(`❌ ${error.response?.data?.message || 'Gagal menghapus aplikasi. Silakan coba lagi.'}`);
                }
            },
            'aplikasi',
        );
    };

    const handleCreate = () => {
        setEditingAplikasi(null);
        setFormData({ name: '', path_api: '' });
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingAplikasi(null);
        setFormData({ name: '', path_api: '' });
    };

    if (loading) {
        return (
            <>
                <Head title="Admin - Aplikasi Management" />
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
                                        <p className="mt-2 text-sm text-gray-600">Memuat data aplikasi...</p>
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
            <Head title="Admin - Aplikasi Management" />
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
                                            <Globe className="h-8 w-8 text-primary" />
                                            Aplikasi Management
                                        </h1>
                                        <p className="font-sans text-base text-muted-foreground">
                                            Kelola aplikasi untuk perusahaan{' '}
                                            {currentCompany ? (
                                                <span className="font-semibold text-primary">{currentCompany.name}</span>
                                            ) : (
                                                <span className="text-yellow-600">— Konteks perusahaan belum dipilih</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className="border-primary/30 bg-primary/10 font-sans text-sm font-medium text-primary"
                                        >
                                            <Activity className="mr-1 h-3 w-3" />
                                            {aplikasis.length} Aplikasi
                                        </Badge>
                                        <Button
                                            onClick={handleCreate}
                                            className="gap-2 font-sans font-medium"
                                            disabled={!currentCompany}
                                            title={!currentCompany ? 'Pilih konteks perusahaan terlebih dahulu' : 'Tambah Aplikasi'}
                                        >
                                            <IconPlus className="h-4 w-4" />
                                            Tambah Aplikasi
                                        </Button>
                                    </div>
                                </div>

                                {/* Warning if no company context */}
                                {!currentCompany && (
                                    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                                        ⚠️ Anda belum memiliki konteks perusahaan aktif. Silakan pilih konteks melalui context switcher di sidebar untuk dapat mengelola aplikasi.
                                    </div>
                                )}

                                {/* Main Content */}
                                <div className="space-y-6">
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-0">
                                            {/* Mobile view */}
                                            <div className="space-y-3 p-4 md:hidden">
                                                {aplikasis.length > 0 ? (
                                                    aplikasis.map((aplikasi, index) => (
                                                        <div key={aplikasi.id} className="space-y-3 border-b border-border pb-3 last:border-0 last:pb-0">
                                                            <div className="flex min-w-0 items-start justify-between gap-3">
                                                                <div className="flex min-w-0 items-start gap-2">
                                                                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs leading-none text-muted-foreground">
                                                                        {index + 1}
                                                                    </span>
                                                                    <span className="min-w-0 break-words font-sans font-medium text-foreground">{aplikasi.name}</span>
                                                                </div>
                                                                <div className="flex shrink-0 gap-1">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleEdit(aplikasi)}
                                                                        className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
                                                                        aria-label={`Edit ${aplikasi.name}`}
                                                                        title="Edit"
                                                                    >
                                                                        <IconEdit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDelete(aplikasi.id, aplikasi.name)}
                                                                        className="h-8 w-8 border-red-300 p-0 text-red-600 hover:bg-red-50"
                                                                        aria-label={`Hapus ${aplikasi.name}`}
                                                                        title="Hapus"
                                                                    >
                                                                        <IconTrash className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2 text-sm">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs text-muted-foreground">Perusahaan</p>
                                                                    <p className="break-words font-sans text-foreground">{aplikasi.company.name}</p>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs text-muted-foreground">Path API</p>
                                                                    {aplikasi.path_api ? (
                                                                        <p className="break-all font-sans text-foreground">
                                                                            <span className="text-muted-foreground">{aplikasi.company.base_url}</span>
                                                                            <span className="font-semibold text-primary">{aplikasi.path_api}</span>
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-muted-foreground">-</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="py-4 text-center font-sans text-sm text-muted-foreground">Belum ada aplikasi yang tersedia</p>
                                                )}
                                            </div>

                                            {/* Desktop view */}
                                            <div className="hidden md:block">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-16 font-sans">No</TableHead>
                                                            <TableHead className="w-64 font-sans">Nama Aplikasi</TableHead>
                                                            <TableHead className="w-48 font-sans">Perusahaan</TableHead>
                                                            <TableHead className="font-sans">Path API</TableHead>
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
                                                                    <TableCell className="font-sans text-sm">
                                                                        {aplikasi.path_api ? (
                                                                            <div className="flex flex-wrap items-center">
                                                                                <span className="text-muted-foreground">{aplikasi.company.base_url}</span>
                                                                                <span className="font-semibold text-primary">{aplikasi.path_api}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-400">-</span>
                                                                        )}
                                                                    </TableCell>
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
                                                                <TableCell colSpan={5} className="py-8 text-center font-sans text-gray-500">
                                                                    Belum ada aplikasi yang tersedia
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
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
                                    {editingAplikasi ? 'Edit Aplikasi' : 'Tambah Aplikasi Baru'}
                                </CardTitle>
                                <CardDescription className="font-sans">
                                    {editingAplikasi
                                        ? 'Perbarui informasi aplikasi'
                                        : `Tambahkan aplikasi baru untuk perusahaan ${currentCompany?.name ?? ''}`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Company (read-only, from context) */}
                                    <div className="space-y-2">
                                        <Label className="font-sans">Perusahaan</Label>
                                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 font-sans text-sm text-muted-foreground">
                                            {currentCompany?.name ?? 'Tidak ada konteks perusahaan'}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Perusahaan ditentukan otomatis berdasarkan konteks Anda yang aktif.
                                        </p>
                                    </div>

                                    {/* Nama Aplikasi */}
                                    <div className="space-y-2">
                                        <Label htmlFor="admin-app-name" className="font-sans">
                                            Nama Aplikasi <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="admin-app-name"
                                            value={formData.name}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                            placeholder="Masukkan nama aplikasi"
                                            className="font-sans"
                                            required
                                        />
                                    </div>

                                    {/* Path API */}
                                    <div className="space-y-2">
                                        <Label htmlFor="admin-app-path-api" className="font-sans">
                                            Path API Aplikasi (Opsional)
                                        </Label>
                                        <Input
                                            id="admin-app-path-api"
                                            value={formData.path_api}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, path_api: e.target.value }))}
                                            placeholder="/api/v1"
                                            className="font-sans"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" onClick={closeModal} disabled={submitting} className="font-sans">
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={submitting || !currentCompany} className="font-sans">
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
