<x-mail::message>
{{-- Status Banner --}}
@php
    $isPast = $deadline && $deadline->isPast();
@endphp

<div style="background: {{ $isPast ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}; border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
    <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background: {{ $isPast ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #d97706, #f59e0b)' }}; color: #ffffff; font-size: 22px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 4px 12px {{ $isPast ? 'rgba(220, 38, 38, 0.3)' : 'rgba(217, 119, 6, 0.3)' }};">⏰</div>
    <h2 style="margin: 0; color: {{ $isPast ? '#991b1b' : '#92400e' }}; font-size: 20px; font-weight: 700;">
        {{ $isPast ? 'Peringatan: Deadline Telah Terlewat' : 'Peringatan: Deadline Persetujuan ' . $timeLabel }}
    </h2>
    <p style="margin: 8px 0 0 0; color: {{ $isPast ? '#b91c1c' : '#b45309' }}; font-size: 14px; line-height: 1.5;">
        {{ $isPast ? 'Batas waktu persetujuan dokumen ini telah terlewat. Mohon segera diproses.' : 'Terdapat pengajuan dokumen yang membutuhkan peninjauan sebelum batas waktu berakhir.' }}
    </p>
</div>

<p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
Halo <strong>{{ $approval->user->name ?? 'Approver' }}</strong>,
</p>

<p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.7;">
Ini adalah pengingat otomatis bahwa pengajuan dokumen berikut memerlukan tindakan persetujuan (approval) dari Anda:
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
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">{{ $dokumen->user->name ?? 'N/A' }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b;">⏰ Batas Waktu</td>
        <td style="padding: 14px 18px;">
            <span style="display: inline-block; background: {{ $isPast ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : 'linear-gradient(135deg, #fef3c7, #fde68a)' }}; color: {{ $isPast ? '#991b1b' : '#92400e' }}; border: 1px solid {{ $isPast ? '#fecaca' : '#fde68a' }}; border-radius: 9999px; padding: 5px 14px; font-size: 12px; font-weight: 700;">
                ⏰ {{ $deadline?->format('d M Y H:i') ?? 'N/A' }}
            </span>
        </td>
    </tr>
</table>

@if ($isPast)
<div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 18px; border-radius: 0 10px 10px 0; margin-bottom: 28px;">
    <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.6; font-weight: 500;">
        ⚠️ <strong>Perhatian:</strong> Batas waktu persetujuan telah terlewati. Mohon prioritas untuk menyelesaikan peninjauan ini.
    </p>
</div>
@endif

<div style="text-align: center; margin: 28px 0;">
    <x-mail::button :url="$approvalUrl" color="primary">
        Tinjau & Berikan Persetujuan Sekarang
    </x-mail::button>
</div>

<p style="font-size: 14px; color: #475569; margin-top: 24px; line-height: 1.6;">
Terima kasih atas kerja sama dan respon cepat Anda.
</p>

Hormat kami,<br>
**{{ config('mail.from.name', 'PT. Tiga Serangkai') }}**
</x-mail::message>
