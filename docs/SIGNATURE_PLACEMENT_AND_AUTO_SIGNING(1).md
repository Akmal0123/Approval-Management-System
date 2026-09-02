# Signature Placement & Automatic PDF Signing

Dokumen ini merangkum konsep fitur tanda tangan pada sistem approval
dokumen berdasarkan pembahasan yang telah dilakukan.

------------------------------------------------------------------------

## 📌 Overview

Fitur ini memungkinkan pemohon meng-upload dokumen PDF dan menentukan
**area tempat tanda tangan** sebelum dokumen masuk ke proses approval.

Ketika approver melakukan approval, approver cukup memilih atau
memasukkan tanda tangannya. Sistem kemudian secara otomatis menempelkan
gambar tanda tangan ke posisi yang sebelumnya telah ditentukan oleh
pemohon.

Konsep utamanya:

``` text
PEMOHON
   │
   ├── Upload PDF
   │
   ├── Preview PDF
   │
   └── Menentukan area tanda tangan
          │
          └── halaman + posisi + ukuran
                    ↓
              Simpan konfigurasi
                    ↓
APPROVER
   │
   ├── Membuka dokumen
   │
   ├── Memilih/menggunakan tanda tangan
   │
   └── Klik Approve
                    ↓
          Ambil posisi signature
                    ↓
          Tempel signature ke PDF
                    ↓
                FINAL PDF
```

------------------------------------------------------------------------

## 🎯 Konsep Utama

Pemohon bertanggung jawab menentukan **di mana tanda tangan harus
ditempatkan**.

Approver bertanggung jawab memberikan **tanda tangan**.

Dengan demikian, approver tidak perlu lagi mencari atau mengarahkan
posisi tanda tangan secara manual.

### Contoh

Pemohon memiliki dokumen dengan area kosong:

``` text
┌──────────────────────────────────────┐
│                                      │
│          DOKUMEN PERSETUJUAN         │
│                                      │
│                                      │
│                     Menyetujui,      │
│                                      │
│                     ┌────────────┐   │
│                     │ SIGN AREA  │   │
│                     └────────────┘   │
│                     Nama Pejabat     │
└──────────────────────────────────────┘
```

Pemohon menentukan area tersebut sebagai lokasi tanda tangan.

Ketika approver melakukan approval:

``` text
Approval
   ↓
Ambil signature approver
   ↓
Ambil posisi signature yang sudah disimpan
   ↓
Tempel signature ke PDF
   ↓
Simpan PDF hasil approval
```

------------------------------------------------------------------------

## 📐 Signature Position Configuration

Posisi tanda tangan perlu disimpan dengan informasi berikut:

  Field           Description
  --------------- --------------------------------------------
  `document_id`   ID dokumen yang memiliki area tanda tangan
  `page`          Nomor halaman tempat tanda tangan
  `x`             Posisi horizontal
  `y`             Posisi vertikal
  `width`         Lebar area tanda tangan
  `height`        Tinggi area tanda tangan

Contoh:

``` text
page   = 3
x      = 420
y      = 680
width  = 150
height = 70
```

Nilai tersebut kemudian digunakan oleh backend ketika menempelkan
signature ke PDF.

------------------------------------------------------------------------

## 🖱️ Signature Placement

Pada sisi pemohon, PDF ditampilkan di browser.

Pemohon dapat menentukan area tanda tangan dengan mekanisme seperti:

-   memilih halaman PDF;
-   memindahkan area tanda tangan;
-   menentukan ukuran area tanda tangan;
-   melihat posisi tanda tangan sebelum menyimpan konfigurasi.

Konsep UI:

``` text
┌──────────────────────────────────────┐
│                                      │
│           PDF DOCUMENT               │
│                                      │
│                     ┌─────────────┐  │
│                     │ SIGNATURE   │  │
│                     │    AREA     │  │
│                     └─────────────┘  │
│                           ↕          │
│                     Drag / Resize   │
└──────────────────────────────────────┘
```

Posisi yang dipilih pemohon kemudian dikirim ke backend dan disimpan.

------------------------------------------------------------------------

## ✍️ Signature Source

Signature yang digunakan oleh approver dapat berupa gambar tanda tangan.

Berdasarkan konfigurasi signature yang sudah ada pada sistem, terdapat
dua metode:

### 1. Manual Drawing

Approver menggambar tanda tangan menggunakan canvas.

``` text
Canvas
   ↓
User menggambar signature
   ↓
Export PNG
   ↓
Gunakan sebagai signature
```

### 2. Saved Signature

Approver memilih signature yang sebelumnya sudah disimpan.

``` text
Saved Signatures
       ↓
Pilih signature
       ↓
Gunakan sebagai signature
```

------------------------------------------------------------------------

## 📄 PDF Processing

PDF yang sudah di-upload tidak perlu dibuat ulang dari awal.

Konsep pemrosesannya:

``` text
PDF Original
     ↓
Import existing PDF
     ↓
Ambil halaman yang ditentukan
     ↓
Tambahkan gambar signature
     ↓
Simpan PDF hasil
```

Library yang dibahas:

  -----------------------------------------------------------------------
  Library                             Fungsi
  ----------------------------------- -----------------------------------
  `setasign/fpdi`                     Import/read PDF existing

  `setasign/fpdf`                     Membantu membuat dan memproses
                                      output PDF

  `tecnickcom/tcpdf`                  Alternatif engine PDF yang sudah
                                      digunakan dalam konfigurasi project
  -----------------------------------------------------------------------

Project juga sudah memiliki konsep `PdfSignatureService` untuk menangani
proses embedding signature ke PDF.

------------------------------------------------------------------------

## 🔄 Approval Flow

### Step 1 --- Upload

Pemohon meng-upload dokumen PDF.

### Step 2 --- Signature Placement

Pemohon membuka preview dokumen dan menentukan area tanda tangan.

### Step 3 --- Save Configuration

Sistem menyimpan:

``` text
document_id
page
x
y
width
height
```

### Step 4 --- Approval

Approver membuka dokumen dan melakukan approval.

### Step 5 --- Select Signature

Approver memilih signature yang akan digunakan atau menggambar signature
baru.

### Step 6 --- Automatic Placement

Backend mengambil konfigurasi posisi signature dari database.

``` text
Signature Image
      +
Signature Position
      ↓
PdfSignatureService
      ↓
PDF
```

### Step 7 --- Final PDF

Signature ditempelkan pada area yang sudah ditentukan pemohon.

------------------------------------------------------------------------

## 🗺️ Coordinate System

Posisi signature pada PDF menggunakan koordinat.

Konsep yang digunakan pada PDF processing:

``` text
(0,0)
┌──────────────────────────────→ X
│
│
│
│
↓
Y
```

Untuk halaman A4:

``` text
Width  ≈ 210 mm
Height ≈ 297 mm
```

Namun, posisi yang diperoleh dari browser tidak selalu dapat langsung
digunakan sebagai koordinat PDF.

Diperlukan proses konversi:

``` text
Browser Coordinate
        ↓
PDF.js Coordinate
        ↓
PDF Coordinate
        ↓
FPDI / TCPDF
        ↓
Signature
```

Konversi perlu memperhatikan:

-   ukuran halaman PDF;
-   ukuran tampilan PDF di browser;
-   zoom/scaling;
-   orientasi halaman;
-   koordinat X/Y;
-   ukuran signature.

------------------------------------------------------------------------

## 📦 Existing Project Components

Berdasarkan konfigurasi signature yang sudah ada, project memiliki
beberapa komponen yang berkaitan dengan signature:

``` text
app/
├── Services/
│   └── PdfSignatureService.php
│
├── Models/
│   └── Signature.php
│
└── Http/
    └── Controllers/
        └── SignatureController.php

resources/
└── js/
    └── components/
        └── signature-pad.tsx
```

Tabel signature:

``` text
signatures
├── id
├── user_id
├── signature_path
├── signature_type
├── is_default
├── created_at
├── updated_at
└── deleted_at
```

Komponen tersebut sudah mendukung konsep manual signature dan saved
signature.

------------------------------------------------------------------------

## 🧩 Existing PDF Signature Configuration

Konfigurasi yang sudah ada pada `PdfSignatureService` menggunakan
parameter seperti:

``` php
$options = [
    'page' => 1,
    'x' => 20,
    'y' => 200,
    'width' => 50,
    'height' => 20,
];
```

Dengan demikian, backend sebenarnya sudah dapat menerima posisi
signature secara custom.

Perbedaan dengan fitur yang dirangkum dalam dokumen ini adalah:

``` text
Existing:
Posisi diberikan melalui konfigurasi/parameter backend.

Proposed:
Posisi ditentukan oleh pemohon melalui UI,
kemudian konfigurasi posisi tersebut disimpan
dan digunakan otomatis ketika approver melakukan approval.
```

------------------------------------------------------------------------

## 🔀 Multiple Signatures

Dokumen dapat membutuhkan lebih dari satu approver.

Konsepnya:

``` text
Dokumen
   │
   ├── Signature Area 1 → Manager
   │
   ├── Signature Area 2 → Finance
   │
   └── Signature Area 3 → Director
```

Setiap area dapat memiliki konfigurasi:

``` text
page
x
y
width
height
signer / approver
status
```

Ketika masing-masing approver melakukan approval, signature ditempel
pada area yang sesuai.

------------------------------------------------------------------------

## 💾 Recommended Signature Placement Data

Untuk mendukung multiple approvers, konfigurasi posisi sebaiknya
memiliki hubungan dengan approver atau approval step.

Contoh konsep data:

``` text
document_signature_positions

id
document_id
approval_id / signer_id
page
x
y
width
height
status
created_at
updated_at
```

Dengan demikian, sistem dapat mengetahui:

> Area signature ini ditujukan untuk approver yang mana.

------------------------------------------------------------------------

## 🔐 Important Considerations

### 1. Original PDF

PDF original sebaiknya tetap dipertahankan sebagai backup.

``` text
Original PDF
      │
      ├── Backup
      │
      └── Processing
              ↓
          Signed PDF
```

### 2. Signature Image

Signature sebaiknya disimpan secara terstruktur berdasarkan
user/approval sehingga dapat digunakan kembali sesuai hak akses.

### 3. Position Validation

Backend perlu melakukan validasi agar:

-   halaman yang dipilih benar-benar tersedia;
-   `x` dan `y` tidak berada di luar halaman;
-   `width` dan `height` tidak menyebabkan signature keluar dari
    halaman.

### 4. Preview

Posisi signature sebaiknya dapat dilihat sebelum pemohon menyimpan
konfigurasi.

------------------------------------------------------------------------

## 🚧 Features Not Yet Defined

Beberapa detail belum ditentukan dalam pembahasan:

-   Apakah pemohon boleh menentukan lebih dari satu area signature?
-   Apakah pemohon dapat mengubah posisi setelah dokumen masuk proses
    approval?
-   Apakah signature area dikaitkan dengan approval step atau langsung
    dengan user?
-   Apakah approver dapat mengganti signature setelah memilihnya?
-   Apakah signature perlu menambahkan nama/tanggal/status approval di
    bawahnya?
-   Apakah dokumen yang sudah signed boleh diproses ulang?
-   Bagaimana menangani dokumen yang direvisi setelah posisi signature
    ditentukan?

Hal-hal tersebut perlu diputuskan sebelum implementasi final.

------------------------------------------------------------------------

## ✅ Core Requirement

Requirement utama fitur:

> **Pemohon menentukan lokasi tanda tangan pada dokumen, sedangkan
> approver cukup memberikan tanda tangannya. Sistem secara otomatis
> menempelkan tanda tangan approver ke lokasi yang telah ditentukan
> pemohon tanpa memerlukan positioning ulang oleh approver.**

------------------------------------------------------------------------

## 📌 Summary

Arsitektur fitur:

``` text
                PEMOHON
                   │
                   ▼
              Upload PDF
                   │
                   ▼
             Preview PDF
                   │
                   ▼
       Tentukan Signature Area
                   │
                   ▼
        Simpan Position Config
                   │
                   ▼
              APPROVAL
                   │
                   ▼
          Approver Signature
                   │
                   ▼
          PdfSignatureService
                   │
                   ▼
          Tempel Signature
                   │
                   ▼
              FINAL PDF
```

Fokus implementasi utama adalah menghubungkan **signature placement UI**
dengan `PdfSignatureService`, sehingga posisi yang dipilih pemohon dapat
digunakan otomatis ketika approver melakukan approval.


---

## 👥 Multiple Approvers

Sistem memungkinkan satu dokumen memiliki lebih dari satu approver.

Setiap approver memiliki **signature area** masing-masing yang telah ditentukan pada dokumen.

Contoh:

```text
Dokumen
│
├── Signature Area 1 → Manager
├── Signature Area 2 → Finance
└── Signature Area 3 → Director
```

### Signature Area Per Approver

Setiap area signature sebaiknya dikaitkan dengan approver atau approval step tertentu.

Contoh data:

```text
document_signature_positions

id | document_id | approval_id | signer_id | page | x   | y   | width | height
---|-------------|-------------|-----------|------|-----|-----|-------|-------
1  | 100         | 1           | 10        | 3    | 20  | 220 | 35    | 13
2  | 100         | 2           | 20        | 3    | 80  | 220 | 35    | 13
3  | 100         | 3           | 30        | 3    | 140 | 220 | 35    | 13
```

Dengan struktur tersebut, sistem dapat mengetahui bahwa:

```text
Signature Area 1 → Approval #1 → Manager
Signature Area 2 → Approval #2 → Finance
Signature Area 3 → Approval #3 → Director
```

### Approval Execution

Mekanisme penempelan signature tetap sama untuk setiap approver.

```text
Manager
   ↓
Approve
   ↓
Ambil signature Manager
   ↓
Cari signature area Manager
   ↓
Tempel signature
```

Kemudian:

```text
Finance
   ↓
Approve
   ↓
Ambil signature Finance
   ↓
Cari signature area Finance
   ↓
Tempel signature
```

Dan seterusnya.

Dengan demikian, `PdfSignatureService` tetap dapat digunakan untuk semua approver.

```text
              PdfSignatureService
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Manager       Finance      Director
          │            │            │
          ▼            ▼            ▼
      Position 1    Position 2    Position 3
          │            │            │
          └────────────┼────────────┘
                       ▼
                   FINAL PDF
```

### Approver Tidak Mengatur Posisi

Approver tidak perlu menentukan posisi tanda tangan saat melakukan approval.

Posisi sudah ditentukan sebelumnya oleh pemohon:

```text
Pemohon
   ↓
Tentukan Signature Area
   ↓
Hubungkan Area dengan Approver / Approval Step
   ↓
Simpan konfigurasi
   ↓
Approver melakukan approval
   ↓
Sistem otomatis menggunakan area yang sesuai
```

Hal ini mencegah approver menempatkan tanda tangan pada area milik approver lain.

### Sequential vs Parallel Approval

Konsep signature placement tetap sama baik approval dilakukan secara berurutan maupun bersamaan.

#### Sequential Approval

Contoh:

```text
Manager
   ↓
Approve
   ↓
Finance
   ↓
Approve
   ↓
Director
   ↓
Approve
```

Setiap approver menandatangani area masing-masing ketika approval step mereka aktif.

#### Parallel Approval

Contoh:

```text
             ┌──→ Manager ──→ Sign Area 1
             │
Document ────┼──→ Finance ──→ Sign Area 2
             │
             └──→ Director ──→ Sign Area 3
```

Masing-masing approver tetap menggunakan signature area yang sudah ditentukan untuk mereka.

Perbedaan sequential dan parallel approval berada pada **aturan workflow approval**, bukan pada mekanisme penempelan signature ke PDF.

---

## 🔐 Multiple Signature Considerations

Untuk dokumen dengan banyak approver, beberapa hal perlu diperhatikan:

- Setiap approver harus memiliki signature area yang jelas.
- Signature area sebaiknya dikaitkan dengan `approval_id` atau `signer_id`.
- Approver hanya boleh menggunakan area signature miliknya.
- Signature dari approver lain tidak boleh tertimpa.
- Backend harus memvalidasi bahwa approver yang melakukan approval memang memiliki hak terhadap signature area tersebut.
- Posisi setiap signature dapat berada pada halaman yang sama maupun halaman berbeda.
- Ukuran setiap signature dapat berbeda jika diperlukan.

### Contoh Multi-Page

```text
Halaman 3
├── Manager Signature
└── Finance Signature

Halaman 5
└── Director Signature
```

Semua posisi tetap dapat disimpan dalam konfigurasi yang sama:

```text
document_id
approval_id
signer_id
page
x
y
width
height
```

---

## 🔄 Complete Multiple-Approver Flow

```text
                    PEMOHON
                       │
                       ▼
                  Upload PDF
                       │
                       ▼
                 Preview PDF
                       │
                       ▼
       Tentukan Signature Area #1
       Tentukan Signature Area #2
       Tentukan Signature Area #3
                       │
                       ▼
       Hubungkan setiap area dengan
          approver / approval step
                       │
                       ▼
             Simpan konfigurasi
                       │
                       ▼
                    APPROVAL
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Manager       Finance      Director
          │            │            │
          ▼            ▼            ▼
       Approve       Approve       Approve
          │            │            │
          ▼            ▼            ▼
       Signature     Signature     Signature
          │            │            │
          ▼            ▼            ▼
       Position 1    Position 2    Position 3
          │            │            │
          └────────────┼────────────┘
                       ▼
                FINAL SIGNED PDF
```

---

## ✅ Updated Core Requirement

Requirement utama fitur:

> **Pemohon menentukan lokasi tanda tangan untuk setiap approver pada dokumen. Setiap signature area dikaitkan dengan approver atau approval step tertentu. Ketika masing-masing approver melakukan approval, sistem secara otomatis mengambil tanda tangan approver dan menempelkannya pada signature area yang sesuai tanpa memerlukan positioning ulang.**

