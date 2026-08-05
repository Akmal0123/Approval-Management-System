<?php

namespace App\Mail;

use App\Models\DokumenApproval;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApprovalRequestMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public DokumenApproval $approval
    ) {
        $this->approval->load(['dokumen.user', 'masterflowStep.jabatan']);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Approval Required] ' . $this->approval->dokumen->judul_dokumen,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.approval-request',
            with: [
                'approval' => $this->approval,
                'dokumen' => $this->approval->dokumen,
                'stepName' => $this->approval->masterflowStep?->step_name ?? 'Approval',
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
