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
import { IconBuilding, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
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
    address: string | null;
    phone_number: string | null;
    created_at: string;
    updated_at: string;
}

// Removed breadcrumbs as we're using SidebarProvider layout

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
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingCompany) {
                await api.put(`/companies/${editingCompany.id}`, formData);
                showToast.success(`🎉 Company "${formData.name}" updated successfully!`);
            } else {
                await api.post('/companies', formData);
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
        });
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
        setFormData({ name: '', address: '', phone_number: '' });
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingCompany(null);
        setFormData({ name: '', address: '', phone_number: '' });
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
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16 font-sans">No</TableHead>
                                                    <TableHead className="w-48 font-sans">Nama Perusahaan</TableHead>
                                                    <TableHead className="w-80 font-sans">Alamat</TableHead>
                                                    <TableHead className="w-32 font-sans">Nomor Telepon</TableHead>
                                                    <TableHead className="w-24 text-right font-sans">Aksi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {companies.length > 0 ? (
                                                    companies.map((company, index) => (
                                                        <TableRow key={company.id}>
                                                            <TableCell className="font-mono">{index + 1}</TableCell>
                                                            <TableCell className="font-sans font-medium">{company.name}</TableCell>
                                                            <TableCell className="w-80 font-sans">
                                                                {company.address ? (
                                                                    <div className="break-words whitespace-normal">{company.address}</div>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-sans">
                                                                {company.phone_number || <span className="text-gray-400">-</span>}
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
                                                        <TableCell colSpan={5} className="py-8 text-center font-sans text-gray-500">
                                                            Belum ada perusahaan yang tersedia
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
                                <CardTitle className="font-serif">{editingCompany ? 'Edit Master Company' : 'Tambah Master Company Baru'}</CardTitle>
                                <CardDescription className="font-sans">
                                    {editingCompany ? 'Perbarui informasi master perusahaan' : 'Tambahkan master perusahaan baru ke sistem'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
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
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" onClick={closeModal} disabled={submitting} className="font-sans">
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={submitting} className="bg-red-600 font-sans hover:bg-red-700">
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
