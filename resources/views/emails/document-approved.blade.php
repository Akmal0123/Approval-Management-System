<x-mail::message>
# ✅ Dokumen Disetujui

Halo,

Selamat! Dokumen Anda telah disetujui oleh semua pihak terkait. Berikut adalah rincian informasi dokumen tersebut:

<x-mail::panel>
**1. Nama Dokumen:**  
{{ $dokumen->judul_dokumen }}

**2. Nomor Dokumen:**  
{{ $dokumen->nomor_dokumen }}

**3. Status:**  
Fully Approved
</x-mail::panel>

Dokumen dengan tanda tangan digital sudah tersedia untuk diunduh.

<x-mail::button :url="$documentUrl" color="success">
Lihat & Unduh Dokumen
</x-mail::button>

Terima kasih atas kerja sama Anda.

Hormat kami,<br>
**{{ config('mail.from.name') }}**
</x-mail::message>
