<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pengingat Batas Waktu Persetujuan Dokumen</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">

<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">

    <!-- Header Banner - Sunset Orange Reminder Theme -->
    <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #7c2d12 100%); padding: 28px 24px 32px 24px; text-align: center;">
        <!-- Top Left Corporate Logo -->
        <div style="text-align: left; margin-bottom: 6px;">
            <img src="{{ $message->embed(public_path('images/logo-tiga-serangkai.png')) }}" alt="Tiga Serangkai" style="max-height: 48px; width: auto; display: inline-block; filter: brightness(0) invert(1); opacity: 0.95;" />
        </div>

        <!-- Center Reminder Icon -->
        <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; padding: 12px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
            <span style="font-size: 32px; line-height: 1; display: block;">⏰</span>
        </div>

        <h2 style="color: #ffffff; margin: 0; font-size: 23px; font-weight: 800; letter-spacing: -0.5px;">
            Pengingat Batas Waktu Persetujuan
        </h2>
        <p style="color: #ffedd5; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
            Sistem Persetujuan Dokumen Terintegrasi - PT Tiga Serangkai
        </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 24px;">
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
            Kepada Yth. <strong style="color: #0f172a;">Bapak/Ibu {{ ucwords($approval->user?->name ?? $approval->approver_email) }}</strong>,
        </p>

        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Dengan hormat,<br>
            Melalui surat elektronik ini, kami mengingatkan kembali bahwa terdapat dokumen permohonan persetujuan yang <strong style="color: #ea580c;">mendekati atau telah melewati batas waktu peninjauan (<em>deadline</em>)</strong>.
        </p>

        <!-- Summary Card Panel - 3 Column Aligned Table -->
        <div style="margin: 24px 0; background-color: #fff7ed; border-left: 5px solid #ea580c; border-radius: 12px; padding: 20px; border-top: 1px solid #ffedd5; border-right: 1px solid #ffedd5; border-bottom: 1px solid #ffedd5;">
            <div style="font-size: 12px; font-weight: 700; color: #9a3412; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                RINGKASAN INFORMASI DOKUMEN
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.5;">
                <tr>
                    <td style="padding: 6px 0; color: #9a3412; font-weight: 600; vertical-align: top; white-space: nowrap; width: 130px;">Judul Dokumen</td>
                    <td style="padding: 6px 4px; color: #9a3412; font-weight: 700; vertical-align: top; width: 10px; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700; vertical-align: top;">{{ $dokumen->judul_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #9a3412; font-weight: 600; vertical-align: top; white-space: nowrap;">Nomor Dokumen</td>
                    <td style="padding: 6px 4px; color: #9a3412; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; vertical-align: top;">{{ $dokumen->nomor_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #9a3412; font-weight: 600; vertical-align: top; white-space: nowrap;">Diajukan Oleh</td>
                    <td style="padding: 6px 4px; color: #9a3412; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; vertical-align: top; word-break: break-all;">{{ ucwords($dokumen->user?->name ?? 'Pengirim Dokumen') }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #9a3412; font-weight: 600; vertical-align: top; white-space: nowrap;">Batas Waktu (Deadline)</td>
                    <td style="padding: 6px 4px; color: #9a3412; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #c2410c; font-weight: 700; vertical-align: top;">{{ $deadline ? \Carbon\Carbon::parse($deadline)->locale('id')->translatedFormat('d F Y, H:i') . ' WIB' : 'Tidak ditentukan' }}</td>
                </tr>
            </table>
        </div>

        @if ($deadline && $deadline->isPast())
        <!-- Alert Box -->
        <div style="margin: 20px 0; background-color: #fee2e2; border-radius: 10px; padding: 14px 18px; border: 1px solid #fca5a5; color: #991b1b; font-size: 13px; font-weight: 600; line-height: 1.5;">
            <strong>PERHATIAN KHUSUS:</strong> Batas waktu peninjauan (<em>deadline</em>) untuk dokumen ini telah terlewati. Mohon berkenan untuk segera memproses keputusan persetujuan.
        </div>
        @endif

        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Mohon berkenan untuk segera meninjau berkas dokumen melalui opsi pilihan di bawah ini:
        </p>

        <!-- CTA Buttons -->
        <div style="margin: 28px 0 16px 0; text-align: center;">
            <a href="{{ $pdfUrl }}" target="_blank" style="display: inline-block; background-color: #f8fafc; color: #334155; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px; border: 1px solid #cbd5e1; margin: 6px 4px;">
                Buka Berkas PDF
            </a>
            <a href="{{ $approvalUrl }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 26px; border-radius: 10px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25); margin: 6px 4px;">
                Proses Persetujuan Sekarang
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
            Demikian pengingat ini kami sampaikan. Atas perhatian, dedikasi, dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
        </p>

        <div style="margin-top: 20px; font-size: 13px; color: #334155; line-height: 1.5;">
            Hormat kami,<br>
            <strong style="color: #0f172a; font-size: 14px;">Tim Manajemen Sistem Persetujuan</strong><br>
            <span style="color: #64748b;">PT Tiga Serangkai Inti Corpora</span>
        </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        Pesan ini dikirim secara otomatis oleh Sistem Persetujuan Dokumen PT Tiga Serangkai Inti Corpora.<br>
        © {{ date('Y') }} PT Tiga Serangkai Inti Corpora. All rights reserved.
    </div>

</div>
</body>
</html>
