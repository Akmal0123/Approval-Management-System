<x-mail::message>
# 🔄 Revisi Dokumen Telah Diunggah

Halo,

Dokumen berikut telah direvisi dan membutuhkan peninjauan ulang dari Anda:

<x-mail::panel>
**1. Nama Dokumen:**  
{{ $dokumen->judul_dokumen }}

**2. Nomor Dokumen:**  
{{ $dokumen->nomor_dokumen }}

**3. Diajukan Oleh:**  
{{ $dokumen->user->name ?? 'N/A' }}

**4. Versi Baru:**  
{{ $newVersion }}

**5. Tahap Persetujuan (Step):**  
{{ $stepName }}

@if ($approval->tgl_deadline)
**6. Deadline Pengajuan:**  
{{ $approval->tgl_deadline->format('d M Y') }}
@endif
</x-mail::panel>

> **Catatan:** Dokumen ini memerlukan persetujuan ulang karena telah diperbarui atau direvisi oleh pemilik dokumen.

<x-mail::button :url="$approvalUrl" color="primary">
Tinjau Ulang & Berikan Persetujuan
</x-mail::button>

Terima kasih atas kerja sama dan perhatian Anda.

Hormat kami,<br>
**{{ config('mail.from.name') }}**
</x-mail::message>
