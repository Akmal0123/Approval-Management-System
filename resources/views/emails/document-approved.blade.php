<x-mail::message>
{{-- Status Banner --}}
<div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
    <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">✓</div>
    <h2 style="margin: 0; color: #065f46; font-size: 20px; font-weight: 700;">Dokumen Disetujui</h2>
    <p style="margin: 8px 0 0 0; color: #047857; font-size: 14px; line-height: 1.5;">Selamat! Dokumen Anda telah disetujui oleh seluruh pihak terkait.</p>
</div>

<p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
Halo <strong>{{ $dokumen->user->name ?? 'Pemilik Dokumen' }}</strong>,
</p>

<p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.7;">
Proses persetujuan (approval) untuk pengajuan dokumen Anda telah <strong style="color: #059669;">selesai sepenuhnya</strong>. Berikut adalah rincian informasi dokumen:
</p>

{{-- Detail Table --}}
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; border-collapse: separate; overflow: hidden;">
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; width: 38%;">📄 Nama Dokumen</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a;">{{ $dokumen->judul_dokumen }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">🔢 Nomor Dokumen</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-weight: 600; color: #0f766e;">{{ $dokumen->nomor_dokumen }}</td>
    </tr>
    @if ($dokumen->company)
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">🏢 Perusahaan</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; font-weight: 500;">{{ $dokumen->company->name }}</td>
    </tr>
    @endif
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">📅 Tanggal Pengajuan</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">{{ $dokumen->tgl_pengajuan?->format('d M Y') ?? $dokumen->created_at->format('d M Y') }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b;">📌 Status Akhir</td>
        <td style="padding: 14px 18px;">
            <span style="display: inline-block; background: linear-gradient(135deg, #dcfce7, #bbf7d0); color: #15803d; border: 1px solid #86efac; border-radius: 9999px; padding: 5px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;">
                ✓ Fully Approved
            </span>
        </td>
    </tr>
</table>

<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; border-radius: 0 10px 10px 0; margin-bottom: 28px;">
    <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.6;">
        📄 Dokumen versi final dengan tanda tangan elektronik telah disatukan dan siap untuk diunduh.
    </p>
</div>

<div style="text-align: center; margin: 28px 0;">
    <x-mail::button :url="$documentUrl" color="success">
        Lihat & Unduh Dokumen
    </x-mail::button>
</div>

<p style="font-size: 14px; color: #475569; margin-top: 24px; line-height: 1.6;">
Terima kasih atas kerja sama Anda.
</p>

Hormat kami,<br>
**{{ config('mail.from.name', 'PT. Tiga Serangkai') }}**
</x-mail::message>
