import { SanctumRegisterForm } from '@/components/sanctum-register-form';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthLayout from '@/layouts/auth-layout';
import { Head } from '@inertiajs/react';

export default function Register() {
    return (
        <AuthProvider>
            <AuthLayout title="Create an account" description="Enter your details below to create your account">
                <Head title="Register" />
                <SanctumRegisterForm />
            </AuthLayout>
        </AuthProvider>
    );
}
