<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pemberitahuan Berkas Revisi Terbaru</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">

<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">

    <!-- Header Banner - Sky Cyan Blue Theme -->
    <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center;">
        <img src="{{ $message->embed(public_path('images/logo-tiga-serangkai.png')) }}" alt="Tiga Serangkai Logo" style="max-height: 75px; width: auto; margin: 0 auto 16px auto; display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));" />
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
            Pemberitahuan Berkas Revisi Terbaru
        </h2>
        <p style="color: #bae6fd; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
            Sistem Persetujuan Dokumen Terintegrasi
        </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 24px;">
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
            Kepada Yth. <strong style="color: #0f172a;">Bapak/Ibu {{ ucwords($approval->user?->name ?? $approval->approver_email) }}</strong>,
        </p>

        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Dengan hormat,<br>
            Menginformasikan bahwa berkas perbaikan untuk dokumen permohonan telah <strong style="color: #0284c7;">berhasil diperbarui dan diunggah (Versi {{ $newVersion }})</strong> oleh pengirim dokumen.
        </p>

        <!-- Summary Card Panel - 3 Column Aligned Table -->
        <div style="margin: 24px 0; background-color: #f0f9ff; border-left: 5px solid #0284c7; border-radius: 12px; padding: 20px; border-top: 1px solid #e0f2fe; border-right: 1px solid #e0f2fe; border-bottom: 1px solid #e0f2fe;">
            <div style="font-size: 12px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                RINGKASAN DOKUMEN REVISI
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.5;">
                <tr>
                    <td style="padding: 6px 0; color: #0369a1; font-weight: 600; vertical-align: top; white-space: nowrap; width: 130px;">Judul Dokumen</td>
                    <td style="padding: 6px 4px; color: #0369a1; font-weight: 700; vertical-align: top; width: 10px; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700; vertical-align: top;">{{ $dokumen->judul_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #0369a1; font-weight: 600; vertical-align: top; white-space: nowrap;">Nomor Dokumen</td>
                    <td style="padding: 6px 4px; color: #0369a1; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; vertical-align: top;">{{ $dokumen->nomor_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #0369a1; font-weight: 600; vertical-align: top; white-space: nowrap;">Diajukan Oleh</td>
                    <td style="padding: 6px 4px; color: #0369a1; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; vertical-align: top; word-break: break-all;">{{ ucwords($dokumen->user?->name ?? 'Pengirim Dokumen') }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #0369a1; font-weight: 600; vertical-align: top; white-space: nowrap;">Versi Berkas Baru</td>
                    <td style="padding: 6px 4px; color: #0369a1; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; vertical-align: top;">
                        <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 20px; border: 1px solid #bae6fd;">Versi {{ $newVersion }}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #0369a1; font-weight: 600; vertical-align: top; white-space: nowrap;">Tahapan Persetujuan</td>
                    <td style="padding: 6px 4px; color: #0369a1; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; vertical-align: top;">{{ $stepName }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #0369a1; font-weight: 600; vertical-align: top; white-space: nowrap;">Batas Waktu Peninjauan</td>
                    <td style="padding: 6px 4px; color: #0369a1; font-weight: 700; vertical-align: top; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #dc2626; font-weight: 700; vertical-align: top;">{{ $approval->tgl_deadline ? \Carbon\Carbon::parse($approval->tgl_deadline)->locale('id')->translatedFormat('d F Y') : 'Tidak ditentukan' }}</td>
                </tr>
            </table>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Dokumen ini membutuhkan peninjauan dan persetujuan ulang dari Bapak/Ibu berdasarkan berkas versi terbaru. Silakan pilih opsi di bawah ini:
        </p>

        <!-- CTA Buttons -->
        <div style="margin: 28px 0 16px 0; text-align: center;">
            <a href="{{ $pdfUrl }}" target="_blank" style="display: inline-block; background-color: #f8fafc; color: #334155; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px; border: 1px solid #cbd5e1; margin: 6px 4px;">
                Buka Berkas PDF
            </a>
            <a href="{{ $approvalUrl }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 26px; border-radius: 10px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25); margin: 6px 4px;">
                Peninjauan & Persetujuan
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
            Demikian pemberitahuan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
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
