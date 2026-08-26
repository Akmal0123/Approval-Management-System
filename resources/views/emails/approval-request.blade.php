<x-mail::message>
# Permintaan Persetujuan Dokumen

Halo,

Anda menerima permintaan persetujuan (approval) baru. Berikut adalah rincian informasi pengajuan dokumen tersebut:

<x-mail::panel>
**1. Nama Dokumen:**  
{{ $dokumen->judul_dokumen }}

**2. Nomor Dokumen:**  
{{ $dokumen->nomor_dokumen }}

**3. Diajukan Oleh:**  
{{ $dokumen->user->name ?? 'N/A' }}

**4. Posisi / Jabatan:**  
{{ $dokumen->user->user_auths->first()?->jabatan->name ?? 'N/A' }}

**5. Tanggal Pengajuan:**  
{{ $dokumen->tgl_pengajuan?->format('d M Y') ?? $dokumen->created_at->format('d M Y') }}

**6. Deadline Pengajuan:**  
{{ $approval->tgl_deadline?->format('d M Y') ?? 'Tidak ada deadline' }}
</x-mail::panel>

@if($dokumen->deskripsi)
**Deskripsi Tambahan:**  
{{ Str::limit($dokumen->deskripsi, 250) }}

@endif
Harap segera meninjau dokumen ini agar proses birokrasi dan operasional dapat berjalan dengan lancar.

<x-mail::button :url="$approvalUrl" color="primary">
Tinjau & Berikan Persetujuan
</x-mail::button>

Terima kasih atas kerja sama dan perhatian Anda.

Hormat kami,<br>
**{{ config('mail.from.name') }}**
</x-mail::message>
