# Approval Management System (AMS) — Master Test Plan

## 1. Pendahuluan & Ringkasan Eksekutif
Dokumen ini merupakan Rencana Pengujian Induk (Master Test Plan) untuk sistem **Approval Management System (AMS)**. AMS adalah platform berbasis web untuk mengelola alur pengesahan dokumen, hierarki persetujuan multi-level (sequential dan parallel), manajemen pengguna, hak akses berbasis peran (Super Admin, Verifikator, Approver, Creator), serta validasi tanda tangan/QR code dokumen.

Sistem dibangun menggunakan:
- **Backend**: Laravel 12 (PHP 8.2+)
- **Frontend**: React 19, TypeScript, Inertia.js, TailwindCSS
- **Database**: MySQL (Production/Staging), SQLite In-Memory (Automated Testing)
- **Pengujian**: PHPUnit 11 / Laravel Test Framework

---

## 2. Tujuan Pengujian (Test Objectives)
1. **Memastikan Validitas Fungsional**: Memverifikasi bahwa setiap fitur inti (autentikasi, manajemen pengguna, masterflow, pengajuan dokumen, alur approval, download/verifikasi dokumen) beroperasi sesuai spesifikasi requirement.
2. **Integritas Alur Approval**: Menjamin status approval dokumen transisi dengan benar (`pending` -> `waiting_approval` -> `approved` / `rejected`), urutan step approval terjamin (sequential), dan parallel approval bekerja sesuai aturan.
3. **Keamanan & Otorisasi**: Mencegah akses unauthorized, memastikan isolasi hak akses (Super Admin vs Creator vs Approver), serta validasi keamanan PIN/password.
4. **Regresi & Stabilitas**: Menyediakan test suite otomatis yang dapat dijalankan secara cepat dan terisolasi untuk mendeteksi regresi kode sedini mungkin.

---

## 3. Ruang Lingkup Pengujian (Scope)

### 3.1. In-Scope (Dalam Lingkup)
- **Autentikasi & Sesi**:
  - Login dengan kredensial valid dan penolakan kredensial salah
  - Proteksi brute force (rate limiting login)
  - Logout dan regenerasi session token
  - Registrasi akun baru & email verification
  - Autentikasi sesi profil (`/profile`)
- **Manajemen Pengguna (User Management)**:
  - CRUD User (`/api/users`)
  - Filter user berdasarkan jabatan (`/api/users/jabatan/{jabatan_id}`)
  - Validasi PIN user (format numerik 6 digit)
  - Pembatasan akses CRUD khusus Super Admin
- **Master Data & Masterflow**:
  - Konfigurasi masterflow approval per aplikasi dan tipe dokumen
  - Definisi langkah persetujuan (`MasterflowStep`): urutan step, jenis (sequential vs parallel), jabatan approver
- **Siklus Dokumen & Pengajuan (Document Lifecycle)**:
  - Pengajuan dokumen baru (`/dokumen/store`)
  - Validasi kelengkapan metadata dokumen dan upload file attachment
  - Inisialisasi otomatis relasi `DokumenApproval` berdasarkan langkah `Masterflow` aktif
  - Versioning dokumen (`DokumenVersion`)
- **Eksekusi Approval Dokumen**:
  - Review dan aksi persetujuan (Approve) dengan PIN verifikasi
  - Penolakan dokumen (Reject) dengan pencatatan alasan penolakan
  - Validasi kepemilikan step: hanya approver yang ditugaskan pada step aktif yang dapat melakukan approval
  - Penolakan approval jika status dokumen bukan dalam status aktif/menunggu
- **Verifikasi Tanda Tangan & QR Code**:
  - Endpoint publik `/verify/{hash}` untuk memverifikasi keaslian dokumen bertanda tangan
  - Tampilan audit trail approval pada dokumen yang telah disetujui

### 3.2. Out-of-Scope (Di Luar Lingkup)
- Stress testing dan load testing ribuan pengguna serentak (dijadwalkan pada fase performance testing terpisah).
- Pengujian perangkat keras scanner QR code fisik.
- Pengujian eksternal third-party mail server (menggunakan `Mail::fake()` pada pengujian otomatis).

---

## 4. Strategi Pengujian (Testing Strategy)

### 4.1. Level Pengujian
1. **Unit Testing**:
   - Validasi model helper, mutator, accessor, casting, dan fungsi utilitas hashing.
2. **Feature & Integration Testing**:
   - HTTP request/response testing menggunakan PHPUnit feature tests.
   - Database state assertions (transaksi rollback per test via `RefreshDatabase`).
   - Mocking sesi autentikasi dan header Inertia.
3. **Negative & Security Testing**:
   - Pengujian input berbahaya, bypassing authentication middleware, manipulasi role, otorisasi horizontal/vertikal, dan percobaan approval tanpa hak akses.

### 4.2. Konfigurasi Lingkungan Testing
- **Framework**: PHPUnit 11.5.3 dengan Laravel Test runner (`php artisan test`)
- **Database Driver**: SQLite `:memory:` (terkonfigurasi pada `phpunit.xml`)
- **Cache / Session Driver**: `array` (terisolasi per test worker, tidak persisten ke disk)
- **Queue / Mail Driver**: `sync` / `array`

---

## 5. Kriteria Masuk dan Keluar (Entry & Exit Criteria)

### 5.1. Entry Criteria
- Repository project dalam kondisi kompilasi bersih (tidak ada syntax error).
- Seluruh migrasi database dapat dieksekusi tanpa kegagalan pada SQLite in-memory.
- Data factories lengkap untuk setiap model domain utama (`User`, `Dokumen`, `DokumenApproval`, `Masterflow`, dll.).

### 5.2. Exit Criteria
- 100% test automation baru untuk fitur inti berstatus **PASSED**.
- Seluruh kegagalan test lama yang disebabkan route outdated telah diperbarui atau didokumentasikan.
- Test coverage mencakup skenario Happy Path, Unhappy Path, Edge Case, dan Security/Authorization.
- Laporan pengujian lengkap terdokumentasi di `docs/testing/`.

---

## 6. Risiko & Rencana Mitigasi

| Risiko | Dampak | Mitigasi |
| :--- | :--- | :--- |
| **Inkonsistensi Route Settings**: Route `/settings/password` tidak terdaftar di router meskipun controller ada. | Test lama gagal (404/RouteNotFound). | Route telah diperiksa dengan `route:list`. Test lama diperbarui untuk mencerminkan status rute aktual. |
| **PIN Hash vs Plaintext**: Kolom PIN dienkripsi dengan `bcrypt`/`Hash::make`, verifikasi memerlukan `Hash::check`. | Kegagalan assertion jika diverifikasi langsung via plaintext query. | Factory dan Test Helper menggunakan `Hash::make('123456')` dan memanggil method verifikasi resmi. |
| **Relasi Foreign Key SQLite**: SQLite in-memory mengaktifkan enforce foreign key yang ketat pada migrasi Laravel 12. | Insert gagal jika data induk tidak dibuat terlebih dahulu. | `CreatesTestData` trait dan factory relationships secara otomatis menyediakan relasi induk (`Company`, `Jabatan`, `Aplikasi`, `UserRole`). |
| **Stateful Inertia Props**: Pengujian endpoint web membutuhkan simulasi session auth yang valid. | Redirect ke login (302) jika sesi tidak diinisialisasi. | Menggunakan `$this->actingAs($user)` dan mocking session `selected_company_id`/`selected_app_id`. |
