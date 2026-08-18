<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pemberitahuan Penolakan Dokumen</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">

<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">

    <!-- Header Banner - Crimson Red Rejected Theme -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #7f1d1d 100%); padding: 28px 24px 32px 24px; text-align: center;">
        <!-- Top Left Corporate Logo -->
        <div style="text-align: left; margin-bottom: 6px;">
            <img src="{{ $message->embed(public_path('images/logo-tiga-serangkai.png')) }}" alt="Tiga Serangkai" style="max-height: 48px; width: auto; display: inline-block; filter: brightness(0) invert(1); opacity: 0.95;" />
        </div>

        <!-- Center Rejected Cross Icon -->
        <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; padding: 12px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
            <span style="font-size: 32px; line-height: 1; display: block;">❌</span>
        </div>

        <h2 style="color: #ffffff; margin: 0; font-size: 23px; font-weight: 800; letter-spacing: -0.5px;">
            Pengajuan Dokumen Ditolak
        </h2>
        <p style="color: #fca5a5; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
            Sistem Persetujuan Dokumen Digital - PT Tiga Serangkai
        </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 28px;">
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
            Kepada Yth. <strong style="color: #0f172a;">{{ ucwords($dokumen->user?->name ?? 'Pengirim Dokumen') }}</strong>,
        </p>

        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Menginformasikan bahwa pengajuan dokumen Anda <strong style="color: #dc2626;">tidak disetujui / ditolak</strong> oleh <strong style="color: #0f172a;">{{ ucwords($rejectedBy?->name ?? 'Penyetuju Dokumen') }}</strong>.
        </p>

        <!-- Rejection Reason Card -->
        @if(!empty($reason))
        <div style="margin: 20px 0; background-color: #fef2f2; border-left: 5px solid #dc2626; border-radius: 10px; padding: 16px; border: 1px solid #fecaca;">
            <div style="font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                💬 ALASAN PENOLAKAN
            </div>
            <div style="font-size: 14px; color: #7f1d1d; font-style: italic; line-height: 1.5;">
                "{{ $reason }}"
            </div>
        </div>
        @endif

        <!-- Summary Card Panel -->
        <div style="margin: 24px 0; background-color: #f8fafc; border-left: 5px solid #64748b; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;">
                📋 RINGKASAN DOKUMEN
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
                <tr>
                    <td style="padding: 6px 0; color: #475569; font-weight: 600; width: 130px;">Judul Dokumen</td>
                    <td style="padding: 6px 4px; color: #475569; font-weight: 700; width: 10px; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">{{ $dokumen->judul_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #475569; font-weight: 600;">Nomor Dokumen</td>
                    <td style="padding: 6px 4px; color: #475569; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{ $dokumen->nomor_dokumen }}</td>
                </tr>
            </table>
        </div>

        <!-- CTA Buttons -->
        <div style="margin: 28px 0 16px 0; text-align: center;">
            <a href="{{ $documentUrl ?? route('dokumen.show', $dokumen->id) }}" target="_blank" style="display: inline-block; background-color: #475569; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 26px; border-radius: 10px;">
                🔗 Lihat Detail Dokumen
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

        <div style="margin-top: 20px; font-size: 13px; color: #334155; line-height: 1.5;">
            Hormat kami,<br>
            <strong style="color: #0f172a; font-size: 14px;">Tim Persetujuan Dokumen Digital</strong><br>
            <span style="color: #64748b;">{{ $dokumen->company?->name ?? 'PT. Digital Approval Indonesia' }}</span>
        </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        Pesan ini dikirim secara otomatis oleh Sistem Persetujuan Dokumen.<br>
        © {{ date('Y') }} {{ $dokumen->company?->name ?? 'PT. Digital Approval Indonesia' }}. All rights reserved.
    </div>

</div>
</body>
</html>
