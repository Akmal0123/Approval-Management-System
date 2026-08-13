<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Permohonan Persetujuan Dokumen</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">

<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">

    <!-- Header Banner - Blue Gradient -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%); padding: 36px 28px; text-align: center;">
        <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border-radius: 50%; padding: 14px; margin-bottom: 12px;">
            <span style="font-size: 32px; line-height: 1;">📝</span>
        </div>
        <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
            Permohonan Persetujuan Dokumen
        </h2>
        <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 13px; font-weight: 500;">
            Sistem Persetujuan Dokumen Digital
        </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 28px;">
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
            Kepada Yth. <strong style="color: #0f172a;">{{ ucwords($approverName ?? 'Penyetuju Dokumen') }}</strong>,
        </p>

        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Anda menerima permohonan persetujuan baru dari <strong style="color: #1d4ed8;">{{ ucwords($dokumen->user?->name ?? 'Pengaju Dokumen') }}</strong> yang membutuhkan peninjauan dan persetujuan Anda.
        </p>

        <!-- Summary Card Panel -->
        <div style="margin: 24px 0; background-color: #eff6ff; border-left: 5px solid #2563eb; border-radius: 12px; padding: 20px; border: 1px solid #dbeafe;">
            <div style="font-size: 11px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;">
                📋 DETAIL PERMOHONAN PERSUTUJUAN
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
                <tr>
                    <td style="padding: 6px 0; color: #1e40af; font-weight: 600; width: 130px;">Judul Dokumen</td>
                    <td style="padding: 6px 4px; color: #1e40af; font-weight: 700; width: 10px; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">{{ $dokumen->judul_dokumen }}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #1e40af; font-weight: 600;">Nomor Dokumen</td>
                    <td style="padding: 6px 4px; color: #1e40af; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{ $dokumen->nomor_dokumen }}</td>
                </tr>
                @if($dokumen->tipe_dokumen)
                <tr>
                    <td style="padding: 6px 0; color: #1e40af; font-weight: 600;">Tipe Dokumen</td>
                    <td style="padding: 6px 4px; color: #1e40af; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-transform: uppercase;">{{ $dokumen->tipe_dokumen }}</td>
                </tr>
                @endif
                <tr>
                    <td style="padding: 6px 0; color: #1e40af; font-weight: 600;">Batas Waktu</td>
                    <td style="padding: 6px 4px; color: #1e40af; font-weight: 700; text-align: center;">:</td>
                    <td style="padding: 6px 0; color: #dc2626; font-weight: 700;">{{ \Carbon\Carbon::parse($dokumen->tgl_deadline)->locale('id')->translatedFormat('d F Y') }}</td>
                </tr>
            </table>
        </div>

        <!-- CTA Buttons -->
        <div style="margin: 28px 0 16px 0; text-align: center;">
            <a href="{{ $approvalUrl ?? route('approvals.index') }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                Tinjau & Setujui Dokumen →
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
