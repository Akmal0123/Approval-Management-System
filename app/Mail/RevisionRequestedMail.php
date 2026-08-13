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
        $requesterEmail = $this->approval->user?->email ?? $this->approval->approver_email;
        $replyTo = $requesterEmail ? [new \Illuminate\Mail\Mailables\Address($requesterEmail, $this->approval->user?->name ?? $requesterEmail)] : [];

        return new Envelope(
            subject: '[Permintaan Revisi] ' . $this->dokumen->judul_dokumen,
            replyTo: $replyTo,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.revision-requested',
            with: [
                'dokumen' => $this->dokumen,
                'approval' => $this->approval,
                'requesterName' => $this->approval->user?->name ?? $this->approval->approver_email ?? 'Approver',
                'revisionNotes' => $this->approval->revision_notes,
                'stepName' => $this->approval->step_name ?? 'Approval',
                'documentUrl' => route('dokumen.detail', $this->dokumen->id),
                'pdfUrl' => route('dokumen.signed-pdf', $this->dokumen->id),
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
