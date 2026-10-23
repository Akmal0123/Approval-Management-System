<x-mail::message>
{{-- Status Banner --}}
<div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
    <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background: linear-gradient(135deg, #0f766e, #14b8a6); color: #ffffff; font-size: 22px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);">✍</div>
    <h2 style="margin: 0; color: #115e59; font-size: 20px; font-weight: 700;">Permintaan Persetujuan Dokumen</h2>
    <p style="margin: 8px 0 0 0; color: #0d9488; font-size: 14px; line-height: 1.5;">Dokumen baru membutuhkan tindakan persetujuan (approval) dari Anda.</p>
</div>

<p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
Halo <strong>{{ $approval->user->name ?? 'Approver' }}</strong>,
</p>

<p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.7;">
Anda menerima permohonan persetujuan untuk pengajuan dokumen berikut. Mohon segera meninjau dokumen agar proses operasional berjalan lancar:
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
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; font-weight: 500;">
            {{ $dokumen->user->name ?? 'N/A' }}
            @if(isset($dokumen->user->user_auths) && $dokumen->user->user_auths->first()?->jabatan)
                <span style="color: #64748b; font-size: 12px;">({{ $dokumen->user->user_auths->first()->jabatan->name }})</span>
            @endif
        </td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">📋 Tahap (Step)</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f766e; font-weight: 600;">{{ $stepName }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">📅 Tanggal Pengajuan</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">{{ $dokumen->tgl_pengajuan?->format('d M Y') ?? $dokumen->created_at->format('d M Y') }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b;">⏰ Batas Waktu</td>
        <td style="padding: 14px 18px;">
            @if($approval->tgl_deadline)
                <span style="display: inline-block; background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; border: 1px solid #fde68a; border-radius: 9999px; padding: 5px 14px; font-size: 12px; font-weight: 700;">
                    ⏰ {{ $approval->tgl_deadline->format('d M Y H:i') }}
                </span>
            @else
                <span style="color: #94a3b8; font-size: 13px;">Tidak ada batas waktu</span>
            @endif
        </td>
    </tr>
</table>

@if($dokumen->deskripsi)
<div style="background-color: #f8fafc; border-left: 4px solid #0f766e; padding: 14px 18px; border-radius: 0 10px 10px 0; margin-bottom: 28px;">
    <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px;">Deskripsi / Catatan Pengajuan:</p>
    <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">{{ Str::limit($dokumen->deskripsi, 250) }}</p>
</div>
@endif

<div style="text-align: center; margin: 28px 0;">
    <x-mail::button :url="$approvalUrl" color="primary">
        Tinjau & Berikan Persetujuan
    </x-mail::button>
</div>

<p style="font-size: 14px; color: #475569; margin-top: 24px; line-height: 1.6;">
Terima kasih atas perhatian dan kerja sama Anda.
</p>

Hormat kami,<br>
**{{ config('mail.from.name', 'PT. Tiga Serangkai') }}**
</x-mail::message>
