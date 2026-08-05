<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Event for browser notifications.
 * This event broadcasts to a user-specific channel to trigger browser notifications.
 */
class BrowserNotificationEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public int $userId,
        public string $title,
        public string $body,
        public string $url,
        public string $type = 'info' // info, success, warning, error
    ) {
        Log::info('🔔 BrowserNotificationEvent constructed', [
            'user_id' => $this->userId,
            'title' => $this->title,
            'type' => $this->type,
        ]);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        $channelName = 'user.' . $this->userId . '.notifications';

        Log::info('🔔 BrowserNotificationEvent::broadcastOn', [
            'channel' => $channelName,
            'user_id' => $this->userId,
        ]);

        return new Channel($channelName);
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'browser.notification';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'url' => $this->url,
            'type' => $this->type,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
