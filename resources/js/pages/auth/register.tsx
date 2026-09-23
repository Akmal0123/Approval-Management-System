import { SanctumRegisterForm } from '@/components/sanctum-register-form';
import { AuthProvider } from '@/contexts/AuthContext';
import { Head } from '@inertiajs/react';

export default function Register() {
    return (
        <AuthProvider>
            <Head title="Register" />
            <div
                className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
                style={{ backgroundImage: "url('/images/waiting-room.png')" }}
            >
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 z-0" />

                {/* Glassmorphism Card */}
                <div className="relative z-10 w-full max-w-sm bg-background/80 dark:bg-background/90 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-6">
                    <SanctumRegisterForm />
                </div>
            </div>
        </AuthProvider>
    );
}
