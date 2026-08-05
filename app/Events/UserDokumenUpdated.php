<?php

namespace App\Events;

use App\Models\Dokumen;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class UserDokumenUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public Dokumen $dokumen)
    {
        // Don't load relations to avoid payload too large error
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        // Broadcast to user-specific channel
        return new Channel('user.' . $this->dokumen->user_id . '.dokumen');
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
        Log::info('UserDokumenUpdated::broadcastWith called', [
            'dokumen_id' => $this->dokumen->id,
            'user_id' => $this->dokumen->user_id,
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
                'user_id' => $this->dokumen->user_id,
                'updated_at' => $this->dokumen->updated_at?->toISOString(),
            ],
            'timestamp' => now()->toISOString(),
        ];
    }
}
