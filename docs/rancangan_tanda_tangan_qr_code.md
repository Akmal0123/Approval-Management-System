# Rancangan Tanda Tangan QR Code pada Approval Management System

## 1. Tujuan

Fitur ini digunakan untuk menyediakan **dua pilihan metode tanda tangan dokumen**:

1. **Tanda tangan asli** — metode default.
2. **Tanda tangan QR Code** — metode opsional.

QR Code tidak digunakan sebagai pengganti data tanda tangan di database. QR Code berfungsi sebagai media untuk membuka halaman verifikasi yang menampilkan informasi bahwa dokumen telah ditandatangani oleh approver tertentu.

> Catatan: Mekanisme hash dokumen belum digunakan pada rancangan ini. Verifikasi difokuskan pada data tanda tangan yang tersimpan di sistem.

---

## 2. Pilihan Metode Tanda Tangan

Ketika approver melakukan proses tanda tangan, sistem menyediakan pilihan:

```text
Metode Tanda Tangan

(•) Tanda Tangan Asli
( ) Tanda Tangan QR Code
```

### 2.1 Tanda Tangan Asli

Ini merupakan metode default.

Alurnya:

```text
Approver
   ↓
Pilih "Tanda Tangan Asli"
   ↓
Upload / gunakan gambar tanda tangan
   ↓
Sistem menempelkan tanda tangan ke PDF
   ↓
Dokumen selesai ditandatangani
```

Tidak diperlukan QR Code pada metode ini.

### 2.2 Tanda Tangan QR Code

Metode ini bersifat opsional.

Alurnya:

```text
Approver
   ↓
Pilih "Tanda Tangan QR Code"
   ↓
Sistem membuat data tanda tangan
   ↓
Sistem membuat URL verifikasi
   ↓
URL dibuat menjadi QR Code
   ↓
QR Code ditempelkan ke PDF
   ↓
Dokumen selesai ditandatangani
```

---

## 3. URL Dokumen Saat Ini

Saat ini dokumen dapat diakses berdasarkan ID dokumen, contohnya:

```text
http://127.0.0.1:8000/api/dokumen/9
```

Karena sistem sudah menggunakan ID dokumen, QR Code dapat menggunakan ID atau token verifikasi yang berhubungan dengan data tanda tangan.

Contoh sederhana:

```text
http://127.0.0.1:8000/verify/dokumen/9
```

Namun, halaman verifikasi sebaiknya tidak hanya menampilkan file PDF. Halaman tersebut harus menampilkan informasi tanda tangan dan identitas dokumen.

---

## 4. Halaman Verifikasi QR Code

Ketika QR Code pada dokumen di-scan, pengguna diarahkan ke halaman verifikasi.

Contoh:

```text
http://127.0.0.1:8000/verify/dokumen/9
```

Halaman tersebut menampilkan detail:

```text
========================================
        VERIFIKASI DOKUMEN
========================================

Status:
✓ Dokumen telah ditandatangani

Nomor Dokumen:
DOC-2026-009

Judul Dokumen:
Surat Persetujuan Pengajuan

Approver:
Budi Santoso

Jabatan:
Kepala Bagian

Metode Tanda Tangan:
QR Code

Waktu Tanda Tangan:
26 Agustus 2026, 09:31:25 WIB

========================================
```

Jika diperlukan, halaman tersebut juga dapat menyediakan tombol:

```text
[ Lihat Dokumen ]
```

untuk membuka dokumen yang bersangkutan.

---

## 5. Data yang Perlu Disimpan

Untuk mendukung verifikasi QR Code, sistem perlu menyimpan informasi proses tanda tangan.

Contoh data:

```text
document_id
approver_id
signature_method
signed_at
verification_token
```

Keterangan:

| Field | Fungsi |
|---|---|
| `document_id` | ID dokumen yang ditandatangani |
| `approver_id` | ID user/approver yang melakukan tanda tangan |
| `signature_method` | Metode tanda tangan, misalnya `original` atau `qr` |
| `signed_at` | Timestamp ketika tanda tangan dibuat |
| `verification_token` | Identitas unik untuk URL verifikasi |

Contoh:

```text
document_id       = 9
approver_id       = 15
signature_method  = qr
signed_at         = 2026-08-26 09:31:25
verification_token = 7f82c1e9...
```

---

## 6. Kenapa Menggunakan Verification Token?

Walaupun ID dokumen saat ini seperti:

```text
/api/dokumen/9
```

dapat digunakan untuk mencari dokumen, lebih baik URL verifikasi QR menggunakan identifier khusus untuk proses tanda tangan.

Contoh:

```text
/verify/signature/7f82c1e9...
```

Alasannya adalah satu dokumen dapat memiliki beberapa approver.

Contoh:

```text
Dokumen #9

Approver 1 → Budi
Approver 2 → Andi
Approver 3 → Siti
```

Jika QR hanya menggunakan:

```text
/verify/dokumen/9
```

sistem harus menentukan tanda tangan approver mana yang ingin ditampilkan.

Dengan verification token, setiap proses tanda tangan memiliki URL sendiri.

Contoh:

```text
/verify/signature/abc123
        ↓
Budi Santoso
```

dan:

```text
/verify/signature/xyz789
        ↓
Andi Setiawan
```

Keduanya tetap mengarah ke dokumen yang sama.

---

## 7. Struktur Alur Sistem

```text
                    APPROVER
                       │
                       ▼
              Pilih metode tanda tangan
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
       Tanda Tangan Asli    Tanda Tangan QR
              │                 │
              │                 ▼
              │          Buat verification
              │              token
              │                 │
              │                 ▼
              │          Generate QR Code
              │                 │
              └────────┬────────┘
                       │
                       ▼
               Tandatangani PDF
                       │
                       ▼
                Dokumen Final
                       │
                       │
              Jika QR digunakan
                       │
                       ▼
                 Scan QR Code
                       │
                       ▼
                Halaman Verifikasi
                       │
                       ▼
        ┌─────────────────────────────┐
        │ Nomor Dokumen               │
        │ Judul Dokumen               │
        │ Nama Approver               │
        │ Jabatan Approver            │
        │ Metode Tanda Tangan         │
        │ Timestamp Tanda Tangan      │
        │ Status Verifikasi           │
        └─────────────────────────────┘
```

---

## 8. Status Verifikasi

Halaman verifikasi minimal dapat memiliki dua kondisi.

### Dokumen Valid

```text
✓ DOKUMEN TERVERIFIKASI

Dokumen ini tercatat telah ditandatangani
melalui sistem Approval Management System.

Nomor Dokumen:
DOC-2026-009

Approver:
Budi Santoso

Waktu Tanda Tangan:
26 Agustus 2026, 09:31:25 WIB
```

### Data Tidak Ditemukan

Jika QR Code tidak valid atau data tanda tangan sudah tidak tersedia:

```text
✕ DOKUMEN TIDAK DAPAT DIVERIFIKASI

Data tanda tangan tidak ditemukan
di dalam sistem.
```

---

## 9. Catatan Keamanan

Pada tahap ini sistem **belum menggunakan hash dokumen**.

Artinya, mekanisme ini berfungsi sebagai **verifikasi bahwa terdapat catatan tanda tangan di dalam sistem**, bukan sebagai pembuktian kriptografis bahwa isi PDF tidak pernah berubah setelah ditandatangani.

Untuk kebutuhan internal atau sistem approval biasa, rancangan ini dapat digunakan sebagai tahap awal.

Jika nantinya dibutuhkan tingkat keamanan lebih tinggi, sistem dapat dikembangkan dengan:

- SHA-256 document hash
- Digital Signature
- Public Key Infrastructure (PKI)
- Sertifikat elektronik
- Mekanisme autentikasi tambahan

Pengembangan tersebut tidak menjadi bagian dari implementasi QR Code tahap awal.

---