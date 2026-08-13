<?php

namespace App\Mail;

use App\Models\DokumenApproval;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
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
        $nomorStr = $this->approval->dokumen->nomor_dokumen ? ' (' . $this->approval->dokumen->nomor_dokumen . ')' : '';
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name', 'Sistem Persetujuan Dokumen')),
            subject: '[Persetujuan Dokumen] 📝 Permohonan Persetujuan: ' . $this->approval->dokumen->judul_dokumen . $nomorStr,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.approval-request',
            with: [
                'approval' => $this->approval,
                'dokumen' => $this->approval->dokumen,
                'stepName' => $this->approval->masterflowStep?->step_name ?? 'Approval',
                'approvalUrl' => route('approvals.show', $this->approval->id),
                'pdfUrl' => route('dokumen.signed-pdf', $this->approval->dokumen_id),
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
