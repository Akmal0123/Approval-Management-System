# Fastify Real-Time Push Notification Backend

Dokumentasi arsitektur dan implementasi teknis pemenuhan hasil review pengembangan backend.

---

## 1. Pemenuhan Hasil Review

> **Catatan Review:**
> **Pengembangan Backend**: *Menggunakan Fastify sebagai backend; kebutuhan real-time difokuskan pada push notification*

Dokumen ini menjelaskan implementasi teknis di mana **Fastify** berperan sebagai backend microservice berkecepatan tinggi yang secara khusus difokuskan untuk mengelola kebutuhan **real-time push notification** dan koneksi WebSocket ke peramban (browser) pengguna, mendampingi backend utama Laravel AMS.

---

## 2. Arsitektur Real-Time Push Notification

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND (React Client)                               │
│  - useFastifyWebSocket hook                                                             │
│  - NotificationListener.tsx                                                             │
│  - Web Notifications API (Desktop Push) + Toast UI                                      │
└───────────────────────────────▲───────────────────────────────────────▲─────────────────┘
                                │                                       │
                                │ 1. Form Submission (Upload / Approve) │ 3. WebSocket Real-Time Push
                                │                                       │    (ws://localhost:5000/ws/notifications?userId=X)
                                ▼                                       │
┌───────────────────────────────────────────────────────┐               │
│               LARAVEL AMS BACKEND (Port 8000)         │               │
│  - DokumenController / DokumenApprovalController      │               │
│  - BrowserNotificationEvent                           │               │
│  - FastifyNotificationService::sendToUser()           │               │
└───────────────────────────────┬───────────────────────┘               │
                                │                                       │
                                │ 2. HTTP POST /api/notifications/push  │
                                ▼                                       │
┌───────────────────────────────────────────────────────────────────────┴─────────────────┐
│                     FASTIFY BACKEND SERVICE (Port 5000)                                 │
│  - Plugin @fastify/websocket                                                            │
│  - NotificationService (In-Memory User Socket Pool & History Cache)                     │
│  - Real-time Push Dispatcher                                                            │
│  - REST Endpoints (/push, /broadcast, /stats, /history/:userId)                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponen Implementasi

### A. Fastify Service (`integration-service/`)

1. **`services/notification.service.js`**
   - Mengelola pool koneksi WebSocket yang dipetakan berdasarkan `userId`.
   - Menangani pengiriman pesan terarah (`sendToUser`) maupun siaran umum (`broadcast`).
   - Menyimpan buffer in-memory history notifikasi terbaru per pengguna.
   - Menyediakan statistik metrik real-time (jumlah koneksi aktif, user aktif, total notifikasi terkirim, uptime).

2. **`routes/notification.routes.js`**
   - `GET /ws/notifications?userId=:id`: Endpoint WebSocket duplex untuk client browser.
   - `POST /api/notifications/push`: Endpoint HTTP untuk trigger push notifikasi ke user spesifik.
   - `POST /api/notifications/broadcast`: Endpoint HTTP untuk trigger broadcast ke seluruh pengguna.
   - `GET /api/notifications/stats`: Endpoint monitoring status backend Fastify.
   - `GET /api/notifications/history/:userId`: Endpoint riwayat notifikasi user.

3. **`server.js`**
   - Mendaftarkan plugin `@fastify/websocket`.
   - Mendaftarkan route notifikasi bersamaan dengan route integrasi eksternal.

### B. Laravel Backend (`Approval-Management-System/`)

1. **`app/Services/FastifyNotificationService.php`**
   - Service class penyedia metode statis untuk mengirimkan notifikasi push ke Fastify secara non-blocking:
     ```php
     FastifyNotificationService::sendToUser(
         userId: $approverId,
         title: 'Dokumen Membutuhkan Persetujuan',
         body: "Dokumen {$dokumen->nomor_dokumen} menunggu persetujuan Anda.",
         url: "/dokumen/{$dokumen->id}",
         type: 'info'
     );
     ```

2. **`app/Events/BrowserNotificationEvent.php`**
   - Otomatis memicu `FastifyNotificationService::sendToUser(...)` saat event dibuat dari Controller (seperti saat dokumen diupload, disetujui, ditolak, atau diminta revisi).

### C. Frontend React (`resources/js/`)

1. **`resources/js/hooks/useFastifyWebSocket.ts`**
   - Hook React untuk koneksi WebSocket ke Fastify:
     - Koneksi instan berdasarkan `userId` yang sedang login.
     - Mekanisme auto-reconnect dengan backoff interval.
     - Heartbeat ping-pong 30 detik untuk menjaga koneksi tetap hidup.

2. **`resources/js/components/NotificationListener.tsx`**
   - Listener global di level layout:
     - Menerima payload push notifikasi dari Fastify WebSocket.
     - Menampilkan **Toast Notification** interaktif.
     - Memicu **Native Browser Desktop Notification** (Web Notifications API).
     - Menangani navigasi instan ke dokumen terkait saat notifikasi diklik.
     - Dilengkapi mekanisme *deduplication* untuk mencegah notifikasi ganda.

---

## 4. Spesifikasi API Fastify Real-Time

### 1. WebSocket Connection
- **URL:** `ws://localhost:5000/ws/notifications?userId={userId}`
- **Query Params:**
  - `userId` *(wajib)*: ID user yang sedang aktif.
- **Connection Ack:**
  ```json
  {
    "type": "connection.ack",
    "userId": "14",
    "message": "Connected to Fastify Real-Time Push Notification Service",
    "timestamp": "2026-09-16T04:26:51.000Z"
  }
  ```

### 2. Push Notification ke User Spesifik
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/notifications/push`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "userId": 14,
    "title": "Dokumen Baru Membutuhkan Persetujuan",
    "body": "Dokumen PO-2026-0001 memerlukan tindakan Anda.",
    "url": "/dokumen/1",
    "type": "info"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "userId": "14",
    "notificationId": "080f34a3-3b00-4c76-83f2-7bcf021f5cad",
    "deliveredSockets": 1,
    "isOnline": true,
    "timestamp": "2026-09-16T04:29:42.271Z"
  }
  ```

### 3. Monitoring Stats
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/notifications/stats`
- **Response (200 OK):**
  ```json
  {
    "status": "active",
    "service": "Fastify Real-Time Push Notification",
    "activeUsersCount": 2,
    "activeSocketsCount": 2,
    "connectedUserIds": ["10", "14"],
    "totalPushed": 5,
    "totalBroadcast": 0,
    "uptimeSeconds": 186
  }
  ```

---

## 5. Pengujian & Verifikasi

Pengujian dapat dijalankan kapan saja menggunakan script pengujian otomatis:

1. **Pengujian End-to-End WebSocket & Push Endpoint (Node.js):**
   ```bash
   node scripts/test_fastify_push_notification.js
   ```

2. **Pengujian Integrasi Laravel ke Fastify (PHP):**
   ```bash
   php scripts/test_laravel_fastify_push.php
   ```
