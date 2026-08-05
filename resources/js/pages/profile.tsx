import { type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';

import { AppSidebar } from '@/components/app-sidebar';
import { NotificationListener } from '@/components/NotificationListener';
import SignatureManager from '@/components/signature-manager';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import { UserRound } from 'lucide-react';
import { useState } from 'react';

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [showPinFields, setShowPinFields] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Get user auth data (first user_auth entry)
    const userAuth = (auth.user as any)?.user_auths?.[0] || (auth.user as any)?.userAuths?.[0];
    const jabatan = userAuth?.jabatan;
    const company = userAuth?.company;
    const aplikasi = userAuth?.aplikasi;

    // Get alamat from profile
    const alamat = (auth.user as any)?.profile?.address || '';

    // Handle form submission
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        setProcessing(true);
        setErrors({});

        router.patch(route('profile.update'), formData, {
            preserveScroll: true,
            onSuccess: () => {
                showToast.success('✓ Perubahan berhasil disimpan!');
                setShowPasswordFields(false);
                setShowPinFields(false);
                setProcessing(false);
            },
            onError: (formErrors: any) => {
                console.error('Form errors:', formErrors);
                setErrors(formErrors);
                showToast.error('❌ Terjadi kesalahan. Periksa form Anda.');
                setProcessing(false);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <>
            <Head title="Profile" />
            <SidebarProvider>
                <NotificationListener />
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-6 p-6">
                            {/* Profile Form with User Icon */}
                            <form onSubmit={handleSubmit}>
                                <Card>
                                    <CardContent className="p-6">
                                        {/* User Icon - Centered at top */}
                                        <div className="mb-8 flex justify-center">
                                            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg">
                                                <UserRound className="h-20 w-20" />
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h2 className="text-xl font-semibold">Personal Information</h2>
                                            <p className="text-sm text-muted-foreground">Update your personal details</p>
                                        </div>

                                        <div className="grid gap-6 md:grid-cols-2">
                                            {/* Left Column */}
                                            <div className="space-y-4">
                                                {/* Nama */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="name">Nama Lengkap</Label>
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                        defaultValue={auth.user.name}
                                                        required
                                                        autoComplete="name"
                                                        placeholder="Masukkan nama lengkap"
                                                    />
                                                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                                </div>

                                                {/* Email */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email</Label>
                                                    <Input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        defaultValue={auth.user.email}
                                                        required
                                                        autoComplete="email"
                                                        placeholder="email@example.com"
                                                    />
                                                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                                                </div>

                                                {/* Password Section */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label>Password</Label>
                                                        <Button
                                                            type="button"
                                                            variant="link"
                                                            size="sm"
                                                            onClick={() => setShowPasswordFields(!showPasswordFields)}
                                                            className="h-auto p-0 text-sm"
                                                        >
                                                            {showPasswordFields ? 'Batal Ubah' : 'Ubah Password'}
                                                        </Button>
                                                    </div>
                                                    {!showPasswordFields && <Input type="password" value="••••••••••••" disabled />}
                                                    {showPasswordFields && (
                                                        <div className="space-y-3">
                                                            <Input
                                                                type="password"
                                                                name="current_password"
                                                                placeholder="Password saat ini"
                                                                autoComplete="current-password"
                                                            />
                                                            <Input
                                                                type="password"
                                                                name="password"
                                                                placeholder="Password baru"
                                                                autoComplete="new-password"
                                                            />
                                                            <Input
                                                                type="password"
                                                                name="password_confirmation"
                                                                placeholder="Konfirmasi password baru"
                                                                autoComplete="new-password"
                                                            />
                                                        </div>
                                                    )}
                                                    {errors.current_password && <p className="text-sm text-red-500">{errors.current_password}</p>}
                                                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                                                </div>

                                                {/* Alamat */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="alamat">Alamat</Label>
                                                    <Textarea
                                                        id="alamat"
                                                        name="alamat"
                                                        defaultValue={alamat || ''}
                                                        placeholder="Masukkan alamat lengkap"
                                                        rows={3}
                                                    />
                                                    {errors.alamat && <p className="text-sm text-red-500">{errors.alamat}</p>}
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-4">
                                                {/* PIN Section */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label>PIN Tanda Tangan</Label>
                                                        <Button
                                                            type="button"
                                                            variant="link"
                                                            size="sm"
                                                            onClick={() => setShowPinFields(!showPinFields)}
                                                            className="h-auto p-0 text-sm"
                                                        >
                                                            {showPinFields ? 'Batal Ubah' : 'Ubah PIN'}
                                                        </Button>
                                                    </div>
                                                    {!showPinFields && <Input type="password" value="••••••" disabled />}
                                                    {showPinFields && (
                                                        <div className="space-y-3">
                                                            <Input type="password" name="current_pin" placeholder="PIN saat ini" maxLength={6} />
                                                            <Input type="password" name="pin" placeholder="PIN baru (6 digit)" maxLength={6} />
                                                            <Input
                                                                type="password"
                                                                name="pin_confirmation"
                                                                placeholder="Konfirmasi PIN baru"
                                                                maxLength={6}
                                                            />
                                                        </div>
                                                    )}
                                                    {errors.pin && <p className="text-sm text-red-500">{errors.pin}</p>}
                                                </div>

                                                {/* Jabatan */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="jabatan">Jabatan</Label>
                                                    <Input id="jabatan" value={jabatan?.name || '-'} disabled className="bg-muted" />
                                                    <p className="text-xs text-muted-foreground">Jabatan dikelola oleh administrator</p>
                                                </div>

                                                {/* Company */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="company">Company</Label>
                                                    <Input id="company" value={company?.name || '-'} disabled className="bg-muted" />
                                                    <p className="text-xs text-muted-foreground">Company dikelola oleh administrator</p>
                                                </div>

                                                {/* Aplikasi */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="aplikasi">Aplikasi</Label>
                                                    <Input id="aplikasi" value={aplikasi?.name || '-'} disabled className="bg-muted" />
                                                    <p className="text-xs text-muted-foreground">Aplikasi dikelola oleh administrator</p>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator className="my-6" />

                                        {/* Save Button */}
                                        <div className="flex items-center gap-4">
                                            <Button type="submit" disabled={processing}>
                                                {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </form>

                            {/* Signature Management Section */}
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-6">
                                        <h2 className="text-xl font-semibold">Tanda Tangan Digital</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Kelola tanda tangan digital Anda untuk proses approval dokumen
                                        </p>
                                    </div>
                                    <SignatureManager />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
