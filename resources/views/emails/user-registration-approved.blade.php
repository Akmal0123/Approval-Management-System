<x-mail::message>
# 🎉 Pendaftaran Akun Disetujui

Halo {{ $user->name }},

Selamat! Permintaan registrasi akun Anda telah dikonfirmasi dan disetujui oleh Super Admin. Berikut adalah rincian hak akses (otorisasi) yang telah diberikan kepada Anda:

<x-mail::panel>
**1. Role (Peran):**  
{{ $authDetails['role'] }}

**2. Company (Perusahaan):**  
{{ $authDetails['company'] }}

**3. Posisi / Jabatan:**  
{{ $authDetails['jabatan'] }}

**4. Aplikasi:**  
{{ $authDetails['aplikasi'] }}
</x-mail::panel>

Anda sekarang sudah dapat masuk ke sistem dan mengakses fitur-fitur yang tersedia sesuai dengan peran dan jabatan Anda.

<x-mail::button :url="config('app.url')" color="success">
Masuk ke Aplikasi
</x-mail::button>

Terima kasih.

Hormat kami,<br>
**{{ config('mail.from.name') }}**
</x-mail::message>
