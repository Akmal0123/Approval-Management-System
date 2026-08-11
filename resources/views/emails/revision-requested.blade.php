<x-mail::message>
# 📝 Permintaan Revisi Dokumen

Halo,

Dokumen Anda memerlukan revisi sebelum dapat disetujui. Berikut adalah rincian informasinya:

<x-mail::panel>
**1. Nama Dokumen:**  
{{ $dokumen->judul_dokumen }}

**2. Nomor Dokumen:**  
{{ $dokumen->nomor_dokumen }}

**3. Tahap Persetujuan (Step):**  
{{ $stepName }}

**4. Diminta Oleh:**  
{{ $requester->name ?? 'N/A' }}
</x-mail::panel>

**Catatan Revisi:**  
{{ $revisionNotes }}

Silakan lakukan perbaikan sesuai dengan catatan di atas dan unggah ulang dokumen Anda. *Persetujuan (approval) yang telah diberikan sebelumnya akan tetap valid.*

<x-mail::button :url="$documentUrl" color="primary">
Lihat Dokumen & Unggah Revisi
</x-mail::button>

Terima kasih atas kerja sama Anda.

Hormat kami,<br>
**{{ config('mail.from.name') }}**
</x-mail::message>
