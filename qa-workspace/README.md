# QA Workspace - Approval Management System (AMS)

Workspace khusus untuk Sub-Agent **QA Tester** dengan keahlian pengujian otomatis end-to-end (E2E) menggunakan **Playwright**.

---

## 📁 Struktur Workspace

```text
qa-workspace/
├── playwright.config.ts        # Konfigurasi Playwright (baseURL, browser, timeout, traces)
├── package.json                # Dependencies (@playwright/test) dan test runner scripts
├── tsconfig.json               # Konfigurasi TypeScript untuk test suite
├── README.md                   # Petunjuk workspace & panduan QA
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts                    # Pengujian login, validasi sesi & error kredensial
│   │   ├── document-paraf-preview.spec.ts  # Validasi paraf preview AMS & integritas download
│   │   └── approval-flow.spec.ts           # Alur approval dokumen, navigasi & timeline
│   ├── fixtures/
│   │   └── test-data.ts                    # Kredensial akun uji & route aplikasi
│   └── utils/
│       └── auth-helper.ts                  # Helper login otomatis & navigasi sesi
├── test-results/               # Artifact hasil test (screenshots saat gagal, video, trace)
└── playwright-report/          # Laporan HTML interaktif Playwright
```

---

## 🚀 Cara Menjalankan Tes

Sebelum menjalankan tes, pastikan server aplikasi AMS aktif (jalankan `start-servers.bat` di root AMS sehingga `http://localhost:8000` aktif).

### 1. Menjalankan Semua Tes (Headless Mode)
```bash
npm run test
# atau
npx playwright test
```

### 2. Menjalankan Tes dengan Browser Terlihat (Headed Mode)
```bash
npm run test:headed
```

### 3. Menjalankan Tes Interaktif (UI Mode)
```bash
npm run test:ui
```

### 4. Menjalankan Tes Spesifik
```bash
# Uji fitur paraf preview
npm run test:paraf

# Uji autentikasi
npm run test:auth

# Uji approval workflow
npm run test:approval
```

### 5. Melihat Laporan Hasil Tes (HTML Report)
```bash
npm run report
```

### 6. Merekam Skenario Tes Baru (Playwright Codegen)
```bash
npm run codegen
```

---

## 🤖 Peran Sub-Agent `qa-tester`

Agent `qa-tester` dapat dipanggil kapan saja untuk:
1. Menjalankan regresi otomatis setelah ada perubahan kode.
2. Memverifikasi fitur baru (misal: fitur paraf preview tidak ter-print di PDF).
3. Mendiagnosis test failure melalui trace file (`trace.zip`) dan screenshot.
4. Menghasilkan laporan QA terstruktur (Pass/Fail matrix, bug reproduction).

