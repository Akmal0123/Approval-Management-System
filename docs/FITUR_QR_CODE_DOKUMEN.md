# Fitur QR Code Verifikasi Dokumen

> **Status**: 📋 Planned  
> **Tanggal Diskusi**: 16 Januari 2026  
> **Prioritas**: TBD

---

## 📌 Ringkasan Fitur

Fitur ini memungkinkan setiap dokumen yang diupload memiliki **QR Code unik** yang dapat di-scan untuk:

1. **Verifikasi Keaslian** - Memastikan dokumen berasal dari company yang benar
2. **Melihat Informasi Dokumen** - Judul, nomor dokumen, tanggal pengajuan
3. **Tracking Status Approval** - Melihat progress persetujuan secara real-time

---

## 🎯 Keputusan Desain

| Aspek                        | Keputusan                                 |
| ---------------------------- | ----------------------------------------- |
| **Kapan QR dibuat?**         | Saat dokumen diupload                     |
| **Apa yang di-encode?**      | URL langsung ke halaman verifikasi publik |
| **Akses halaman verifikasi** | Public (tanpa login)                      |
| **Penyimpanan data**         | Kolom tambahan di tabel `dokumen`         |
| **Tracking scan history**    | Tidak diperlukan                          |
| **Embed QR ke PDF**          | Ya, langsung saat upload                  |

---

## 🗄️ Perubahan Database

### Tabel `dokumen` - Kolom Baru

```sql
ALTER TABLE dokumen ADD COLUMN verification_token VARCHAR(64) UNIQUE;
ALTER TABLE dokumen ADD COLUMN original_file_path VARCHAR(255);
-- Kolom file_path yang sudah ada akan menyimpan PDF dengan QR
```

| Kolom                | Tipe         | Deskripsi                                       |
| -------------------- | ------------ | ----------------------------------------------- |
| `verification_token` | VARCHAR(64)  | Token unik (UUID) untuk URL verifikasi          |
| `original_file_path` | VARCHAR(255) | Path ke file PDF asli (tanpa QR) sebagai backup |

---

## 📊 Flow Proses

### 1. Upload Dokumen

```
┌─────────────────────────────────────────────────────────────┐
│                    USER UPLOAD PDF                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Simpan file ORIGINAL ke: storage/dokumen/original/      │
│  2. Generate verification_token (UUID)                      │
│  3. Generate QR Code image (temporary)                      │
│  4. Embed QR ke PDF halaman pertama (pojok kanan bawah)     │
│  5. Simpan file WITH QR ke: storage/dokumen/verified/       │
│  6. Hapus QR image temporary                                │
│  7. Update database dengan token & paths                    │
└─────────────────────────────────────────────────────────────┘
```

### 2. Scan & Verifikasi

```
┌─────────────────────────────────────────────────────────────┐
│               USER SCAN QR CODE                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  URL: https://domain.com/verify/{verification_token}        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Lookup dokumen by verification_token                    │
│  2. Load approval status (eager load approvals)             │
│  3. Render public verification page                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Halaman Verifikasi Publik

Saat QR di-scan, user akan melihat halaman publik dengan informasi:

```
┌─────────────────────────────────────────────────────────────┐
│              ✅ DOKUMEN TERVERIFIKASI                       │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                             │
│ 🏢 Company      : PT. XYZ Indonesia                         │
│ 📄 Judul        : Proposal Pengadaan IT                     │
│ 📋 Nomor        : DOC-2026-001                              │
│ 📅 Tgl Pengajuan: 16 Januari 2026                           │
│ 📅 Deadline     : 30 Januari 2026                           │
│                                                             │
│ ━━━━━━━━━━━━━ STATUS APPROVAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                             │
│ ✅ Step 1: Manager IT        - Disetujui (15 Jan 2026)      │
│ ⏳ Step 2: Finance           - Menunggu Persetujuan         │
│ ⬜ Step 3: Direktur          - Belum Dimulai                │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ Status Keseluruhan: 🔄 IN PROGRESS (1/3 approved)           │
└─────────────────────────────────────────────────────────────┘
```

### Informasi yang Ditampilkan:

- ✅ Nama Company
- ✅ Judul Dokumen
- ✅ Nomor Dokumen
- ✅ Tanggal Pengajuan
- ✅ Tanggal Deadline
- ✅ Status Approval per Step (timeline)
- ✅ Status Keseluruhan Dokumen

### Informasi yang TIDAK Ditampilkan (Security):

- ❌ File dokumen asli
- ❌ Detail isi dokumen
- ❌ Informasi personal approver
- ❌ Komentar/catatan internal

---

## 📐 Spesifikasi QR Code di PDF

| Aspek       | Spesifikasi                             |
| ----------- | --------------------------------------- |
| **Posisi**  | Pojok kanan bawah halaman pertama       |
| **Ukuran**  | ~2.5cm x 2.5cm (25mm)                   |
| **Halaman** | Hanya halaman pertama                   |
| **Label**   | (TBD) Opsional: "Scan untuk verifikasi" |

### Ilustrasi Posisi QR di PDF:

```
┌─────────────────────────────────────────┐
│                                         │
│         KONTEN DOKUMEN                  │
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│                                    ┌───┐│
│                                    │QR ││
│                                    └───┘│
└─────────────────────────────────────────┘
```

---

## 🛠️ Technical Stack

### PHP Packages yang Diperlukan:

| Package                                 | Fungsi                   |
| --------------------------------------- | ------------------------ |
| `simplesoftwareio/simple-qrcode`        | Generate QR Code         |
| `setasign/fpdi`                         | Import/read PDF existing |
| `setasign/fpdf` atau `tecnickcom/tcpdf` | Manipulasi PDF           |

### Instalasi:

```bash
composer require simplesoftwareio/simple-qrcode
composer require setasign/fpdi
composer require tecnickcom/tcpdf
```

---

## 📁 Struktur File yang Akan Dibuat

```
app/
├── Http/
│   └── Controllers/
│       └── DocumentVerificationController.php    # Controller untuk public page
├── Services/
│   └── QrCodeService.php                         # Service untuk generate & embed QR
│
resources/
└── js/
    └── pages/
        └── verify/
            └── show.tsx                          # Public verification page (React)
│
routes/
└── web.php                                       # Tambah route: /verify/{token}
│
database/
└── migrations/
    └── xxxx_add_qr_columns_to_dokumen_table.php  # Migration untuk kolom baru
```

---

## 🔐 Security Considerations

| Aspek                | Implementasi                                  |
| -------------------- | --------------------------------------------- |
| **Token Generation** | UUID v4 (128-bit, praktis tidak bisa ditebak) |
| **Public Access**    | Hanya metadata, BUKAN file dokumen            |
| **Rate Limiting**    | Throttle endpoint `/verify/{token}`           |
| **Token Expiry**     | Tidak ada (lifetime)                          |
| **HTTPS**            | URL QR harus menggunakan HTTPS                |

---

## ✅ Checklist Implementasi

### Phase 1: Backend Foundation

- [ ] Buat migration untuk kolom baru di tabel `dokumen`
- [ ] Install package QR code dan PDF manipulation
- [ ] Buat `QrCodeService` untuk generate QR
- [ ] Buat `PdfService` untuk embed QR ke PDF
- [ ] Update `DokumenController@store` untuk integrate QR generation

### Phase 2: Public Verification

- [ ] Buat route `/verify/{token}` (public, no auth)
- [ ] Buat `DocumentVerificationController`
- [ ] Buat halaman React untuk public verification page
- [ ] Style halaman verification (responsive, mobile-friendly)

### Phase 3: Testing & Polish

- [ ] Test upload dokumen dengan QR generation
- [ ] Test scan QR dan akses halaman verifikasi
- [ ] Test tampilan status approval real-time
- [ ] Test dokumen yang ditolak/rejected
- [ ] Performance testing untuk large PDF files

---

## 📝 Catatan Tambahan

### Pertanyaan yang Perlu Dijawab Sebelum Implementasi:

1. **Label di bawah QR** - Apakah perlu teks "Scan untuk verifikasi"?
2. **Branding** - Apakah perlu logo company di samping QR?
3. **Multi-version** - Jika dokumen direvisi, apakah QR tetap sama atau berubah?

### Edge Cases yang Perlu Dihandle:

- Dokumen yang ditolak (rejected) - tetap bisa diverifikasi tapi tampilkan status rejected
- Dokumen dengan file selain PDF - generate QR terpisah (download link)
- Dokumen yang dihapus - tampilkan pesan "Dokumen tidak ditemukan"

---

## 📅 Timeline Estimasi

| Phase                        | Estimasi    |
| ---------------------------- | ----------- |
| Phase 1: Backend Foundation  | 2-3 jam     |
| Phase 2: Public Verification | 2-3 jam     |
| Phase 3: Testing & Polish    | 1-2 jam     |
| **Total**                    | **5-8 jam** |

---

> **Note**: Dokumen ini adalah hasil brainstorming dan dapat diupdate sesuai kebutuhan sebelum implementasi dimulai.
