<?php

namespace App\Events;

use App\Models\Dokumen;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DokumenUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Dokumen $dokumen;

    /**
     * Create a new event instance.
     */
    public function __construct(Dokumen $dokumen)
    {
        // Only load essential relations for minimal payload
        $this->dokumen = $dokumen;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        return new Channel('dokumen.' . $this->dokumen->id);
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'dokumen.updated';
    }

    /**
     * Get the data to broadcast.
     * Only send essential data to avoid "Payload too large" error.
     */
    public function broadcastWith(): array
    {
        Log::info('DokumenUpdated::broadcastWith called', [
            'dokumen_id' => $this->dokumen->id,
            'judul' => $this->dokumen->judul_dokumen,
            'status' => $this->dokumen->status
        ]);

        // Send minimal payload - frontend should reload for full data
        return [
            'dokumen' => [
                'id' => $this->dokumen->id,
                'judul_dokumen' => $this->dokumen->judul_dokumen,
                'nomor_dokumen' => $this->dokumen->nomor_dokumen,
                'status' => $this->dokumen->status,
                'status_current' => $this->dokumen->status_current,
                'updated_at' => $this->dokumen->updated_at?->toISOString(),
            ],
            'timestamp' => now()->toISOString(),
        ];
    }
}
