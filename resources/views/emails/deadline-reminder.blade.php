<x-mail::message>
# ⏰ Peringatan: Deadline Persetujuan {{ $timeLabel }}

Halo,

Anda memiliki pengajuan dokumen yang memerlukan persetujuan dan sudah mendekati batas waktu (deadline). Berikut adalah rincian informasi dokumen tersebut:

<x-mail::panel>
**1. Nama Dokumen:**  
{{ $dokumen->judul_dokumen }}

**2. Nomor Dokumen:**  
{{ $dokumen->nomor_dokumen }}

**3. Diajukan Oleh:**  
{{ $dokumen->user->name ?? 'N/A' }}

**4. Batas Waktu (Deadline):**  
{{ $deadline?->format('d M Y H:i') ?? 'N/A' }}
</x-mail::panel>

@if ($deadline && $deadline->isPast())
<x-mail::panel>
⚠️ **PERHATIAN:** Batas waktu (deadline) untuk persetujuan dokumen ini telah terlewat!
</x-mail::panel>
@endif

Mohon segera lakukan peninjauan dan persetujuan agar proses birokrasi dapat berjalan lancar.

<x-mail::button :url="$approvalUrl" color="primary">
Tinjau & Berikan Persetujuan
</x-mail::button>

Terima kasih atas kerja sama dan perhatian Anda.

Hormat kami,<br>
**{{ config('mail.from.name') }}**
</x-mail::message>
