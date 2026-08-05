<?php

namespace App\Mail;

use App\Models\Dokumen;
use App\Models\DokumenApproval;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RevisionRequestedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Dokumen $dokumen,
        public DokumenApproval $approval
    ) {
        $this->approval->load(['user', 'masterflowStep']);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Revision Required] ' . $this->dokumen->judul_dokumen,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.revision-requested',
            with: [
                'dokumen' => $this->dokumen,
                'approval' => $this->approval,
                'requester' => $this->approval->user,
                'revisionNotes' => $this->approval->revision_notes,
                'stepName' => $this->approval->masterflowStep?->step_name ?? 'Approval',
                'documentUrl' => route('dokumen.detail', $this->dokumen->id),
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
