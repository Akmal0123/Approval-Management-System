<?php

namespace App\Events;

use App\Models\DokumenApproval;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ApprovalCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public DokumenApproval $approval)
    {
        // Load all necessary relations
        $this->approval->load([
            'dokumen.user',
            'dokumen.masterflow',
            'dokumen.latestVersion',
            'user.profile',
            'masterflowStep.jabatan',
        ]);

        Log::info('🔔 ApprovalCreated event constructed', [
            'approval_id' => $this->approval->id,
            'user_id' => $this->approval->user_id,
            'channel_will_be' => 'user.' . $this->approval->user_id . '.approvals',
        ]);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        $channelName = 'user.' . $this->approval->user_id . '.approvals';

        Log::info('🔔 ApprovalCreated::broadcastOn called', [
            'channel' => $channelName,
            'user_id' => $this->approval->user_id,
            'approval_id' => $this->approval->id,
        ]);

        // Broadcast to user-specific approvals channel
        return new Channel($channelName);
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'approval.created';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        Log::info('ApprovalCreated::broadcastWith called', [
            'approval_id' => $this->approval->id,
            'user_id' => $this->approval->user_id,
            'dokumen_id' => $this->approval->dokumen_id,
            'dokumen_judul' => $this->approval->dokumen->judul_dokumen ?? null,
        ]);

        return [
            'approval' => $this->approval,
            'timestamp' => now(),
        ];
    }
}
