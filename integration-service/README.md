# Fastify Integration Service

Service perantara (*middleware integration layer*) antara **Approval Management System (AMS)** dan **External Inventory System (ERP/Inventory)**.

## Fitur Utama

- **Otorisasi JWT Otomatis**: Menyimpan token JWT external inventory system di memory cache dan me-refresh token secara transparan.
- **Pencarian / Lookup Multi-Dokumen**: Mencari PO dan PR sekaligus (`GET /api/integration/lookup?q=...`).
- **Data Transformation**: Menstransformasi data mentah dari External Inventory System ke format yang 100% kompatibel dengan `TransactionTemplatePdfService.php` dan `DummyTransactionService.php` di AMS.
- **Proxy PDF**: Mengambil dan mengalirkan file PDF asli Purchase Order dari external inventory system.

## Cara Menjalankan

1. Install dependencies:
   ```bash
   npm install
   ```

2. Jalankan server:
   ```bash
   npm run dev
   ```
   atau:
   ```bash
   npm start
   ```

Server akan berjalan pada `http://localhost:5000`.

## Endpoint API

- `GET /health` : Cek status service
- `GET /api/integration/lookup?q={query}` : Pencarian PO & PR untuk autocomplete
- `GET /api/integration/document/{keyword}` : Detail dokumen transaksi terstandarisasi untuk AMS
- `GET /api/integration/purchase-orders/lookup?q={query}` : Lookup khusus PO
- `GET /api/integration/purchase-orders/:id` : Detail PO
- `GET /api/integration/purchase-orders/:id/pdf` : Stream PDF PO asli dari External System
- `GET /api/integration/purchase-requests/lookup?q={query}` : Lookup khusus PR
- `GET /api/integration/purchase-requests/:id` : Detail PR
