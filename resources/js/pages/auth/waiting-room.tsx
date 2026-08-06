import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function WaitingRoom() {
    const { auth } = usePage<{ auth: { user?: { name: string; email: string } } }>().props;
    const { post, processing } = useForm();

    const handleLogout: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('logout'));
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <AuthLayout
            title="Menunggu Persetujuan Admin"
            description="Akun Anda telah berhasil terdaftar dan sedang dalam proses peninjauan."
        >
            <Head title="Menunggu Persetujuan" />

            <div className="flex flex-col items-center justify-center space-y-6 text-center py-4">
                <div className="relative">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
                        <Clock className="w-10 h-10" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-background p-1 rounded-full border border-border">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                    </div>
                </div>

                <div className="space-y-2 max-w-sm">
                    <h3 className="font-semibold text-lg">
                        Halo, {auth?.user?.name || 'Pengguna Baru'}! 👋
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Akun Anda dengan email <span className="font-medium text-foreground">{auth?.user?.email}</span> saat ini belum memiliki akses role. 
                        Super Admin perlu memberikan persetujuan dan role sebelum Anda dapat mengakses dashboard.
                    </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border border-border/50 text-xs text-muted-foreground max-w-sm w-full space-y-1 text-left">
                    <p className="font-medium text-foreground">💡 Apa yang harus dilakukan?</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Hubungi Administrator/HR perusahaan Anda.</li>
                        <li>Coba tekan tombol <strong>Cek Status</strong> jika peran Anda sudah diberikan.</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        onClick={handleRefresh}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Cek Status
                    </Button>

                    <form onSubmit={handleLogout} className="w-full">
                        <Button
                            type="submit"
                            variant="destructive"
                            className="w-full flex items-center gap-2"
                            disabled={processing}
                        >
                            <LogOut className="w-4 h-4" />
                            Keluar (Logout)
                        </Button>
                    </form>
                </div>
            </div>
        </AuthLayout>
    );
}
