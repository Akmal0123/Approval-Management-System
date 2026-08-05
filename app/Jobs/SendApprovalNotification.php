<?php

namespace App\Jobs;

use App\Mail\ApprovalRequestMail;
use App\Models\DokumenApproval;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendApprovalNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public DokumenApproval $approval
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $approval = $this->approval->load(['dokumen.user', 'user', 'masterflowStep']);

        // Check if user has email and email notifications enabled
        if (!$approval->user || !$approval->user->email) {
            Log::warning('SendApprovalNotification: No email found for approval', [
                'approval_id' => $approval->id,
                'user_id' => $approval->user_id,
            ]);
            return;
        }

        // Check user email preferences (if exists)
        $emailPreferences = $approval->user->email_preferences ?? [];
        if (isset($emailPreferences['approval_request']) && $emailPreferences['approval_request'] === false) {
            Log::info('SendApprovalNotification: User disabled approval request emails', [
                'approval_id' => $approval->id,
                'user_id' => $approval->user_id,
            ]);
            return;
        }

        try {
            Mail::to($approval->user->email)
                ->send(new ApprovalRequestMail($approval));

            Log::info('SendApprovalNotification: Email sent successfully', [
                'approval_id' => $approval->id,
                'user_id' => $approval->user_id,
                'email' => $approval->user->email,
            ]);
        } catch (\Exception $e) {
            Log::error('SendApprovalNotification: Failed to send email', [
                'approval_id' => $approval->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
