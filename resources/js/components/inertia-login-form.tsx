import React, { useEffect, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InertiaLoginFormProps {
    canResetPassword: boolean;
    status?: string;
}

export function InertiaLoginForm({ canResetPassword, status }: InertiaLoginFormProps) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    // Get CSRF cookie when component mounts
    useEffect(() => {
        axios.get('/sanctum/csrf-cookie').catch((err) => {
            console.error('Failed to get CSRF cookie:', err);
        });
    }, []);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="w-full max-w-[410px] rounded-[32px] border border-white/80 bg-white/95 p-7 sm:p-8 shadow-[0_25px_60px_-15px_rgba(20,60,30,0.12),0_4px_16px_rgba(0,0,0,0.03),inset_0_2px_4px_rgba(255,255,255,0.95)] backdrop-blur-xl flex flex-col justify-between font-sans">
            <div>
                {/* Top Brand Logo Badge */}
                <div className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_10px_22px_rgba(34,134,70,0.28)] transition-transform duration-300 hover:scale-105 overflow-hidden">
                        <img
                            src="/images/ams-logo-vector.svg"
                            alt="AMS Logo"
                            className="h-full w-full object-contain"
                        />
                    </div>

                    <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#143d22]">
                        Selamat Datang!
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#5a7665]">
                        Silakan masuk ke akun Anda untuk melanjutkan
                    </p>
                </div>

                {/* Status Message (e.g. password reset link sent) */}
                {status && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-2.5 text-center text-xs font-medium text-emerald-800">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="mt-5 space-y-3.5">
                    {/* Email Field */}
                    <div className="space-y-1.5 text-left">
                        <label
                            htmlFor="email"
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#1f4b2c]"
                        >
                            <Mail className="h-3.5 w-3.5 text-[#1f4b2c]" />
                            <span>Email</span>
                        </label>
                        <div className="relative">
                            <input
                                id="email"
                                type="email"
                                placeholder="Masukkan email kamu"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                className={cn(
                                    'h-11 w-full rounded-2xl border border-[#dce8e0] bg-[#f9fbf9] px-3.5 text-sm text-[#143d22] placeholder:text-[#96aea0] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all outline-none focus:border-[#228646] focus:bg-white focus:ring-2 focus:ring-[#228646]/20',
                                    errors.email && 'border-red-400 bg-red-50/30 focus:border-red-500'
                                )}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-xs text-red-600">{errors.email}</p>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5 text-left">
                        <label
                            htmlFor="password"
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#1f4b2c]"
                        >
                            <Lock className="h-3.5 w-3.5 text-[#1f4b2c]" />
                            <span>Password</span>
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Masukkan password kamu"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                autoComplete="current-password"
                                className={cn(
                                    'h-11 w-full rounded-2xl border border-[#dce8e0] bg-[#f9fbf9] pl-3.5 pr-10 text-sm text-[#143d22] placeholder:text-[#96aea0] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all outline-none focus:border-[#228646] focus:bg-white focus:ring-2 focus:ring-[#228646]/20',
                                    errors.password && 'border-red-400 bg-red-50/30 focus:border-red-500'
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-1/2 -translate-y-1/2 right-3 text-[#799583] hover:text-[#143d22] transition-colors"
                                tabIndex={-1}
                                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-xs text-red-600">{errors.password}</p>
                        )}
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between pt-1">
                        <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                id="remember"
                                type="checkbox"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="h-4 w-4 rounded-md border-[#c2d7ca] text-[#228646] accent-[#228646] focus:ring-[#228646] cursor-pointer"
                            />
                            <span className="text-xs sm:text-sm text-[#476553]">
                                Ingat saya
                            </span>
                        </label>

                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-xs sm:text-sm font-medium text-[#228646] hover:text-[#176233] transition-colors"
                            >
                                Lupa password?
                            </Link>
                        )}
                    </div>

                    {/* Submit Button: Masuk -> */}
                    <button
                        type="submit"
                        disabled={processing}
                        className="group relative mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#228646] px-4 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(34,134,70,0.32),inset_0_1px_2px_rgba(255,255,255,0.35)] transition-all duration-200 hover:bg-[#1b733b] hover:shadow-[0_10px_26px_rgba(34,134,70,0.42)] active:translate-y-0.5 active:shadow-[0_4px_12px_rgba(34,134,70,0.25)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <>
                                <span>Masuk</span>
                                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                            </>
                        )}
                    </button>

                    {/* ATAU Divider */}
                    <div className="relative my-3 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#e2ece5]" />
                        </div>
                        <span className="relative bg-white px-3 text-[10px] font-semibold tracking-wider uppercase text-[#90a69a]">
                            ATAU
                        </span>
                    </div>

                    {/* Google OAuth Button */}
                    <button
                        type="button"
                        onClick={() => (window.location.href = route('auth.google'))}
                        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-2xl border border-[#d6e5dc] bg-[#f8faf8] px-4 text-xs sm:text-sm font-medium text-[#1c472a] shadow-xs transition-all duration-200 hover:bg-[#edf5f0] hover:border-[#c5dcd0] active:translate-y-0.5"
                    >
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span>Masuk dengan Google</span>
                    </button>
                </form>
            </div>

            {/* Copyright Footer */}
            <div className="mt-5 text-center text-xs text-[#8fa799]">
                © 2026 Approval Management System
            </div>
        </div>
    );
}
