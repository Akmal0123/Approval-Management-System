# Approval Management System (AMS) — Testing Documentation Hub

Selamat datang di direktori dokumentasi pengujian resmi untuk **Approval Management System (AMS)**. Direktori ini menjadi pusat acuan tunggal (*single source of truth*) untuk seluruh artefak pengujian sistem, spesifikasi kasus uji, pelacakan kebutuhan, dan laporan defek perangkat lunak.

---

## 1. Indeks Dokumen Pengujian Utama

Sesuai standar penataan dokumentasi pengujian sistem, direktori ini memelihara **satu file utama** untuk setiap jenis dokumen:

| Nama File | Format | Deskripsi & Isi Dokumen |
| :--- | :---: | :--- |
| **[RTM.xlsx](file:///d:/Magang/Project%202/Approval-Management-System/docs/testing/RTM.xlsx)** | Excel (`.xlsx`) | **Requirements Traceability Matrix**: Memetakan 36 kebutuhan bisnis/fitur sistem terhadap Test Case ID, file & method automation test PHPUnit/Pest terkait, serta status coverage (100% Covered). |
| **[Test-Cases.xlsx](file:///d:/Magang/Project%202/Approval-Management-System/docs/testing/Test-Cases.xlsx)** | Excel (`.xlsx`) | **Test Cases Specification**: Katalog 37 kasus uji lengkap dengan atribut ID, modul, skenario, tipe (Positive, Negative, Boundary, Security), preconditions, langkah pengujian, data uji, hasil yang diharapkan, dan status otomatisasi. |
| **[Test-Plan.md](file:///d:/Magang/Project%202/Approval-Management-System/docs/testing/Test-Plan.md)** | Markdown (`.md`) | **Master Test Plan**: Rencana induk pengujian mencakup tujuan, ruang lingkup (in-scope & out-of-scope), strategi pengujian multi-level (Unit, Feature, Integration, Security), konfigurasi SQLite in-memory, kriteria masuk/keluar, dan mitigasi risiko. |
| **[Test-Execution-Report.md](file:///d:/Magang/Project%202/Approval-Management-System/docs/testing/Test-Execution-Report.md)** | Markdown (`.md`) | **Test Execution Report**: Laporan eksekutif hasil pengujian aktual, matriks keberhasilan per test suite (118 passed, 0 failed, 0 skipped), analisis eliminasi status blocked pada password update, dan log lengkap assertions. |
| **[Defect-Report.md](file:///d:/Magang/Project%202/Approval-Management-System/docs/testing/Defect-Report.md)** | Markdown (`.md`) | **Defect & Audit Finding Report**: Rekapitulasi temuan cacat sistem, analisis bug closure `masterflowDetails()` pada `routes/web.php:218`, investigasi orphaned `PasswordController`, analisis redirect Breeze, dan pembuatan database model factories. |
| **[Testing-README.md](file:///d:/Magang/Project%202/Approval-Management-System/docs/testing/Testing-README.md)** | Markdown (`.md`) | **Testing Hub Index**: Panduan navigasi seluruh dokumen, struktur test suite, tata cara eksekusi pengujian, dan arsitektur database factories. |

---

## 2. Struktur Test Suite & Cakupan Pengujian

Seluruh automation test ditempatkan pada direktori `tests/Feature/` dan `tests/Unit/`:

```text
tests/
├── Feature/
│   ├── Auth/
│   │   ├── AuthenticationTest.php       # Autentikasi dasar Breeze (Login & Logout)
│   │   ├── EmailVerificationTest.php    # Layar & token verifikasi email
│   │   ├── PasswordConfirmationTest.php # Konfirmasi password screen
│   │   ├── PasswordResetTest.php        # Alur token reset password
│   │   └── RegistrationTest.php         # Pendaftaran akun & redirect ke waiting room
│   ├── Settings/
│   │   ├── PasswordUpdateTest.php       # Validasi perubahan kata sandi (PATCH /profile)
│   │   └── ProfileUpdateTest.php        # Update data profil & penghapusan akun
│   ├── AuthenticationTest.php           # Comprehensive auth suite & rate limiting
│   ├── DashboardTest.php                # Pengujian rute role dashboard redirector
│   ├── DocumentWorkflowTest.php         # Siklus hidup dokumen (store, cancel, approve, reject, revise)
│   ├── ExampleTest.php                  # Pengujian root URL (/) redirect
│   ├── MasterflowApprovalTest.php       # CRUD Masterflow, sequential & parallel/group approval
│   ├── RoleAuthorizationTest.php        # Multi-role access control (Super Admin, Admin, User, Waiting Room)
│   ├── SignatureVerificationTest.php    # Verifikasi publik keabsahan tanda tangan QR token
│   ├── UserManagementTest.php           # CRUD API User, filter jabatan, & duplicate PIN support
│   └── UserPinTest.php                  # Validasi bisnis penyimpanan duplikasi PIN
├── Traits/
│   └── CreatesTestData.php              # Reusable trait setup context User, Role, Company, Jabatan, Aplikasi
└── Unit/
    └── ExampleTest.php                  # Basic unit sanity test
```

---

## 3. Database Factories (`database/factories/`)

Untuk mendukung pengujian otomatis pada database SQLite `:memory:` yang bersih dan terisolasi, 10 model factory berikut dipelihara secara aktif:

1. `UserFactory.php` — Model `User`
2. `UserRoleFactory.php` — Model `UserRole` (tabel `usersroles`)
3. `CompanyFactory.php` — Model `Company` (tabel `companies`)
4. `JabatanFactory.php` — Model `Jabatan` (tabel `jabatans`)
5. `AplikasiFactory.php` — Model `Aplikasi` (tabel `aplikasis`)
6. `MasterflowFactory.php` — Model `Masterflow` (tabel `masterflows`)
7. `MasterflowStepFactory.php` — Model `MasterflowStep` (tabel `masterflow_steps`)
8. `DokumenFactory.php` — Model `Dokumen` (tabel `dokumens`)
9. `DokumenVersionFactory.php` — Model `DokumenVersion` (tabel `dokumen_versions`)
10. `DokumenApprovalFactory.php` — Model `DokumenApproval` (tabel `dokumen_approval`)

---

## 4. Cara Menjalankan Automation Test

### Menjalankan Seluruh Test Suite:
```bash
php artisan test
```

### Menjalankan Test Suite Tertentu:
```bash
# Menjalankan pengujian perubahan password
php artisan test --filter=PasswordUpdateTest

# Menjalankan pengujian alur dokumen & approval
php artisan test tests/Feature/DocumentWorkflowTest.php

# Menjalankan pengujian otorisasi peran
php artisan test tests/Feature/RoleAuthorizationTest.php
```

---

## 5. Ringkasan Hasil Pengujian Terkini

- **Total Test**: 118 test
- **Passed**: 118 test (100%)
- **Failed**: 0 test (0%)
- **Skipped / Blocked**: 0 test (0%)
- **Total Assertions**: 294 assertions
- **Durasi Eksekusi**: 11.60s
- **Status Akhir**: **SUCCESS (Exit Code: 0 — 100% PASS, 0 FAILED, 0 SKIPPED)**
