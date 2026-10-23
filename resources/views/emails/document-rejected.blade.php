<x-mail::message>
{{-- Status Banner --}}
<div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
    <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background: linear-gradient(135deg, #dc2626, #ef4444); color: #ffffff; font-size: 22px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">✕</div>
    <h2 style="margin: 0; color: #991b1b; font-size: 20px; font-weight: 700;">Dokumen Ditolak</h2>
    <p style="margin: 8px 0 0 0; color: #b91c1c; font-size: 14px; line-height: 1.5;">Pengajuan dokumen Anda tidak dapat disetujui pada tahap ini.</p>
</div>

<p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
Halo <strong>{{ $dokumen->user->name ?? 'Pemilik Dokumen' }}</strong>,
</p>

<p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.7;">
Mohon maaf, pengajuan dokumen berikut telah <strong style="color: #dc2626;">ditolak</strong> oleh peninjau (approver). Rincian dokumen dan alasan penolakan:
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
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">👤 Ditolak Oleh</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 500; color: #334155;">{{ $rejector->name ?? 'N/A' }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b;">📌 Status</td>
        <td style="padding: 14px 18px;">
            <span style="display: inline-block; background: linear-gradient(135deg, #fee2e2, #fecaca); color: #991b1b; border: 1px solid #fecaca; border-radius: 9999px; padding: 5px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;">
                ✕ Rejected
            </span>
        </td>
    </tr>
</table>

{{-- Reason Box --}}
<div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 28px;">
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #991b1b; letter-spacing: 0.3px;">⚠️ Alasan Penolakan:</p>
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #7f1d1d; line-height: 1.6;">{{ $reason }}</p>
    @if ($rejection->comment)
        <div style="border-top: 1px solid #fecaca; padding-top: 10px; margin-top: 10px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #991b1b;">Catatan Tambahan:</p>
            <p style="margin: 0; font-size: 13px; color: #7f1d1d; font-style: italic; line-height: 1.5;">{{ $rejection->comment }}</p>
        </div>
    @endif
</div>

<p style="font-size: 14px; color: #475569; margin-bottom: 24px; line-height: 1.6;">
Silakan periksa catatan di atas. Jika diperlukan, Anda dapat melakukan penyesuaian dan mengajukan kembali dokumen melalui sistem.
</p>

<div style="text-align: center; margin: 28px 0;">
    <x-mail::button :url="$documentUrl" color="error">
        Lihat Detail Dokumen
    </x-mail::button>
</div>

Hormat kami,<br>
**{{ config('mail.from.name', 'PT. Tiga Serangkai') }}**
</x-mail::message>
