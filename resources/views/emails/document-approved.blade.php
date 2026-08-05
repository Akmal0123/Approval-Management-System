<x-mail::message>
    # ✅ Dokumen Disetujui

    Selamat! Dokumen Anda telah disetujui oleh semua pihak.

    <x-mail::panel>
        **Judul Dokumen:** {{ $dokumen->judul_dokumen }}

        **Nomor Dokumen:** {{ $dokumen->nomor_dokumen }}

        **Status:** Fully Approved
    </x-mail::panel>

    Dokumen dengan tanda tangan digital sudah tersedia untuk diunduh.

    <x-mail::button :url="$documentUrl">
        Lihat & Unduh Dokumen
    </x-mail::button>

    Terima kasih,<br>
    {{ config('app.name') }}
</x-mail::message>
