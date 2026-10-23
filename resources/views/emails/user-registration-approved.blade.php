<x-mail::message>
{{-- Status Banner --}}
<div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
    <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">🎉</div>
    <h2 style="margin: 0; color: #065f46; font-size: 20px; font-weight: 700;">Pendaftaran Akun Disetujui</h2>
    <p style="margin: 8px 0 0 0; color: #047857; font-size: 14px; line-height: 1.5;">Akun Anda telah berhasil diverifikasi dan kini aktif dalam sistem.</p>
</div>

<p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
Halo <strong>{{ $user->name }}</strong>,
</p>

<p style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.7;">
Selamat! Permintaan pendaftaran akun Anda di <strong style="color: #0f766e;">Approval Management System (AMS)</strong> telah disetujui oleh Super Admin. Berikut adalah rincian otorisasi dan hak akses yang diberikan:
</p>

{{-- Detail Table --}}
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px; border-collapse: separate; overflow: hidden;">
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; width: 38%;">🔑 Peran (Role)</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f766e;">{{ $authDetails['role'] ?? '-' }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">🏢 Perusahaan</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #0f172a;">{{ $authDetails['company'] ?? '-' }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">💼 Posisi / Jabatan</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">{{ $authDetails['jabatan'] ?? '-' }}</td>
    </tr>
    <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b;">📱 Aplikasi Terhubung</td>
        <td style="padding: 14px 18px; font-size: 13px; color: #334155;">{{ $authDetails['aplikasi'] ?? '-' }}</td>
    </tr>
</table>

<p style="font-size: 14px; color: #475569; margin-bottom: 24px; line-height: 1.6;">
Anda sekarang dapat masuk ke aplikasi menggunakan alamat email dan kata sandi yang telah didaftarkan.
</p>

<div style="text-align: center; margin: 28px 0;">
    <x-mail::button :url="config('app.url') . '/login'" color="success">
        Masuk ke Aplikasi Sekarang
    </x-mail::button>
</div>

Hormat kami,<br>
**{{ config('mail.from.name', 'PT. Tiga Serangkai') }}**
</x-mail::message>
