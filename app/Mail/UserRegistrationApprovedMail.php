<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserRegistrationApprovedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public array $authDetails
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pendaftaran Akun Disetujui',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.user-registration-approved',
            with: [
                'user' => $this->user,
                'authDetails' => $this->authDetails,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
