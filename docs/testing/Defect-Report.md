# Approval Management System (AMS) — Defect & Audit Finding Report

Dokumen ini mencatat seluruh temuan cacat (*defects*), inkonsistensi arsitektur, dan diskrepansi antara kode sumber, route, controller, frontend, dan automation test yang ditemukan selama audit dan proses stabilisasi pengujian sistem.

---

## 1. Ringkasan Temuan Defect

| Defect ID | Judul Temuan | Modul Terkait | Severity | Status | Tindakan / Resolusi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | `BadMethodCallException` pada route `masterflows/{masterflow}/steps` | Routing / Masterflow | **Major** | Documented & Verified | Route helper di `routes/web.php:218` memanggil method non-existent `$masterflow->masterflowDetails()`. Endpoint resmi yang aktif dan valid adalah `/api/masterflows/{masterflow}/steps` (`Admin\MasterflowController@getSteps`). Test diselaraskan ke endpoint resmi. Direkomendasikan menghapus/memperbaiki closure di `routes/web.php`. |
| **DEF-002** | Orphaned Legacy Controller `Settings\PasswordController.php` | Settings / Auth | **Minor** | Resolved in Test Suite | Controller terpisah `PasswordController.php` tidak didaftarkan di router. Investigasi menemukan bahwa fitur ubah password telah **digabung ke dalam form profil terpadu** (`resources/js/pages/profile.tsx`) menggunakan `PATCH /profile` (`ProfileController@update` & `ProfileUpdateRequest`). `PasswordUpdateTest.php` kini memvalidasi alur resmi ini (100% PASS). |
| **DEF-003** | Inkonsistensi Asersi Test Bawaan Laravel Breeze | Authentication & Dashboard | **Moderate** | Resolved in Test Suite | Test bawaan Breeze mengasumsikan redirect umum (`/dashboard`, `/`, 200 OK) yang bertentangan dengan arsitektur multi-role dinamis AMS (redirect ke `/user/dashboard`, `/waiting-room`, `/login`). Seluruh test auth telah diselaraskan dengan arsitektur peran AMS. |
| **DEF-004** | Ketiadaan Factory Database untuk Model Domain Utama | Testing Infrastructure | **Major** | Resolved (Factories Created) | Test `UserPinTest` dan test baru gagal karena SQLite in-memory tidak memiliki factory untuk model: `UserRole`, `Company`, `Jabatan`, `Aplikasi`, `Dokumen`, `DokumenApproval`, `DokumenVersion`, `Masterflow`, `MasterflowStep`. Telah dibuat 9 file factory lengkap di `database/factories/`. |

---

## 2. Rincian Analisis Cacat

### DEF-001: Undefined Method pada Helper Route Masterflow
- **Lokasi**: [routes/web.php](file:///d:/Magang/Project%202/Approval-Management-System/routes/web.php#L216-L227) (baris 218)
- **Gejala**: HTTP 500 saat endpoint `GET /masterflows/{masterflow}/steps` dipanggil:
  ```text
  BadMethodCallException: Call to undefined method App\Models\Masterflow::masterflowDetails()
  ```
- **Akar Masalah**: Model `App\Models\Masterflow` mendefinisikan relasi `steps()`, bukan `masterflowDetails()`. Selain itu, model `MasterflowStep` berelasi dengan `jabatan`, bukan `role` atau `approver`.
- **Rekomendasi Perbaikan Teknis**:
  Hapus closure duplikat pada `routes/web.php` baris 216-227, dan pastikan frontend secara konsisten mengonsumsi route API yang telah tersedia di [routes/api.php](file:///d:/Magang/Project%202/Approval-Management-System/routes/api.php#L86):
  ```php
  Route::get('/masterflows/{masterflow}/steps', [\App\Http\Controllers\Admin\MasterflowController::class, 'getSteps']);
  ```

---

### DEF-002: Orphaned Controller vs Konsolidasi Fitur Ganti Password
- **Lokasi**:
  - Controller yatim: [app/Http/Controllers/Settings/PasswordController.php](file:///d:/Magang/Project%202/Approval-Management-System/app/Http/Controllers/Settings/PasswordController.php)
  - Controller aktif: [app/Http/Controllers/Settings/ProfileController.php](file:///d:/Magang/Project%202/Approval-Management-System/app/Http/Controllers/Settings/ProfileController.php)
  - Form Request aktif: [app/Http/Requests/Settings/ProfileUpdateRequest.php](file:///d:/Magang/Project%202/Approval-Management-System/app/Http/Requests/Settings/ProfileUpdateRequest.php)
  - Frontend aktif: [resources/js/pages/profile.tsx](file:///d:/Magang/Project%202/Approval-Management-System/resources/js/pages/profile.tsx#L121-L160)
- **Gejala**: Test awal `Settings/PasswordUpdateTest` berstatus BLOCKED karena mencoba memanggil `PUT /password` yang mengembalikan HTTP 404 Not Found.
- **Hasil Investigasi Mendalam**:
  1. Frontend AMS tidak memiliki halaman terpisah `/settings/password`.
  2. UI ganti password dan ganti PIN dirancang menyatu dalam halaman **Profil** (`resources/js/pages/profile.tsx`).
  3. Form profil mengirimkan `current_password`, `password`, dan `password_confirmation` ke `PATCH /profile` (`profile.update`).
  4. `ProfileUpdateRequest` secara aktif memvalidasi `current_password` dan `password` (min 8 karakter).
  5. `ProfileController@update` mengenkripsi dan menyimpan password baru:
     ```php
     if (!empty($validated['password'])) {
         $user->password = bcrypt($validated['password']);
     }
     ```
- **Tindakan yang Diambil**:
  Sesuai prinsip tidak mengubah alur bisnis dan tidak menambahkan rute duplikat yang tidak dibutuhkan frontend, `tests/Feature/Settings/PasswordUpdateTest.php` disesuaikan untuk menguji endpoint resmi `PATCH /profile`. Seluruh 4 skenario (happy path, wrong current password, mismatched confirmation, minimum length) kini **100% PASSED**.

---

### DEF-003: Diskrepansi Asersi pada Test Bawaan Breeze
- **Lokasi**: `tests/Feature/Auth/AuthenticationTest.php`, `tests/Feature/Auth/RegistrationTest.php`, `tests/Feature/DashboardTest.php`, `tests/Feature/ExampleTest.php`
- **Gejala**: Test gagal karena ekspektasi URL statis (`/dashboard`, `/`, HTTP 200).
- **Akar Masalah**:
  1. Login di AMS mengarahkan user sesuai hak akses (`/super-admin/dashboard`, `/admin/dashboard`, atau `/user/dashboard`).
  2. User baru yang mendaftar mandiri diarahkan ke `/waiting-room` karena belum memiliki asosiasi company/jabatan/role.
  3. Endpoint `/dashboard` merupakan router middleware yang meredirect (HTTP 302) ke dashboard spesifik peran.
  4. Endpoint `/` meredirect guest ke `/login`.
- **Tindakan yang Diambil**:
  Asersi test diperbarui agar sesuai dengan spesifikasi perilaku bisnis AMS tanpa memodifikasi kode produksi.

---

### DEF-004: Ketiadaan Database Model Factories
- **Lokasi**: `database/factories/`
- **Gejala**: Error `QueryException: no such table: usersroles` atau `Call to undefined method Factory::create()` pada eksekusi test SQLite in-memory.
- **Tindakan yang Diambil**:
  Telah dibuat 9 database factories baru:
  - `UserRoleFactory.php`
  - `CompanyFactory.php`
  - `JabatanFactory.php`
  - `AplikasiFactory.php`
  - `MasterflowFactory.php`
  - `MasterflowStepFactory.php`
  - `DokumenFactory.php`
  - `DokumenVersionFactory.php`
  - `DokumenApprovalFactory.php`
