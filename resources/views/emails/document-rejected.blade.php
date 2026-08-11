<x-mail::message>
# ❌ Dokumen Ditolak

Halo,

Mohon maaf, dokumen yang Anda ajukan telah ditolak. Berikut adalah rincian informasi penolakan tersebut:

<x-mail::panel>
**1. Nama Dokumen:**  
{{ $dokumen->judul_dokumen }}

**2. Nomor Dokumen:**  
{{ $dokumen->nomor_dokumen }}

**3. Ditolak Oleh:**  
{{ $rejector->name ?? 'N/A' }}
</x-mail::panel>

**Alasan Penolakan:**  
{{ $reason }}

@if ($rejection->comment)
**Catatan Tambahan:**  
{{ $rejection->comment }}
@endif

Silakan periksa kembali catatan penolakan di atas dan unggah ulang dokumen yang telah disesuaikan jika diperlukan.

<x-mail::button :url="$documentUrl" color="error">
Lihat Dokumen
</x-mail::button>

Terima kasih atas perhatian Anda.

Hormat kami,<br>
**{{ config('mail.from.name') }}**
</x-mail::message>
