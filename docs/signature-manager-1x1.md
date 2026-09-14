# Implementasi Signature Manager — Format Signature 1:1

## Tujuan

Ubah fitur **Digital Signature Management** agar seluruh tanda tangan yang masuk ke backend memiliki format gambar **persegi dengan rasio 1:1**.

Ada dua sumber tanda tangan:

1. **Gambar manual** melalui canvas.
2. **Upload gambar** melalui file picker dan cropper.

Keduanya harus menghasilkan signature dengan standar yang sama sebelum dikirim ke backend.

---

## Standar Signature

Tetapkan standar output signature sebagai berikut:

- Rasio: **1:1**
- Ukuran output: **400 × 400 px**
- Format: **PNG**
- Background: **putih**
- Signature tidak boleh terdistorsi/stretch.
- Backend harus menerima file/image signature yang sudah memenuhi standar tersebut.

> Catatan: ukuran 400 × 400 px adalah standar output. Jika implementasi membutuhkan ukuran internal canvas berbeda untuk kualitas gambar, hasil akhir yang dikirim ke backend tetap harus 400 × 400 px.

---

# 1. Signature Manual

## Kondisi Saat Ini

`signature-manager.tsx` menggunakan canvas:

```tsx
<canvas
    ref={canvasRef}
    width={600}
    height={200}
/>
```

Canvas tersebut memiliki rasio 3:1.

## Perubahan

Ubah canvas menjadi persegi:

```tsx
<canvas
    ref={canvasRef}
    width={400}
    height={400}
/>
```

Canvas harus tetap responsif secara visual menggunakan Tailwind, tetapi **aspect ratio harus tetap 1:1**.

Contoh:

```tsx
className="aspect-square w-full ..."
```

Jangan menggunakan styling yang menyebabkan canvas internal 400 × 400 ditampilkan dengan rasio selain 1:1.

## Koordinat Drawing

Pertahankan mekanisme `getCanvasCoordinates()` yang sudah ada.

Perhitungan koordinat harus tetap memperhitungkan perbedaan antara:

- ukuran internal canvas
- ukuran canvas yang ditampilkan di browser

Tujuannya agar posisi tanda tangan tetap akurat ketika canvas responsive.

## Penyimpanan

Saat user menekan **Simpan Tanda Tangan**:

1. Ambil isi canvas.
2. Konversi menjadi PNG.
3. Pastikan hasilnya 400 × 400 px.
4. Kirim hasil tersebut ke endpoint `signatures.store`.
5. Backend menerima signature dengan format 1:1.

Jangan mengirim canvas dengan ukuran atau rasio selain 1:1.

---

# 2. Upload Signature

## Masalah

User dapat mengupload gambar dengan berbagai ukuran dan rasio.

Contoh:

```text
1200 × 400
800 × 1000
1920 × 1080
500 × 500
```

File asli **tidak boleh langsung dikirim ke backend**.

Sebelum upload, user harus mendapatkan UI untuk memilih area signature.

---

# 3. Gunakan Cropper 1:1

Gunakan library cropper React, misalnya:

```bash
npm install react-easy-crop
```

Gunakan cropper dengan:

```tsx
aspect={1}
```

Dengan demikian area crop selalu berbentuk persegi.

Flow:

```text
User memilih file
        ↓
Validasi file
        ↓
Tampilkan cropper
        ↓
Crop area dikunci 1:1
        ↓
User dapat melakukan:
- drag
- zoom
        ↓
User menekan "Gunakan"
        ↓
Hasil crop dibuat menjadi PNG 400 × 400
        ↓
Kirim ke backend
```

---

# 4. Jangan Kirim File Asli

Ini penting.

Kode yang sebelumnya:

```tsx
formData.append('signature_file', uploadFile);
```

tidak boleh langsung digunakan untuk file asli.

`uploadFile` harus diganti dengan hasil crop.

Contoh konsep:

```tsx
const croppedFile = await getCroppedImage(...);
```

Kemudian:

```tsx
const formData = new FormData();

formData.append('signature_file', croppedFile);
formData.append('signature_type', 'uploaded');
formData.append(
    'is_default',
    signatures.length === 0 ? '1' : '0'
);
```

Dengan demikian Laravel hanya menerima hasil yang sudah diproses.

---

# 5. Hasil Crop Harus 400 × 400

Cropper menghasilkan area persegi, tetapi jangan hanya mengandalkan rasio crop.

Pastikan hasil akhir dibuat menggunakan canvas:

```text
Canvas output
width  = 400
height = 400
```

Proses:

```text
Original Image
      ↓
Crop Area 1:1
      ↓
Canvas 400 × 400
      ↓
Draw cropped image
      ↓
canvas.toBlob()
      ↓
PNG
      ↓
File
      ↓
Laravel
```

Hasil akhirnya harus:

```text
Width:  400 px
Height: 400 px
Ratio:  1:1
Format: PNG
```

---

# 6. Validasi Frontend

Frontend tetap melakukan validasi awal:

### File type

Terima:

- PNG
- JPG
- JPEG

Tolak format selain gambar.

### File size

Tetap gunakan batas maksimal **2 MB** untuk file asli.

Contoh:

```tsx
if (file.size > 2 * 1024 * 1024) {
    showToast.error('❌ Ukuran file maksimal 2MB');
    return;
}
```

Setelah proses crop, hasil yang dikirim adalah PNG 400 × 400.

---

# 7. Validasi Backend Laravel

Frontend **tidak boleh menjadi satu-satunya tempat validasi**.

Backend harus melakukan validasi ulang.

Tujuannya memastikan API tidak menerima signature yang melanggar standar meskipun request dibuat tanpa melalui frontend.

Backend harus memastikan:

```text
Signature
├── merupakan image
├── format yang diperbolehkan
├── width  = 400 px
├── height = 400 px
└── ratio  = 1:1
```

Jika backend menerima signature yang bukan 400 × 400, request harus ditolak.

Contoh validasi Laravel dapat menggunakan pemeriksaan image setelah file diterima.

Konsep:

```php
$image = getimagesize($file->getRealPath());

$width = $image[0];
$height = $image[1];

if ($width !== 400 || $height !== 400) {
    return response()->json([
        'message' => 'Signature harus berukuran 400 × 400 px (rasio 1:1).'
    ], 422);
}
```

Selain validasi dimensi, tetap lakukan validasi MIME/type dan ukuran file sesuai aturan aplikasi.

> Implementasi backend harus menyesuaikan controller/service/validation yang sudah digunakan project. Jangan membuat endpoint baru jika endpoint signature yang sekarang sudah tersedia.

---

# 8. Konsistensi dengan Signature Placement

Fitur `SignatureManager` harus menghasilkan signature yang konsisten dengan fitur penempatan signature pada PDF.

Standarnya:

```text
Signature Manager
       ↓
PNG 400 × 400
       ↓
Storage
       ↓
Signature Placement
       ↓
PDF
```

Karena semua signature sudah 1:1, ketika signature ditempatkan ke PDF:

```text
width = height
```

dapat dipertahankan untuk mencegah signature menjadi gepeng.

User tetap boleh mengubah ukuran signature ketika menempatkannya pada PDF, tetapi perubahan ukuran harus mempertahankan rasio 1:1.

---

# 9. Jangan Mengubah Data Model Jika Tidak Diperlukan

Perubahan ini tidak membutuhkan perubahan struktur database selama database saat ini sudah menyimpan:

```text
signature_path
signature_type
is_default
```

Yang berubah adalah **format image sebelum disimpan**.

---

# 10. UX yang Diharapkan

## Tab "Gambar Tanda Tangan"

Tampilkan canvas persegi:

```text
┌──────────────────┐
│                  │
│                  │
│    TANDA         │
│    TANGAN        │
│                  │
│                  │
└──────────────────┘
```

User bebas menggambar di dalam area tersebut.

---

## Tab "Upload Tanda Tangan"

Setelah memilih file:

```text
┌──────────────────────────┐
│                          │
│       gambar asli        │
│                          │
│      ┌──────────┐        │
│      │          │        │
│      │ SIGNATURE│        │
│      │          │        │
│      └──────────┘        │
│                          │
└──────────────────────────┘

       [ Zoom ] [ Crop ]
```

Frame crop **selalu persegi**.

User dapat:

- menggeser gambar
- melakukan zoom
- menentukan bagian signature yang masuk ke frame

User tidak dapat mengubah frame menjadi landscape atau portrait.

---

# 11. State yang Disarankan

Untuk upload, tambahkan state seperti:

```tsx
const [crop, setCrop] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);
const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
const [cropDialogOpen, setCropDialogOpen] = useState(false);
```

Ketika crop selesai:

```tsx
const onCropComplete = (
    croppedArea,
    croppedAreaPixels
) => {
    setCroppedAreaPixels(croppedAreaPixels);
};
```

Gunakan:

```tsx
<Cropper
    image={imageUrl}
    crop={crop}
    zoom={zoom}
    aspect={1}
    onCropChange={setCrop}
    onZoomChange={setZoom}
    onCropComplete={onCropComplete}
/>
```

---

# 12. Helper Untuk Membuat PNG 400 × 400

Buat helper khusus, misalnya:

```tsx
async function createSignatureFile(
    imageSrc: string,
    crop: {
        x: number;
        y: number;
        width: number;
        height: number;
    }
): Promise<File> {
    // Buat canvas 400 × 400
    // Crop image berdasarkan crop coordinates
    // Draw ke canvas
    // Convert canvas menjadi PNG Blob
    // Convert Blob menjadi File
}
```

Helper ini bertanggung jawab memastikan hasil upload memiliki standar yang sama dengan signature manual.

---

# 13. Acceptance Criteria

Implementasi dianggap selesai jika semua kondisi berikut terpenuhi.

### Manual Signature

- [ ] Canvas berbentuk persegi.
- [ ] Canvas memiliki rasio 1:1.
- [ ] User dapat menggambar signature.
- [ ] Signature disimpan sebagai PNG.
- [ ] Signature yang dikirim ke backend berukuran 400 × 400 px.

### Uploaded Signature

- [ ] User dapat memilih file PNG/JPG/JPEG.
- [ ] File asli tidak langsung dikirim ke backend.
- [ ] Cropper muncul setelah file dipilih.
- [ ] Crop frame selalu 1:1.
- [ ] User dapat drag gambar.
- [ ] User dapat zoom gambar.
- [ ] Hasil crop dikonversi menjadi PNG.
- [ ] Hasil akhir berukuran 400 × 400 px.
- [ ] Hasil akhir dikirim ke endpoint upload signature yang sudah ada.

### Backend

- [ ] Backend memvalidasi file sebagai image.
- [ ] Backend memvalidasi format file.
- [ ] Backend memvalidasi ukuran/dimensi image.
- [ ] Backend menolak image yang bukan 400 × 400 px.
- [ ] Backend hanya menyimpan signature yang memenuhi standar 1:1.

### PDF Signature Placement

- [ ] Signature tetap mempertahankan rasio 1:1 ketika ditempatkan.
- [ ] Resize signature tidak menyebabkan distorsi.
- [ ] Signature manual dan uploaded terlihat konsisten.

---

# 14. Prinsip Implementasi

Prioritaskan perubahan minimal terhadap sistem yang sudah berjalan.

Jangan mengubah:

- nama route yang sudah ada
- struktur database yang tidak perlu diubah
- mekanisme authentication
- mekanisme CSRF
- fitur default signature
- fitur delete signature
- fitur list signature

Fokus perubahan:

```text
Canvas 3:1
     ↓
Canvas 1:1

Upload langsung
     ↓
Upload → Crop 1:1 → PNG 400×400 → Backend

Backend menerima image bebas
     ↓
Backend hanya menerima signature standar 400×400
```

Tujuan akhir:

> **Apa pun cara user membuat tanda tangan, backend harus selalu menerima signature dalam format PNG berukuran 400 × 400 px dengan rasio 1:1.**
