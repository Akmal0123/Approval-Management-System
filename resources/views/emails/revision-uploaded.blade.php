<x-mail::message>
{{-- Status Banner --}}
<div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
    <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background: linear-gradient(135deg, #0f766e, #14b8a6); color: #ffffff; font-size: 22px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);">🔄</div>
    <h2 style="margin: 0; color: #115e59; font-size: 20px; font-weight: 700;">Revisi Dokumen Telah Diunggah</h2>
    <p style="margin: 8px 0 0 0; color: #0d9488; font-size: 14px; line-height: 1.5;">Pemilik dokumen telah memperbarui file dokumen sesuai catatan revisi.</p>
</div>

<p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
Halo <strong>{{ $approval->user->name ?? 'Approver' }}</strong>,
</p>

<p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.7;">
Dokumen berikut telah diperbarui dan kini membutuhkan peninjauan ulang serta persetujuan dari Anda:
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
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">👤 Diajukan Oleh</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; font-weight: 500;">{{ $dokumen->user->name ?? 'N/A' }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">🔄 Versi Baru</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
            <span style="display: inline-block; background: linear-gradient(135deg, #e0f2fe, #bae6fd); color: #0369a1; border: 1px solid #bae6fd; border-radius: 8px; padding: 4px 12px; font-size: 12px; font-weight: 700;">
                {{ $newVersion }}
            </span>
        </td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">📋 Tahap (Step)</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f766e; font-weight: 600;">{{ $stepName }}</td>
    </tr>
    @if ($approval->tgl_deadline)
    <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b;">⏰ Batas Waktu</td>
        <td style="padding: 14px 18px; font-size: 13px; color: #d97706; font-weight: 600;">⏰ {{ $approval->tgl_deadline->format('d M Y H:i') }}</td>
    </tr>
    @endif
</table>

<div style="background-color: #f0fdfa; border-left: 4px solid #0f766e; padding: 14px 18px; border-radius: 0 10px 10px 0; margin-bottom: 28px;">
    <p style="margin: 0; font-size: 13px; color: #115e59; line-height: 1.6;">
        📌 Silakan periksa perubahan versi terbaru dari dokumen ini dan lakukan konfirmasi persetujuan.
    </p>
</div>

<div style="text-align: center; margin: 28px 0;">
    <x-mail::button :url="$approvalUrl" color="primary">
        Tinjau Ulang & Berikan Persetujuan
    </x-mail::button>
</div>

Hormat kami,<br>
**{{ config('mail.from.name', 'PT. Tiga Serangkai') }}**
</x-mail::message>
