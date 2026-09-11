# Requirement: Approval Timeline — Actual Approval Duration / SLA

## Context

Saya sedang mengembangkan **Approval Management System** menggunakan Laravel untuk backend dan React/TypeScript untuk frontend.

Saya ingin menambahkan informasi **durasi approval aktual (SLA)** pada bagian **Approval Timeline** di halaman detail dokumen, yaitu `dokumen/show.tsx`.

## Konsep SLA yang Diinginkan

Sistem perlu menampilkan **berapa lama waktu aktual yang digunakan oleh setiap approver untuk memproses approval**.

Durasi dihitung dari:

> **Saat approval diberikan/dikirim/ditugaskan kepada approver**
>
> sampai
>
> **saat approver melakukan tindakan approve atau reject.**

Jadi SLA yang ditampilkan adalah **durasi aktual proses approval**, bukan jatah waktu yang diberikan kepada masing-masing approver.

### Contoh

Misalnya:

```text
Dokumen dikirim kepada Manager
01 September 2026, 09:00

Manager melakukan approve
01 September 2026, 15:30

Durasi approval:
6 jam 30 menit
```

Pada timeline dapat ditampilkan:

```text
┌─────────────────────────────────────────────┐
│ ✓ Manager                     APPROVED      │
│   Approval Manager                          │
│                                             │
│   🕐 01 Sep 2026, 15:30                    │
│   ⏱ Durasi approval: 6 jam 30 menit        │
└─────────────────────────────────────────────┘
```

## Deadline Dokumen

Pemohon dapat memberikan **deadline untuk keseluruhan proses approval dokumen**.

Contoh:

```text
Pemohon memberikan deadline:
5 hari
```

Deadline tersebut berlaku untuk **keseluruhan proses approval**, bukan untuk masing-masing approver.

### PENTING

Deadline **tidak boleh dibagi rata** kepada approver.

Contoh yang SALAH:

```text
Total deadline: 5 hari

Manager  → 2 hari 12 jam
Direktur → 2 hari 12 jam
```

Sistem **tidak** menggunakan pendekatan tersebut.

Yang benar:

```text
Total deadline dokumen: 5 hari

Manager:
Durasi aktual = 1 hari 4 jam

Direktur:
Durasi aktual = 1 hari 20 jam
```

Masing-masing approver hanya memiliki **durasi aktual** berdasarkan berapa lama mereka benar-benar memproses approval setelah approval tersebut diberikan kepada mereka.

Dengan demikian terdapat dua konsep waktu yang berbeda:

1. **Deadline dokumen**
   - Ditentukan oleh pemohon.
   - Berlaku untuk keseluruhan proses approval.
   - Tidak dibagi menjadi jatah waktu per approver.

2. **Durasi approval aktual**
   - Dihitung untuk masing-masing approver.
   - Dimulai ketika approval diberikan kepada approver.
   - Berakhir ketika approver melakukan approve/reject.

## Approval yang Masih Pending

Jika approval masih berstatus `pending` dan belum memiliki waktu selesai, tampilkan durasi yang sudah berjalan sampai saat ini.

Contoh:

```text
Approval diberikan:
01 September 2026, 09:00

Sekarang:
02 September 2026, 12:00

Durasi approval:
1 hari 3 jam
```

Tampilan:

```text
Manager                         PENDING

⏱ Durasi approval: 1 hari 3 jam
```

Durasi pending dihitung:

```text
Waktu sekarang - waktu approval diberikan kepada user
```

## Menentukan Waktu Mulai Approval

Jangan langsung menggunakan tanggal dokumen dibuat sebagai waktu mulai.

Yang dibutuhkan adalah timestamp yang menunjukkan:

> **kapan approval benar-benar diberikan/dikirim/ditugaskan kepada approver tersebut.**

Periksa terlebih dahulu struktur project untuk mencari timestamp yang sudah tersedia, misalnya:

- `created_at`
- `sent_at`
- `assigned_at`
- `started_at`
- atau field timestamp lain yang relevan.

Periksa:

- Model `DokumenApproval`
- Migration tabel `dokumen_approvals`
- Controller yang menangani approval
- Service yang menangani proses approval
- Logic ketika approval dibuat/dikirim kepada approver
- Relasi `DokumenApproval` dengan dokumen dan masterflow

Jika `DokumenApproval` memang dibuat tepat ketika approval diberikan kepada approver, `created_at` dapat dipertimbangkan sebagai waktu mulai.

Namun jika `created_at` terjadi sebelum approval benar-benar diberikan kepada user, jangan menggunakannya.

Jika tidak ada timestamp yang tepat, jelaskan apakah diperlukan field baru seperti:

```text
started_at
```

atau:

```text
assigned_at
```

## Waktu Selesai Approval

Periksa field:

```tsx
approval.tgl_approve
```

Pastikan apakah field tersebut merepresentasikan waktu ketika approver melakukan tindakan approve/reject.

Jika sesuai:

```text
Durasi aktual = tgl_approve - waktu mulai approval
```

Untuk approval yang masih pending:

```text
Durasi aktual = waktu sekarang - waktu mulai approval
```

## Group Approval

Approval Timeline saat ini memiliki dua jenis item:

- `single`
- `group`

Group approval dapat memiliki tipe:

- `any_one`
- `all_required`

Pertahankan seluruh logic group approval yang sudah ada.

Untuk group approval, durasi sebaiknya dihitung untuk **masing-masing approver**, berdasarkan:

```text
waktu approval diberikan kepada approver
        ↓
approver melakukan approve/reject
```

Contoh:

```text
Group Approval

Manager A
Dikirim: 09:00
Approve: 13:00
Durasi: 4 jam

Manager B
Dikirim: 09:00
Approve: 15:30
Durasi: 6 jam 30 menit
```

### Approval `skipped`

Jika anggota group memiliki status `skipped` karena group sudah menyelesaikan approval, jangan menampilkan durasi seolah-olah user tersebut benar-benar memproses approval.

Pertahankan behavior `skipped` yang sudah ada.

## Format Durasi

Gunakan format yang mudah dibaca:

```text
25 menit
4 jam 27 menit
1 hari 3 jam
2 hari 5 jam 15 menit
```

Tidak perlu menampilkan satuan yang nilainya nol.

Contoh:

```text
4 jam
```

lebih baik daripada:

```text
0 hari 4 jam 0 menit
```

## UI

Tambahkan informasi durasi ke dalam card pada **Approval Timeline** yang sudah ada di `dokumen/show.tsx`.

Jangan menghilangkan informasi existing seperti:

- nama approver
- jabatan
- status approval
- komentar
- alasan penolakan
- tanggal approval

Durasi approval hanya menjadi informasi tambahan.

Contoh:

```text
┌─────────────────────────────────────────────┐
│ ✓ Manager                     APPROVED      │
│   Approval Manager                          │
│                                             │
│   🕐 01 Sep 2026, 15:30                    │
│   ⏱ Durasi approval: 6 jam 30 menit        │
└─────────────────────────────────────────────┘
```

## Scope

Untuk tahap ini, fokus pada **menampilkan waktu/durasi aktual proses approval**.

Jangan membuat sistem membagi deadline dokumen menjadi jatah waktu untuk setiap approver.

Jangan menambahkan status SLA seperti:

- `Within SLA`
- `Overdue`
- `Warning`
- `SLA Exceeded`

kecuali struktur existing project ternyata sudah memiliki konsep tersebut dan memang diperlukan.

Fokus utama adalah:

> **Menampilkan berapa lama masing-masing approver benar-benar membutuhkan waktu untuk memproses approval sejak approval diberikan kepada mereka sampai mereka melakukan approve/reject.**

## Sebelum Mengubah Kode

Jangan langsung mengubah kode.

Analisis terlebih dahulu struktur project dan jelaskan:

1. Dari mana data Approval Timeline berasal.
2. Field apa yang paling tepat digunakan sebagai waktu mulai approval.
3. Field apa yang digunakan sebagai waktu selesai approval.
4. Apakah data yang diperlukan sudah tersedia di database.
5. Apakah perlu menambahkan field baru pada database.
6. Di bagian backend mana durasi sebaiknya dihitung.
7. Di bagian frontend `dokumen/show.tsx` mana informasi durasi akan ditampilkan.
8. Bagaimana menangani approval yang masih `pending`.
9. Bagaimana menangani `single`, `any_one`, `all_required`, dan `skipped`.
10. Bagaimana memastikan deadline keseluruhan dokumen **tidak dibagi menjadi deadline per approver**.

Prioritaskan penggunaan struktur dan data yang sudah tersedia. Jangan menambahkan migration atau field database baru jika data existing sebenarnya sudah cukup untuk menghitung durasi aktual approval.

Setelah analisis selesai, baru usulkan perubahan kode yang diperlukan.
