import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { Head } from '@inertiajs/react';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { Building2, CheckCircle2, Layers, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Aplikasi {
    id: number;
    name: string;
    company?: {
        id: number;
        name: string;
    };
}

interface Transaksi {
    id: number;
    aplikasi_id: number;
    kode_transaksi: string;
    nama_transaksi: string;
    departemen?: string | null;
    deskripsi?: string | null;
    is_active: boolean;
    created_at: string;
    aplikasi?: Aplikasi;
    lookup_path_api?: string;
    get_pdf_path_api?: string;
    path_dokumen?: string;
}

export default function TransaksiManagement() {
    const [transaksis, setTransaksis] = useState<Transaksi[]>([]);
    const [aplikasis, setAplikasis] = useState<Aplikasi[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTransaksi, setEditingTransaksi] = useState<Transaksi | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingTransaksi, setDeletingTransaksi] = useState<Transaksi | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAplikasiFilter, setSelectedAplikasiFilter] = useState<string>('all');

    const [formData, setFormData] = useState({
        aplikasi_id: '',
        kode_transaksi: '',
        nama_transaksi: '',
        departemen: '',
        deskripsi: '',
        is_active: true,
        lookup_path_api: '',
        get_pdf_path_api: '',
        path_dokumen: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [transaksiRes, aplikasiRes] = await Promise.all([
                api.get('/transaksis'),
                api.get('/aplikasis'),
            ]);

            setTransaksis(transaksiRes.data.data || []);
            setAplikasis(aplikasiRes.data.aplikasis || aplikasiRes.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast.error('Gagal mengambil data transaksi');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const openCreateModal = () => {
        setEditingTransaksi(null);
        setFormData({
            aplikasi_id: aplikasis.length > 0 ? String(aplikasis[0].id) : '',
            kode_transaksi: '',
            nama_transaksi: '',
            departemen: '',
            deskripsi: '',
            is_active: true,
            lookup_path_api: '',
            get_pdf_path_api: '',
            path_dokumen: '',
        });
        setErrors({});
        setIsCreateModalOpen(true);
    };

    const openEditModal = (transaksi: Transaksi) => {
        setEditingTransaksi(transaksi);
        setFormData({
            aplikasi_id: String(transaksi.aplikasi_id),
            kode_transaksi: transaksi.kode_transaksi,
            nama_transaksi: transaksi.nama_transaksi,
            departemen: transaksi.departemen || '',
            deskripsi: transaksi.deskripsi || '',
            is_active: transaksi.is_active,
            lookup_path_api: transaksi.lookup_path_api || '',
            get_pdf_path_api: transaksi.get_pdf_path_api || '',
            path_dokumen: transaksi.path_dokumen || '',
        });
        setErrors({});
        setIsCreateModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});

        try {
            if (editingTransaksi) {
                const response = await api.put(`/transaksis/${editingTransaksi.id}`, formData);
                showToast.success('Transaksi berhasil diperbarui');
                setTransaksis(prev => prev.map(item => (item.id === editingTransaksi.id ? response.data.data : item)));
            } else {
                const response = await api.post('/transaksis', formData);
                showToast.success('Transaksi berhasil ditambahkan');
                setTransaksis(prev => [response.data.data, ...prev]);
            }
            setIsCreateModalOpen(false);
        } catch (error: any) {
            console.error('Error submitting transaksi:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showToast.error(error.response?.data?.message || 'Gagal menyimpan data transaksi');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (transaksi: Transaksi) => {
        try {
            await api.patch(`/transaksis/${transaksi.id}/toggle-status`);
            setTransaksis(prev =>
                prev.map(item =>
                    item.id === transaksi.id ? { ...item, is_active: !item.is_active } : item
                )
            );
            showToast.success(`Transaksi berhasil ${transaksi.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
        } catch (error) {
            console.error('Error toggling status:', error);
            showToast.error('Gagal mengubah status transaksi');
        }
    };

    const handleDelete = async () => {
        if (!deletingTransaksi) return;

        try {
            await api.delete(`/transaksis/${deletingTransaksi.id}`);
            setTransaksis(prev => prev.filter(item => item.id !== deletingTransaksi.id));
            showToast.success('Transaksi berhasil dihapus');
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error('Error deleting transaksi:', error);
            showToast.error('Gagal menghapus transaksi');
        }
    };

    const filteredTransaksis = transaksis.filter(t => {
        const matchesSearch =
            t.nama_transaksi.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.kode_transaksi.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.departemen && t.departemen.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.aplikasi?.name && t.aplikasi.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesAplikasi =
            selectedAplikasiFilter === 'all' || String(t.aplikasi_id) === selectedAplikasiFilter;

        return matchesSearch && matchesAplikasi;
    });

    return (
        <>
            <Head title="Transaksi Management" />
            <SidebarProvider>
                <NotificationListener />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />

                    <div className="flex flex-1 flex-col gap-6 p-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
                                    Transaksi Management
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Kelola master tipe transaksi per aplikasi (ERP, HRIS, Custom) dan pemetaannya.
                                </p>
                            </div>

                            <Button onClick={openCreateModal} className="gap-2 bg-primary hover:bg-primary/90">
                                <IconPlus className="h-4 w-4" />
                                Tambah Transaksi
                            </Button>
                        </div>

                        {/* Search & Filter Bar */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-1">
                                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Cari transaksi berdasarkan nama, kode, departemen..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>

                                    <div className="w-full md:w-64">
                                        <Select
                                            value={selectedAplikasiFilter}
                                            onValueChange={setSelectedAplikasiFilter}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Semua Aplikasi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Aplikasi</SelectItem>
                                                {aplikasis.map(app => (
                                                    <SelectItem key={app.id} value={String(app.id)}>
                                                        {app.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Transaksi Table */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="font-serif text-lg flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-primary" />
                                    Daftar Transaksi
                                </CardTitle>
                                <CardDescription>
                                    Total {filteredTransaksis.length} tipe transaksi terdaftar
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                                        <p className="mt-2 text-sm">Memuat data transaksi...</p>
                                    </div>
                                ) : filteredTransaksis.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Layers className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                        <h3 className="mt-4 font-semibold text-lg">Belum Ada Transaksi</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {searchQuery || selectedAplikasiFilter !== 'all'
                                                ? 'Tidak ada transaksi yang cocok dengan filter pencarian.'
                                                : 'Mulai dengan menambahkan tipe transaksi baru untuk aplikasi Anda.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Kode</TableHead>
                                                    <TableHead>Nama Transaksi</TableHead>
                                                    <TableHead>Aplikasi</TableHead>
                                                    <TableHead>Deskripsi</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Aksi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredTransaksis.map(transaksi => (
                                                    <TableRow key={transaksi.id}>
                                                        <TableCell className="font-mono font-semibold text-xs text-primary">
                                                            {transaksi.kode_transaksi}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-foreground">
                                                            {transaksi.nama_transaksi}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5">
                                                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                                <span className="text-sm">{transaksi.aplikasi?.name || '-'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {transaksi.departemen ? (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {transaksi.departemen}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">Semua</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                                                            {transaksi.deskripsi || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <button
                                                                onClick={() => handleToggleStatus(transaksi)}
                                                                className="inline-flex items-center gap-1 cursor-pointer focus:outline-none"
                                                                title="Klik untuk mengubah status"
                                                            >
                                                                {transaksi.is_active ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200">
                                                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                                                        Aktif
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200">
                                                                        <XCircle className="mr-1 h-3 w-3" />
                                                                        Nonaktif
                                                                    </Badge>
                                                                )}
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => openEditModal(transaksi)}
                                                                    title="Edit Transaksi"
                                                                >
                                                                    <IconEdit className="h-4 w-4 text-blue-600" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setDeletingTransaksi(transaksi);
                                                                        setIsDeleteDialogOpen(true);
                                                                    }}
                                                                    title="Hapus Transaksi"
                                                                >
                                                                    <IconTrash className="h-4 w-4 text-red-600" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Create / Edit Modal */}
<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
            <DialogTitle className="font-serif">
                {editingTransaksi ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
            </DialogTitle>
            <DialogDescription>
                Konfigurasi tipe transaksi dan kaitkan dengan modul aplikasi.
            </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Layout Grid Horizontal 2 Kolom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kolom Kiri */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="aplikasi_id">Aplikasi <span className="text-red-500">*</span></Label>
                        <Select
                            value={formData.aplikasi_id}
                            onValueChange={val => setFormData(prev => ({ ...prev, aplikasi_id: val }))}
                        >
                            <SelectTrigger id="aplikasi_id">
                                <SelectValue placeholder="Pilih Aplikasi" />
                            </SelectTrigger>
                            <SelectContent>
                                {aplikasis.map(app => (
                                    <SelectItem key={app.id} value={String(app.id)}>
                                        {app.name} {app.company ? `(${app.company.name})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.aplikasi_id && <p className="text-xs text-red-500">{errors.aplikasi_id}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="kode_transaksi">Kode Transaksi <span className="text-red-500">*</span></Label>
                        <Input
                            id="kode_transaksi"
                            name="kode_transaksi"
                            placeholder="Misal: PR, PO, CUTI"
                            value={formData.kode_transaksi}
                            onChange={handleInputChange}
                            className="font-mono uppercase"
                            required
                        />
                        {errors.kode_transaksi && <p className="text-xs text-red-500">{errors.kode_transaksi}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nama_transaksi">Nama Transaksi <span className="text-red-500">*</span></Label>
                        <Input
                            id="nama_transaksi"
                            name="nama_transaksi"
                            placeholder="Misal: Purchase Request, Pengajuan Cuti Tahunan"
                            value={formData.nama_transaksi}
                            onChange={handleInputChange}
                            required
                        />
                        {errors.nama_transaksi && <p className="text-xs text-red-500">{errors.nama_transaksi}</p>}
                    </div>

                    {/* DESKRIPSI PINDAH KE KIRI DI SINI */}
                    <div className="space-y-2">
                        <Label htmlFor="deskripsi">Deskripsi (Opsional)</Label>
                        <Textarea
                            id="deskripsi"
                            name="deskripsi"
                            placeholder="Keterangan alur atau peruntukan transaksi..."
                            value={formData.deskripsi}
                            onChange={handleInputChange}
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                </div>

                {/* Kolom Kanan */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="get_pdf_path_api">Get PDF Path API (Opsional)</Label>
                        <Input
                            id="get_pdf_path_api"
                            name="get_pdf_path_api"
                            placeholder="Contoh: /po/download"
                            value={formData.get_pdf_path_api || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, get_pdf_path_api: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="path_dokumen">Path Dokumen (Opsional)</Label>
                        <Input
                            id="path_dokumen"
                            name="path_dokumen"
                            placeholder="Contoh: /path/dokumen..."
                            value={formData.path_dokumen || ''}
                            onChange={handleInputChange}
                        />
                        {errors.path_dokumen && <p className="text-xs text-red-500">{errors.path_dokumen}</p>}
                    </div>

                    {/* LOOKUP PATH API PINDAH KE KANAN DI SINI */}
                    <div className="space-y-2">
                        <Label htmlFor="lookup_path_api">Lookup Path API (Opsional)</Label>
                        <Input
                            id="lookup_path_api"
                            name="lookup_path_api"
                            placeholder="Contoh: /po/search"
                            value={formData.lookup_path_api || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, lookup_path_api: e.target.value }))}
                        />
                    </div>
                </div>
            </div>

            {/* Status Aktif dan Footer */}
            <div className="flex items-center gap-2 pt-2">
                <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
                <Label htmlFor="is_active" className="cursor-pointer text-sm font-medium">
                    Status Transaksi Aktif
                </Label>
            </div>

            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Batal
                </Button>
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Menyimpan...' : editingTransaksi ? 'Simpan Perubahan' : 'Tambah Transaksi'}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

                    {/* Delete Confirmation Modal */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-red-600 font-serif">Hapus Transaksi</DialogTitle>
                                <DialogDescription>
                                    Apakah Anda yakin ingin menghapus transaksi{' '}
                                    <span className="font-semibold text-foreground">
                                        "{deletingTransaksi?.nama_transaksi}" ({deletingTransaksi?.kode_transaksi})
                                    </span>
                                    ? Data masterflow yang terhubung mungkin akan terpengaruh.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                    Batal
                                </Button>
                                <Button variant="destructive" onClick={handleDelete}>
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
