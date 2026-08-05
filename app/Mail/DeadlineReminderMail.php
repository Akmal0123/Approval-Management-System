<?php

namespace App\Mail;

use App\Models\DokumenApproval;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DeadlineReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public DokumenApproval $approval,
        public string $timeLabel
    ) {
        $this->approval->load(['dokumen.user', 'masterflowStep']);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '⏰ [Reminder] Deadline Approval ' . $this->timeLabel,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.deadline-reminder',
            with: [
                'approval' => $this->approval,
                'dokumen' => $this->approval->dokumen,
                'timeLabel' => $this->timeLabel,
                'deadline' => $this->approval->tgl_deadline,
                'approvalUrl' => route('approvals.show', $this->approval->id),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
