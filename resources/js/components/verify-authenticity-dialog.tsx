import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    IconShieldCheck,
    IconShieldX,
    IconUpload,
    IconFileText,
    IconCheck,
    IconClock,
    IconUser,
    IconCopy,
    IconExternalLink,
    IconHistory,
    IconRefresh,
    IconArrowUpRight,
    IconSparkles,
} from '@tabler/icons-react';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { showToast } from '@/lib/toast';

interface ApproverInfo {
    id: number;
    name: string;
    email?: string;
    jabatan: string;
    step_name: string;
    step_order: number;
    status: string;
    signed_at: string | null;
    signature_method?: string;
    comment?: string | null;
}

interface HashHistoryItem {
    id: number;
    hash_type: string;
    type_label: string;
    sha256_hash: string;
    step_order?: number | null;
    approver_name?: string | null;
    note?: string | null;
    created_at?: string | null;
    is_current_match: boolean;
}

interface DocumentInfo {
    id: number;
    nomor_dokumen: string;
    judul_dokumen: string;
    status: string;
    status_label: string;
    nominal?: number | null;
    uploader_name: string;
    uploader_email?: string;
    tgl_pengajuan: string;
    created_at: string;
    detail_url: string;
}

interface VerifyResult {
    is_valid: boolean;
    matched_hash?: string;
    computed_hash?: string;
    hash_type?: string;
    stage_label?: string;
    message?: string;
    dokumen?: DocumentInfo;
    approvers?: ApproverInfo[];
    hash_history?: HashHistoryItem[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function VerifyAuthenticityDialog({ open, onOpenChange }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('Membaca berkas...');
    const [result, setResult] = useState<VerifyResult | null>(null);
    const [copiedHash, setCopiedHash] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setIsLoading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const processFile = async (selectedFile: File) => {
        if (!selectedFile) return;

        if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
            showToast.error('Hanya berkas format PDF yang didukung');
            return;
        }

        if (selectedFile.size > 25 * 1024 * 1024) {
            showToast.error('Ukuran berkas melebihi batas maksimal 25 MB');
            return;
        }

        setFile(selectedFile);
        setIsLoading(true);
        setLoadingStage('Menghitung sidik jari kriptografi SHA-256...');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            setTimeout(() => {
                setLoadingStage('Mencocokkan ke database histori & integritas stempel AMS...');
            }, 600);

            const response = await axios.post('/api/dokumen/verify-authenticity', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data) {
                setResult(response.data);
            }
        } catch (error: any) {
            console.error('Verifikasi gagal:', error);
            const msg = error.response?.data?.message || 'Gagal memproses verifikasi dokumen';
            showToast.error(msg);
            setResult({
                is_valid: false,
                message: msg,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedHash(true);
        showToast.success('SHA-256 Hash berhasil disalin');
        setTimeout(() => setCopiedHash(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleReset();
            onOpenChange(val);
        }}>
            <DialogContent className="max-w-2xl sm:max-w-3xl overflow-hidden p-0 rounded-3xl border border-border/80 bg-card text-card-foreground shadow-[0_25px_60px_-15px_rgba(35,70,33,0.15),0_10px_25px_-5px_rgba(75,164,67,0.08)] max-h-[90vh] flex flex-col font-sans">
                {/* Header with AMS Soft Clay Touch */}
                <div className="relative px-6 pt-6 pb-4 border-b border-border/40 bg-gradient-to-b from-secondary/50 via-secondary/20 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary border border-border/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_12px_rgba(75,164,67,0.15)]">
                            <IconShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="font-serif text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                Verifikasi Keaslian Dokumen
                            </DialogTitle>
                            <DialogDescription className="font-sans text-xs text-muted-foreground mt-0.5">
                                Unggah dokumen PDF untuk memastikan keaslian, integritas isi, dan riwayat tanda tangan digital AMS.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* STATE 1: Dropzone (When no file uploaded or resetting) */}
                    {!file && !isLoading && !result && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`group relative cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 ${isDragging
                                ? 'border-primary bg-secondary/60 scale-[1.01]'
                                : 'border-border/80 bg-secondary/20 hover:border-primary hover:bg-secondary/40'
                                } shadow-[inset_0_2px_4px_rgba(35,70,33,0.02),0_8px_20px_-6px_rgba(35,70,33,0.04)]`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border/50 shadow-[0_8px_20px_-4px_rgba(35,70,33,0.1),inset_0_2px_3px_rgba(255,255,255,0.9)] group-hover:scale-110 transition-transform duration-300 text-primary">
                                <IconUpload className="h-8 w-8" />
                            </div>

                            <div className="mt-4 space-y-1">
                                <p className="font-sans text-sm font-semibold text-foreground">
                                    Tarik & letakkan berkas PDF di sini, atau{' '}
                                    <span className="text-primary underline underline-offset-2">
                                        pilih dari komputer
                                    </span>
                                </p>
                                <p className="font-sans text-xs text-muted-foreground">
                                    Mendukung file dokumen hasil terbitan AMS (Maks. 25 MB)
                                </p>
                            </div>

                            <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <IconCheck className="h-3.5 w-3.5 text-primary" />
                                    Deteksi modifikasi isi
                                </span>
                                <span className="h-3 w-px bg-border" />
                                <span className="flex items-center gap-1">
                                    <IconCheck className="h-3.5 w-3.5 text-primary" />
                                    Histori stempel approver
                                </span>
                            </div>
                        </div>
                    )}

                    {/* STATE 2: Loading Scanning State */}
                    {isLoading && (
                        <div className="py-14 text-center space-y-5 rounded-3xl border border-border/70 bg-secondary/30 p-8 shadow-[inset_0_2px_4px_rgba(75,164,67,0.05),0_10px_25px_-5px_rgba(75,164,67,0.08)]">
                            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border/60 shadow-[0_10px_25px_rgba(75,164,67,0.2)] text-primary">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            </div>

                            <div className="space-y-1.5 max-w-sm mx-auto">
                                <h3 className="font-serif text-base font-bold text-foreground">
                                    Memeriksa Sidik Jari Kriptografis
                                </h3>
                                <p className="font-sans text-xs text-muted-foreground animate-pulse">
                                    {loadingStage}
                                </p>
                            </div>

                            {file && (
                                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-1 text-xs text-foreground shadow-xs">
                                    <IconFileText className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-medium truncate max-w-[220px]">{file.name}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STATE 3: Results (Bento Layout + Soft Claymorphism in AMS Palette) */}
                    {!isLoading && result && (
                        <div className="space-y-4">
                            {/* Bento Item 1: Verification Result Banner */}
                            {result.is_valid && result.dokumen ? (
                                <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-secondary via-secondary/70 to-secondary/40 p-4.5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_8px_20px_-6px_rgba(35,70,33,0.08)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                                            <IconCheck className="h-6 w-6 stroke-[2.5]" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-serif text-base font-bold text-secondary-foreground">
                                                    DOKUMEN ASLI & TERVERIFIKASI
                                                </h3>
                                                <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[10px] px-2 py-0 font-semibold tracking-wide uppercase">
                                                    Sah AMS
                                                </Badge>
                                            </div>
                                            <p className="font-sans text-xs text-muted-foreground mt-0.5">
                                                {result.stage_label || 'Dokumen cocok dengan catatan sah di sistem AMS.'}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        className="rounded-xl border-border bg-card hover:bg-secondary text-foreground hover:text-secondary-foreground font-sans text-xs h-8 shrink-0 self-start sm:self-center shadow-xs"
                                    >
                                        <IconRefresh className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                        Cek Berkas Lain
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4.5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_8px_20px_-6px_rgba(220,38,38,0.1)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground shadow-md">
                                            <IconShieldX className="h-6 w-6 stroke-[2.5]" />
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-base font-bold text-destructive">
                                                DOKUMEN TIDAK COCOK / TIDAK TERDAFTAR
                                            </h3>
                                            <p className="font-sans text-xs text-muted-foreground mt-0.5">
                                                {result.message || 'Isi dokumen telah dimodifikasi atau file ini tidak diterbitkan oleh sistem AMS.'}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        className="rounded-xl border-destructive/30 bg-card hover:bg-destructive/10 text-destructive font-sans text-xs h-8 shrink-0 shadow-xs"
                                    >
                                        <IconRefresh className="mr-1.5 h-3.5 w-3.5" />
                                        Coba Lagi
                                    </Button>
                                </div>
                            )}

                            {/* BENTO GRID: Two Columns */}
                            {result.is_valid && result.dokumen && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Bento Tile A: Document Identity */}
                                    <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-[0_4px_16px_rgba(35,70,33,0.04),inset_0_1px_2px_rgba(255,255,255,0.9)] space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Informasi Dokumen
                                            </span>
                                            <Badge variant="outline" className="border-border bg-secondary text-secondary-foreground text-[10px]">
                                                {result.dokumen.status_label}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2.5">
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase font-medium">Nomor Dokumen</span>
                                                <p className="font-mono text-sm font-bold text-foreground">
                                                    {result.dokumen.nomor_dokumen || '-'}
                                                </p>
                                            </div>

                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase font-medium">Judul Dokumen</span>
                                                <p className="font-serif text-sm font-semibold text-foreground leading-snug">
                                                    {result.dokumen.judul_dokumen}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Pengunggah</span>
                                                    <p className="text-xs font-medium text-foreground flex items-center gap-1 mt-0.5">
                                                        <IconUser className="h-3 w-3 text-muted-foreground" />
                                                        {result.dokumen.uploader_name}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Tanggal Pengajuan</span>
                                                    <p className="text-xs font-medium text-foreground flex items-center gap-1 mt-0.5">
                                                        <IconClock className="h-3 w-3 text-muted-foreground" />
                                                        {result.dokumen.tgl_pengajuan}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs h-8 font-sans border-border/80 bg-secondary/30 text-foreground hover:bg-secondary hover:text-secondary-foreground">
                                                <a href={result.dokumen.detail_url} target="_blank" rel="noopener noreferrer">
                                                    <IconExternalLink className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                                    Buka Detail Dokumen di AMS
                                                </a>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Bento Tile B: Approvers & Signature Timeline */}
                                    <div className="rounded-2xl border border-border/70 bg-card p-4.5 shadow-[0_4px_16px_rgba(35,70,33,0.04),inset_0_1px_2px_rgba(255,255,255,0.9)] space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Riwayat Tanda Tangan & Approver
                                            </span>
                                            <span className="text-[11px] font-semibold text-primary">
                                                {result.approvers?.filter(a => a.status === 'approved').length || 0} / {result.approvers?.length || 0} Sah
                                            </span>
                                        </div>

                                        <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                                            {result.approvers && result.approvers.length > 0 ? (
                                                result.approvers.map((app, idx) => (
                                                    <div
                                                        key={app.id || idx}
                                                        className={`rounded-xl border p-2.5 transition-all text-xs ${app.status === 'approved'
                                                            ? 'border-border/80 bg-secondary/30'
                                                            : 'border-border/30 bg-muted/20 text-muted-foreground'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1">
                                                            <div className="min-w-0 font-semibold text-foreground flex items-center gap-1.5 truncate">
                                                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                                                                    {app.step_order || idx + 1}
                                                                </span>
                                                                <span className="truncate">{app.name}</span>
                                                            </div>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[9px] px-1.5 py-0 capitalize shrink-0 ${app.status === 'approved'
                                                                    ? 'border-border bg-secondary text-secondary-foreground font-semibold'
                                                                    : 'border-border/40 text-muted-foreground'
                                                                    }`}
                                                            >
                                                                {app.status === 'approved' ? 'Disetujui' : app.status}
                                                            </Badge>
                                                        </div>

                                                        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                                                            <span>{app.jabatan || app.step_name}</span>
                                                            {app.signed_at && (
                                                                <span className="font-mono text-primary font-medium">
                                                                    {app.signed_at}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic text-center py-4">
                                                    Belum ada approver terdaftar
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bento Item 3: Cryptographic Hash Audit & Stage History */}
                            {result.is_valid && (
                                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4.5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <IconHistory className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                                Histori Hash & Stempel Dokumen
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground font-mono">
                                            Algoritma SHA-256
                                        </span>
                                    </div>

                                    {/* Matched Hash Display */}
                                    {result.matched_hash && (
                                        <div className="rounded-xl border border-border bg-card p-3 shadow-xs flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                    Hash Berkas yang Diunggah (Cocok)
                                                </div>
                                                <code className="mt-0.5 block font-mono text-[11px] text-foreground break-all font-semibold">
                                                    {result.matched_hash}
                                                </code>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(result.matched_hash!)}
                                                className="h-8 w-8 p-0 text-primary hover:bg-secondary shrink-0"
                                                title="Salin Hash"
                                            >
                                                {copiedHash ? <IconCheck className="h-4 w-4 text-primary" /> : <IconCopy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    )}

                                    {/* Hash Lifecycle Timeline */}
                                    {result.hash_history && result.hash_history.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Jejak Hash Berdasarkan Siklus Stempel:
                                            </span>
                                            <div className="space-y-1.5">
                                                {result.hash_history.map((hist) => (
                                                    <div
                                                        key={hist.id}
                                                        className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[11px] border transition-all ${hist.is_current_match
                                                            ? 'border-primary bg-secondary text-secondary-foreground font-semibold shadow-xs'
                                                            : 'border-border/50 bg-card/70 text-muted-foreground'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {hist.is_current_match ? (
                                                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
                                                                    ✓
                                                                </span>
                                                            ) : (
                                                                <span className="h-1.5 w-1.5 rounded-full bg-border" />
                                                            )}
                                                            <span className="font-medium truncate">{hist.note || hist.type_label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <code className="font-mono text-[10px] text-muted-foreground">
                                                                {hist.sha256_hash.substring(0, 10)}...{hist.sha256_hash.substring(54)}
                                                            </code>
                                                            {hist.is_current_match && (
                                                                <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-4 font-bold uppercase">
                                                                    Cocok
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Computed Hash for unverified document */}
                            {!result.is_valid && result.computed_hash && (
                                <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-xs">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        SHA-256 Hash Berkas Terunggah:
                                    </span>
                                    <code className="block font-mono text-[11px] text-foreground break-all bg-secondary/30 p-2 rounded border border-border/50">
                                        {result.computed_hash}
                                    </code>
                                    <p className="text-[10px] text-muted-foreground pt-1">
                                        Nilai hash di atas tidak ditemukan pada dokumen asli, stempel persetujuan, maupun dokumen final di database AMS.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with AMS Soft Clay Touch */}
                <div className="px-6 py-4 border-t border-border/40 bg-secondary/20 flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">
                        Approval Management System Integrity Verification
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
