<x-mail::message>
# Permintaan Approval Dokumen

Anda memiliki permintaan approval baru untuk dokumen berikut:

**Judul Dokumen:** {{ $dokumen->judul_dokumen }}

**Nomor Dokumen:** {{ $dokumen->nomor_dokumen }}

**Diajukan oleh:** {{ $dokumen->user->name ?? 'N/A' }}

**Step:** {{ $stepName }}

**Deadline:** {{ $approval->tgl_deadline?->format('d M Y') ?? 'Tidak ada deadline' }}

@if($dokumen->deskripsi)
**Deskripsi:** {{ Str::limit($dokumen->deskripsi, 200) }}
@endif

<x-mail::button :url="$approvalUrl">
Lihat & Approve Dokumen
</x-mail::button>

Terima kasih,<br>
{{ config('app.name') }}
</x-mail::message>
