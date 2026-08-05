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

class DocumentRejectedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Dokumen $dokumen,
        public DokumenApproval $rejection
    ) {
        $this->rejection->load('user');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Rejected] ' . $this->dokumen->judul_dokumen,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.document-rejected',
            with: [
                'dokumen' => $this->dokumen,
                'rejection' => $this->rejection,
                'rejector' => $this->rejection->user,
                'reason' => $this->rejection->alasan_reject,
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
