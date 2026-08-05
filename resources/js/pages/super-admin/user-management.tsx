import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { IconPlus, IconUser } from '@tabler/icons-react';
import {
    Activity,
    Briefcase,
    Building2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Edit,
    Eye,
    EyeOff,
    Minus,
    Plus,
    Smartphone,
    Trash2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface UserProfile {
    id: number;
    address: string | null;
    phone_number: string | null;
}

interface UserAuth {
    id?: number;
    role_id: number;
    company_id: number;
    jabatan_id: number;
    aplikasi_id: number;
    role?: { id: number; role_name: string };
    company?: { id: number; name: string };
    jabatan?: { id: number; name: string };
    aplikasi?: { id: number; name: string };
}

interface Role {
    id: number;
    role_name: string;
}

interface Company {
    id: number;
    name: string;
}

interface Jabatan {
    id: number;
    name: string;
}

interface Aplikasi {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    pin: string;
    profile?: UserProfile;
    user_auths?: UserAuth[];
    created_at: string;
    updated_at: string;
}

interface PaginationMeta {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
}

interface FormData {
    name: string;
    email: string;
    password?: string;
    pin: string;
    address: string;
    phone_number: string;
    user_auths: {
        role_id: number | '';
        company_id: number | '';
        jabatan_id: number | '';
        aplikasi_id: number | '';
    }[];
}

const initialFormData: FormData = {
    name: '',
    email: '',
    password: '',
    pin: '',
    address: '',
    phone_number: '',
    user_auths: [
        {
            role_id: '',
            company_id: '',
            jabatan_id: '',
            aplikasi_id: '',
        },
    ],
};

// Removed breadcrumbs as we're using SidebarProvider layout

export default function UserManagement() {
    const { auth } = usePage().props as any;
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [jabatans, setJabatans] = useState<Jabatan[]>([]);
    const [aplikasis, setAplikasis] = useState<Aplikasi[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [filterRole, setFilterRole] = useState<string>('');
    const [filterJabatan, setFilterJabatan] = useState<string>('');
    const [pagination, setPagination] = useState<PaginationMeta>({
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    // Fetch users from API
    const fetchUsers = async () => {
        try {
            console.log('Fetching users...');
            setIsLoading(true);

            // Build query parameters
            const params = new URLSearchParams();
            if (filterRole) params.append('role_id', filterRole);
            if (filterJabatan) params.append('jabatan_id', filterJabatan);
            params.append('page', currentPage.toString());
            params.append('per_page', perPage.toString());

            const queryString = params.toString();
            const url = queryString ? `/users?${queryString}` : '/users';

            const response = await api.get(url);
            console.log('Users fetched:', response.data);
            setUsers(response.data.data);
            setPagination(response.data.meta);
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast.error('❌ Failed to load users. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch master data for dropdowns
    const fetchMasterData = async () => {
        try {
            console.log('Fetching master data...');
            const [rolesRes, companiesRes, jabatansRes, aplikasisRes] = await Promise.all([
                api.get('/roles'),
                api.get('/companies'),
                api.get('/jabatans'),
                api.get('/aplikasis'),
            ]);

            console.log('Master data fetched:', {
                roles: rolesRes.data?.roles?.length || 0,
                companies: companiesRes.data?.companies?.length || 0,
                jabatans: jabatansRes.data?.jabatans?.length || 0,
                aplikasis: aplikasisRes.data?.aplikasis?.length || 0,
            });

            setRoles(rolesRes.data?.roles || []);
            setCompanies(companiesRes.data?.companies || []);
            setJabatans(jabatansRes.data?.jabatans || []);
            setAplikasis(aplikasisRes.data?.aplikasis || []);
        } catch (error) {
            console.error('Error fetching master data:', error);
            showToast.error('❌ Failed to load master data. Please try again.');

            // Set empty arrays as fallback
            setRoles([]);
            setCompanies([]);
            setJabatans([]);
            setAplikasis([]);
        }
    };

    useEffect(() => {
        // Check if user is authenticated via session (not token)
        if (!auth.user) {
            console.log('No authenticated user found, redirecting to home');
            showToast.error('❌ Please login first to access User Management.');
            window.location.href = '/';
            return;
        }
        console.log('Authenticated user found, loading data');
        fetchMasterData();
    }, [auth.user]);

    // Refetch users when filters change
    useEffect(() => {
        if (auth.user) {
            fetchUsers();
        }
    }, [auth.user, filterRole, filterJabatan, currentPage, perPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterRole, filterJabatan, perPage]);

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: [],
            }));
        }
    };

    // Handle userauth field changes
    const handleUserAuthChange = (index: number, field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            user_auths: prev.user_auths.map((auth, i) => (i === index ? { ...auth, [field]: value === '' ? '' : Number(value) } : auth)),
        }));
    };

    // Add new userauth entry
    const addUserAuth = () => {
        setFormData((prev) => ({
            ...prev,
            user_auths: [
                ...prev.user_auths,
                {
                    role_id: '',
                    company_id: '',
                    jabatan_id: '',
                    aplikasi_id: '',
                },
            ],
        }));
    };

    // Remove userauth entry
    const removeUserAuth = (index: number) => {
        if (formData.user_auths.length > 1) {
            setFormData((prev) => ({
                ...prev,
                user_auths: prev.user_auths.filter((_, i) => i !== index),
            }));
        }
    };

    // Open dialog for creating new user
    const handleCreate = async () => {
        // Refresh CSRF token when opening dialog
        try {
            await fetch('/sanctum/csrf-cookie', {
                credentials: 'include',
            });
        } catch (error) {
            console.warn('Failed to refresh CSRF token:', error);
        }

        setEditingUser(null);
        setFormData(initialFormData);
        setErrors({});
        setIsDialogOpen(true);
    };

    // Open dialog for editing user
    const handleEdit = async (user: User) => {
        // Refresh CSRF token when opening dialog
        try {
            await fetch('/sanctum/csrf-cookie', {
                credentials: 'include',
            });
        } catch (error) {
            console.warn('Failed to refresh CSRF token:', error);
        }

        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '', // Don't pre-fill password for security
            pin: user.pin,
            address: user.profile?.address || '',
            phone_number: user.profile?.phone_number || '',
            user_auths:
                user.user_auths && user.user_auths.length > 0
                    ? user.user_auths.map((auth) => ({
                          role_id: auth.role_id,
                          company_id: auth.company_id,
                          jabatan_id: auth.jabatan_id,
                          aplikasi_id: auth.aplikasi_id,
                      }))
                    : [
                          {
                              role_id: '',
                              company_id: '',
                              jabatan_id: '',
                              aplikasi_id: '',
                          },
                      ],
        });
        setErrors({});
        setIsDialogOpen(true);
    };

    // Submit form (create or update)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        try {
            // Force refresh CSRF token before submitting
            console.log('Refreshing CSRF token before form submission...');
            await fetch('/sanctum/csrf-cookie', {
                credentials: 'include',
            });

            // Wait a bit to ensure cookie is set
            await new Promise((resolve) => setTimeout(resolve, 100));

            // For updates, only include password if it's provided
            const submitData = { ...formData };
            if (editingUser && !submitData.password) {
                delete submitData.password;
            }

            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, submitData);
                showToast.success(`🎉 User "${formData.name}" updated successfully!`);
            } else {
                await api.post('/users', submitData);
                showToast.success(`🎉 User "${formData.name}" created successfully!`);
            }

            setIsDialogOpen(false);
            fetchUsers();
        } catch (error: any) {
            console.error('Form submission error:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }

            // Special handling for CSRF errors
            if (error.response?.status === 419) {
                showToast.error('❌ Session expired. Please refresh the page and try again.');
            } else {
                showToast.error(`❌ Failed to save user. ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete user
    const handleDelete = async (user: User) => {
        if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) {
            return;
        }

        try {
            await api.delete(`/users/${user.id}`);
            showToast.success(`🎉 User "${user.name}" deleted successfully!`);
            fetchUsers();
        } catch (error: any) {
            showToast.error(`❌ Failed to delete user. ${error.response?.data?.message || error.message}`);
        }
    };

    return (
        <>
            <Head title="User Management" />
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
                                        <IconUser className="h-8 w-8 text-primary" />
                                        Master User Management
                                    </h1>
                                    <p className="font-sans text-base text-muted-foreground">Kelola dan atur master user dalam sistem</p>
                                </div>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className="border-primary/30 bg-primary/10 font-sans text-sm font-medium text-primary"
                                        >
                                            <Activity className="mr-1 h-3 w-3" />
                                            {pagination.total} Users
                                        </Badge>

                                        {/* Role Filter */}
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="filter-role" className="font-sans text-sm font-medium">
                                                Role:
                                            </Label>
                                            <Select
                                                value={filterRole || 'all'}
                                                onValueChange={(value) => setFilterRole(value === 'all' ? '' : value)}
                                            >
                                                <SelectTrigger id="filter-role" className="w-40 font-sans">
                                                    <SelectValue placeholder="Semua Role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Role</SelectItem>
                                                    {roles.map((role) => (
                                                        <SelectItem key={role.id} value={role.id.toString()}>
                                                            {role.role_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Jabatan Filter */}
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="filter-jabatan" className="font-sans text-sm font-medium">
                                                Jabatan:
                                            </Label>
                                            <Select
                                                value={filterJabatan || 'all'}
                                                onValueChange={(value) => setFilterJabatan(value === 'all' ? '' : value)}
                                            >
                                                <SelectTrigger id="filter-jabatan" className="w-40 font-sans">
                                                    <SelectValue placeholder="Semua Jabatan" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Jabatan</SelectItem>
                                                    {jabatans.map((jabatan) => (
                                                        <SelectItem key={jabatan.id} value={jabatan.id.toString()}>
                                                            {jabatan.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button onClick={handleCreate} className="gap-2 font-sans font-medium">
                                        <IconPlus className="h-4 w-4" />
                                        Tambah User
                                    </Button>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="space-y-6">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-center">
                                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                                            <p className="mt-2 text-sm text-gray-600">Loading data user...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-16 font-sans">No</TableHead>
                                                        <TableHead className="w-48 font-sans">Nama</TableHead>
                                                        <TableHead className="w-56 font-sans">Email</TableHead>
                                                        <TableHead className="w-32 font-sans">Telepon</TableHead>
                                                        <TableHead className="min-w-80 font-sans">Authorization</TableHead>
                                                        <TableHead className="w-24 text-right font-sans">Aksi</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {users.length > 0 ? (
                                                        users.map((user, index) => (
                                                            <TableRow key={user.id}>
                                                                <TableCell className="font-mono">{index + 1}</TableCell>
                                                                <TableCell className="font-sans font-medium">{user.name}</TableCell>
                                                                <TableCell className="font-sans">{user.email}</TableCell>
                                                                <TableCell className="font-sans">{user.profile?.phone_number || '-'}</TableCell>
                                                                <TableCell className="font-sans">
                                                                    <div className="space-y-4">
                                                                        {user.user_auths && user.user_auths.length > 0 ? (
                                                                            user.user_auths.map((auth, authIndex) => (
                                                                                <div key={authIndex} className="space-y-1.5">
                                                                                    {/* Badge Role - Highlight Utama */}
                                                                                    <div>
                                                                                        <span
                                                                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                                                                auth.role?.role_name === 'Super Admin'
                                                                                                    ? 'bg-red-100 text-red-800'
                                                                                                    : auth.role?.role_name === 'Admin'
                                                                                                      ? 'bg-blue-100 text-blue-800'
                                                                                                      : auth.role?.role_name === 'User'
                                                                                                        ? 'bg-green-100 text-green-800'
                                                                                                        : 'bg-gray-100 text-gray-800'
                                                                                            }`}
                                                                                        >
                                                                                            {auth.role?.role_name || 'No Role'}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Company Name - Konteks Organisasi */}
                                                                                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                                                        <Building2 className="h-3.5 w-3.5 text-gray-500" />
                                                                                        <span className="font-medium">
                                                                                            {auth.company?.name || 'No Company'}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Jabatan & Aplikasi - Detail Sekunder */}
                                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                        <div className="flex items-center gap-1">
                                                                                            <Briefcase className="h-3 w-3" />
                                                                                            <span>{auth.jabatan?.name || 'No Jabatan'}</span>
                                                                                        </div>
                                                                                        <span className="text-gray-400">•</span>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <Smartphone className="h-3 w-3" />
                                                                                            <span>{auth.aplikasi?.name || 'No Aplikasi'}</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Divider between multiple auths */}
                                                                                    {authIndex < user.user_auths!.length - 1 && (
                                                                                        <div className="mt-3 border-t border-gray-200 pt-3"></div>
                                                                                    )}
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="py-2 text-sm text-gray-500">Tidak ada authorization</div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleEdit(user)}
                                                                            className="h-8 w-8 border-blue-300 p-0 text-blue-600 hover:bg-blue-50"
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleDelete(user)}
                                                                            className="h-8 w-8 border-red-300 p-0 text-red-600 hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="py-8 text-center font-sans text-gray-500">
                                                                Belum ada user yang tersedia
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Pagination */}
                                {!isLoading && users.length > 0 && (
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        {/* Results Info */}
                                        <div className="text-sm text-muted-foreground">
                                            Menampilkan <span className="font-medium text-foreground">{pagination.from}</span> hingga{' '}
                                            <span className="font-medium text-foreground">{pagination.to}</span> dari{' '}
                                            <span className="font-medium text-foreground">{pagination.total}</span> user
                                        </div>

                                        <div className="flex items-center gap-6">
                                            {/* Per Page Selector */}
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="per-page" className="text-sm font-medium">
                                                    Per halaman:
                                                </Label>
                                                <Select value={perPage.toString()} onValueChange={(value) => setPerPage(Number(value))}>
                                                    <SelectTrigger id="per-page" className="w-20 font-sans">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="5">5</SelectItem>
                                                        <SelectItem value="10">10</SelectItem>
                                                        <SelectItem value="20">20</SelectItem>
                                                        <SelectItem value="50">50</SelectItem>
                                                        <SelectItem value="100">100</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Pagination Buttons */}
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(1)}
                                                    disabled={currentPage === 1}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ChevronsLeft className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>

                                                {/* Page Numbers */}
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                                                        let pageNum;
                                                        if (pagination.last_page <= 5) {
                                                            pageNum = i + 1;
                                                        } else if (currentPage <= 3) {
                                                            pageNum = i + 1;
                                                        } else if (currentPage >= pagination.last_page - 2) {
                                                            pageNum = pagination.last_page - 4 + i;
                                                        } else {
                                                            pageNum = currentPage - 2 + i;
                                                        }

                                                        return (
                                                            <Button
                                                                key={pageNum}
                                                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                                                size="sm"
                                                                onClick={() => setCurrentPage(pageNum)}
                                                                className={`h-8 w-8 p-0 ${
                                                                    currentPage === pageNum
                                                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                                        : ''
                                                                }`}
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((prev) => Math.min(pagination.last_page, prev + 1))}
                                                    disabled={currentPage === pagination.last_page}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(pagination.last_page)}
                                                    disabled={currentPage === pagination.last_page}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ChevronsRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </SidebarInset>

                {/* Create/Edit Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle className="font-serif">{editingUser ? 'Edit Master User' : 'Tambah Master User Baru'}</DialogTitle>
                                <DialogDescription className="font-sans">
                                    {editingUser ? 'Perbarui informasi master user' : 'Tambahkan master user baru ke sistem'}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-2 gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="font-sans">
                                        Nama
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={errors.name ? 'border-red-500 font-sans' : 'font-sans'}
                                        placeholder="Masukkan nama lengkap"
                                    />
                                    {errors.name && <p className="text-sm text-red-500">{errors.name[0]}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="font-sans">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={errors.email ? 'border-red-500 font-sans' : 'font-sans'}
                                        placeholder="masukkan@email.com"
                                    />
                                    {errors.email && <p className="text-sm text-red-500">{errors.email[0]}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="font-sans">
                                        Password {editingUser && '(kosongkan jika tidak ingin ubah)'}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className={errors.password ? 'border-red-500 pr-10 font-sans' : 'pr-10 font-sans'}
                                            placeholder="Masukkan password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    {errors.password && <p className="text-sm text-red-500">{errors.password[0]}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pin" className="font-sans">
                                        PIN (8 digit)
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="pin"
                                            name="pin"
                                            type={showPin ? 'text' : 'password'}
                                            value={formData.pin}
                                            onChange={handleInputChange}
                                            maxLength={8}
                                            className={errors.pin ? 'border-red-500 pr-10 font-sans' : 'pr-10 font-sans'}
                                            placeholder="12345678 (tidak harus unik)"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPin(!showPin)}
                                        >
                                            {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    {errors.pin && <p className="text-sm text-red-500">{errors.pin[0]}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone_number" className="font-sans">
                                        Nomor Telepon
                                    </Label>
                                    <Input
                                        id="phone_number"
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleInputChange}
                                        className={errors.phone_number ? 'border-red-500 font-sans' : 'font-sans'}
                                        placeholder="08123456789"
                                    />
                                    {errors.phone_number && <p className="text-sm text-red-500">{errors.phone_number[0]}</p>}
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="address" className="font-sans">
                                        Alamat
                                    </Label>
                                    <Textarea
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className={errors.address ? 'border-red-500 font-sans' : 'font-sans'}
                                        rows={3}
                                        placeholder="Masukkan alamat lengkap"
                                    />
                                    {errors.address && <p className="text-sm text-red-500">{errors.address[0]}</p>}
                                </div>

                                {/* User Auth Section */}
                                <div className="col-span-2 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-sans font-medium">User Authorization</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addUserAuth}
                                            className="gap-1 text-green-600 hover:bg-green-50"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Tambah Auth
                                        </Button>
                                    </div>

                                    {formData.user_auths.map((auth, index) => (
                                        <div key={index} className="space-y-3 rounded-lg border p-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-medium">Authorization #{index + 1}</h4>
                                                {formData.user_auths.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => removeUserAuth(index)}
                                                        className="gap-1 text-red-600 hover:bg-red-50"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                        Hapus
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="font-sans text-sm">Role</Label>
                                                    <Select
                                                        value={auth.role_id === '' ? '' : auth.role_id.toString()}
                                                        onValueChange={(value) => handleUserAuthChange(index, 'role_id', value)}
                                                    >
                                                        <SelectTrigger className="font-sans">
                                                            <SelectValue placeholder="Pilih Role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {roles &&
                                                                roles.length > 0 &&
                                                                roles.map((role) => (
                                                                    <SelectItem key={role.id} value={role.id.toString()}>
                                                                        {role.role_name}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="font-sans text-sm">Company</Label>
                                                    <Select
                                                        value={auth.company_id === '' ? '' : auth.company_id.toString()}
                                                        onValueChange={(value) => handleUserAuthChange(index, 'company_id', value)}
                                                    >
                                                        <SelectTrigger className="font-sans">
                                                            <SelectValue placeholder="Pilih Company" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {companies &&
                                                                companies.length > 0 &&
                                                                companies.map((company) => (
                                                                    <SelectItem key={company.id} value={company.id.toString()}>
                                                                        {company.name}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="font-sans text-sm">Jabatan</Label>
                                                    <Select
                                                        value={auth.jabatan_id === '' ? '' : auth.jabatan_id.toString()}
                                                        onValueChange={(value) => handleUserAuthChange(index, 'jabatan_id', value)}
                                                    >
                                                        <SelectTrigger className="font-sans">
                                                            <SelectValue placeholder="Pilih Jabatan" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {jabatans &&
                                                                jabatans.length > 0 &&
                                                                jabatans.map((jabatan) => (
                                                                    <SelectItem key={jabatan.id} value={jabatan.id.toString()}>
                                                                        {jabatan.name}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="font-sans text-sm">Aplikasi</Label>
                                                    <Select
                                                        value={auth.aplikasi_id === '' ? '' : auth.aplikasi_id.toString()}
                                                        onValueChange={(value) => handleUserAuthChange(index, 'aplikasi_id', value)}
                                                    >
                                                        <SelectTrigger className="font-sans">
                                                            <SelectValue placeholder="Pilih Aplikasi" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {aplikasis &&
                                                                aplikasis.length > 0 &&
                                                                aplikasis.map((aplikasi) => (
                                                                    <SelectItem key={aplikasi.id} value={aplikasi.id.toString()}>
                                                                        {aplikasi.name}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                    disabled={isSubmitting}
                                    className="font-sans"
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-red-600 font-sans hover:bg-red-700">
                                    {isSubmitting ? 'Menyimpan...' : editingUser ? 'Perbarui' : 'Simpan'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </SidebarProvider>
        </>
    );
}
