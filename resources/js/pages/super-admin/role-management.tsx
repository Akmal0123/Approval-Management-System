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
import { IconEdit, IconPlus, IconShield, IconTrash } from '@tabler/icons-react';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

declare global {
    interface Window {
        Echo?: any;
    }
}

interface Role {
    id: number;
    role_name: string;
    created_at: string;
    updated_at: string;
}

// Removed breadcrumbs as we're using SidebarProvider layout

export default function SuperAdminRoleManagement() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ role_name: '' });

    // Fetch roles from API
    useEffect(() => {
        fetchRoles();
    }, []);

    // Setup realtime updates
    useEffect(() => {
        const channel = window.Echo?.channel('role-management');

        if (channel) {
            channel.listen('role.updated', (e: any) => {
                const { action, role } = e;

                setRoles((prevRoles) => {
                    switch (action) {
                        case 'created':
                            showToast.realtime.created(role.role_name, 'role');
                            // Tambah di akhir array untuk urutan ascending berdasarkan created_at
                            return [...prevRoles, role];
                        case 'updated':
                            showToast.realtime.updated(role.role_name, 'role');
                            return prevRoles.map((r) => (r.id === role.id ? role : r));
                        case 'deleted':
                            showToast.realtime.deleted('Role');
                            return prevRoles.filter((r) => r.id !== role.id);
                        default:
                            return prevRoles;
                    }
                });
            });
        }

        // Cleanup
        return () => {
            if (channel) {
                channel.stopListening('role.updated');
            }
        };
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await api.get('/roles');
            setRoles(response.data.roles);
        } catch (error) {
            showToast.error('❌ Failed to fetch roles. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, formData);
                showToast.success(`🎉 Role "${formData.role_name}" updated successfully!`);
            } else {
                await api.post('/roles', formData);
                showToast.success(`🎉 Role "${formData.role_name}" created successfully!`);
            }

            closeModal();
            fetchRoles(); // Refresh the list
        } catch (error: any) {
            showToast.error(`❌ ${error.response?.data?.message || 'Something went wrong. Please try again.'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({ role_name: role.role_name });
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (roleId: number, roleName: string) => {
        showToast.confirmDelete(
            roleName,
            async () => {
                try {
                    await api.delete(`/roles/${roleId}`);
                    showToast.success('🗑️ Role deleted successfully!');
                    fetchRoles();
                } catch (error: any) {
                    showToast.error(`❌ ${error.response?.data?.message || 'Failed to delete role. Please try again.'}`);
                }
            },
            'role',
        );
    };

    const handleCreate = () => {
        setEditingRole(null);
        setFormData({ role_name: '' });
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingRole(null);
        setFormData({ role_name: '' });
    };

    if (loading) {
        return (
            <>
                <Head title="Super Admin - Role Management" />
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
                                        <p className="mt-2 text-sm text-gray-600">Loading data role...</p>
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
            <Head title="Super Admin - Role Management" />
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
                                            <IconShield className="h-8 w-8 text-primary" />
                                            Master Role Management
                                        </h1>
                                        <p className="font-sans text-base text-muted-foreground">Kelola dan atur master role global dalam sistem</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className="border-primary/30 bg-primary/10 font-sans text-sm font-medium text-primary"
                                        >
                                            <Activity className="mr-1 h-3 w-3" />
                                            {roles.length} Roles
                                        </Badge>
                                        <Button onClick={handleCreate} className="gap-2 font-sans font-medium">
                                            <IconPlus className="h-4 w-4" />
                                            Tambah Role
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
                                                        <TableHead className="font-sans">No</TableHead>
                                                        <TableHead className="font-sans">Nama Role</TableHead>
                                                        <TableHead className="font-sans">Dibuat</TableHead>
                                                        <TableHead className="font-sans">Diperbarui</TableHead>
                                                        <TableHead className="text-right font-sans">Aksi</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {roles.length > 0 ? (
                                                        roles.map((role, index) => (
                                                            <TableRow key={role.id}>
                                                                <TableCell className="font-mono">{index + 1}</TableCell>
                                                                <TableCell className="font-sans font-medium">{role.role_name}</TableCell>
                                                                <TableCell className="font-sans">
                                                                    {new Date(role.created_at).toLocaleDateString('id-ID')}
                                                                </TableCell>
                                                                <TableCell className="font-sans">
                                                                    {new Date(role.updated_at).toLocaleDateString('id-ID')}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleEdit(role)}
                                                                            className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
                                                                        >
                                                                            <IconEdit className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleDelete(role.id, role.role_name)}
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
                                                                Belum ada role yang tersedia
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Create/Edit Modal */}
                                {isCreateModalOpen && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                                        <Card className="mx-4 w-full max-w-md">
                                            <CardHeader>
                                                <CardTitle className="font-serif">
                                                    {editingRole ? 'Edit Master Role' : 'Tambah Master Role Baru'}
                                                </CardTitle>
                                                <CardDescription className="font-sans">
                                                    {editingRole ? 'Perbarui informasi master role global' : 'Tambahkan master role baru ke sistem'}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <form onSubmit={handleSubmit} className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="role_name" className="font-sans">
                                                            Nama Role
                                                        </Label>
                                                        <Input
                                                            id="role_name"
                                                            value={formData.role_name}
                                                            onChange={(e) => setFormData({ role_name: e.target.value })}
                                                            placeholder="Masukkan nama role"
                                                            className="font-sans"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2 pt-4">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={closeModal}
                                                            disabled={submitting}
                                                            className="font-sans"
                                                        >
                                                            Batal
                                                        </Button>
                                                        <Button type="submit" disabled={submitting} className="bg-red-600 font-sans hover:bg-red-700">
                                                            {submitting ? 'Menyimpan...' : editingRole ? 'Perbarui' : 'Simpan'}
                                                        </Button>
                                                    </div>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
