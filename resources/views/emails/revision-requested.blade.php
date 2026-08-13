<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Permintaan Perbaikan / Revisi Dokumen</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">

<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">

    <!-- Header Banner - Warm Amber Theme -->
    <div style="background: linear-gradient(135deg, #78350f 0%, #d97706 100%); padding: 32px 24px; text-align: center;">
        <img src="{{ $message->embed(public_path('images/logo-tiga-serangkai.png')) }}" alt="Tiga Serangkai Logo" style="max-height: 75px; width: auto; margin: 0 auto 16px auto; display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));" />
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
            Permintaan Perbaikan / Revisi Dokumen
        </h2>
        <p style="color: #fef3c7; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
            Sistem Persetujuan Dokumen Terintegrasi
        </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 24px;">
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
            Kepada Yth. <strong style="color: #0f172a;">Bapak/Ibu {{ ucwords($dokumen->user?->name ?? 'Pengirim Dokumen') }}</strong>,
        </p>

        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Dengan hormat,<br>
            Diberitahukan bahwa dokumen permohonan yang Bapak/Ibu ajukan membutuhkan <strong style="color: #b45309;">penyesuaian atau perbaikan berkas</strong> sebelum dapat dilanjutkan ke tahap persetujuan berikutnya.
        </p>

        <!-- Summary Card Panel - 3 Column Aligned Table -->
        <div style="margin: 24px 0; background-color: #fffbeb; border-left: 5px solid #d97706; border-radius: 12px; padding: 20px; border-top: 1px solid #fef3c7; border-right: 1px solid #fef3c7; border-bottom: 1px solid #fef3c7;">
            <div style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                DETAIL PERMINTAAN REVISI
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.5;">
                <tr>
                    <td style="padding: 6px 0; color: #78350f; font-weight: 600; vertical-align: top; white-space: nowrap; width: 130px;">Judul Dokumen</td>
                    <td style="padding: 6px 4px; color: #78350f; font-weight: 700; vertical-align: top; width: 10px; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700; vertical-align: top;">{{ $dokumen->judul_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #78350f; font-weight: 600; vertical-align: top; white-space: nowrap;">Nomor Dokumen</td>
                    <td style="padding: 6px 4px; color: #78350f; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; vertical-align: top;">{{ $dokumen->nomor_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #78350f; font-weight: 600; vertical-align: top; white-space: nowrap;">Tahapan Persetujuan</td>
                    <td style="padding: 6px 4px; color: #78350f; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; vertical-align: top;">{{ $stepName }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #78350f; font-weight: 600; vertical-align: top; white-space: nowrap;">Status Saat Ini</td>
                    <td style="padding: 6px 4px; color: #78350f; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; vertical-align: top;">
                        <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 20px; border: 1px solid #fde68a;">Perlu Revisi / Perbaikan</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #78350f; font-weight: 600; vertical-align: top; white-space: nowrap;">Diminta Oleh</td>
                    <td style="padding: 6px 4px; color: #78350f; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #92400e; font-weight: 700; vertical-align: top; word-break: break-all;">{{ ucwords($requesterName) }}</td>
                </tr>
            </table>
        </div>

        <!-- Revision Notes Callout Box -->
        <div style="margin: 20px 0; background-color: #fef3c7; border-radius: 12px; padding: 18px; border: 1px solid #fde68a; color: #78350f; line-height: 1.6;">
            <div style="font-weight: 700; font-size: 13px; text-transform: uppercase; margin-bottom: 6px; color: #92400e;">
                Catatan & Instruksi Perbaikan:
            </div>
            <div style="font-size: 14px; font-style: italic; font-weight: 600; color: #78350f;">
                "{{ $revisionNotes }}"
            </div>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #475569;">
            <strong>Catatan Penting:</strong> Persetujuan yang telah diperoleh dari tahapan sebelumnya tetap tersimpan secara sah. Silakan periksa berkas atau unggah revisi versi terbaru melalui tombol di bawah ini:
        </p>

        <!-- CTA Buttons -->
        <div style="margin: 28px 0 16px 0; text-align: center;">
            <a href="{{ $pdfUrl }}" target="_blank" style="display: inline-block; background-color: #f8fafc; color: #334155; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px; border: 1px solid #cbd5e1; margin: 6px 4px;">
                Buka Berkas PDF
            </a>
            <a href="{{ $documentUrl }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 26px; border-radius: 10px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); margin: 6px 4px;">
                Unggah Berkas Revisi
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
            Demikian informasi ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
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
