import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout'; // sesuaikan dengan layout super admin yang kamu pakai
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface MasterTransaksi {
    id: number;
    kode_transaksi: string;
    nama_transaksi: string;
    kategori: string;
    deskripsi?: string;
    aplikasi?: { id: number; name: string };
    is_active: boolean;
}

interface PageProps {
    transaksis: MasterTransaksi[];
    aplikasis: { id: number; name: string }[];
}

export default function TransaksiManagement({ transaksis = [], aplikasis = [] }: PageProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MasterTransaksi | null>(null);
    const [formData, setFormData] = useState({
        aplikasi_id: '',
        kode_transaksi: '',
        nama_transaksi: '',
        kategori: 'transaksi',
        deskripsi: '',
        is_active: true,
    });

    const openCreateModal = () => {
        setEditingItem(null);
        setFormData({
            aplikasi_id: aplikasis[0]?.id ? String(aplikasis[0].id) : '',
            kode_transaksi: '',
            nama_transaksi: '',
            kategori: 'transaksi',
            deskripsi: '',
            is_active: true,
        });
        setIsModalOpen(true);
    };

    const openEditModal = (item: MasterTransaksi) => {
        setEditingItem(item);
        setFormData({
            aplikasi_id: String(item.aplikasi?.id || ''),
            kode_transaksi: item.kode_transaksi,
            nama_transaksi: item.nama_transaksi,
            kategori: item.kategori,
            deskripsi: item.deskripsi || '',
            is_active: Boolean(item.is_active),
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            router.put(`/super-admin/transaksi-management/${editingItem.id}`, formData, {
                onSuccess: () => setIsModalOpen(false),
            });
        } else {
            router.post('/super-admin/transaksi-management', formData, {
                onSuccess: () => setIsModalOpen(false),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus data transaksi ini?')) {
            router.delete(`/super-admin/transaksi-management/${id}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Transaksi Management" />
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Transaksi Management</h1>
                        <p className="text-sm text-muted-foreground">Kelola modul dan jenis transaksi per aplikasi</p>
                    </div>
                    <Button onClick={openCreateModal} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Tambah Transaksi
                    </Button>
                </div>

                <div className="border rounded-lg bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12 text-center">No</TableHead>
                                <TableHead>Aplikasi</TableHead>
                                <TableHead>Kode Transaksi</TableHead>
                                <TableHead>Nama Transaksi</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead className="text-center w-28">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transaksis.length > 0 ? (
                                transaksis.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-center">{index + 1}</TableCell>
                                        <TableCell className="font-medium">{item.aplikasi?.name || '-'}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded bg-muted text-xs font-mono font-bold">
                                                {item.kode_transaksi}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.nama_transaksi}</TableCell>
                                        <TableCell className="capitalize">{item.kategori}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{item.deskripsi || '-'}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditModal(item)}>
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Belum ada data transaksi yang dibuat.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Modal Form */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Pilih Aplikasi *</Label>
                                <select
                                    value={formData.aplikasi_id}
                                    onChange={(e) => setFormData({ ...formData, aplikasi_id: e.target.value })}
                                    className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    <option value="" disabled>-- Pilih Aplikasi --</option>
                                    {aplikasis.map((app) => (
                                        <option key={app.id} value={app.id}>{app.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Kode Transaksi *</Label>
                                    <Input
                                        placeholder="Misal: PR, PO, CUTI"
                                        value={formData.kode_transaksi}
                                        onChange={(e) => setFormData({ ...formData, kode_transaksi: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kategori *</Label>
                                    <select
                                        value={formData.kategori}
                                        onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                                        className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background"
                                        required
                                    >
                                        <option value="transaksi">Transaksi</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Nama Transaksi *</Label>
                                <Input
                                    placeholder="Misal: Purchase Request"
                                    value={formData.nama_transaksi}
                                    onChange={(e) => setFormData({ ...formData, nama_transaksi: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Deskripsi (Opsional)</Label>
                                <Input
                                    placeholder="Keterangan singkat modul..."
                                    value={formData.deskripsi}
                                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                                />
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                                <Button type="submit">{editingItem ? 'Simpan Perubahan' : 'Buat Transaksi'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}