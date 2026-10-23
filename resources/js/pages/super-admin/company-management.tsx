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
import { IconBuilding, IconEdit, IconPlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { Activity } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        Echo: any; 
    }
}

interface Company {
    id: number;
    name: string;
    address: string | null;
    phone_number: string | null;
    base_url: string | null; 
    logo: string | null;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
}

export default function SuperAdminCompanyManagement() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone_number: '',
        base_url: '',
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch companies from API
    useEffect(() => {
        fetchCompanies();
    }, []);

    // Setup realtime updates
    useEffect(() => {
        const channel = window.Echo?.channel('company-management');

        if (channel) {
            channel.listen('company.updated', (e: any) => {
                const { action, company } = e;

                setCompanies((prevCompanies) => {
                    switch (action) {
                        case 'created':
                            showToast.realtime.created(company.name, 'company');
                            // Tambah di akhir array untuk urutan ascending berdasarkan created_at
                            return [...prevCompanies, company];
                        case 'updated':
                            showToast.realtime.updated(company.name, 'company');
                            return prevCompanies.map((c) => (c.id === company.id ? company : c));
                        case 'deleted':
                            showToast.realtime.deleted('Company');
                            return prevCompanies.filter((c) => c.id !== company.id);
                        default:
                            return prevCompanies;
                    }
                });
            });
        }

        // Cleanup
        return () => {
            if (channel) {
                channel.stopListening('company.updated');
            }
        };
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/companies');
            setCompanies(response.data.companies);
        } catch (error) {
            showToast.error('❌ Failed to fetch companies. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast.error('❌ Ukuran file logo maksimal 2MB.');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
        setRemoveLogo(false);
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        setRemoveLogo(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('address', formData.address || '');
            data.append('phone_number', formData.phone_number || '');
            data.append('base_url', formData.base_url || '');

            if (logoFile) {
                data.append('logo', logoFile);
            }
            if (removeLogo) {
                data.append('remove_logo', '1');
            }

            if (editingCompany) {
                data.append('_method', 'PUT');
                await api.post(`/companies/${editingCompany.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                showToast.success(`🎉 Company "${formData.name}" updated successfully!`);
            } else {
                await api.post('/companies', data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                showToast.success(`🎉 Company "${formData.name}" created successfully!`);
            }

            closeModal();
            fetchCompanies(); // Refresh the list
        } catch (error: any) {
            showToast.error(`❌ ${error.response?.data?.message || 'Something went wrong. Please try again.'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (company: Company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name,
            address: company.address || '',
            phone_number: company.phone_number || '',
            base_url: company.base_url || '', 
        });
        setLogoFile(null);
        setLogoPreview(company.logo_url || null);
        setRemoveLogo(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (companyId: number, companyName: string) => {
        showToast.confirmDelete(
            companyName,
            async () => {
                try {
                    await api.delete(`/companies/${companyId}`);
                    showToast.success('🗑️ Company deleted successfully!');
                    fetchCompanies();
                } catch (error: any) {
                    showToast.error(`❌ ${error.response?.data?.message || 'Failed to delete company. Please try again.'}`);
                }
            },
            'company',
        );
    };

    const handleCreate = () => {
        setEditingCompany(null);
        setFormData({ name: '', address: '', phone_number: '', base_url: '' }); 
        setLogoFile(null);
        setLogoPreview(null);
        setRemoveLogo(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingCompany(null);
        setFormData({ name: '', address: '', phone_number: '', base_url: '' }); 
        setLogoFile(null);
        setLogoPreview(null);
        setRemoveLogo(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return (
            <>
                <Head title="Super Admin - Company Management" />
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
                                        <p className="mt-2 text-sm text-gray-600">Loading data perusahaan...</p>
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
            <Head title="Super Admin - Company Management" />
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
                                        <IconBuilding className="h-8 w-8 text-primary" />
                                        Master Company Management
                                    </h1>
                                    <p className="font-sans text-base text-muted-foreground">Kelola dan atur master perusahaan dalam sistem</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="border-primary/30 bg-primary/10 font-sans text-sm font-medium text-primary">
                                        <Activity className="mr-1 h-3 w-3" />
                                        {companies.length} Companies
                                    </Badge>
                                    <Button onClick={handleCreate} className="gap-2 font-sans font-medium">
                                        <IconPlus className="h-4 w-4" />
                                        Tambah Company
                                    </Button>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="space-y-6">
                                <Card className="border-border bg-card">
                                    <CardContent className="p-0">
                                        <div className="space-y-3 p-4 md:hidden">
                                            {companies.length > 0 ? (
                                                companies.map((company, index) => (
                                                    <div key={company.id} className="space-y-3 border-b border-border pb-3 last:border-0 last:pb-0">
                                                        <div className="flex min-w-0 items-start justify-between gap-3">
                                                            <div className="flex min-w-0 items-start gap-2.5">
                                                                <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">{index + 1}</span>
                                                                {company.logo_url ? (
                                                                    <img
                                                                        src={company.logo_url}
                                                                        alt={company.name}
                                                                        className="h-8 w-8 shrink-0 rounded border border-border object-contain p-0.5 bg-white"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-dashed border-border bg-muted/40 text-muted-foreground">
                                                                        <IconBuilding className="h-4 w-4" />
                                                                    </div>
                                                                )}
                                                                <span className="min-w-0 break-words font-sans font-medium text-foreground">{company.name}</span>
                                                            </div>
                                                            <div className="flex shrink-0 gap-1">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEdit(company)}
                                                                    className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
                                                                    aria-label={`Edit ${company.name}`}
                                                                    title="Edit"
                                                                >
                                                                    <IconEdit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(company.id, company.name)}
                                                                    className="h-8 w-8 border-red-300 p-0 text-red-600 hover:bg-red-50"
                                                                    aria-label={`Hapus ${company.name}`}
                                                                    title="Hapus"
                                                                >
                                                                    <IconTrash className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-muted-foreground">Alamat</p>
                                                                <p className="break-words font-sans text-foreground">{company.address || '-'}</p>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-muted-foreground">Nomor Telepon</p>
                                                                <p className="break-words font-sans text-foreground">{company.phone_number || '-'}</p>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-muted-foreground">Base URL</p>
                                                                {company.base_url ? (
                                                                    <a
                                                                        href={company.base_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="block break-all font-sans text-blue-600 hover:underline"
                                                                    >
                                                                        {company.base_url}
                                                                    </a>
                                                                ) : (
                                                                    <p className="text-foreground">-</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="py-4 text-center font-sans text-sm text-muted-foreground">Belum ada perusahaan yang tersedia</p>
                                            )}
                                        </div>
                                        <div className="hidden md:block">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16 font-sans">No</TableHead>
                                                    <TableHead className="w-48 font-sans">Nama Perusahaan</TableHead>
                                                    <TableHead className="w-64 font-sans">Alamat</TableHead>
                                                    <TableHead className="w-32 font-sans">Nomor Telepon</TableHead>
                                                    {/* Tambahan: Header untuk Base URL */}
                                                    <TableHead className="w-48 font-sans">Base URL</TableHead>
                                                    <TableHead className="w-24 text-right font-sans">Aksi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {companies.length > 0 ? (
                                                    companies.map((company, index) => (
                                                        <TableRow key={company.id}>
                                                            <TableCell className="font-mono">{index + 1}</TableCell>
                                                            <TableCell className="font-sans font-medium">
                                                                <div className="flex items-center gap-3">
                                                                    {company.logo_url ? (
                                                                        <img
                                                                            src={company.logo_url}
                                                                            alt={company.name}
                                                                            className="h-8 w-8 shrink-0 rounded border border-border object-contain p-0.5 bg-white shadow-xs"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-dashed border-border bg-muted/40 text-muted-foreground">
                                                                            <IconBuilding className="h-4 w-4" />
                                                                        </div>
                                                                    )}
                                                                    <span className="min-w-0">{company.name}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="w-64 font-sans">
                                                                {company.address ? (
                                                                    <div className="break-words whitespace-normal">{company.address}</div>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-sans">
                                                                {company.phone_number || <span className="text-gray-400">-</span>}
                                                            </TableCell>
                                                            {/* Tambahan: Sel Data untuk Base URL */}
                                                            <TableCell className="font-sans break-all">
                                                                {company.base_url ? (
                                                                    <a href={company.base_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                        {company.base_url}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleEdit(company)}
                                                                        className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
                                                                    >
                                                                        <IconEdit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDelete(company.id, company.name)}
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
                                                        {/* Ubah colSpan menjadi 6 karena ada tambahan kolom Base URL */}
                                                        <TableCell colSpan={6} className="py-8 text-center font-sans text-gray-500">
                                                            Belum ada perusahaan yang tersedia
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
                </SidebarInset>

                {/* Create/Edit Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <Card className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden">
                            <CardHeader className="shrink-0">
                                <CardTitle className="font-serif">{editingCompany ? 'Edit Master Company' : 'Tambah Master Company Baru'}</CardTitle>
                                <CardDescription className="font-sans">
                                    {editingCompany ? 'Perbarui informasi master perusahaan' : 'Tambahkan master perusahaan baru ke sistem'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="overflow-y-auto pr-6">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="font-sans">
                                            Nama Perusahaan <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                            placeholder="Masukkan nama perusahaan"
                                            className="font-sans"
                                            required
                                        />
                                    </div>

                                    {/* Upload Logo Perusahaan */}
                                    <div className="space-y-2">
                                        <Label className="font-sans">Logo Perusahaan (Opsional)</Label>
                                        <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/10 p-3">
                                            {logoPreview ? (
                                                <div className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1 shadow-xs">
                                                    <img
                                                        src={logoPreview}
                                                        alt="Logo Preview"
                                                        className="h-full w-full rounded object-contain"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveLogo}
                                                        className="absolute inset-0 flex items-center justify-center rounded bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                                        title="Hapus Logo"
                                                    >
                                                        <IconTrash className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-muted/30"
                                                >
                                                    <IconUpload className="h-6 w-6" />
                                                    <span className="mt-1 font-sans text-[10px]">Upload</span>
                                                </div>
                                            )}

                                            <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                                                <input
                                                    ref={fileInputRef}
                                                    id="logo-upload"
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                                                    onChange={handleLogoChange}
                                                    className="hidden"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="h-8 font-sans text-xs"
                                                    >
                                                        <IconUpload className="mr-1.5 h-3.5 w-3.5" />
                                                        {logoPreview ? 'Ganti Logo' : 'Pilih Logo'}
                                                    </Button>
                                                    {logoPreview && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleRemoveLogo}
                                                            className="h-8 font-sans text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        >
                                                            Hapus
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="font-sans text-muted-foreground">
                                                    Format: PNG, JPG, JPEG, WEBP, atau SVG. (Maks. 2MB)
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address" className="font-sans">
                                            Alamat Perusahaan
                                        </Label>
                                        <textarea
                                            id="address"
                                            value={formData.address}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                                setFormData((prev) => ({ ...prev, address: e.target.value }))
                                            }
                                            placeholder="Masukkan alamat perusahaan"
                                            className="flex min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-sans text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone_number" className="font-sans">
                                            Nomor Telepon
                                        </Label>
                                        <Input
                                            id="phone_number"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                                            placeholder="Masukkan nomor telepon"
                                            className="font-sans"
                                            maxLength={20}
                                        />
                                    </div>
                                    
                                    {/* Penambahan Field Base URL */}
                                    <div className="space-y-2">
                                        <Label htmlFor="base_url" className="font-sans">
                                            Base URL (Opsional)
                                        </Label>
                                        <Input
                                            id="base_url"
                                            type="url"
                                            value={formData.base_url || ''}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, base_url: e.target.value }))}
                                            placeholder="Contoh: https://perusahaan.com"
                                            className="font-sans"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" onClick={closeModal} disabled={submitting} className="font-sans">
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={submitting} className="font-sans">
                                            {submitting ? 'Menyimpan...' : editingCompany ? 'Perbarui' : 'Simpan'}
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

