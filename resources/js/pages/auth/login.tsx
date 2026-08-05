import { InertiaLoginForm } from '@/components/inertia-login-form';
import { Head } from '@inertiajs/react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    return (
        <div className="flex min-h-svh">
            {/* Left Side - Colorful Background with Branding */}
            <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent lg:flex lg:flex-1">
                <img src="/images/login-img.png" alt="" />
            </div>

            {/* Right Side - Login Form */}
            <div className="flex flex-1 flex-col justify-center bg-background p-6 lg:p-12">
                <div className="mx-auto w-full max-w-sm">
                    <Head title="Log in" />

                    <InertiaLoginForm canResetPassword={canResetPassword} />

                    {status && (
                        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/10 p-4">
                            <div className="text-center font-sans text-sm font-medium text-primary">{status}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
