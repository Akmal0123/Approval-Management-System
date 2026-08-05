<x-mail::message>
    # ⏰ Reminder: Deadline Approval {{ $timeLabel }}

    Anda memiliki approval yang mendekati deadline.

    <x-mail::panel>
        **Judul Dokumen:** {{ $dokumen->judul_dokumen }}

        **Nomor Dokumen:** {{ $dokumen->nomor_dokumen }}

        **Diajukan oleh:** {{ $dokumen->user->name ?? 'N/A' }}

        **Deadline:** {{ $deadline?->format('d M Y H:i') ?? 'N/A' }}
    </x-mail::panel>

    @if ($deadline && $deadline->isPast())
        <x-mail::panel>
            ⚠️ **PERHATIAN:** Deadline approval ini sudah terlewat!
        </x-mail::panel>
    @endif

    Mohon segera lakukan approval agar proses dokumen dapat berjalan lancar.

    <x-mail::button :url="$approvalUrl">
        Lihat & Approve Dokumen
    </x-mail::button>

    Terima kasih,<br>
    {{ config('app.name') }}
</x-mail::message>
