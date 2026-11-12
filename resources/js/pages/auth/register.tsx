import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { SanctumRegisterForm } from '@/components/sanctum-register-form';
import VerifyAuthenticityDialog from '@/components/verify-authenticity-dialog';
import { AuthProvider } from '@/contexts/AuthContext';
import { IconShieldCheck, IconArrowRight } from '@tabler/icons-react';

export default function Register() {
    const [isVerifyOpen, setIsVerifyOpen] = useState(false);

    return (
        <AuthProvider>
            <div
                className="relative min-h-screen w-full overflow-hidden bg-cover bg-center bg-no-repeat text-[#143d22] antialiased selection:bg-[#228646] selection:text-white flex flex-col justify-center py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-12 font-sans"
                style={{ backgroundImage: "url('/images/background.png')" }}
            >
                <Head title="Daftar Akun - Approval Management System" />

                {/* Fullscreen Background Image Layer */}
                <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                    <img
                        src="/images/background.png"
                        alt=""
                        className="h-full w-full object-cover object-center select-none"
                    />
                </div>

                {/* Main Content Stage Container */}
                <div className="relative z-10 mx-auto w-full max-w-7xl">
                    <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-14">
                        {/* Left Column - Enterprise Hero Branding, 3D Artwork & Public Verification Action */}
                        <div className="flex flex-col justify-between lg:col-span-7 xl:col-span-7 min-h-[560px]">
                            {/* 1. Header Branding: Enterprise Pill Capsule */}
                            <div>
                                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white/95 shadow-[0_4px_16px_rgba(20,60,30,0.06),inset_0_1px_2px_rgba(255,255,255,0.95)] transition-transform duration-300 hover:scale-[1.02]">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg overflow-hidden shadow-xs">
                                        <img
                                            src="/images/ams-logo-vector.svg"
                                            alt="AMS Logo"
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                    <span className="text-sm font-black tracking-tight text-[#143d22]">
                                        AMS
                                    </span>
                                    <span className="text-slate-300 text-xs">|</span>
                                    <span className="text-xs font-semibold text-[#375a43]">
                                        Approval Management System
                                    </span>
                                </div>
                            </div>

                            {/* 2. Center Hero: Typography & 3D Illustration Graphic */}
                            <div className="relative my-4 lg:my-6 grid grid-cols-1 items-center gap-6 sm:grid-cols-12">
                                {/* Headline, Subtitle & Micro-Badges */}
                                <div className="z-10 sm:col-span-6 flex flex-col justify-center space-y-4">
                                    <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-[#143d22] leading-[1.05]">
                                        Approval <br />
                                        <span className="text-[#143d22]">made simple.</span>
                                    </h1>
                                    <p className="text-sm sm:text-base text-[#41624d] leading-relaxed max-w-sm">
                                        Kelola, setujui, dan verifikasi dokumen dengan aman dan terpercaya.
                                    </p>
                                </div>

                                {/* Centerpiece 3D Floating Spheres Graphic */}
                                <div className="sm:col-span-6 relative flex items-center justify-center">
                                    {/* Floating 3D Clay Sphere Top-Right */}
                                    <div className="pointer-events-none absolute -top-1 right-6 h-7 w-7 rounded-full bg-gradient-to-br from-[#a6f0c2] via-[#46c174] to-[#196b37] shadow-[0_8px_18px_rgba(20,60,30,0.22),inset_-2px_-3px_5px_rgba(0,0,0,0.2),inset_2px_2px_4px_rgba(255,255,255,0.7)] z-20" />

                                    {/* Floating 3D Clay Sphere Bottom-Left */}
                                    <div className="pointer-events-none absolute bottom-4 -left-2 h-5 w-5 rounded-full bg-gradient-to-br from-[#c5f8d8] via-[#5ec986] to-[#258548] shadow-[0_6px_14px_rgba(20,60,30,0.18),inset_-1px_-2px_4px_rgba(0,0,0,0.15),inset_1px_1px_3px_rgba(255,255,255,0.7)] z-20" />
                                </div>
                            </div>

                            {/* 3. Action Card Button: Verifikasi Dokumen with Liquid Fill Effect */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsVerifyOpen(true)}
                                    className="group relative cursor-pointer overflow-hidden rounded-[24px] border border-white/95 bg-white/95 px-4 sm:px-5 py-3 shadow-[0_14px_35px_rgba(20,60,30,0.08),inset_0_2px_4px_rgba(255,255,255,0.95)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_18px_40px_rgba(22,90,45,0.22)] active:scale-[0.98] w-full max-w-sm sm:max-w-[400px] flex items-center justify-between text-left"
                                >
                                    {/* Liquid Wave 1 */}
                                    <div
                                        className="pointer-events-none absolute inset-y-0 left-0 w-full -translate-x-full transition-transform duration-750 delay-75 ease-[cubic-bezier(0.3,1,0.4,1)] group-hover:translate-x-0"
                                        aria-hidden="true"
                                    >
                                        <div className="relative h-full w-full bg-[#1b733b]/35">
                                            <div className="absolute top-0 -right-8 h-full w-9 overflow-visible">
                                                <svg
                                                    className="h-full w-full text-[#1b733b]/35 fill-current"
                                                    viewBox="0 0 30 100"
                                                    preserveAspectRatio="none"
                                                >
                                                    <path d="M0,0 C24,15 10,40 28,65 C12,80 20,95 0,100 Z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Liquid Wave 2 */}
                                    <div
                                        className="pointer-events-none absolute inset-y-0 left-0 w-full -translate-x-full transition-transform duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0"
                                        aria-hidden="true"
                                    >
                                        <div className="relative h-full w-full bg-gradient-to-r from-[#14532d] via-[#1a7139] to-[#228646]">
                                            <div className="absolute top-0 -right-6 h-full w-7 overflow-visible">
                                                <svg
                                                    className="h-full w-full text-[#228646] fill-current"
                                                    viewBox="0 0 30 100"
                                                    preserveAspectRatio="none"
                                                >
                                                    <path d="M0,0 C18,20 30,35 15,55 C0,75 25,85 0,100 Z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Button Content */}
                                    <div className="relative z-10 flex items-center justify-between w-full gap-3">
                                        <div className="flex items-center gap-3">
                                            {/* Shield Icon Badge */}
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#1f7d40] shadow-xs transition-all duration-300 group-hover:bg-white/20 group-hover:text-white group-hover:rotate-6">
                                                <IconShieldCheck className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                                            </div>

                                            {/* Vertical Divider */}
                                            <div className="h-8 w-[1px] bg-slate-200/90 transition-colors duration-300 group-hover:bg-white/30" />

                                            {/* Text Content */}
                                            <div>
                                                <div className="text-xs sm:text-sm font-bold text-[#143d22] transition-colors duration-300 group-hover:text-white">
                                                    Verifikasi Dokumen
                                                </div>
                                                <div className="text-[10px] sm:text-xs text-[#52705e] transition-colors duration-300 group-hover:text-emerald-100">
                                                    Periksa keaslian dokumen tanpa perlu login.
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Arrow Circle Action */}
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#228646] text-white shadow-xs transition-all duration-300 group-hover:bg-white group-hover:text-[#1f7d40] group-hover:scale-105 group-hover:shadow-md">
                                            <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Right Column - Enterprise Soft Claymorphic Register Card */}
                        <div className="flex justify-center lg:col-span-5 xl:col-span-5 lg:justify-end">
                            <SanctumRegisterForm />
                        </div>
                    </div>
                </div>

                {/* Public Verify Authenticity Dialog Modal */}
                <VerifyAuthenticityDialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen} />
            </div>
        </AuthProvider>
    );
}
