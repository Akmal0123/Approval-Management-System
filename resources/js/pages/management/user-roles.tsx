import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { IconEdit, IconPlus, IconShield, IconTrash, IconUsers } from '@tabler/icons-react';
import { Activity, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

// Extend window type for Echo
declare global {
    interface Window {
        Echo?: any;
    }
}

interface UserRole {
    id: number;
    role_name: string;
    users_count?: number;
    created_at: string;
    updated_at: string;
    formatted_role_name?: string;
}

interface ApiResponse {
    success: boolean;
    data: {
        data: UserRole[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    message: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'User Roles Management',
        href: '/user-roles',
    },
];

export default function UserRolesManagement() {
    const { user } = useAuth();
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<UserRole | null>(null);
    const [newRoleName, setNewRoleName] = useState('');
    const [editRoleName, setEditRoleName] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });

    // Fetch roles data
    const fetchRoles = async (page = 1, search = '') => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: pagination.per_page.toString(),
                ...(search && { search }),
            });

            const response = await fetch(`/api/user-roles?${params}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
                    Accept: 'application/json',
                },
            });

            if (response.ok) {
                const data: ApiResponse = await response.json();
                setRoles(data.data.data);
                setPagination({
                    current_page: data.data.current_page,
                    last_page: data.data.last_page,
                    per_page: data.data.per_page,
                    total: data.data.total,
                });
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    // Create new role
    const createRole = async () => {
        try {
            const response = await fetch('/api/user-roles', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ role_name: newRoleName }),
            });

            if (response.ok) {
                setNewRoleName('');
                setIsCreateModalOpen(false);
                fetchRoles();

                // Broadcast role created event
                if (window.Echo) {
                    window.Echo.channel('roles').whisper('role.created', {
                        role_name: newRoleName,
                        user: user?.name,
                    });
                }
            }
        } catch (error) {
            console.error('Error creating role:', error);
        }
    };

    // Update role
    const updateRole = async () => {
        if (!editingRole) return;

        try {
            const response = await fetch(`/api/user-roles/${editingRole.id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ role_name: editRoleName }),
            });

            if (response.ok) {
                setEditRoleName('');
                setEditingRole(null);
                setIsEditModalOpen(false);
                fetchRoles();

                // Broadcast role updated event
                if (window.Echo) {
                    window.Echo.channel('roles').whisper('role.updated', {
                        role_name: editRoleName,
                        old_name: editingRole.role_name,
                        user: user?.name,
                    });
                }
            }
        } catch (error) {
            console.error('Error updating role:', error);
        }
    };

    // Delete role
    const deleteRole = async (role: UserRole) => {
        try {
            const response = await fetch(`/api/user-roles/${role.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
                    Accept: 'application/json',
                },
            });

            if (response.ok) {
                fetchRoles();

                // Broadcast role deleted event
                if (window.Echo) {
                    window.Echo.channel('roles').whisper('role.deleted', {
                        role_name: role.role_name,
                        user: user?.name,
                    });
                }
            }
        } catch (error) {
            console.error('Error deleting role:', error);
        }
    };

    // Initialize data and realtime listening
    useEffect(() => {
        fetchRoles();

        // Setup realtime listening
        if (window.Echo) {
            const channel = window.Echo.channel('roles');

            channel.listenForWhisper('role.created', () => {
                fetchRoles();
            });

            channel.listenForWhisper('role.updated', () => {
                fetchRoles();
            });

            channel.listenForWhisper('role.deleted', () => {
                fetchRoles();
            });

            return () => {
                window.Echo.leaveChannel('roles');
            };
        }
    }, []);

    // Handle search
    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            fetchRoles(1, searchQuery);
        }, 500);

        return () => clearTimeout(delayedSearch);
    }, [searchQuery]);

    const openEditModal = (role: UserRole) => {
        setEditingRole(role);
        setEditRoleName(role.role_name);
        setIsEditModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Roles Management" />
            <div className="flex min-h-screen flex-1 flex-col bg-white">
                <div className="@container/main flex flex-1 flex-col">
                    {/* Header Section */}
                    <div className="px-4 py-6 lg:px-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-gray-900">
                                    <IconShield className="h-6 w-6 text-primary" />
                                    User Roles Management
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Kelola user roles dengan fitur realtime menggunakan Laravel Sanctum API
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Activity className="h-3 w-3" />
                                    <span>Realtime Updates Active</span>
                                    <Badge variant="outline" className="text-xs">
                                        Total: {pagination.total} roles
                                    </Badge>
                                </div>
                            </div>

                            <Button onClick={() => setIsCreateModalOpen(true)}>
                                <IconPlus className="mr-2 h-4 w-4" />
                                Add New Role
                            </Button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mt-4 max-w-md">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search roles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Roles Table */}
                    <div className="flex-1 px-4 pb-8 lg:px-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>User Roles</CardTitle>
                                <CardDescription>Daftar role pengguna dalam sistem</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="text-sm text-muted-foreground">Loading roles...</div>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Role Name</TableHead>
                                                <TableHead>Users Count</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead>Updated</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {roles.map((role) => (
                                                <TableRow key={role.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <IconShield className="h-4 w-4 text-muted-foreground" />
                                                            {role.formatted_role_name || role.role_name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <IconUsers className="h-4 w-4 text-muted-foreground" />
                                                            <span>{role.users_count || 0}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{formatDate(role.created_at)}</TableCell>
                                                    <TableCell className="text-muted-foreground">{formatDate(role.updated_at)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button variant="outline" size="sm" onClick={() => openEditModal(role)}>
                                                                <IconEdit className="h-4 w-4" />
                                                            </Button>

                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="outline" size="sm">
                                                                        <IconTrash className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to delete the role "{role.role_name}"? This action
                                                                            cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => deleteRole(role)}
                                                                            className="bg-destructive hover:bg-destructive/90"
                                                                        >
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
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

            {/* Create Role Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                        <DialogDescription>Add a new user role to the system.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="role_name">Role Name</Label>
                            <Input
                                id="role_name"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="Enter role name..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={createRole} disabled={!newRoleName.trim()}>
                            Create Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Role Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Role</DialogTitle>
                        <DialogDescription>Update the role information.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit_role_name">Role Name</Label>
                            <Input
                                id="edit_role_name"
                                value={editRoleName}
                                onChange={(e) => setEditRoleName(e.target.value)}
                                placeholder="Enter role name..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={updateRole} disabled={!editRoleName.trim()}>
                            Update Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
