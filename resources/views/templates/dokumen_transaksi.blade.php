<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $dokumen->judul_dokumen }}</title>
    <style>
        @page {
            margin: 20mm 15mm 20mm 15mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #1e293b;
            line-height: 1.5;
        }
        
        /* KOP SURAT */
        .kop-table {
            width: 100%;
            border-bottom: 2.5px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 15px;
        }
        .kop-table td {
            vertical-align: middle;
        }
        .company-name {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
            letter-spacing: 0.5px;
            margin: 0;
            text-transform: uppercase;
        }
        .company-sub {
            font-size: 9px;
            color: #64748b;
            margin: 2px 0 0;
        }
        .doc-title-box {
            text-align: right;
        }
        .doc-main-title {
            font-size: 14px;
            font-weight: bold;
            color: #0369a1;
            text-transform: uppercase;
            margin: 0;
        }
        .doc-badge {
            display: inline-block;
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
            margin-top: 4px;
        }

        /* METADATA GRID */
        .info-card {
            width: 100%;
            border-collapse: collapse;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 18px;
        }
        .info-card td {
            padding: 6px 10px;
            font-size: 10.5px;
        }
        .info-label {
            color: #64748b;
            font-weight: 500;
        }
        .info-value {
            font-weight: bold;
            color: #0f172a;
        }

        /* SECTION TITLE */
        .section-heading {
            font-size: 11px;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            border-left: 3px solid #0284c7;
            padding-left: 6px;
            margin: 15px 0 8px;
        }

        /* DATA TABLE */
        .content-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .content-table th, .content-table td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
        }
        .content-table th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
        }

        /* LEMBAR TANDA TANGAN */
        .signature-container {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
        }
        .signature-cell {
            vertical-align: top;
            padding: 6px;
            text-align: center;
        }
        .signature-card {
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            border-radius: 4px;
            padding: 8px 4px;
            min-height: 140px;
        }
        .sign-role {
            font-size: 10px;
            font-weight: bold;
            color: #475569;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        .sign-area {
            height: 75px;
            line-height: 75px;
            color: #94a3b8;
            font-size: 9px;
            border-bottom: 1px dashed #cbd5e1;
            margin: 0 10px 8px;
        }
        .sign-name {
            font-weight: bold;
            color: #0f172a;
            font-size: 10px;
            margin: 0;
        }
        .sign-date {
            font-size: 8.5px;
            color: #64748b;
            margin: 2px 0 0;
        }

        /* FOOTER NOTE */
        .footer-note {
            margin-top: 25px;
            font-size: 8.5px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            text-align: justify;
        }
    </style>
</head>
<body>

    <!-- KOP HEADER -->
    <table class="kop-table">
        <tr>
            <td width="60%">
                <h1 class="company-name">{{ $dokumen->company->name ?? 'PT. CORPORATE SYSTEM' }}</h1>
                <p class="company-sub">Sistem Manajemen Dokumen & Persetujuan Elektronik</p>
            </td>
            <td width="40%" class="doc-title-box">
                <div class="doc-main-title">Lembar Pengajuan</div>
                <div class="doc-badge">{{ $dokumen->tipe_dokumen ?? 'Transaksi Sistem' }}</div>
            </td>
        </tr>
    </table>

    <!-- INFORMASI IDENTITAS DOKUMEN -->
    <table class="info-card">
        <tr>
            <td width="18%" class="info-label">ID Dokumen</td>
            <td width="32%" class="info-value">: {{ $dokumen->id_dokumen }}</td>
            <td width="20%" class="info-label">Tanggal Pengajuan</td>
            <td width="30%" class="info-value">: {{ \Carbon\Carbon::parse($dokumen->tgl_pengajuan)->translatedFormat('d F Y') }}</td>
        </tr>
        <tr>
            <td class="info-label">Nomor Transaksi</td>
            <td class="info-value">: {{ $dokumen->nomor_dokumen ?? '-' }}</td>
            <td class="info-label">Batas Persetujuan</td>
            <td class="info-value">: {{ \Carbon\Carbon::parse($dokumen->tgl_deadline)->translatedFormat('d F Y') }}</td>
        </tr>
        <tr>
            <td class="info-label">Klasifikasi</td>
            <td class="info-value">: {{ ucfirst($dokumen->kategori_dokumen ?? 'Transaksi') }}</td>
            <td class="info-label">Diajukan Oleh</td>
            <td class="info-value">: {{ $dokumen->user->name ?? '-' }}</td>
        </tr>
    </table>

    <!-- RINCIAN PENGAJUAN -->
    <div class="section-heading">Rincian Pengajuan</div>
    <table class="content-table">
        <thead>
            <tr>
                <th width="28%">Komponen</th>
                <th>Keterangan / Rincian</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Judul Dokumen</strong></td>
                <td>{{ $dokumen->judul_dokumen }}</td>
            </tr>
            <tr>
                <td><strong>Tipe Transaksi</strong></td>
                <td>{{ $dokumen->tipe_dokumen ?? '-' }}</td>
            </tr>
            <tr>
                <td><strong>Catatan / Keterangan</strong></td>
                <td>{!! nl2br(e($dokumen->deskripsi ?? 'Tidak ada catatan tambahan.')) !!}</td>
            </tr>
        </tbody>
    </table>

    <!-- LEMBAR PERSETUJUAN & TANDA TANGAN -->
    <div class="section-heading">Lembar Persetujuan & Tanda Tangan</div>
    <table class="signature-container">
        <tr>
            @if(isset($approvals) && count($approvals) > 0)
                @foreach($approvals as $approval)
                    <td class="signature-cell" width="{{ 100 / count($approvals) }}%">
                        <div class="signature-card">
                            <div class="sign-role">
                                {{ $approval->masterflowStep->jabatan->name ?? ('Persetujuan Tingkat ' . ($approval->approval_order ?? $loop->iteration)) }}
                            </div>
                            
                            <div class="sign-area">
                                @if($approval->approval_status === 'approved')
                                    <span style="color: #16a34a; font-weight: bold;">[ APPROVED / VALID ]</span>
                                @else
                                    <span style="color: #94a3b8;">[ Menunggu Persetujuan ]</span>
                                @endif
                            </div>

                            <p class="sign-name">
                                {{ $approval->user->name ?? $approval->approver_email ?? ('Approver ' . $loop->iteration) }}
                            </p>
                            <p class="sign-date">
                                {{ $approval->approver_email ? $approval->approver_email : ($approval->user ? 'User ID: ' . $approval->user_id : '-') }}
                            </p>
                        </div>
                    </td>
                @endforeach
            @else
                <td class="signature-cell" width="100%">
                    <div class="signature-card" style="padding: 20px;">
                        <p style="color: #dc2626; margin: 0; font-weight: bold;">Tidak ada alur persetujuan yang dikonfigurasi.</p>
                    </div>
                </td>
            @endif
        </tr>
    </table>

    <!-- FOOTER CATATAN HUKUM/SISTEM -->
    <div class="footer-note">
        * Dokumen ini diterbitkan secara elektronik melalui Sistem Persetujuan Terpadu. Seluruh tanda tangan digital dan riwayat persetujuan yang tercatat di dalam sistem ini memiliki kekuatan hukum sah internal perusahaan.
    </div>

</body>
</html>