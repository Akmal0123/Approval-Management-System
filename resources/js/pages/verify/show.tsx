import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AppLogoIcon from '@/components/app-logo-icon';
import { Head, Link } from '@inertiajs/react';
import {
    IconAlertCircle,
    IconCheck,
    IconClock,
    IconDownload,
    IconFileText,
    IconCalendar,
    IconX,
    IconUser,
} from '@tabler/icons-react';

interface VerifiedApproval {
    nomor_dokumen: string;
    judul_dokumen: string;
    approver_name: string;
    approver_jabatan: string;
    signed_at: string;
    signature_method: string;
    download_url: string;
}

interface Props {
    isValid: boolean;
    approval: VerifiedApproval | null;
}

export default function VerifyShow({ isValid, approval }: Props) {
    // Format date
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Format date with time
    const formatDateTime = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timeStr = date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        return `${dateStr}, ${timeStr} WIB`;
    };

    return (
        <>
            <Head title={isValid ? `Verifikasi Dokumen - ${approval?.judul_dokumen}` : 'Verifikasi Gagal'} />
            <div className="flex min-h-svh flex-col items-center justify-center bg-white p-6 md:p-10">
                <div className="w-full max-w-xl space-y-6">
                    {/* Header Logo */}
                    <div className="flex flex-col items-center gap-2">
                        <Link href={route('home')} className="flex flex-col items-center gap-2 font-medium">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                <AppLogoIcon className="size-6 fill-current" />
                            </div>
                            <span className="font-serif text-lg font-bold tracking-tight text-foreground">
                                Approval Management System
                            </span>
                        </Link>
                    </div>

                    {/* Verification Status Banner */}
                    {isValid && approval ? (
                        <Card className="border-emerald-600 bg-emerald-600 text-white">
                            <CardContent className="flex items-start gap-4 p-5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600">
                                    <IconCheck className="h-6 w-6" />
                                </div>

                                <div className="space-y-1">
                                    <h2 className="font-serif text-lg font-bold text-white">
                                        DOKUMEN TERVERIFIKASI
                                    </h2>

                                    <p className="font-sans text-xs leading-relaxed text-white/90 sm:text-sm">
                                        Dokumen ini tercatat telah sah ditandatangani secara digital oleh approver yang terdaftar di dalam sistem.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-red-600 bg-red-600 text-white">
                            <CardContent className="flex items-start gap-4 p-5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-red-600">
                                    <IconX className="h-6 w-6" />
                                </div>

                                <div className="space-y-1">
                                    <h2 className="font-serif text-lg font-bold text-white">
                                        DOKUMEN TIDAK DAPAT DIVERIFIKASI
                                    </h2>

                                    <p className="font-sans text-xs leading-relaxed text-white/90 sm:text-sm">
                                        Data tanda tangan atau token verifikasi tidak ditemukan di dalam sistem. Mohon periksa kembali keaslian dokumen Anda.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Verification Details Card */}
                    {isValid && approval && (
                        <Card className="shadow-md">
                            <CardHeader className="border-b">
                                <CardTitle className="font-serif text-xl">Detail Verifikasi Tanda Tangan</CardTitle>
                                <CardDescription className="font-sans">
                                    Informasi lengkap mengenai dokumen dan persetujuan digital.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                {/* Familiar Document Info Section */}
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            Nomor Dokumen
                                        </Label>
                                        <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground">
                                            <IconFileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>{approval.nomor_dokumen || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            Judul Dokumen
                                        </Label>
                                        <div className="font-serif text-sm font-semibold text-foreground">
                                            {approval.judul_dokumen || '-'}
                                        </div>
                                    </div>

                                    <Separator className="sm:col-span-2" />

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            Nama Approver
                                        </Label>
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                            <IconUser className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>{approval.approver_name || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            Jabatan
                                        </Label>
                                        <div className="text-sm text-foreground">
                                            {approval.approver_jabatan || '-'}
                                        </div>
                                    </div>

                                    <Separator className="sm:col-span-2" />

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            Waktu Tanda Tangan
                                        </Label>
                                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                                            <IconClock className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>{formatDateTime(approval.signed_at)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            Metode Tanda Tangan
                                        </Label>
                                        <div>
                                            <Badge variant="secondary" className="capitalize">
                                                {approval.signature_method === 'qr' ? 'QR Code' : 'Asli'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 pt-2">
                                    <Button asChild className="w-full bg-primary font-sans hover:bg-primary/90">
                                        <a href={approval.download_url} target="_blank" rel="noopener noreferrer">
                                            <IconDownload className="mr-2 h-4 w-4" />
                                            Lihat & Unduh Dokumen
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline" className="w-full font-sans">
                                        <Link href={route('dashboard')}>
                                            Masuk ke Dashboard
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!isValid && (
                        <div className="text-center">
                            <Button asChild variant="link" className="font-sans text-xs text-muted-foreground">
                                <Link href={route('login')}>
                                    Kembali ke Halaman Login
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
