# Fitur Email Notification

Dokumentasi lengkap untuk fitur notifikasi email pada Document Approval Management System.

---

## 📋 Daftar Isi

- [Overview](#overview)
- [Jenis Email Notification](#jenis-email-notification)
- [Konfigurasi Email](#konfigurasi-email)
- [Arsitektur & Flow](#arsitektur--flow)
- [File & Komponen Terkait](#file--komponen-terkait)
- [Troubleshooting](#troubleshooting)

---

## Overview

Sistem ini menyediakan notifikasi email otomatis untuk berbagai event dalam proses approval dokumen. Email dikirim secara asynchronous melalui Laravel Queue untuk memastikan performa aplikasi tetap optimal.

### Fitur Utama:

- ✅ Notifikasi saat dokumen membutuhkan approval
- ✅ Reminder deadline untuk approval yang mendekati batas waktu
- ✅ Notifikasi saat dokumen fully approved
- ✅ Notifikasi saat dokumen di-reject
- ✅ Notifikasi saat revisi diminta

---

## Jenis Email Notification

### 1. 📩 Approval Request (Permintaan Approval)

**Trigger:** Dokumen di-submit untuk approval atau approval berlanjut ke step berikutnya.

**Penerima:** User yang ditunjuk sebagai approver pada step tersebut.

**Konten Email:**

- Judul dokumen
- Nomor dokumen
- Nama pengaju
- Step/tahap approval
- Deadline
- Deskripsi dokumen
- Tombol untuk langsung ke halaman approval

**File Terkait:**

- Mail Class: `app/Mail/ApprovalRequestMail.php`
- Template: `resources/views/emails/approval-request.blade.php`
- Job: `app/Jobs/SendApprovalNotification.php`

---

### 2. ⏰ Deadline Reminder (Pengingat Deadline)

**Trigger:** Scheduled task yang berjalan harian untuk mengecek approval yang mendekati deadline.

**Penerima:** Approver yang memiliki pending approval mendekati deadline.

**Konten Email:**

- Informasi dokumen
- Sisa waktu sebelum deadline
- Link ke halaman approval

**File Terkait:**

- Mail Class: `app/Mail/DeadlineReminderMail.php`
- Template: `resources/views/emails/deadline-reminder.blade.php`
- Command: `app/Console/Commands/SendDeadlineReminders.php`

---

### 3. ✅ Document Fully Approved (Dokumen Disetujui)

**Trigger:** Semua step approval telah di-approve.

**Penerima:** User yang mengupload/mengajukan dokumen.

**Konten Email:**

- Konfirmasi dokumen telah disetujui
- Informasi dokumen
- Link untuk melihat dokumen final

**File Terkait:**

- Mail Class: `app/Mail/DocumentFullyApprovedMail.php`
- Template: `resources/views/emails/document-approved.blade.php`

---

### 4. ❌ Document Rejected (Dokumen Ditolak)

**Trigger:** Salah satu approver menolak dokumen.

**Penerima:** User yang mengupload/mengajukan dokumen.

**Konten Email:**

- Informasi bahwa dokumen ditolak
- Alasan penolakan
- Step yang menolak
- Instruksi untuk revisi
- Link ke dokumen

**File Terkait:**

- Mail Class: `app/Mail/DocumentRejectedMail.php`
- Template: `resources/views/emails/document-rejected.blade.php`

---

### 5. 📝 Revision Requested (Permintaan Revisi)

**Trigger:** Approver meminta revisi tanpa menolak dokumen.

**Penerima:** User yang mengupload/mengajukan dokumen.

**Konten Email:**

- Informasi bahwa revisi diperlukan
- Catatan revisi dari approver
- Link ke dokumen untuk upload revisi

**File Terkait:**

- Mail Class: `app/Mail/RevisionRequestedMail.php`
- Template: `resources/views/emails/revision-requested.blade.php`

---

## Konfigurasi Email

### Menggunakan Gmail SMTP (Gratis)

Untuk menggunakan Gmail sebagai mail server:

#### Langkah 1: Aktifkan 2-Factor Authentication

1. Buka [Google Account Security](https://myaccount.google.com/security)
2. Aktifkan **2-Step Verification**

#### Langkah 2: Generate App Password

1. Buka [App Passwords](https://myaccount.google.com/apppasswords)
2. Pilih App: **Mail**
3. Pilih Device: **Other** → ketik "Laravel App"
4. Klik **Generate**
5. Catat password 16 karakter yang muncul (contoh: `abcd efgh ijkl mnop`)

#### Langkah 3: Konfigurasi .env

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD="abcdefghijklmnop"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="your-email@gmail.com"
MAIL_FROM_NAME="Document Approval System"
```

> ⚠️ **Penting:**
>
> - Gunakan App Password, BUKAN password Gmail biasa
> - Password harus dalam tanda kutip jika mengandung spasi
> - Hapus spasi pada App Password saat memasukkan ke .env

#### Langkah 4: Clear Config Cache

```bash
php artisan config:clear
php artisan queue:restart
```

---

### Alternatif Mail Services

#### Mailtrap (Development/Testing)

```env
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@example.com"
MAIL_FROM_NAME="Document Approval System"
```

#### Mailgun (Production)

```env
MAIL_MAILER=mailgun
MAILGUN_DOMAIN=your-domain.mailgun.org
MAILGUN_SECRET=your-mailgun-api-key
MAIL_FROM_ADDRESS="noreply@your-domain.com"
MAIL_FROM_NAME="Document Approval System"
```

#### Amazon SES (Production)

```env
MAIL_MAILER=ses
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_REGION=us-east-1
MAIL_FROM_ADDRESS="noreply@your-verified-domain.com"
MAIL_FROM_NAME="Document Approval System"
```

---

## Arsitektur & Flow

### Flow Pengiriman Email

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Controller    │────▶│   Queue Job      │────▶│   Mail Class    │
│   (DokumenCtrl) │     │ (SendApproval    │     │ (ApprovalReq    │
│                 │     │  Notification)   │     │  Mail)          │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                         │
                                ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │   Database       │     │   Blade         │
                        │   (jobs table)   │     │   Template      │
                        └──────────────────┘     └─────────────────┘
                                │                         │
                                ▼                         │
                        ┌──────────────────┐              │
                        │   Queue Worker   │◀─────────────┘
                        │ (php artisan     │
                        │  queue:work)     │
                        └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   SMTP Server    │
                        │   (Gmail/etc)    │
                        └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   📧 Email       │
                        │   Delivered      │
                        └──────────────────┘
```

### Proses Detail

1. **Dokumen di-submit** → `DokumenController::store()` dipanggil
2. **Approval dibuat** → `DokumenApproval` record dibuat di database
3. **Job di-dispatch** → `SendApprovalNotification::dispatch($approval)`
4. **Job masuk queue** → Tersimpan di tabel `jobs` (database queue)
5. **Queue worker memproses** → `php artisan queue:work` mengambil job
6. **Email dikirim** → `ApprovalRequestMail` dikirim via SMTP
7. **Email diterima** → Approver menerima email di inbox

---

## File & Komponen Terkait

### Mail Classes (`app/Mail/`)

| File                            | Deskripsi                          |
| ------------------------------- | ---------------------------------- |
| `ApprovalRequestMail.php`       | Email permintaan approval          |
| `DeadlineReminderMail.php`      | Email reminder deadline            |
| `DocumentFullyApprovedMail.php` | Email konfirmasi dokumen disetujui |
| `DocumentRejectedMail.php`      | Email notifikasi dokumen ditolak   |
| `RevisionRequestedMail.php`     | Email permintaan revisi            |

### Email Templates (`resources/views/emails/`)

| File                           | Deskripsi                    |
| ------------------------------ | ---------------------------- |
| `approval-request.blade.php`   | Template permintaan approval |
| `deadline-reminder.blade.php`  | Template reminder deadline   |
| `document-approved.blade.php`  | Template dokumen disetujui   |
| `document-rejected.blade.php`  | Template dokumen ditolak     |
| `revision-requested.blade.php` | Template permintaan revisi   |

### Queue Job (`app/Jobs/`)

| File                           | Deskripsi                                 |
| ------------------------------ | ----------------------------------------- |
| `SendApprovalNotification.php` | Job untuk mengirim email approval request |

### Console Command (`app/Console/Commands/`)

| File                        | Deskripsi                                |
| --------------------------- | ---------------------------------------- |
| `SendDeadlineReminders.php` | Command untuk mengirim reminder deadline |

---

## Troubleshooting

### Email Tidak Terkirim

**1. Cek konfigurasi MAIL_MAILER**

```bash
php artisan tinker
>>> config('mail.default')
# Harus menampilkan: "smtp" (bukan "log")
```

**2. Cek queue worker berjalan**

```bash
php artisan queue:work
```

Queue worker harus selalu berjalan agar email terproses.

**3. Cek tabel jobs**

```sql
SELECT * FROM jobs;
```

Jika ada job yang gagal, cek tabel `failed_jobs`.

**4. Test kirim email manual**

```bash
php artisan tinker
>>> Mail::raw('Test email', function($m) { $m->to('test@example.com')->subject('Test'); });
```

### Error "Connection refused"

- Pastikan `MAIL_HOST` benar
- Pastikan `MAIL_PORT` benar (587 untuk TLS, 465 untuk SSL)
- Cek firewall tidak memblokir port tersebut

### Error "Authentication failed"

- Pastikan menggunakan App Password (untuk Gmail)
- Cek `MAIL_USERNAME` dan `MAIL_PASSWORD` benar
- Pastikan 2FA sudah aktif di akun Gmail

### Email Masuk ke Spam

- Pastikan `MAIL_FROM_ADDRESS` menggunakan domain yang terverifikasi
- Untuk production, gunakan layanan seperti Mailgun/SendGrid/SES
- Setup SPF, DKIM, dan DMARC records di DNS

---

## Batasan & Limitasi

### Gmail SMTP

- **500 email/hari** untuk akun Gmail biasa
- **2000 email/hari** untuk Google Workspace
- Cocok untuk development dan aplikasi skala kecil

### Rekomendasi Production

- Gunakan layanan transactional email seperti:
    - Mailgun (5000 email gratis/bulan untuk 3 bulan pertama)
    - SendGrid (100 email gratis/hari)
    - Amazon SES (~$0.10 per 1000 email)
    - Postmark (100 email gratis/bulan)

---

## Cara Menambah Jenis Email Baru

### 1. Buat Mail Class

```bash
php artisan make:mail NamaEmailBaru
```

### 2. Edit Mail Class

```php
// app/Mail/NamaEmailBaru.php
class NamaEmailBaru extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public $data) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Subject Email',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.nama-email-baru',
            with: ['data' => $this->data],
        );
    }
}
```

### 3. Buat Template

```blade
{{-- resources/views/emails/nama-email-baru.blade.php --}}
<x-mail::message>
# Judul Email

Konten email di sini...

<x-mail::button :url="$url">
Tombol Aksi
</x-mail::button>

Terima kasih,<br>
{{ config('app.name') }}
</x-mail::message>
```

### 4. Kirim Email

```php
// Di Controller atau Job
Mail::to($user->email)->send(new NamaEmailBaru($data));
```

---

_Dokumentasi ini dibuat pada 2026-01-16_
