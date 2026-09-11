# Rencana Implementasi: Integrasi Pratinjau dan Penyesuaian Posisi Tanda Tangan/QR Code pada Halaman Approval

Dokumen ini menjelaskan rencana teknis untuk menggantikan pemutar PDF standar (`PDFViewer`) pada halaman pratinjau approval (`approvals/show.tsx`) dengan antarmuka penempatan tanda tangan interaktif dari `SignaturePlacementDialog`. Ini akan memungkinkan approver melihat posisi tanda tangan/QR code dan mengkoreksinya secara langsung dari halaman pratinjau sebelum melakukan tanda tangan.

## User Review Required

> [!IMPORTANT]
> **Aksesibilitas Perubahan Posisi**
> - **Approver Aktif**: Hanya approver aktif (status approval `pending` dan `canApprove` bernilai `true`) yang diizinkan untuk menggeser/mengubah ukuran kotak tanda tangan atau QR code.
> - **Mode Baca-Saja (Read-Only)**: Pengguna lain atau approver yang sudah memproses persetujuan hanya dapat melihat pratinjau posisi tanpa tombol "Simpan Posisi" dan tidak dapat menggeser/mengubah ukuran objek apa pun. Hal ini untuk menjaga integritas dokumen yang sudah ditandatangani.

---

## Proposed Changes

### Komponen Frontend

#### [MODIFY] [signature-placement-dialog.tsx](file:///d:/Project/Approval-Management-System/resources/js/components/signature-placement-dialog.tsx)
- Menambahkan properti `readOnly?: boolean` pada `Props` interface.
- Memodifikasi `useEffect` agar dapat memuat posisi tanda tangan ketika `isEmbedded` bernilai `true` (tidak hanya bergantung pada `open`).
- Memperbarui fungsi `handleMouseDown` dan `handleResizeMouseDown` agar mengabaikan event geser/ubah ukuran jika `readOnly` aktif atau jika kotak merupakan signature milik approver lain yang sudah disetujui (`approval_status === 'approved'`).
- Memodifikasi return render komponen:
  - Jika `isEmbedded` bernilai `true`, langsung kembalikan layout bagian dalam (sidebar & PDF viewer area) tanpa pembungkus `<Dialog>`, `<DialogContent>`, dsb.
  - Tampilkan tombol **"Simpan Posisi"** di bagian bawah sidebar konfigurasi jika dalam mode `isEmbedded` dan tidak `readOnly`.
- Menyesuaikan penutupan dialog di `handleSave` agar opsional (hanya memanggil `onOpenChange` jika fungsi tersebut disediakan).

#### [MODIFY] [show.tsx](file:///d:/Project/Approval-Management-System/resources/js/pages/approvals/show.tsx)
- Mengimpor `SignaturePlacementDialog`.
- Menyiapkan variabel `mappedApprovalsForPlacement` untuk memetakan data `allApprovals` ke struktur data yang sesuai dengan antarmuka `Approval` pada `SignaturePlacementDialog`.
- Mengganti komponen `<PDFViewer>` di bagian kiri dialog pratinjau dokumen dengan `<SignaturePlacementDialog>` yang dikonfigurasi sebagai:
  - `isEmbedded={true}`
  - `readOnly={!(canApprove && approval.approval_status === 'pending')}`
  - `dokumenId={approval.dokumen.id}`
  - `fileUrl={previewFileUrl}`

---

## Verification Plan

### Manual Verification
1. **Verifikasi Tampilan Approver Aktif**:
   - Masuk sebagai approver yang memiliki tugas approval pending.
   - Buka halaman detail approval dokumen lalu klik **"Setujui Dokumen"** atau **"Preview"**.
   - Pastikan di sebelah kiri tampil pratinjau PDF lengkap dengan sidebar pengaturan tanda tangan & QR Code, serta kotak tanda tangan yang bisa digeser/diubah ukurannya.
   - Coba geser kotak tanda tangan/QR code dan klik **"Simpan Posisi"** di sidebar kiri. Pastikan muncul toast berhasil dan posisi tersimpan ke DB.
   - Lakukan tanda tangan di panel kanan dan setujui dokumen.
   - Pastikan PDF yang dihasilkan memiliki tanda tangan & QR code di koordinat yang baru saja disesuaikan.

2. **Verifikasi Tampilan Baca-Saja (Read-Only)**:
   - Masuk sebagai pengguna biasa atau approver yang sudah menyetujui dokumen tersebut.
   - Buka pratinjau dokumen.
   - Pastikan kotak tanda tangan/QR code tampil di posisi masing-masing tetapi tidak dapat digeser atau diubah ukurannya, dan tombol **"Simpan Posisi"** di sidebar kiri tidak muncul.
