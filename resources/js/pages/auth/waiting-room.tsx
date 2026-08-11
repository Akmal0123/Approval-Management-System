import { Head, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Clock, LogOut } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function WaitingRoom() {
    const { auth } = usePage<{ auth: { user?: { name: string; email: string } } }>().props;
    const { post, processing } = useForm();

    const handleLogout: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('logout'));
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
            style={{ backgroundImage: "url('/images/waiting-room.png')" }}
        >
            <Head title="Menunggu Persetujuan" />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 z-0"></div>

            {/* Content Container - Glassmorphism */}
            <div className="relative z-10 w-full max-w-lg bg-background/80 dark:bg-background/90 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-8 flex flex-col items-center text-center">

                {/* Icon Animation */}
                <div className="mb-6 relative mt-2">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                    <div className="relative bg-background text-primary p-4 rounded-full border shadow-sm">
                        <Clock className="w-12 h-12 animate-pulse" />
                    </div>
                </div>

                {/* Text Content */}
                <h1 className="text-3xl font-bold tracking-tight mb-4">
                    Menunggu Persetujuan
                </h1>

                <div className="space-y-4 mb-8">
                    <p className="text-lg font-medium text-foreground">
                        Halo, {auth?.user?.name || 'Pengguna Baru'}!
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                        Akun Anda dengan email <span className="font-semibold text-foreground">{auth?.user?.email}</span> sedang dalam tahap peninjauan.
                        Administrator perlu memberikan persetujuan dan hak akses sebelum Anda dapat melanjutkan.
                    </p>
                </div>

                {/* Info Card */}
                <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8 text-sm text-left flex gap-4 shadow-inner">
                    <span className="text-2xl mt-1">💡</span>
                    <div>
                        <p className="font-semibold text-foreground mb-1">Apa yang harus dilakukan?</p>
                        <p className="text-muted-foreground leading-relaxed">Silakan hubungi Administrator atau HRD perusahaan Anda untuk mengkonfirmasi pemberian akses role pada akun Anda.</p>
                    </div>
                </div>

                {/* Actions */}
                <form onSubmit={handleLogout} className="w-full">
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full text-base flex items-center justify-center gap-2 font-medium shadow-md transition-all hover:scale-[1.02] bg-white text-green-600 hover:bg-green-600 hover:text-white"
                        disabled={processing}
                    >
                        <LogOut className="w-5 h-5" />
                        Keluar
                    </Button>
                </form>

            </div>
        </div>
    );
}
