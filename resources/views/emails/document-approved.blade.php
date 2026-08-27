<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pemberitahuan Persetujuan Resmi Dokumen</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">

<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">

    <!-- Header Banner - Emerald Green Approved Theme -->
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%); padding: 32px 24px; text-align: center;">
        
        <!-- Logo Rata Tengah -->
        <div style="text-align: center; margin-bottom: 16px;">
            <img src="{{ $message->embed(public_path('images/logo-tiga-serangkai.png')) }}" alt="Tiga Serangkai" style="max-height: 52px; width: auto; display: inline-block; margin: 0 auto; filter: brightness(0) invert(1); opacity: 0.95;" />
        </div>

        <h2 style="color: #ffffff; margin: 0; font-size: 23px; font-weight: 800; letter-spacing: -0.5px;">
            Dokumen Berhasil Disetujui
        </h2>
        <p style="color: #a7f3d0; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
            Sistem Persetujuan Dokumen Digital Resmi - PT Tiga Serangkai
        </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 28px;">
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
            Kepada Yth. <strong style="color: #0f172a;">{{ ucwords($dokumen->user?->name ?? 'Pengirim Dokumen') }}</strong>,
        </p>

        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Dengan hormat,<br>
            Menginformasikan bahwa pengajuan dokumen Anda telah <strong style="color: #1c595b;">selesai disetujui sepenuhnya</strong> oleh seluruh pejabat berwenang secara sah dan tercatat di sistem.
        </p>

        <!-- Summary Card Panel -->
        <div style="margin: 24px 0; background-color: #e6f2f2; border-left: 5px solid #246e70; border-radius: 12px; padding: 20px; border: 1px solid #b2dfdb;">
            <div style="font-size: 11px; font-weight: 800; color: #144446; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;">
                📋 RINGKASAN DOKUMEN RESMI
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
                <tr>
                    <td style="padding: 6px 0; color: #1c595b; font-weight: 600; width: 130px;">Judul Dokumen</td>
                    <td style="padding: 6px 4px; color: #1c595b; font-weight: 700; width: 10px; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">{{ $dokumen->judul_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #1c595b; font-weight: 600;">Nomor Dokumen</td>
                    <td style="padding: 6px 4px; color: #1c595b; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{ $dokumen->nomor_dokumen }}</td>
                </tr>
                @if($dokumen->tipe_dokumen)
                <tr>
                    <td style="padding: 6px 0; color: #1c595b; font-weight: 600;">Tipe Dokumen</td>
                    <td style="padding: 6px 4px; color: #1c595b; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-transform: uppercase;">{{ $dokumen->tipe_dokumen }}</td>
                </tr>
                @endif
                <tr>
                    <td style="padding: 6px 0; color: #1c595b; font-weight: 600;">Status Akhir</td>
                    <td style="padding: 6px 4px; color: #1c595b; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0;">
                        <span style="display: inline-block; background-color: #b2dfdb; color: #144446; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 20px; border: 1px solid #80cbc4;">Disetujui Sepenuhnya</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #1c595b; font-weight: 600;">Waktu Selesai</td>
                    <td style="padding: 6px 4px; color: #1c595b; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a;">{{ \Carbon\Carbon::now()->locale('id')->translatedFormat('d F Y, H:i') }} WIB</td>
                </tr>
            </table>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Berkas PDF yang telah dilengkapi tanda tangan digital & QR Code verifikasi siap diakses dan diunduh:
        </p>

        <!-- CTA Buttons -->
        <div style="margin: 28px 0 16px 0; text-align: center;">
            <a href="{{ $pdfUrl }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #246e70 0%, #1c595b 100%); color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 26px; border-radius: 10px; box-shadow: 0 4px 12px rgba(36, 110, 112, 0.3); margin: 6px 4px;">
                📄 Unduh PDF Bertanda Tangan
            </a>
            <a href="{{ $documentUrl }}" target="_blank" style="display: inline-block; background-color: #f8fafc; color: #334155; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px; border: 1px solid #cbd5e1; margin: 6px 4px;">
                🔗 Lihat Portal Detail
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