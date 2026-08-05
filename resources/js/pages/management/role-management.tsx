import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { IconEdit, IconPlus, IconShield, IconTrash } from '@tabler/icons-react';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

// Extend window type for Echo
declare global {
    interface Window {
        Echo?: any;
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Role Management',
        href: '/role-management',
    },
];

interface Role {
    id: number;
    role_name: string;
    created_at: string;
    updated_at: string;
}

interface RoleManagementProps {
    roles: Role[];
}

export default function RoleManagement({ roles: initialRoles = [] }: RoleManagementProps) {
    const [roles, setRoles] = useState<Role[]>(initialRoles);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    // Setup realtime updates
    useEffect(() => {
        const channel = window.Echo?.channel('role-management');

        if (channel) {
            channel.listen('role.updated', (e: any) => {
                const { action, role } = e;

                setRoles((prevRoles) => {
                    switch (action) {
                        case 'created':
                            return [...prevRoles, role];
                        case 'updated':
                            return prevRoles.map((r) => (r.id === role.id ? role : r));
                        case 'deleted':
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

    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        processing,
        errors,
        reset,
    } = useForm({
        role_name: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingRole) {
            put(route('role-management.update', editingRole.id), {
                onSuccess: () => {
                    setEditingRole(null);
                    reset();
                },
            });
        } else {
            post(route('role-management.store'), {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setData('role_name', role.role_name);
        setIsCreateModalOpen(true);
    };

    const handleDelete = (roleId: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus role ini?')) {
            destroy(route('role-management.destroy', roleId));
        }
    };

    const handleCreate = () => {
        setEditingRole(null);
        reset();
        setIsCreateModalOpen(true);
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingRole(null);
        reset();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Role Management" />
            <div className="flex min-h-screen flex-1 flex-col bg-white">
                <div className="@container/main flex flex-1 flex-col">
                    {/* Header Section */}
                    <div className="px-4 py-6 lg:px-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-gray-900">
                                    <IconShield className="h-6 w-6 text-primary" />
                                    Role Management
                                </h1>
                                <p className="font-sans text-gray-600">Kelola dan atur role pengguna dalam sistem</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="gap-1 border-green-300 bg-green-50 font-sans text-green-700">
                                    <Activity className="h-3 w-3" />
                                    {roles.length} Roles
                                </Badge>
                                <Button onClick={handleCreate} className="gap-2 font-sans">
                                    <IconPlus className="h-4 w-4" />
                                    Tambah Role
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 px-4 pb-6 lg:px-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-serif">Daftar Role</CardTitle>
                                <CardDescription className="font-sans">Kelola role pengguna yang tersedia dalam sistem</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-sans">ID</TableHead>
                                            <TableHead className="font-sans">Nama Role</TableHead>
                                            <TableHead className="font-sans">Dibuat</TableHead>
                                            <TableHead className="font-sans">Diperbarui</TableHead>
                                            <TableHead className="text-right font-sans">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {roles.length > 0 ? (
                                            roles.map((role) => (
                                                <TableRow key={role.id}>
                                                    <TableCell className="font-mono">{role.id}</TableCell>
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
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <IconEdit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDelete(role.id)}
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
                </div>

                {/* Create/Edit Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <Card className="mx-4 w-full max-w-md">
                            <CardHeader>
                                <CardTitle className="font-serif">{editingRole ? 'Edit Role' : 'Tambah Role Baru'}</CardTitle>
                                <CardDescription className="font-sans">
                                    {editingRole ? 'Perbarui informasi role' : 'Tambahkan role baru ke sistem'}
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
                                            value={data.role_name}
                                            onChange={(e) => setData('role_name', e.target.value)}
                                            placeholder="Masukkan nama role"
                                            className="font-sans"
                                            required
                                        />
                                        {errors.role_name && <p className="font-sans text-sm text-red-600">{errors.role_name}</p>}
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" onClick={closeModal} disabled={processing} className="font-sans">
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={processing} className="font-sans">
                                            {processing ? 'Menyimpan...' : editingRole ? 'Perbarui' : 'Simpan'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
