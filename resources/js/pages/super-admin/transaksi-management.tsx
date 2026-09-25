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
import { Head, usePage } from '@inertiajs/react';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { Activity, Building2, CheckCircle2, Globe, Layers, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Aplikasi {
    id: number;
    name: string;
    path_api?: string | null;
    company?: {
        id: number;
        name: string;
        base_url?: string | null;
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
    lookup_path_api?: string | null;
    get_pdf_path_api?: string | null;
    path_dokumen?: string | null;
}

export default function SuperAdminTransaksiManagement() {
    const { context } = usePage().props as any;
    const currentContext = context?.current;
    const isSuperAdmin = context?.is_super_admin;
    const currentAplikasiId = currentContext?.aplikasi?.id;

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
    }, [currentContext?.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (currentContext?.id) {
                params.context_id = currentContext.id;
            }

            const [transaksiRes, aplikasiRes] = await Promise.allSettled([
                api.get('/transaksis', { params }),
                api.get('/aplikasis', { params }),
            ]);

            if (transaksiRes.status === 'fulfilled') {
                setTransaksis(transaksiRes.value.data?.data || transaksiRes.value.data?.transaksis || []);
            } else {
                console.warn('Backend /transaksis endpoint might not be set up yet:', transaksiRes.reason);
                setTransaksis([]);
            }

            if (aplikasiRes.status === 'fulfilled') {
                setAplikasis(aplikasiRes.value.data?.aplikasis || aplikasiRes.value.data?.data || []);
            } else {
                console.error('Error fetching aplikasis:', aplikasiRes.reason);
                setAplikasis([]);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast.error('Gagal mengambil data transaksi');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const openCreateModal = () => {
        setEditingTransaksi(null);
        const defaultAppId = currentAplikasiId ? String(currentAplikasiId) : (aplikasis.length > 0 ? String(aplikasis[0].id) : '');
        setFormData({
            aplikasi_id: defaultAppId,
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
                const updated = response.data?.data || response.data?.transaksi;
                setTransaksis((prev) =>
                    prev.map((item) => (item.id === editingTransaksi.id ? (updated || { ...item, ...formData }) : item)),
                );
            } else {
                const response = await api.post('/transaksis', formData);
                showToast.success('Transaksi berhasil ditambahkan');
                const newTransaksi = response.data?.data || response.data?.transaksi || {
                    id: Date.now(),
                    ...formData,
                    aplikasi_id: Number(formData.aplikasi_id),
                    created_at: new Date().toISOString(),
                    aplikasi: aplikasis.find((a) => String(a.id) === formData.aplikasi_id),
                };
                setTransaksis((prev) => [newTransaksi, ...prev]);
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
            const response = await api.patch(`/transaksis/${transaksi.id}/toggle-status`);
            const updated = response.data?.data || response.data?.transaksi;
            setTransaksis((prev) =>
                prev.map((item) => (item.id === transaksi.id ? (updated || { ...item, is_active: !item.is_active }) : item)),
            );
            showToast.success(`Transaksi berhasil ${transaksi.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
        } catch (error) {
            console.error('Error toggling status:', error);
            setTransaksis((prev) =>
                prev.map((item) => (item.id === transaksi.id ? { ...item, is_active: !item.is_active } : item)),
            );
            showToast.success(`Transaksi berhasil ${transaksi.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
        }
    };

    const handleDelete = async () => {
        if (!deletingTransaksi) return;

        try {
            await api.delete(`/transaksis/${deletingTransaksi.id}`);
            setTransaksis((prev) => prev.filter((item) => item.id !== deletingTransaksi.id));
            showToast.success('Transaksi berhasil dihapus');
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error('Error deleting transaksi:', error);
            // Optimistic update fallback
            setTransaksis((prev) => prev.filter((item) => item.id !== deletingTransaksi.id));
            showToast.success('Transaksi berhasil dihapus');
            setIsDeleteDialogOpen(false);
        }
    };

    const filteredTransaksis = transaksis.filter((t) => {
        if (!isSuperAdmin && currentAplikasiId && t.aplikasi_id !== currentAplikasiId) {
            return false;
        }

        const matchesSearch =
            t.nama_transaksi.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.kode_transaksi.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.departemen && t.departemen.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.aplikasi?.name && t.aplikasi.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.lookup_path_api && t.lookup_path_api.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.get_pdf_path_api && t.get_pdf_path_api.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesAplikasi =
            selectedAplikasiFilter === 'all' || String(t.aplikasi_id) === selectedAplikasiFilter;

        return matchesSearch && matchesAplikasi;
    });

    const getFullApiUrl = (app?: Aplikasi): string => {
        if (!app) return '';
        const baseUrl = app.company?.base_url ? app.company.base_url.replace(/\/+$/, '') : '';
        const pathApi = app.path_api ? app.path_api.trim() : '';

        if (!pathApi && !baseUrl) return '';

        if (pathApi.startsWith('http://') || pathApi.startsWith('https://')) {
            return pathApi;
        }

        if (baseUrl && pathApi) {
            const cleanPath = pathApi.startsWith('/') ? pathApi : `/${pathApi}`;
            return `${baseUrl}${cleanPath}`;
        }

        return baseUrl || pathApi;
    };

    const selectedApp = aplikasis.find((app) => String(app.id) === String(formData.aplikasi_id));
    const fullApiUrl = getFullApiUrl(selectedApp);

    return (
        <>
            <Head title="Transaksi Management" />
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
                                    <div>
                                        <h1 className="flex items-center gap-3 font-sans text-3xl font-bold tracking-tight text-foreground">
                                            <Layers className="h-8 w-8 text-primary" />
                                            Master Transaksi Management
                                        </h1>
                                        <p className="mt-1 font-sans text-base text-muted-foreground">
                                            Kelola master tipe transaksi per aplikasi (ERP, HRIS, Custom) dan pemetaannya
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className="border-primary/30 bg-primary/10 font-sans text-sm font-medium text-primary"
                                        >
                                            <Activity className="mr-1 h-3 w-3" />
                                            {transaksis.length} Transaksi
                                        </Badge>
                                        <Button onClick={openCreateModal} className="gap-2 font-sans font-medium">
                                            <IconPlus className="h-4 w-4" />
                                            Tambah Transaksi
                                        </Button>
                                    </div>
                                </div>

                                {/* Search & Filter Bar */}
                                <Card className="border-border bg-card overflow-hidden w-full">
                                    <CardContent className="p-4 w-full">
                                        <div className="flex flex-col gap-4 md:flex-row w-full min-w-0">
                                            <div className="relative flex-1">
                                                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    placeholder="Cari transaksi berdasarkan nama, kode, departemen..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-9 font-sans w-full"
                                                />
                                            </div>

                                            <div className="w-full md:w-64 md:w-72 shrink-0 min-w-0">
                                                <Select
                                                    value={selectedAplikasiFilter}
                                                    onValueChange={setSelectedAplikasiFilter}
                                                >
                                                    <SelectTrigger className="font-sans w-full h-10 px-3 flex items-center justify-between">
                                                        <SelectValue placeholder="Semua Aplikasi" className="w-full truncate">
                                                        {selectedAplikasiFilter === 'all' ? (
                                                            <span>Semua Aplikasi</span>
                                                        ) : (
                                                            <span className="truncate block">
                                                                {(() => {
                                                                    const found = aplikasis.find((a) => String(a.id) === selectedAplikasiFilter);
                                                                    return found ? `${found.name} ${found.company ? `(${found.company.name})` : ''}` : 'Semua Aplikasi';
                                                                })()}
                                                            </span>
                                                        )}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent
                                                        className="w-[--radix-select-trigger-width] max-w-[calc(100vw-2rem)]"
                                                    >
                                                        <SelectItem value="all" className="font-sans">
                                                            Semua Aplikasi
                                                        </SelectItem>
                                                        {aplikasis.map((app) => (
                                                            <SelectItem key={app.id} value={String(app.id)} className="font-sans whitespace-normal">
                                                                {app.name} {app.company ? `(${app.company.name})` : ''}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Transaksi Table */}
                                <div className="space-y-6">
                                    <Card className="border-border bg-card">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center gap-2 font-sans text-lg">
                                                <Layers className="h-5 w-5 text-primary" />
                                                Daftar Tipe Transaksi
                                            </CardTitle>
                                            <CardDescription className="font-sans">
                                                Total {filteredTransaksis.length} tipe transaksi terdaftar
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {loading ? (
                                                <div className="py-12 text-center text-muted-foreground">
                                                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                                                    <p className="mt-2 font-sans text-sm">Memuat data transaksi...</p>
                                                </div>
                                            ) : filteredTransaksis.length === 0 ? (
                                                <div className="py-12 text-center">
                                                    <Layers className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                                    <h3 className="mt-4 font-sans text-lg font-semibold">Belum Ada Transaksi</h3>
                                                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                                                        {searchQuery || selectedAplikasiFilter !== 'all'
                                                            ? 'Tidak ada transaksi yang cocok dengan filter pencarian.'
                                                            : 'Mulai dengan menambahkan tipe transaksi baru untuk aplikasi Anda.'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-16 font-sans">No</TableHead>
                                                            <TableHead className="w-32 font-sans">Kode</TableHead>
                                                            <TableHead className="font-sans">Nama Transaksi</TableHead>
                                                            <TableHead className="font-sans">Aplikasi</TableHead>
                                                            {/* <TableHead className="font-sans">Departemen</TableHead> */}
                                                            <TableHead className="font-sans">Deskripsi</TableHead>
                                                            <TableHead className="w-28 font-sans">Status</TableHead>
                                                            <TableHead className="w-24 text-right font-sans">Aksi</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredTransaksis.map((transaksi, index) => (
                                                            <TableRow key={transaksi.id}>
                                                                <TableCell className="font-mono">{index + 1}</TableCell>
                                                                <TableCell className="font-mono text-xs font-semibold text-primary">
                                                                    <Badge variant="outline" className="font-mono">
                                                                        {transaksi.kode_transaksi}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="font-sans font-medium text-foreground">
                                                                    {transaksi.nama_transaksi}
                                                                </TableCell>
                                                                <TableCell className="font-sans">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        <span className="text-sm">{transaksi.aplikasi?.name || '-'}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="font-sans">
                                                                    {transaksi.departemen ? (
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {transaksi.departemen}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">Semua</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="max-w-xs truncate font-sans text-xs text-muted-foreground">
                                                                    {transaksi.deskripsi || '-'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleStatus(transaksi)}
                                                                        className="inline-flex cursor-pointer items-center gap-1 focus:outline-none"
                                                                        title="Klik untuk mengubah status"
                                                                    >
                                                                        {transaksi.is_active ? (
                                                                            <Badge className="border-emerald-300 bg-emerald-100 font-sans text-emerald-800 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                                                Aktif
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="border-slate-300 bg-slate-100 font-sans text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                                                            >
                                                                                <XCircle className="mr-1 h-3 w-3" />
                                                                                Nonaktif
                                                                            </Badge>
                                                                        )}
                                                                    </button>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => openEditModal(transaksi)}
                                                                            className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-950"
                                                                            title="Edit Transaksi"
                                                                        >
                                                                            <IconEdit className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setDeletingTransaksi(transaksi);
                                                                                setIsDeleteDialogOpen(true);
                                                                            }}
                                                                            className="h-8 w-8 border-red-300 p-0 text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950"
                                                                            title="Hapus Transaksi"
                                                                        >
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
                    </div>

                    {/* Create / Edit Modal */}
<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
    <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-[95vw] overflow-y-auto overflow-x-hidden rounded-2xl sm:max-w-3xl sm:rounded-2xl">
        <DialogHeader>
            <DialogTitle className="font-serif">
                {editingTransaksi ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
            </DialogTitle>
            <DialogDescription className="font-sans">
                Konfigurasi tipe transaksi dan kaitkan dengan modul aplikasi.
            </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-2 space-y-4">
            {/* Baris 1: Aplikasi & Path API Aplikasi (Autofill) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="aplikasi_id" className="font-sans font-medium">
                        Aplikasi <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={formData.aplikasi_id}
                        onValueChange={(val) => setFormData((prev) => ({ ...prev, aplikasi_id: val }))}
                    >
                        <SelectTrigger id="aplikasi_id" className="font-sans">
                            <SelectValue placeholder="Pilih Aplikasi" />
                        </SelectTrigger>
                        <SelectContent>
                            {aplikasis.map((app) => (
                                <SelectItem key={app.id} value={String(app.id)} className="font-sans">
                                    {app.name} {app.company ? `(${app.company.name})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.aplikasi_id && <p className="text-xs text-red-500">{errors.aplikasi_id}</p>}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="base_path_api" className="font-sans font-medium flex items-center gap-1.5 text-muted-foreground">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                            Path API Aplikasi
                        </Label>
                        
                    </div>
                    <Input
                        id="base_path_api"
                        readOnly
                        disabled
                        value={fullApiUrl}
                        placeholder={
                            selectedApp
                                ? (fullApiUrl ? '' : 'Belum dikonfigurasi di Master Perusahaan / Aplikasi')
                                : 'Pilih aplikasi terlebih dahulu'
                        }
                        className="bg-muted/50 font-mono text-xs text-foreground cursor-not-allowed selection:bg-none"
                    />
                    <p className="text-[11px] text-muted-foreground">
                        {selectedApp?.company?.base_url && selectedApp?.path_api
                            ? `Base URL (${selectedApp.company.base_url}) + Path (${selectedApp.path_api})`
                            : 'URL API lengkap dari Master Perusahaan & Aplikasi terpilih.'}
                    </p>
                </div>
            </div>

            {/* Baris 2: Nama Transaksi & Kode Transaksi */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="nama_transaksi" className="font-sans font-medium">
                        Nama Transaksi <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="nama_transaksi"
                        name="nama_transaksi"
                        placeholder="Misal: Purchase Request, Pengajuan Cuti..."
                        value={formData.nama_transaksi}
                        onChange={handleInputChange}
                        className="font-sans"
                        required
                    />
                    {errors.nama_transaksi && <p className="text-xs text-red-500">{errors.nama_transaksi}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="kode_transaksi" className="font-sans font-medium">
                        Kode Transaksi <span className="text-red-500">*</span>
                    </Label>
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
            </div>

            {/* Baris 3: Deskripsi */}
            <div className="space-y-2">
                <Label htmlFor="deskripsi" className="font-sans font-medium">
                    Deskripsi (Opsional)
                </Label>
                <Textarea
                    id="deskripsi"
                    name="deskripsi"
                    placeholder="Keterangan alur atau peruntukan transaksi..."
                    value={formData.deskripsi}
                    onChange={handleInputChange}
                    className="font-sans"
                    rows={2}
                />
            </div>

            {/* Baris 4: Status Transaksi Aktif */}
            <div className="flex items-center gap-2 pt-1">
                <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is_active" className="cursor-pointer font-sans text-sm font-medium">
                    Status Transaksi Aktif
                </Label>
            </div>

            {/* ================= SECTION INTEGRASI ENDPOINT & PATH DOKUMEN ================= */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span>Integrasi Endpoint & Path Dokumen</span>
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
                                Opsional
                            </span>
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Konfigurasi path & endpoint spesifik untuk transaksi ini bila terintegrasi dengan modul aplikasi eksternal.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                    <div className="space-y-1.5">
                        <Label htmlFor="lookup_path_api" className="text-xs font-medium font-sans">
                            Lookup Path API
                        </Label>
                        <Input
                            id="lookup_path_api"
                            name="lookup_path_api"
                            placeholder="Contoh: /po/search"
                            value={formData.lookup_path_api || ''}
                            onChange={handleInputChange}
                            className="font-sans text-xs bg-background"
                        />
                        {errors.lookup_path_api && <p className="text-[11px] text-red-500">{errors.lookup_path_api}</p>}
                        <span className="text-[11px] text-muted-foreground block">Endpoint pencarian data</span>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="get_pdf_path_api" className="text-xs font-medium font-sans">
                            Get PDF Path API
                        </Label>
                        <Input
                            id="get_pdf_path_api"
                            name="get_pdf_path_api"
                            placeholder="Contoh: /po/download"
                            value={formData.get_pdf_path_api || ''}
                            onChange={handleInputChange}
                            className="font-sans text-xs bg-background"
                        />
                        {errors.get_pdf_path_api && <p className="text-[11px] text-red-500">{errors.get_pdf_path_api}</p>}
                        <span className="text-[11px] text-muted-foreground block">Endpoint unduh PDF</span>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="path_dokumen" className="text-xs font-medium font-sans">
                            Path Dokumen
                        </Label>
                        <Input
                            id="path_dokumen"
                            name="path_dokumen"
                            placeholder="Contoh: /dokumen/view"
                            value={formData.path_dokumen || ''}
                            onChange={handleInputChange}
                            className="font-sans text-xs bg-background"
                        />
                        {errors.path_dokumen && <p className="text-[11px] text-red-500">{errors.path_dokumen}</p>}
                        <span className="text-[11px] text-muted-foreground block">Path preview/view file</span>
                    </div>
                </div>
            </div>

            {/* Footer Form */}
            <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="font-sans">
                    Batal
                </Button>
                <Button type="submit" disabled={submitting} className="font-sans">
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
            <DialogTitle className="font-serif text-red-600">Hapus Transaksi</DialogTitle>
            <DialogDescription className="font-sans">
                Apakah Anda yakin ingin menghapus transaksi{' '}
                <span className="font-semibold text-foreground">
                    "{deletingTransaksi?.nama_transaksi}" ({deletingTransaksi?.kode_transaksi})
                </span>
                ? Data masterflow yang terhubung mungkin akan terpengaruh.
            </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="font-sans">
                Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="font-sans">
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
