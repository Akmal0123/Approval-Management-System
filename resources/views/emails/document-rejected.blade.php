<x-mail::message>
    # Dokumen Ditolak

    Dokumen Anda telah ditolak oleh approver.

    <x-mail::panel>
        **Judul Dokumen:** {{ $dokumen->judul_dokumen }}

        **Nomor Dokumen:** {{ $dokumen->nomor_dokumen }}

        **Ditolak oleh:** {{ $rejector->name ?? 'N/A' }}
    </x-mail::panel>

    ## Alasan Penolakan

    {{ $reason }}

    @if ($rejection->comment)
        **Catatan tambahan:** {{ $rejection->comment }}
    @endif

    ---

    Silakan lakukan revisi dan upload ulang dokumen Anda.

    <x-mail::button :url="$documentUrl">
        Lihat Dokumen & Upload Revisi
    </x-mail::button>

    Terima kasih,<br>
    {{ config('app.name') }}
</x-mail::message>
