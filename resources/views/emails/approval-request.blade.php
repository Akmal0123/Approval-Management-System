<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Persetujuan Dokumen Berhasil</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">

<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

    <!-- Header Banner - Emerald Green Theme -->
    <div style="background-color: #0d7a53; padding: 40px 24px; text-align: center;">
        <!-- Center Corporate Logo (Dipindah ke tengah menggantikan centang) -->
        <div style="margin-bottom: 16px;">
            <img src="{{ $message->embed(public_path('images/logo-tiga-serangkai.png')) }}" alt="TS Logo" style="max-height: 64px; width: auto; display: inline-block; filter: brightness(0) invert(1);" />
        </div>

        <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
            Dokumen Berhasil Disetujui
        </h2>
        <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 13px; font-weight: 400;">
            Sistem Persetujuan Dokumen Digital Resmi - PT Tiga Serangkai
        </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 32px 40px 32px;">
        <h3 style="margin-top: 0; margin-bottom: 24px; font-size: 18px; color: #1e293b; font-weight: 700; display: flex; align-items: center;">
            <span style="font-size: 20px; margin-right: 8px;">📋</span> Detail Dokumen
        </h3>
        
        <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-top: 0; margin-bottom: 20px;">
            Yth. Bapak/Ibu <strong style="color: #0f172a;">{{ ucwords($approverName ?? 'Penyetuju Dokumen') }}</strong>,
        </p>

        <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
            Dengan hormat, kami informasikan bahwa dokumen berikut telah berhasil diproses dan disetujui melalui <strong>{{ config('app.name', 'Laravel') }}</strong>.
        </p>

        <!-- Summary Card Panel (Aksen Hijau) -->
        <div style="margin: 24px 0; background-color: #f8fafc; border-left: 4px solid #0d7a53; padding: 16px; border-radius: 0 6px 6px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
                <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 130px;">Judul Dokumen</td>
                    <td style="padding: 6px 4px; color: #64748b; font-weight: 700; width: 10px; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">{{ $dokumen->judul_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Nomor Dokumen</td>
                    <td style="padding: 6px 4px; color: #64748b; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{ $dokumen->nomor_dokumen }}</td>
                </tr>
                @if($dokumen->tipe_dokumen)
                <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Tipe Dokumen</td>
                    <td style="padding: 6px 4px; color: #64748b; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-transform: uppercase;">{{ $dokumen->tipe_dokumen }}</td>
                </tr>
                @endif
                <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Pengaju Dokumen</td>
                    <td style="padding: 6px 4px; color: #64748b; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{ ucwords($dokumen->user?->name ?? 'Pengaju Dokumen') }}</td>
                </tr>
            </table>
        </div>

        <!-- CTA Buttons -->
        <div style="margin: 32px 0 16px 0; text-align: left;">
            <a href="{{ $approvalUrl ?? route('approvals.index') }}" target="_blank" style="display: inline-block; background-color: #0d7a53; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
                Lihat Dokumen
            </a>
        </div>
    </div>

</div>
</body>
</html>