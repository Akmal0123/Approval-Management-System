<?php

namespace App\Mail;

use App\Models\Dokumen;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DocumentFullyApprovedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Dokumen $dokumen
    ) {
        $this->dokumen->load(['approvals.user', 'latestVersion']);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $nomorStr = $this->dokumen->nomor_dokumen ? ' (' . $this->dokumen->nomor_dokumen . ')' : '';
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name', 'Sistem Persetujuan Dokumen')),
            subject: '[Persetujuan Dokumen] ✅ Disetujui: ' . $this->dokumen->judul_dokumen . $nomorStr,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.document-approved',
            with: [
                'dokumen' => $this->dokumen,
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
