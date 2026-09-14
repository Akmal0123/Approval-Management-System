<?php

namespace Database\Seeders;

use App\Models\Aplikasi;
use App\Models\Transaksi;
use Illuminate\Database\Seeder;

class TransaksiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $aplikasis = Aplikasi::all();

        if ($aplikasis->isEmpty()) {
            $this->command->error('No aplikasis found! Please run AplikasiSeeder first.');
            return;
        }

        $sampleTransaksis = [
            'Tisera' => [
                [
                    'kode_transaksi' => 'PR',
                    'nama_transaksi' => 'Purchase Requisition',
                    'departemen' => 'Procurement',
                    'deskripsi' => 'Pengajuan pengadaan barang dan jasa operasional',
                    'is_active' => true,
                ],
                [
                    'kode_transaksi' => 'PO',
                    'nama_transaksi' => 'Purchase Order',
                    'departemen' => 'Purchasing',
                    'deskripsi' => 'Pemesanan pembelian barang ke vendor rekanan',
                    'is_active' => true,
                ],
                [
                    'kode_transaksi' => 'CUTI',
                    'nama_transaksi' => 'Pengajuan Cuti Tahunan',
                    'departemen' => 'HRD',
                    'deskripsi' => 'Form permohonan cuti tahunan dan izin karyawan',
                    'is_active' => true,
                ],
                [
                    'kode_transaksi' => 'REIMBURSE',
                    'nama_transaksi' => 'Reimbursement Biaya',
                    'departemen' => 'Finance',
                    'deskripsi' => 'Penggantian biaya operasional dinas dan klaim medis',
                    'is_active' => true,
                ],
            ],
            'PerpusKita' => [
                [
                    'kode_transaksi' => 'REQ_BUKU',
                    'nama_transaksi' => 'Pengadaan Koleksi Buku',
                    'departemen' => 'Perpustakaan',
                    'deskripsi' => 'Usulan penambahan buku dan literatur digital baru',
                    'is_active' => true,
                ],
                [
                    'kode_transaksi' => 'LANGGANAN',
                    'nama_transaksi' => 'Langganan E-Journal',
                    'departemen' => 'IT & Konten',
                    'deskripsi' => 'Pengajuan perpanjangan lisensi jurnal ilmiah internasional',
                    'is_active' => true,
                ],
            ],
            'Assalaam Hypermarket' => [
                [
                    'kode_transaksi' => 'INV_STOCK',
                    'nama_transaksi' => 'Penyesuaian Stok Gudang',
                    'departemen' => 'Inventory',
                    'deskripsi' => 'Berita acara stock opname dan penyesuaian inventaris retail',
                    'is_active' => true,
                ],
                [
                    'kode_transaksi' => 'RETURN_SUPPLIER',
                    'nama_transaksi' => 'Retur Barang ke Supplier',
                    'departemen' => 'Warehouse',
                    'deskripsi' => 'Dokumen pengembalian barang rusak atau mendekati expired',
                    'is_active' => true,
                ],
            ],
        ];

        $totalCreated = 0;

        foreach ($aplikasis as $aplikasi) {
            $transList = $sampleTransaksis[$aplikasi->name] ?? [
                [
                    'kode_transaksi' => 'DOC_' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $aplikasi->name), 0, 4)),
                    'nama_transaksi' => 'Pengajuan Transaksi ' . $aplikasi->name,
                    'departemen' => 'Operasional',
                    'deskripsi' => 'Dokumen transaksi standar untuk sistem ' . $aplikasi->name,
                    'is_active' => true,
                ]
            ];

            foreach ($transList as $trans) {
                Transaksi::firstOrCreate(
                    [
                        'aplikasi_id' => $aplikasi->id,
                        'kode_transaksi' => $trans['kode_transaksi'],
                    ],
                    [
                        'nama_transaksi' => $trans['nama_transaksi'],
                        'departemen' => $trans['departemen'],
                        'deskripsi' => $trans['deskripsi'],
                        'is_active' => $trans['is_active'],
                    ]
                );
                $totalCreated++;
            }
        }

        $this->command->info("Transaksi seeder completed successfully! Created/verified {$totalCreated} transaksi records.");
    }
}
