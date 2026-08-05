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

class RevisionUploadedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Dokumen $dokumen,
        public DokumenApproval $approval,
        public string $newVersion
    ) {
        $this->approval->load(['dokumen.user', 'masterflowStep.jabatan']);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Revision Uploaded] ' . $this->dokumen->judul_dokumen,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.revision-uploaded',
            with: [
                'dokumen' => $this->dokumen,
                'approval' => $this->approval,
                'newVersion' => $this->newVersion,
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
