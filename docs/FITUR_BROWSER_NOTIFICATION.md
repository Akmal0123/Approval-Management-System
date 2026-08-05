# Browser Notification Feature

Dokumentasi fitur notifikasi browser untuk Document Approval Management System.

## Gambaran Umum

Fitur browser notification memungkinkan pengguna menerima notifikasi real-time langsung di browser mereka ketika ada aktivitas penting pada dokumen, seperti:

- Dokumen baru yang membutuhkan persetujuan
- Dokumen yang telah direvisi
- Dokumen yang ditolak
- Permintaan revisi dokumen

## Arsitektur

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Laravel   │────▶│   Reverb    │────▶│ Laravel Echo│────▶│   Browser   │
│   Backend   │     │  WebSocket  │     │  (Frontend) │     │ Notification│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                                                            │
      │  BrowserNotificationEvent                                  │
      │  - userId                                                  │
      │  - title                                         ┌─────────▼─────────┐
      │  - body                                          │  Toast + Browser  │
      │  - url                                           │   Notification    │
      │  - type                                          └───────────────────┘
      └──────────────────────────────────────────────────────────────────────▶
```

## Komponen

### Backend

| File                                      | Deskripsi                                                   |
| ----------------------------------------- | ----------------------------------------------------------- |
| `app/Events/BrowserNotificationEvent.php` | Event class untuk broadcast notifikasi                      |
| `routes/channels.php`                     | Definisi channel `user.{userId}.notifications`              |
| `DokumenController.php`                   | Dispatch notifikasi saat `store()` dan `uploadRevision()`   |
| `DokumenApprovalController.php`           | Dispatch notifikasi saat `reject()` dan `requestRevision()` |
| `app/Mail/RevisionUploadedMail.php`       | Email notifikasi saat revisi diupload untuk grup approval   |

### Frontend

| File                                               | Deskripsi                                                  |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `resources/js/hooks/useBrowserNotification.ts`     | Hook untuk mengelola permission dan menampilkan notifikasi |
| `resources/js/components/NotificationListener.tsx` | Komponen yang listen event dari Echo channel               |

## Trigger Notifikasi

### 1. Dokumen Baru Membutuhkan Persetujuan

- **Trigger**: User upload dokumen dengan approvers
- **Penerima**: Setiap approver yang dipilih
- **Type**: `info` (biru)

### 2. Dokumen Telah Direvisi

- **Trigger**: Owner upload revisi dokumen
- **Penerima**: Approvers yang perlu mereview revisi
- **Type**: `info` (biru)

### 3. Dokumen Ditolak

- **Trigger**: Approver reject dokumen
- **Penerima**: Owner dokumen
- **Type**: `error` (merah)

### 4. Revisi Dokumen Diminta

- **Trigger**: Approver request revision
- **Penerima**: Owner dokumen
- **Type**: `warning` (kuning)

### 5. Revisi Dokumen Telah Diupload

- **Trigger**: Owner upload revisi dokumen untuk grup approval
- **Penerima**: Semua approver dalam grup yang approval-nya di-reset
- **Type**: `info` (biru)

## Konfigurasi

### Prerequisites

1. **Laravel Reverb** harus berjalan:

    ```bash
    php artisan reverb:start
    ```

2. **Environment variables** di `.env`:

    ```ini
    REVERB_APP_ID=your_app_id
    REVERB_APP_KEY=your_app_key
    REVERB_APP_SECRET=your_app_secret
    REVERB_HOST=localhost
    REVERB_PORT=8080
    REVERB_SCHEME=http

    VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
    VITE_REVERB_HOST="${REVERB_HOST}"
    VITE_REVERB_PORT="${REVERB_PORT}"
    VITE_REVERB_SCHEME="${REVERB_SCHEME}"
    ```

### Permission Browser

Saat user pertama kali login, sistem akan meminta izin notifikasi browser. Status permission:

- **`default`**: Belum pernah diminta - akan muncul popup
- **`granted`**: Sudah diizinkan - notifikasi akan muncul
- **`denied`**: Diblokir - user harus reset permission manual

#### Reset Permission (Chrome)

1. Klik ikon 🔒 di address bar
2. Klik **Site settings**
3. Cari **Notifications**
4. Ubah ke **Ask** atau **Allow**

## Cara Kerja

### Backend Flow

1. Event terjadi (misal: dokumen di-upload)
2. Controller create `BrowserNotificationEvent` dengan data:
    - `userId`: ID penerima notifikasi
    - `title`: Judul notifikasi
    - `body`: Isi pesan
    - `url`: URL untuk di-redirect saat diklik
    - `type`: Tipe notifikasi (info/success/warning/error)
3. Event di-broadcast ke channel `user.{userId}.notifications`
4. Laravel Reverb mengirim via WebSocket

### Frontend Flow

1. `NotificationListener` subscribe ke channel user
2. Saat event diterima:
    - **Toast notification** selalu muncul (tidak butuh permission)
    - **Browser notification** muncul jika permission granted
3. User klik notifikasi → redirect ke URL terkait

## Debugging

### Console Logs

Buka browser DevTools (F12) → Console, cari log dengan emoji 🔔:

```
🔔 NotificationListener mounted
🔔 Subscribing to notification channel: user.14.notifications
🔔 Received browser notification: {title: "...", body: "..."}
```

### Laravel Logs

Cek `storage/logs/laravel.log`:

```
BrowserNotificationEvent constructed {"user_id":14,"title":"..."}
BrowserNotificationEvent::broadcastOn {"channel":"user.14.notifications"}
```

## Troubleshooting

### Notifikasi tidak muncul

1. **Cek Reverb berjalan**: `php artisan reverb:start`
2. **Cek console logs**: Ada error WebSocket?
3. **Cek permission**: Sudah granted?
4. **Cek channel subscription**: Log `🔔 Subscribing to notification channel` muncul?

### Toast muncul tapi browser notification tidak

- Permission mungkin `denied`
- Reset permission di browser settings

### Channel tidak ter-subscribe

- Cek `window.Echo` sudah terinisialisasi di console
- Cek konfigurasi Reverb di `.env`
