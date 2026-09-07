<?php

namespace App\Services;

class DummyTransactionService
{
    /**
     * Get all dummy transaction records.
     *
     * @return array<string, array>
     */
    public static function all(): array
    {
        return [
            // =========================================================================
            // PURCHASE REQUEST (PR)
            // =========================================================================
            'RQE-22001433' => [
                'kode' => 'RQE-22001433',
                'nomor_dokumen' => 'RQE-22001433/100000',
                'judul' => 'Pengadaan Printer Epson L3250 Operasional BO Kediri - MDC Solo TD',
                'nominal' => 2850000,
                'tanggal' => '2026-07-07',
                'print_date' => '7/7/2026 2:15:34 PM',
                'tipe' => 'PR',
                'no_ref' => '142/TD-OPS SB/VII/2026',
                'gudang' => 'MDC SOLO TD',
                'entity' => 'Head Office',
                'del_date' => '7/7/2026 2:15:34 PM',
                'deskripsi' => 'Pengadaan Printer Epson L3250 untuk mendukung kelancaran operasional Branch Office Kediri via MDC Solo TD.',
                'items' => [
                    [
                        'kode' => '2691.0132',
                        'nama' => 'Printer Epson L3250/L3251 print, scan, copy_kediri ( 2691.0132/ 4C1002.569 )',
                        'satuan' => 'Unit',
                        'qty' => 1,
                        'keterangan' => '1 Customize BO Kediri PR OPS SB 142'
                    ]
                ],
                'approver1' => 'AGM',
                'approver2' => 'M.M',
                'app_date' => '8/18/2026'
            ],

            'RQE-22001434' => [
                'kode' => 'RQE-22001434',
                'nomor_dokumen' => 'RQE-22001434/100000',
                'judul' => 'Pengadaan Kertas HVS SiDU A4 Surat Jalan & Faktur - MDC Solo TD',
                'nominal' => 2500000,
                'tanggal' => '2026-08-01',
                'print_date' => '8/1/2026 9:30:00 AM',
                'tipe' => 'PR',
                'no_ref' => '143/TD-OPS SB/VIII/2026',
                'gudang' => 'MDC SOLO TD',
                'entity' => 'Head Office',
                'del_date' => '8/5/2026 9:00:00 AM',
                'deskripsi' => 'Pengadaan kertas HVS SiDU A4 70 GSM rutin bulanan untuk kebutuhan cetak faktur dan surat jalan.',
                'items' => [
                    [
                        'kode' => '2691.0140',
                        'nama' => 'Kertas HVS SiDU A4 70 GSM (Cetak Surat Jalan & Faktur Penjualan)',
                        'satuan' => 'Rim',
                        'qty' => 50,
                        'keterangan' => 'Pengadaan ATK Rutin Operasional MDC Solo'
                    ]
                ],
                'approver1' => 'AGM',
                'approver2' => 'M.M',
                'app_date' => '8/2/2026'
            ],

            'RQE-22001435' => [
                'kode' => 'RQE-22001435',
                'nomor_dokumen' => 'RQE-22001435/100000',
                'judul' => 'Pengadaan Barcode Scanner Honeywell Wireless - Gudang TD Yogya',
                'nominal' => 4200000,
                'tanggal' => '2026-08-15',
                'print_date' => '8/15/2026 2:00:00 PM',
                'tipe' => 'PR',
                'no_ref' => '089/TD-OPS YK/VIII/2026',
                'gudang' => 'WH-YOGYA',
                'entity' => 'Cab. Yogyakarta',
                'del_date' => '8/20/2026 10:00:00 AM',
                'deskripsi' => 'Penggantian barcode scanner rusak di area packing gudang cabang Yogyakarta.',
                'items' => [
                    [
                        'kode' => '2691.0210',
                        'nama' => 'Barcode Scanner Wireless 2D Honeywell (Area Packing Gudang Yogya)',
                        'satuan' => 'Unit',
                        'qty' => 2,
                        'keterangan' => 'Penggantian Scanner Rusak di Gudang Yogya'
                    ]
                ],
                'approver1' => 'KADIV',
                'approver2' => 'OPS',
                'app_date' => '8/16/2026'
            ],

            // =========================================================================
            // PURCHASE ORDER (PO)
            // =========================================================================
            'POE-22005020' => [
                'kode' => 'POE-22005020',
                'nomor_dokumen' => 'POE-22005020/100000',
                'judul' => 'PO GRENGSENG Basa Jawa SMP 7, 8, 9 - MEDIA KARYA PUTRA. CV',
                'nominal' => 9446640,
                'tanggal' => '2026-08-10',
                'print_date' => '8/10/2026 8:38:34 AM',
                'tipe' => 'PO',
                'ref_no' => 'RQE-22001458/100000',
                'vendor' => 'MEDIA KARYA PUTRA. CV',
                'phone' => '0271 - 712684',
                'deliver_to' => 'MDC SOLO TD',
                'notes' => 'PR OPS  021/TD/PR.SB-BLM/VIII/2026',
                'deskripsi' => 'Purchase Order pengadaan buku GRENGSENG Basa Jawa SMP tingkat 7, 8, dan 9 ke CV Media Karya Putra.',
                'items' => [
                    ['delDate' => '08/06/2026', 'name' => 'GRENGSENG Basa Jawa SMP 7 ( 2696.0228/ 4A2449.007 )', 'unit' => 'EXP', 'qty' => 198, 'price' => 22520, 'amount' => 4458960],
                    ['delDate' => '08/06/2026', 'name' => 'GRENGSENG Basa Jawa SMP 8 ( 2696.0229/ 4A2449.008 )', 'unit' => 'EXP', 'qty' => 105, 'price' => 20800, 'amount' => 2184000],
                    ['delDate' => '08/06/2026', 'name' => 'GRENGSENG Basa Jawa SMP 9 ( 2696.0230/ 4A2449.009 )', 'unit' => 'EXP', 'qty' => 108, 'price' => 25960, 'amount' => 2803680],
                ],
                'totals' => [
                    'subtotal' => 9446640,
                    'discount' => 0,
                    'dppLainnya' => 8659420,
                    'ppn' => 0,
                    'transport' => 0,
                    'total' => 9446640
                ],
                'approvers' => ['NNR', 'P.A.M.'],
                'app_date' => '8/10/2026'
            ],

            'POE-22005021' => [
                'kode' => 'POE-22005021',
                'nomor_dokumen' => 'POE-22005021/100000',
                'judul' => 'PO Buku Siswa SMP Kurikulum Merdeka - PT Tiga Serangkai Pustaka Mandiri',
                'nominal' => 19425000,
                'tanggal' => '2026-08-12',
                'print_date' => '8/12/2026 10:15:00 AM',
                'tipe' => 'PO',
                'ref_no' => 'RQE-22001459/100000',
                'vendor' => 'PT TIGA SERANGKAI PUSTAKA MANDIRI',
                'phone' => '0271 - 714344',
                'deliver_to' => 'MDC SOLO TD',
                'notes' => 'PO Reguler Pengadaan Buku Kurikulum Merdeka Semester Gasal 2026',
                'deskripsi' => 'Pengadaan buku teks pelajaran siswa SMP Kurikulum Merdeka semester ganjil.',
                'items' => [
                    ['delDate' => '08/18/2026', 'name' => 'Buku Siswa Bahasa Indonesia SMP Kelas VII Merdeka ( 2696.0101 )', 'unit' => 'EXP', 'qty' => 300, 'price' => 24000, 'amount' => 7200000],
                    ['delDate' => '08/18/2026', 'name' => 'Buku Siswa Matematika SMP Kelas VII Merdeka ( 2696.0102 )', 'unit' => 'EXP', 'qty' => 250, 'price' => 26500, 'amount' => 6625000],
                    ['delDate' => '08/18/2026', 'name' => 'Buku Siswa IPA SMP Kelas VII Merdeka ( 2696.0103 )', 'unit' => 'EXP', 'qty' => 200, 'price' => 28000, 'amount' => 5600000],
                ],
                'totals' => [
                    'subtotal' => 19425000,
                    'discount' => 0,
                    'dppLainnya' => 17500000,
                    'ppn' => 0,
                    'transport' => 0,
                    'total' => 19425000
                ],
                'approvers' => ['NNR', 'P.A.M.'],
                'app_date' => '8/12/2026'
            ],

            'POE-22005022' => [
                'kode' => 'POE-22005022',
                'nomor_dokumen' => 'POE-22005022/100000',
                'judul' => 'PO Cetak Continuous Form Faktur & Surat Jalan 3-Ply - PT Wangsa Jatra Lestari',
                'nominal' => 12250000,
                'tanggal' => '2026-08-20',
                'print_date' => '8/20/2026 2:45:00 PM',
                'tipe' => 'PO',
                'ref_no' => 'RQE-22001460/100000',
                'vendor' => 'PT WANGSA JATRA LESTARI',
                'phone' => '0271 - 781200',
                'deliver_to' => 'MDC SOLO TD',
                'notes' => 'PO Cetak Continuous Form 3-Ply Surat Jalan & Faktur TD Logo Tisera',
                'deskripsi' => 'Pengadaan formulir continuous form rangkap 3 berlogo Tisera untuk cetakan faktur penjualan.',
                'items' => [
                    ['delDate' => '08/25/2026', 'name' => 'Continuous Form 3 Ply W/NCR 9.5 x 11 Logo Tisera ( 3120.0045 )', 'unit' => 'BOX', 'qty' => 50, 'price' => 245000, 'amount' => 12250000],
                ],
                'totals' => [
                    'subtotal' => 12250000,
                    'discount' => 0,
                    'dppLainnya' => 11036036,
                    'ppn' => 1213964,
                    'transport' => 0,
                    'total' => 12250000
                ],
                'approvers' => ['NNR', 'P.A.M.'],
                'app_date' => '8/20/2026'
            ],

            // =========================================================================
            // CALCULATION NPK (CCA)
            // =========================================================================
            'CCA-00000002' => [
                'kode' => 'CCA-00000002',
                'nomor_dokumen' => 'CCA-00000002/110303',
                'judul' => 'Meja Siswa Kayu Jati SD NEGERI 22 MURANTE - UD Kembang Jati (Cab. Pare-Pare)',
                'nominal' => 9000000,
                'tanggal' => '2026-08-08',
                'date_formatted' => '08 August 2026',
                'tipe' => 'CCA',
                'entity' => 'pare-pare',
                'customer' => 'SD NEGERI 22 MURANTE',
                'supplier' => 'UD Kembang Jati',
                'deskripsi' => 'Kalkulasi bisnis custom mebeler meja siswa kayu jati pesanan SD Negeri 22 Murante via Cabang Pare-Pare.',
                'items' => [
                    ['name' => 'Meja Siswa Kayu Jati 60 x 75 x 55 cm', 'unit' => 12, 'kulak' => 550000, 'jual' => 750000, 'disc' => 5.00, 'total' => 9000000]
                ],
                'calc' => [
                    'bruto' => 9000000.00,
                    'dpp' => 8108108.10,
                    'dppLainnya' => 7432432.43,
                    'ppn' => 891891.89,
                    'pph' => 121621.62,
                    'disc' => 399324.30,
                    'netto' => 7708783.80,
                    'cogs' => 5945945.94,
                    'gp' => 1762837.86
                ],
                'remarks' => [
                    'BO' => 'Mohon pengajuan ini dapat diproses',
                    'AM' => '# Pengajuan disetujui # Tidak ada harga standar baku # GP : 21,74%',
                    'NSM' => 'Disetujuai, Harap dipastikan Spek sesuai pesanan dan pembayaran Lunas',
                    'Akt' => 'Approved, dipastikan faktur pajak pembelian karena PKP, dan pembayaran aman'
                ]
            ],

            'CCA-00000003' => [
                'kode' => 'CCA-00000003',
                'nomor_dokumen' => 'CCA-00000003/110303',
                'judul' => 'Pengadaan Kursi Siswa SMPN 1 Enrekang - CV Meubel Jati Indah (Cab. Pare-Pare)',
                'nominal' => 10000000,
                'tanggal' => '2026-08-15',
                'date_formatted' => '15 August 2026',
                'tipe' => 'CCA',
                'entity' => 'pare-pare',
                'customer' => 'SMP NEGERI 1 ENREKANG',
                'supplier' => 'CV MEUBEL JATI INDAH',
                'deskripsi' => 'Pengajuan pesanan kursi siswa besi dan kayu SMPN 1 Enrekang dengan rekanan CV Meubel Jati Indah.',
                'items' => [
                    ['name' => 'Kursi Siswa Besi & Kayu Standar SMP (Cabang Pare-pare)', 'unit' => 40, 'kulak' => 180000, 'jual' => 250000, 'disc' => 0.00, 'total' => 10000000]
                ],
                'calc' => [
                    'bruto' => 10000000.00,
                    'dpp' => 9009009.01,
                    'dppLainnya' => 8256880.73,
                    'ppn' => 990990.99,
                    'pph' => 135135.14,
                    'disc' => 0.00,
                    'netto' => 9600000.00,
                    'cogs' => 7200000.00,
                    'gp' => 1673873.87
                ],
                'remarks' => [
                    'BO' => 'Pengajuan pesanan sarana sekolah SMPN 1 Enrekang via Cabang Pare-Pare',
                    'AM' => '# Pengajuan disetujui # Margin GP 18,58% sesuai target cabang #',
                    'NSM' => 'Disetujui, pastikan pengiriman sebelum tahun ajaran aktif dan pembayaran aman',
                    'Akt' => 'Approved, kelengkapan NPWP dan faktur pajak rekanan CV Meubel Jati Indah valid'
                ]
            ],

            'CCA-00000004' => [
                'kode' => 'CCA-00000004',
                'nomor_dokumen' => 'CCA-00000004/100000',
                'judul' => 'Paket Modul Muatan Lokal Budaya Solo - Dinas Pendidikan Kota Surakarta',
                'nominal' => 25000000,
                'tanggal' => '2026-08-25',
                'date_formatted' => '25 August 2026',
                'tipe' => 'CCA',
                'entity' => 'Head Office',
                'customer' => 'DINAS PENDIDIKAN SURAKARTA',
                'supplier' => 'PT TIGA SERANGKAI PUSTAKA MANDIRI',
                'deskripsi' => 'Kalkulasi bisnis paket modul pengayaan muatan lokal Budaya Solo tingkat SD untuk Dinas Pendidikan Kota Surakarta.',
                'items' => [
                    ['name' => 'Paket Modul Pengayaan Muatan Lokal Budaya Solo SD', 'unit' => 500, 'kulak' => 36000, 'jual' => 50000, 'disc' => 0.00, 'total' => 25000000]
                ],
                'calc' => [
                    'bruto' => 25000000.00,
                    'dpp' => 22522522.52,
                    'dppLainnya' => 20642201.83,
                    'ppn' => 2477477.48,
                    'pph' => 337837.84,
                    'disc' => 0.00,
                    'netto' => 24000000.00,
                    'cogs' => 18000000.00,
                    'gp' => 4522522.52
                ],
                'remarks' => [
                    'BO' => 'Pengajuan pengadaan modul muatan lokal Disdik Kota Solo Tahun Ajaran 2026',
                    'AM' => '# Menunggu review kelengkapan spesifikasi dari tim editorial TS # GP : 20.08%',
                    'NSM' => 'Disetujui untuk diproses ke bagian produksi cetak',
                    'Akt' => 'Dokumen anggaran dan verifikasi pajak rekanan telah lengkap'
                ]
            ],
        ];
    }

    /**
     * Find a transaction by keyword or document code.
     *
     * @param string $keyword
     * @return array|null
     */
    public static function findByKeyword(string $keyword): ?array
    {
        $clean = strtoupper(trim($keyword));
        if (empty($clean)) {
            return null;
        }

        $all = self::all();

        // 1. Direct match on key
        if (isset($all[$clean])) {
            return $all[$clean];
        }

        // 2. Search by key, nomor_dokumen, or numeric code
        foreach ($all as $key => $item) {
            if (
                str_contains($clean, $key) ||
                str_contains($key, $clean) ||
                stripos($item['nomor_dokumen'], $clean) !== false ||
                (isset($item['kode']) && stripos($item['kode'], $clean) !== false)
            ) {
                return $item;
            }

            // Check numeric part e.g. 22001434, 22005020, 00000002
            $numericPart = preg_replace('/\D/', '', $key);
            $cleanNumeric = preg_replace('/\D/', '', $clean);
            if (!empty($cleanNumeric) && !empty($numericPart) && (str_contains($numericPart, $cleanNumeric) || str_contains($cleanNumeric, $numericPart))) {
                return $item;
            }
        }

        return null;
    }

    /**
     * Get brief sample list for quick selection chips in the UI.
     *
     * @return array<int, array{code: string, label: string, type: string}>
     */
    public static function getSamples(): array
    {
        return [
            ['code' => 'RQE-22001434', 'label' => 'RQE-22001434 (PR Kertas HVS)', 'type' => 'PR'],
            ['code' => 'RQE-22001433', 'label' => 'RQE-22001433 (PR Printer Epson)', 'type' => 'PR'],
            ['code' => 'POE-22005020', 'label' => 'POE-22005020 (PO Basa Jawa)', 'type' => 'PO'],
            ['code' => 'POE-22005021', 'label' => 'POE-22005021 (PO Buku Merdeka)', 'type' => 'PO'],
            ['code' => 'CCA-00000002', 'label' => 'CCA-00000002 (NPK Meja Jati)', 'type' => 'CCA'],
            ['code' => 'CCA-00000003', 'label' => 'CCA-00000003 (NPK Kursi Enrekang)', 'type' => 'CCA'],
        ];
    }
}
