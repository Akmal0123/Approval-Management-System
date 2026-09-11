# Responsive Web Desktop & Mobile — Approval Management System

## Tujuan

Membuat tampilan web Approval Management System (AMS) tetap nyaman digunakan pada desktop, tablet, dan mobile tanpa membuat kode menjadi spaghetti code.

Prinsip utama:

> **Mobile bukan aplikasi yang berbeda. Mobile adalah representasi berbeda dari data dan fitur yang sama.**

Business logic harus tetap menjadi satu sumber, sedangkan presentation layer dapat dibuat berbeda apabila struktur UI desktop dan mobile memang berbeda secara signifikan.

---

## 1. Prinsip Arsitektur

### Pisahkan Business Logic dan Presentation

Logic seperti:

- data fetching
- filtering
- pagination
- approval/rejection action
- document action
- state management

tidak boleh diduplikasi antara desktop dan mobile.

Jika diperlukan, logic dapat dikeluarkan ke custom hook.

Contoh:

```text
useUserDocuments()
    ├── documents
    ├── filters
    ├── pagination
    ├── handleApprove()
    ├── handleReject()
    └── handleView()
```

Kemudian hasilnya digunakan oleh tampilan desktop maupun mobile.

### Jangan Membuat Logic Desktop dan Mobile Terpisah

Hindari pola:

```tsx
// Desktop
const handleApprove = ...

// Mobile
const handleApprove = ...
```

Gunakan satu handler:

```tsx
const handleApprove = ...
```

lalu gunakan pada kedua presentation component.

---

# 2. Responsive Styling vs Responsive Structure

Tidak semua perbedaan mobile membutuhkan component baru.

## Responsive Styling

Gunakan Tailwind responsive utilities jika hanya ukuran atau layout yang berubah.

Contoh:

```tsx
<div className="flex flex-col md:flex-row">
```

atau:

```tsx
<p className="text-sm md:text-base">
```

Cocok untuk:

- font size
- padding
- margin
- gap
- grid columns
- flex direction
- alignment
- ukuran button
- spacing

## Responsive Structure

Gunakan component berbeda apabila struktur UI memang berubah drastis.

Contoh:

```tsx
<div className="hidden md:block">
    <DocumentTableView />
</div>

<div className="md:hidden">
    <DocumentCardView />
</div>
```

Cocok untuk:

- Table → Card
- Horizontal timeline → Vertical timeline
- Desktop navigation → Mobile navigation
- Toolbar kompleks → Toolbar mobile

---

# 3. Struktur Folder yang Disarankan

Struktur dapat dikembangkan secara bertahap:

```text
resources/js/
├── components/
│   ├── documents/
│   │   ├── document-list.tsx
│   │   ├── document-table-view.tsx
│   │   ├── document-card-view.tsx
│   │   └── document-card-item.tsx
│   │
│   ├── approval/
│   │   ├── approval-timeline.tsx
│   │   ├── approval-timeline-desktop.tsx
│   │   └── approval-timeline-mobile.tsx
│   │
│   └── signature/
│       ├── signature-pad.tsx
│       └── ...
│
└── hooks/
    └── use-mobile.ts
```

Tidak semua component harus langsung dibuat. Buat hanya ketika memang dibutuhkan.

---

# 4. Adaptive Component

Untuk komponen yang mempunyai struktur desktop dan mobile yang berbeda, gunakan komponen induk.

Contoh:

```tsx
export function DocumentList({ documents, actions }) {
    return (
        <>
            <div className="hidden md:block">
                <DocumentTableView
                    documents={documents}
                    {...actions}
                />
            </div>

            <div className="md:hidden">
                <DocumentCardView
                    documents={documents}
                    {...actions}
                />
            </div>
        </>
    );
}
```

## Catatan

Rendering dua representasi UI masih dapat diterima untuk komponen ringan seperti table/card.

Jangan menggunakan pendekatan ini secara berlebihan untuk komponen berat seperti:

- PDF viewer
- chart interaktif
- editor
- signature canvas
- komponen yang memiliki lifecycle kompleks

Untuk komponen berat, pertimbangkan conditional rendering menggunakan `useIsMobile`.

---

# 5. Hook `useIsMobile`

Gunakan hook ini secara selektif ketika struktur atau lifecycle desktop dan mobile memang berbeda.

```tsx
import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(
            `(max-width: ${breakpoint - 1}px)`
        );

        const onChange = () => setIsMobile(mql.matches);

        setIsMobile(mql.matches);
        mql.addEventListener("change", onChange);

        return () => {
            mql.removeEventListener("change", onChange);
        };
    }, [breakpoint]);

    return isMobile;
}
```

## Kapan digunakan?

Gunakan ketika:

- component desktop dan mobile sangat berbeda
- component cukup berat
- tidak diperlukan rendering kedua versi secara bersamaan
- terdapat perbedaan event/lifecycle

Jangan gunakan hook hanya untuk menggantikan Tailwind responsive classes yang sederhana.

---

# 6. Komponen yang Perlu Diadaptasi

## 6.1 Document Table

File utama yang perlu diperiksa:

```text
resources/js/components/user-document-table.tsx
resources/js/components/data-table.tsx
```

### Desktop

Tetap gunakan tabel dengan kolom:

```text
No | Dokumen | Pemohon | Status | Aksi
```

### Mobile

Jangan memaksakan tabel horizontal.

Gunakan stacked card:

```text
┌─────────────────────────────┐
│ Surat Permohonan ...      ⋮ │
│                             │
│ Pemohon                     │
│ Akmal Gelar                 │
│                             │
│ Status                      │
│ ✓ Approved                  │
│                             │
│ 10 September 2026           │
│                             │
│ [ Lihat Detail ]            │
└─────────────────────────────┘
```

Data dan action harus tetap sama dengan versi desktop.

---

# 7. Approval Timeline

Approval timeline perlu menyesuaikan orientasi layar.

## Desktop

Gunakan horizontal stepper apabila ruang mencukupi:

```text
● ───── ● ───── ● ───── ●
```

## Mobile

Gunakan vertical stepper:

```text
●
│
│
●
│
│
●
│
│
●
```

Informasi setiap approver tetap harus tersedia, misalnya:

- nama approver
- status
- waktu pengiriman
- waktu approval
- waktu penolakan
- SLA/deadline jika tersedia
- elapsed time jika digunakan
- catatan

Jangan mengubah business logic hanya karena layout berubah.

---

# 8. Modal / Dialog

Jangan mengubah seluruh dialog menjadi bottom sheet secara otomatis.

Gunakan bottom sheet/drawer hanya jika memang lebih nyaman untuk mobile.

Pertimbangkan:

- form sederhana → dialog responsive dapat tetap digunakan
- form panjang → drawer/bottom sheet dapat lebih nyaman
- action confirmation → dialog tetap cukup
- signature input → pertimbangkan fullscreen/bottom sheet

Prioritaskan usability daripada membuat semua komponen memiliki versi mobile yang berbeda.

---

# 9. Signature Pad

Signature pad merupakan komponen khusus karena berkaitan dengan:

```text
Touch
    ↓
Canvas
    ↓
Signature Input
    ↓
Position / Size
    ↓
PDF
```

Pada mobile:

- area tanda tangan harus cukup besar
- nyaman digunakan dengan jari
- mendukung touch interaction
- tidak terpotong viewport
- tombol simpan/batal mudah dijangkau
- orientasi landscape dapat dipertimbangkan

### Penting

Perubahan responsive pada signature placement **tidak boleh mengubah sistem koordinat yang digunakan untuk stamping PDF**.

AMS saat ini perlu menjaga konsistensi antara:

```text
Frontend overlay
        ↓
Position & size
        ↓
Backend
        ↓
PDF stamping
```

Perbedaan unit seperti:

```text
Frontend: mm / CSS pixel
Backend: PDF point / pixel / unit lain
```

harus ditangani melalui conversion layer yang jelas.

Jangan memperbaiki masalah responsive dengan mengubah koordinat secara sembarangan.

---

# 10. Sidebar dan Header

Komponen yang perlu diperiksa terlebih dahulu:

```text
resources/js/components/site-header.tsx
resources/js/components/context-switcher.tsx
```

Sidebar menggunakan `SidebarProvider` dari Shadcn UI.

Target mobile:

- sidebar dapat dibuka melalui hamburger/menu trigger
- header tidak overflow
- user menu tetap mudah digunakan
- context switcher tidak menyebabkan horizontal scroll
- tombol tetap berada dalam area touch yang nyaman

Tidak perlu membuat ulang sistem sidebar apabila implementasi Shadcn UI yang ada sudah menangani responsive behavior dengan baik.

---

# 11. Dashboard Statistic Cards

Gunakan grid responsive yang konsisten.

Contoh:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    ...
</div>
```

Target:

```text
Mobile
1 kolom

Tablet
2 kolom

Desktop
4 kolom
```

Gunakan spacing yang konsisten.

---

# 12. Design / Layout Token

Gunakan standar layout agar halaman tidak memiliki padding yang berbeda-beda tanpa alasan.

Contoh standar:

```text
px-4 py-4
md:px-6 md:py-6
lg:px-8
```

Typography:

```text
text-xl md:text-2xl font-bold
```

Tujuannya agar seluruh dashboard mempunyai visual hierarchy yang konsisten.

---

# 13. Roadmap Implementasi

Implementasi dilakukan bertahap.

## Fase 0 — Audit Existing Responsive Layout

Periksa terlebih dahulu:

```text
app.css
site-header.tsx
sidebar
section-cards.tsx
user-document-table.tsx
data-table.tsx
dashboard pages
```

Tujuan:

- menemukan komponen yang sudah responsive
- menemukan overflow
- menemukan fixed width
- menemukan tabel yang tidak nyaman di mobile
- menghindari refactor yang tidak diperlukan

Jangan mengubah component yang sebenarnya sudah bekerja dengan baik.

---

## Fase 1 — Layout Shell & Navigation

Fokus:

- header
- sidebar
- main content
- page padding
- mobile menu
- overflow horizontal

Target minimal:

```text
375px
390px
768px
1440px
```

Pastikan tidak ada horizontal scroll yang tidak diperlukan.

---

## Fase 2 — Dashboard Cards

Perbaiki:

```text
section-cards.tsx
```

Target:

```text
Mobile  → 1 column
Tablet  → 2 columns
Desktop → 4 columns
```

---

## Fase 3 — Document Table

Refactor:

```text
user-document-table.tsx
data-table.tsx
```

Jika diperlukan, pecah menjadi:

```text
document-list.tsx
document-table-view.tsx
document-card-view.tsx
document-card-item.tsx
```

Pastikan:

- filter tetap bekerja
- pagination tetap bekerja
- sorting tetap bekerja jika ada
- action tetap bekerja
- status tetap sama
- data tidak diduplikasi

---

## Fase 4 — Approval Timeline & Forms

Adaptasi:

```text
Approval Timeline
Form
Modal/Dialog
SLA information
Status information
```

Target mobile:

- timeline vertikal
- form tidak overflow
- action button mudah disentuh
- informasi tidak terlalu padat

---

## Fase 5 — Signature & PDF

Kerjakan setelah layout dasar stabil.

Periksa:

```text
PDF Viewer
Signature Pad
Signature Placement
QR Placement
Drag
Resize
Coordinate Conversion
PDF Stamping
```

Prioritas utama:

> **Responsive UI tidak boleh mengubah hasil posisi tanda tangan/QR pada PDF.**

Sebelum dan sesudah refactor harus dilakukan pengujian posisi overlay dan hasil stamping.

---

# 14. Breakpoint Pengujian

Minimal lakukan pengujian pada:

| Resolusi | Target |
|---|---|
| 375px | Smartphone kecil |
| 390px | Smartphone umum |
| 640px | Small breakpoint |
| 768px | Tablet / breakpoint desktop |
| 1024px | Tablet besar / laptop kecil |
| 1440px | Desktop |

Pengujian harus mencakup:

- User
- Admin
- Super Admin

---

# 15. Checklist Responsive

## Global

- [ ] Tidak ada horizontal overflow
- [ ] Header responsive
- [ ] Sidebar responsive
- [ ] Page padding konsisten
- [ ] Typography tidak terlalu besar di mobile
- [ ] Button dapat disentuh dengan nyaman

## Dashboard

- [ ] Statistic cards responsive
- [ ] Grid tidak terpotong
- [ ] Content tidak keluar viewport

## Document

- [ ] Table desktop tetap berfungsi
- [ ] Mobile menggunakan card jika diperlukan
- [ ] Filter responsive
- [ ] Pagination responsive
- [ ] Action menu responsive

## Approval

- [ ] Timeline desktop
- [ ] Timeline mobile
- [ ] Status tetap jelas
- [ ] SLA tetap terbaca
- [ ] Elapsed time tetap terbaca

## Signature

- [ ] Signature pad nyaman di mobile
- [ ] Touch interaction bekerja
- [ ] Canvas tidak terpotong
- [ ] Resize tetap bekerja
- [ ] Drag tetap bekerja
- [ ] QR placement tetap bekerja
- [ ] Signature placement tetap bekerja
- [ ] Hasil PDF tetap sesuai posisi overlay

---

# 16. Prinsip Maintenance

Setiap perubahan responsive harus mengikuti aturan:

### 1. Satu business logic

```text
                    ┌── Desktop UI
Business Logic ─────┤
                    └── Mobile UI
```

### 2. Jangan membuat duplicate handler

Hindari:

```text
desktopApprove()
mobileApprove()
```

Gunakan:

```text
handleApprove()
```

### 3. Gunakan Tailwind untuk perubahan sederhana

Jangan membuat component baru hanya karena:

```text
padding berbeda
font berbeda
gap berbeda
```

### 4. Buat component berbeda jika struktur berbeda

Contoh yang valid:

```text
Table → Card
Horizontal Timeline → Vertical Timeline
```

### 5. Jangan over-engineering

Tidak semua halaman membutuhkan:

```text
DesktopComponent
MobileComponent
TabletComponent
```

Mulai dari Tailwind responsive utilities dan pecah component hanya ketika diperlukan.

---

# 17. Urutan Prioritas Implementasi AMS

Prioritas yang disarankan:

```text
1. Audit layout
       ↓
2. Header + Sidebar
       ↓
3. Dashboard cards
       ↓
4. Document table → card
       ↓
5. Approval timeline
       ↓
6. Forms & dialogs
       ↓
7. Signature pad
       ↓
8. PDF/signature/QR placement
       ↓
9. Testing seluruh role
```

## Prinsip utama

> **Refactor sedikit demi sedikit, jangan langsung mengubah seluruh aplikasi.**

Setiap fase harus tetap bisa dijalankan dan diuji sebelum masuk ke fase berikutnya.
