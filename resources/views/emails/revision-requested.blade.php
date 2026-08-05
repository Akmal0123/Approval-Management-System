<x-mail::message>
    # Revisi Diperlukan

    Dokumen Anda memerlukan revisi sebelum dapat disetujui.

    <x-mail::panel>
        **Judul Dokumen:** {{ $dokumen->judul_dokumen }}

        **Nomor Dokumen:** {{ $dokumen->nomor_dokumen }}

        **Step:** {{ $stepName }}

        **Diminta oleh:** {{ $requester->name ?? 'N/A' }}
    </x-mail::panel>

    ## Catatan Revisi

    {{ $revisionNotes }}

    ---

    Silakan lakukan revisi sesuai catatan di atas dan upload ulang dokumen Anda. Approval yang sudah diberikan
    sebelumnya tetap valid.

    <x-mail::button :url="$documentUrl">
        Lihat Dokumen & Upload Revisi
    </x-mail::button>

    Terima kasih,<br>
    {{ config('app.name') }}
</x-mail::message>
