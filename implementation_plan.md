# Rencana Implementasi Tanda Tangan QR Code

Rencana ini dibuat untuk menambahkan metode tanda tangan QR Code opsional pada proses approval dokumen, menyimpan metadata tanpa membuat tabel baru, serta menyediakan halaman verifikasi publik yang familiar dengan desain Informasi Dokumen.

## User Review Required

> [!IMPORTANT]
> **Kebijakan Keamanan Dokumen:**
> Sesuai rancangan, tanda tangan QR Code akan memuat URL verifikasi publik `/verify/signature/{token}`. Siapa pun yang memiliki QR Code tersebut dapat memindai dan melihat data metadata tanda tangan (Nama, Jabatan, Nomor Dokumen, Judul Dokumen, Waktu Tanda Tangan) secara publik tanpa login. Kami juga menyediakan tombol **[ Lihat Dokumen ]** untuk mengunduh dokumen yang bersangkutan secara langsung demi kemudahan verifikasi.

> [!NOTE]
> **Tanpa Tabel Baru:**
> Kami tidak membuat tabel database baru. Kami akan menambahkan kolom `signature_method` dan `verification_token` ke dalam tabel `dokumen_approval` yang sudah ada melalui sebuah migrasi database.

---

## Proposed Changes

### Database Layer

#### [NEW] [Migration file](file:///d:/Project/Approval-Management-System/database/migrations/2026_08_26_140000_add_signature_method_to_dokumen_approval_table.php)
Membuat file migrasi baru untuk menambahkan kolom `signature_method` dan `verification_token` ke tabel `dokumen_approval`.

```php
Schema::table('dokumen_approval', function (Blueprint $table) {
    $table->string('signature_method')->default('original')->after('approval_status');
    $table->string('verification_token')->nullable()->unique()->after('signature_method');
});
```

#### [MODIFY] [DokumenApproval.php](file:///d:/Project/Approval-Management-System/app/Models/DokumenApproval.php)
Menambahkan `signature_method` dan `verification_token` ke dalam `$fillable` array.

---

### Backend Logic

#### [MODIFY] [DokumenApprovalController.php](file:///d:/Project/Approval-Management-System/app/Http/Controllers/DokumenApprovalController.php)
1. Memperbarui method `approve` untuk menerima input `signature_method`.
2. Jika `signature_method === 'qr'`, generates UUID/random string sebagai `verification_token` dan lewati validasi gambar base64 signature.
3. Menambahkan method `verifySignature(string $token)` untuk menampilkan halaman verifikasi publik menggunakan Inertia.
4. Menambahkan method `downloadSignedDocument(string $token)` untuk menyajikan download file PDF bertanda tangan secara publik tanpa auth.

#### [MODIFY] [PdfSignatureService.php](file:///d:/Project/Approval-Management-System/app/Services/PdfSignatureService.php)
Memperbarui method `generateSignedPdfStream` agar mendeteksi jika `signature_method === 'qr'`. Jika ya, kirimkan parameter `qrText` berupa URL verifikasi ke Node.js script ketimbang path gambar signature.

#### [MODIFY] [sign-pdf.cjs](file:///d:/Project/Approval-Management-System/scripts/sign-pdf.cjs)
Memperbarui script Node.js agar mendeteksi property `qrText` di dalam array `signatures`. Jika ada `qrText`, generate QR Code buffer menggunakan library `qrcode` (sudah terinstall) dan sematkan ke halaman PDF pada posisi signature.

#### [MODIFY] [web.php](file:///d:/Project/Approval-Management-System/routes/web.php)
Menambahkan route publik (tanpa middleware auth):
1. `Route::get('/verify/signature/{token}', [DokumenApprovalController::class, 'verifySignature'])->name('verify.signature');`
2. `Route::get('/verify/signature/{token}/download', [DokumenApprovalController::class, 'downloadSignedDocument'])->name('verify.signature.download');`

---

### Frontend UI / UX

#### [NEW] [show.tsx (Verify Page)](file:///d:/Project/Approval-Management-System/resources/js/pages/verify/show.tsx)
Halaman verifikasi publik menggunakan React + Inertia. Halaman ini akan dibuat mirip dengan *Document Info Section* dari `show.tsx` approval:
- Header dengan status verifikasi (Tercatat valid / Tidak valid).
- Card informasi dokumen (Nomor, Judul, Tanggal, Deskripsi).
- Card informasi approver (Nama, Jabatan, Waktu persetujuan).
- Tombol aksi **[ Lihat Dokumen ]** untuk mendownload PDF.

#### [MODIFY] [show.tsx (Approvals Page)](file:///d:/Project/Approval-Management-System/resources/js/pages/approvals/show.tsx)
1. Menambahkan state `signature_method` ke form `approveForm`.
2. Di dalam panel kanan/signature dialog, tambahkan toggle button: **[ Tanda Tangan Asli ]** dan **[ Tanda Tangan QR Code ]**.
3. Jika opsi QR terpilih, tampilkan ilustrasi box QR Code premium, bypass gambar signature pad, dan aktifkan tombol "Setujui Dokumen".
4. Menambahkan properti `signature_method` dan `verification_token` ke dalam interface `DokumenApproval`.

---

## Verification Plan

### Automated Tests
- Menjalankan unit tests atau debug server untuk memastikan flow berjalan lancar:
  `php artisan migrate`
  `npm run build` / `npm run dev`

### Manual Verification
1. Jalankan server Laravel dan frontend Vite.
2. Login sebagai user approver.
3. Buka detail approval dokumen, lalu klik **Setujui Dokumen**.
4. Pilih metode **Tanda Tangan QR Code**, tambahkan komentar, lalu simpan.
5. Unduh dokumen PDF dan pastikan QR Code muncul di lokasi tanda tangan.
6. Scan QR Code atau buka URL verifikasi publik untuk memeriksa halaman detail verifikasi.
7. Klik tombol **Lihat Dokumen** pada halaman verifikasi publik untuk mendownload dokumen PDF yang sama.
