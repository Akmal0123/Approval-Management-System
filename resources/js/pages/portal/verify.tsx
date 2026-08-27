import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    FileCheck2,
    FileText,
    Layers,
    Printer,
    QrCode,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    Users,
    XCircle,
} from 'lucide-react';
import React from 'react';

interface ApprovalItem {
    id: number;
    step_name: string;
    approver_name: string;
    approver_jabatan: string;
    status: string;
    tgl_approve: string | null;
    comment?: string | null;
    signature_type: string;
    has_signature: boolean;
}

interface DocumentData {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    tipe_dokumen?: string;
    nominal?: number | null;
    company_name: string;
    aplikasi_name: string;
    transaksi_name?: string;
    departemen?: string;
    creator_name: string;
    creator_email: string;
    tgl_pengajuan: string;
    status: string;
    status_label: string;
    status_badge: 'verified' | 'processing' | 'rejected' | 'draft';
    verification_hash: string;
    verified_at: string;
    file_name?: string;
    approvals: ApprovalItem[];
}

interface Props {
    isValid: boolean;
    dokumen?: DocumentData | null;
    errorMessage?: string | null;
}

export default function DocumentVerificationPortal({ isValid, dokumen, errorMessage }: Props) {
    const handlePrint = () => {
        window.print();
    };

    const formatRupiah = (amount: number | null | undefined) => {
        if (!amount) return null;
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
            <Head title={dokumen ? `Verifikasi Dokumen - ${dokumen.nomor_dokumen}` : 'Portal Verifikasi Dokumen'} />

            <div className="mx-auto max-w-4xl space-y-6">
                {/* Brand Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold tracking-tight text-slate-900 text-lg sm:text-xl">
                                    TIGA SERANGKAI
                                </span>
                                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                                    Verification Portal
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500">
                                Sistem Informasi Validasi & Keabsahan Dokumen Digital
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50">
                            <Printer className="h-4 w-4" />
                            Cetak
                        </Button>
                    </div>
                </div>

                {!isValid || !dokumen ? (
                    /* Error State Card */
                    <Card className="border-red-200 bg-white shadow-sm overflow-hidden">
                        <div className="bg-red-500 h-2 w-full" />
                        <CardContent className="p-8 sm:p-12 text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                                <ShieldAlert className="h-10 w-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Dokumen Tidak Valid</h2>
                            <p className="max-w-md mx-auto text-sm text-slate-600">
                                {errorMessage || 'Dokumen dengan kode verifikasi ini tidak ditemukan di sistem atau data telah mengalami perubahan.'}
                            </p>
                            <div className="pt-4">
                                <a
                                    href="/"
                                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
                                >
                                    Kembali ke Beranda
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Valid Document Details */
                    <>
                        {/* Status Banner */}
                        <div
                            className={`rounded-2xl p-6 sm:p-8 shadow-sm border transition-all ${
                                dokumen.status_badge === 'verified'
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400'
                                    : dokumen.status_badge === 'rejected'
                                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-500'
                                      : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-400'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
                                        {dokumen.status_badge === 'verified' ? (
                                            <CheckCircle2 className="h-8 w-8 text-white" />
                                        ) : dokumen.status_badge === 'rejected' ? (
                                            <XCircle className="h-8 w-8 text-white" />
                                        ) : (
                                            <Clock className="h-8 w-8 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase font-bold tracking-widest text-white/80">
                                            Status Keabsahan
                                        </div>
                                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                                            {dokumen.status_label}
                                        </h1>
                                        <p className="text-xs sm:text-sm text-white/90 mt-1">
                                            {dokumen.status_badge === 'verified'
                                                ? 'Dokumen ini resmi dan telah melalui seluruh tahapan persetujuan pejabat berwenang.'
                                                : dokumen.status_badge === 'rejected'
                                                  ? 'Dokumen ini telah ditolak dalam proses peninjauan persetujuan.'
                                                  : 'Dokumen ini sedang dalam alur verifikasi dan persetujuan.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl bg-black/20 p-3 sm:text-right w-full sm:w-auto backdrop-blur-sm">
                                    <div className="text-[11px] text-white/70">Waktu Verifikasi Sistem</div>
                                    <div className="text-xs font-semibold text-white mt-0.5">{dokumen.verified_at}</div>
                                </div>
                            </div>
                        </div>

                        {/* Document Information Card */}
                        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-emerald-600" />
                                        <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                                            Informasi Dokumen
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-xs border-slate-300 text-slate-700 bg-white">
                                        {dokumen.nomor_dokumen}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Judul Dokumen</div>
                                            <div className="text-base font-bold text-slate-900 mt-1">{dokumen.judul_dokumen}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Aplikasi</div>
                                                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 mt-1">
                                                    <Building2 className="h-4 w-4 text-slate-400" />
                                                    {dokumen.aplikasi_name}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tipe Transaksi</div>
                                                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 mt-1">
                                                    <Layers className="h-4 w-4 text-slate-400" />
                                                    {dokumen.transaksi_name || '-'}
                                                </div>
                                            </div>
                                        </div>

                                        {dokumen.nominal && (
                                            <div>
                                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Nominal Transaksi</div>
                                                <div className="text-base font-extrabold text-emerald-700 mt-1">
                                                    {formatRupiah(dokumen.nominal)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                                        <div>
                                            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pengaju Dokumen</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                                    {dokumen.creator_name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{dokumen.creator_name}</div>
                                                    <div className="text-xs text-slate-500">{dokumen.creator_email}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Departemen</div>
                                                <div className="text-sm font-medium text-slate-800 mt-1">{dokumen.departemen || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tanggal Pengajuan</div>
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 mt-1">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    {dokumen.tgl_pengajuan}
                                                </div>
                                            </div>
                                        </div>

                                        {dokumen.verification_hash && (
                                            <div>
                                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Digital Hash Verifikasi</div>
                                                <div className="font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-200 text-slate-600 break-all mt-1">
                                                    {dokumen.verification_hash}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Approval Audit Trail */}
                        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="h-5 w-5 text-emerald-600" />
                                        <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                                            Kronologi Persetujuan & Tanda Tangan
                                        </CardTitle>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        Total {dokumen.approvals.length} Approver
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                    {dokumen.approvals.map((item, idx) => {
                                        const isApproved = item.status === 'approved' || item.status === 'skipped';
                                        const isRejected = item.status === 'rejected';

                                        return (
                                            <div key={item.id} className="relative group">
                                                {/* Status node */}
                                                <div
                                                    className={`absolute -left-[30px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white ${
                                                        isApproved
                                                            ? 'border-emerald-600 text-emerald-600'
                                                            : isRejected
                                                              ? 'border-red-600 text-red-600'
                                                              : 'border-amber-500 text-amber-500'
                                                    }`}
                                                >
                                                    {isApproved ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                    ) : isRejected ? (
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Clock className="h-3.5 w-3.5" />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition-colors hover:bg-slate-50/80">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                                                    Tahap {idx + 1}: {item.step_name}
                                                                </span>
                                                                {item.has_signature && (
                                                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                                                        {item.signature_type === 'qr_code' ? 'QR Code Valid' : 'TTD Digital'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm font-bold text-slate-900 mt-1">
                                                                {item.approver_name}
                                                            </div>
                                                            <div className="text-xs font-medium text-slate-600">
                                                                {item.approver_jabatan}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:items-end gap-1">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs w-fit ${
                                                                    isApproved
                                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                                        : isRejected
                                                                          ? 'border-red-300 bg-red-50 text-red-700'
                                                                          : 'border-amber-300 bg-amber-50 text-amber-700'
                                                                }`}
                                                            >
                                                                {isApproved ? 'Disetujui' : isRejected ? 'Ditolak' : 'Menunggu'}
                                                            </Badge>
                                                            {item.tgl_approve && (
                                                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {item.tgl_approve}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {item.comment && (
                                                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
                                                            <span className="font-semibold text-slate-900">Catatan: </span>
                                                            {item.comment}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Footer Info */}
                        <div className="text-center text-xs text-slate-400 py-4 space-y-1">
                            <p>© {new Date().getFullYear()} PT Tiga Serangkai Pustaka Mandiri. Hak Cipta Dilindungi.</p>
                            <p>Keaslian dokumen ini dijamin melalui sertifikasi digital terenkripsi pada Approval Management System.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
