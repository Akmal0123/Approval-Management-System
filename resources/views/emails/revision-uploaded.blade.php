<x-mail::message>
    # Revisi Dokumen Telah Diupload

    Dokumen berikut telah direvisi dan membutuhkan review ulang dari Anda:

    **Judul Dokumen:** {{ $dokumen->judul_dokumen }}

    **Nomor Dokumen:** {{ $dokumen->nomor_dokumen }}

    **Diajukan oleh:** {{ $dokumen->user->name ?? 'N/A' }}

    **Versi Baru:** {{ $newVersion }}

    **Step:** {{ $stepName }}

    @if ($approval->tgl_deadline)
        **Deadline:** {{ $approval->tgl_deadline->format('d M Y') }}
    @endif

    > Dokumen ini memerlukan persetujuan ulang karena telah direvisi oleh pemilik dokumen.

    <x-mail::button :url="$approvalUrl">
        Review & Approve Dokumen
    </x-mail::button>

    Terima kasih,<br>
    {{ config('app.name') }}
</x-mail::message>
