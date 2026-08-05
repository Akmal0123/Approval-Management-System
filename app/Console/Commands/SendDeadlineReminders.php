<?php

namespace App\Console\Commands;

use App\Mail\DeadlineReminderMail;
use App\Models\DokumenApproval;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendDeadlineReminders extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'approvals:send-reminders 
                            {--dry-run : Run without actually sending emails}';

    /**
     * The console command description.
     */
    protected $description = 'Send deadline reminder emails for pending approvals';

    /**
     * Track which reminders have been sent (to avoid duplicates).
     * In production, this should be tracked in database.
     */
    private array $sentReminders = [];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $now = Carbon::now();

        $this->info('Starting deadline reminder check at ' . $now->toDateTimeString());

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No emails will be sent');
        }

        // H-3 reminder
        $count3Days = $this->sendReminders(
            $now->copy()->addDays(3),
            'reminder_3_days',
            '3 hari lagi',
            $dryRun
        );

        // H-1 reminder
        $count1Day = $this->sendReminders(
            $now->copy()->addDay(),
            'reminder_1_day',
            'besok',
            $dryRun
        );

        // Same day reminder
        $countToday = $this->sendReminders(
            $now,
            'reminder_today',
            'hari ini',
            $dryRun
        );

        // Overdue escalation
        $countOverdue = $this->sendOverdueReminders($dryRun);

        $this->newLine();
        $this->info('Summary:');
        $this->line("  - H-3 reminders: {$count3Days}");
        $this->line("  - H-1 reminders: {$count1Day}");
        $this->line("  - Same day reminders: {$countToday}");
        $this->line("  - Overdue reminders: {$countOverdue}");

        $total = $count3Days + $count1Day + $countToday + $countOverdue;
        $this->info("Total reminders " . ($dryRun ? 'found' : 'sent') . ": {$total}");

        return Command::SUCCESS;
    }

    /**
     * Send reminders for approvals with deadline on target date.
     */
    private function sendReminders(Carbon $targetDate, string $reminderType, string $timeLabel, bool $dryRun): int
    {
        $approvals = DokumenApproval::with(['dokumen.user', 'user'])
            ->where('approval_status', 'pending')
            ->whereDate('tgl_deadline', $targetDate->toDateString())
            ->get();

        $count = 0;

        foreach ($approvals as $approval) {
            if (!$approval->user?->email) {
                continue;
            }

            // Check user email preferences
            $emailPreferences = $approval->user->email_preferences ?? [];
            if (isset($emailPreferences['deadline_reminder']) && $emailPreferences['deadline_reminder'] === false) {
                continue;
            }

            if ($dryRun) {
                $this->line("  Would send {$reminderType} to: {$approval->user->email} for approval #{$approval->id}");
            } else {
                try {
                    Mail::to($approval->user->email)
                        ->send(new DeadlineReminderMail($approval, $timeLabel));

                    Log::info('Deadline reminder sent', [
                        'type' => $reminderType,
                        'approval_id' => $approval->id,
                        'email' => $approval->user->email,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send deadline reminder', [
                        'type' => $reminderType,
                        'approval_id' => $approval->id,
                        'error' => $e->getMessage(),
                    ]);
                    continue;
                }
            }

            $count++;
        }

        if ($count > 0) {
            $this->info("Sent {$count} {$reminderType} reminders (deadline: {$timeLabel})");
        }

        return $count;
    }

    /**
     * Send reminders for overdue approvals.
     */
    private function sendOverdueReminders(bool $dryRun): int
    {
        $overdueApprovals = DokumenApproval::with(['dokumen.user', 'user'])
            ->where('approval_status', 'pending')
            ->where('tgl_deadline', '<', now())
            ->get();

        $count = 0;

        foreach ($overdueApprovals as $approval) {
            if (!$approval->user?->email) {
                continue;
            }

            if ($dryRun) {
                $this->line("  Would send overdue reminder to: {$approval->user->email} for approval #{$approval->id}");
            } else {
                try {
                    Mail::to($approval->user->email)
                        ->send(new DeadlineReminderMail($approval, 'TERLEWAT'));

                    Log::info('Overdue reminder sent', [
                        'approval_id' => $approval->id,
                        'email' => $approval->user->email,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send overdue reminder', [
                        'approval_id' => $approval->id,
                        'error' => $e->getMessage(),
                    ]);
                    continue;
                }
            }

            $count++;
        }

        return $count;
    }
}
