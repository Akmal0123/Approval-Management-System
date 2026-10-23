<x-mail::message>
{{-- Status Banner --}}
<div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
    <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background: linear-gradient(135deg, #d97706, #f59e0b); color: #ffffff; font-size: 22px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);">📝</div>
    <h2 style="margin: 0; color: #92400e; font-size: 20px; font-weight: 700;">Permintaan Revisi Dokumen</h2>
    <p style="margin: 8px 0 0 0; color: #b45309; font-size: 14px; line-height: 1.5;">Dokumen Anda memerlukan perbaikan sebelum dapat diproses lebih lanjut.</p>
</div>

<p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
Halo <strong>{{ $dokumen->user->name ?? 'Pemilik Dokumen' }}</strong>,
</p>

<p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.7;">
Peninjau (approver) meminta perbaikan (revisi) pada pengajuan dokumen Anda. Berikut adalah rincian informasi dan catatan revisinya:
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
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">📋 Tahap Persetujuan</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #0f766e;">{{ $stepName }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b;">👤 Diminta Oleh</td>
        <td style="padding: 14px 18px; font-size: 13px; color: #334155; font-weight: 500;">{{ $requester->name ?? 'N/A' }}</td>
    </tr>
</table>

{{-- Notes Box --}}
<div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">📝 Catatan Revisi:</p>
    <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.7;">{{ $revisionNotes }}</p>
</div>

<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; border-radius: 0 10px 10px 0; margin-bottom: 28px;">
    <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.6;">
        💡 <em>Catatan: Persetujuan (approval) yang telah diberikan pada tahapan sebelumnya akan tetap tersimpan dan valid.</em>
    </p>
</div>

<div style="text-align: center; margin: 28px 0;">
    <x-mail::button :url="$documentUrl" color="primary">
        Lihat Dokumen & Unggah Revisi
    </x-mail::button>
</div>

Hormat kami,<br>
**{{ config('mail.from.name', 'PT. Tiga Serangkai') }}**
</x-mail::message>
