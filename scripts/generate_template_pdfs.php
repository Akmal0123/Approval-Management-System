<?php

require __DIR__ . '/../vendor/autoload.php';

// use Fpdf\Fpdf;

$outputDir = __DIR__ . '/../storage/app/dummy_templates';
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0777, true);
}

// =========================================================================
// HELPER CLASS WITH CUSTOM DRAWING
// =========================================================================
class TiseraPdf extends \FPDF
{
    function drawHeader($entity = 'Head Office', $address = 'Jl. Dr. Soepomo No. 23 Solo', $phone = 'Phone : 0271 - 714344 Fax : 0271 - 716874', $printDate = '8/18/2026 1:35:22 PM', $printBy = 'iadijana')
    {
        // Red TD Logo box
        $this->SetFillColor(210, 25, 25);
        $this->Rect(10, 10, 18, 16, 'F');
        $this->SetTextColor(255, 255, 255);
        $this->SetFont('Arial', 'B', 16);
        $this->SetXY(10, 11);
        $this->Cell(18, 14, 'TD', 0, 0, 'C');

        // Company text
        $this->SetTextColor(0, 0, 0);
        $this->SetXY(31, 10);
        $this->SetFont('Arial', 'B', 12);
        $this->Cell(100, 5, 'PT TISERA DISTRIBUSINDO', 0, 1, 'L');
        $this->SetX(31);
        $this->SetFont('Arial', 'B', 9);
        $this->Cell(100, 4, $entity, 0, 1, 'L');
        $this->SetX(31);
        $this->SetFont('Arial', '', 8);
        $this->Cell(100, 3.5, $address, 0, 1, 'L');
        $this->SetX(31);
        $this->Cell(100, 3.5, $phone, 0, 0, 'L');

        // Top right print info
        $this->SetXY(140, 10);
        $this->SetFont('Arial', 'I', 8);
        $this->Cell(60, 4, $printDate, 0, 1, 'R');
        $this->SetX(140);
        $this->Cell(60, 4, 'Print by : ' . $printBy, 0, 1, 'R');

        // Header bottom line
        $this->SetDrawColor(0, 0, 0);
        $this->SetLineWidth(0.6);
        $this->Line(10, 28, 200, 28);
        $this->SetLineWidth(0.2);
        $this->Ln(3);
    }
}

// =========================================================================
// 1. GENERATE PURCHASE REQUEST (PR)
// =========================================================================
function generatePR($filename, $reqNo, $date, $noRef, $wareId, $entity, $delDate, $items, $approver1, $approver2, $appDate)
{
    $pdf = new TiseraPdf('P', 'mm', 'A4');
    $pdf->SetMargins(10, 10, 10);
    $pdf->AddPage();
    $pdf->drawHeader($entity, 'Jl. Dr. Soepomo No. 23 Solo', 'Phone : 0271 - 714344 Fax : 0271 - 716874', $date, 'iadijana');

    // Title
    $pdf->SetY(32);
    $pdf->SetFont('Arial', 'B', 13);
    $pdf->Cell(190, 6, 'PURCHASE REQUEST', 0, 1, 'C');
    $pdf->Ln(2);

    // Meta Info 2 Columns
    $pdf->SetFont('Arial', '', 8.5);
    $startX = 10;
    $y = $pdf->GetY();

    // Left Column
    $pdf->SetXY($startX, $y);
    $pdf->Cell(25, 4.5, 'Request No.', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->SetFont('Arial', 'B', 8.5);
    $pdf->Cell(65, 4.5, $reqNo, 0, 1);

    $pdf->SetFont('Arial', '', 8.5);
    $pdf->SetX($startX);
    $pdf->Cell(25, 4.5, 'Tanggal', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(65, 4.5, $date, 0, 1);

    $pdf->SetX($startX);
    $pdf->Cell(25, 4.5, 'No. Referensi', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(65, 4.5, $noRef, 0, 1);

    // Right Column
    $rightX = 115;
    $pdf->SetXY($rightX, $y);
    $pdf->Cell(30, 4.5, 'Gudang', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(50, 4.5, $wareId, 0, 1);

    $pdf->SetXY($rightX, $y + 4.5);
    $pdf->Cell(30, 4.5, 'Entity Gudang', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(50, 4.5, $entity, 0, 1);

    $pdf->SetXY($rightX, $y + 9);
    $pdf->Cell(30, 4.5, 'Jadwal Kedatangan', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(50, 4.5, $delDate, 0, 1);

    $pdf->Ln(4);
    $pdf->SetFont('Arial', '', 8.5);
    $pdf->Cell(190, 5, 'Mohon untuk dibeli barang-barang sebagai berikut :', 0, 1);
    $pdf->Ln(1);

    // Table Header
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->SetDrawColor(0, 0, 0);
    $pdf->Cell(10, 6, 'No', 1, 0, 'C');
    $pdf->Cell(25, 6, 'Kode', 1, 0, 'C');
    $pdf->Cell(85, 6, 'Nama', 1, 0, 'C');
    $pdf->Cell(16, 6, 'Satuan', 1, 0, 'C');
    $pdf->Cell(14, 6, 'Qty', 1, 0, 'C');
    $pdf->Cell(40, 6, 'Keterangan', 1, 1, 'C');

    // Table Rows
    $pdf->SetFont('Arial', '', 7.5);
    $totalQty = 0;
    foreach ($items as $idx => $item) {
        $pdf->Cell(10, 8, $idx + 1, 1, 0, 'C');
        $pdf->Cell(25, 8, $item['kode'], 1, 0, 'C');
        $pdf->Cell(85, 8, ' ' . $item['nama'], 1, 0, 'L');
        $pdf->Cell(16, 8, $item['satuan'], 1, 0, 'C');
        $pdf->Cell(14, 8, $item['qty'], 1, 0, 'C');
        $pdf->Cell(40, 8, ' ' . $item['keterangan'], 1, 1, 'L');
        $totalQty += (float)$item['qty'];
    }

    // Total Row
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(136, 6, 'TOTAL', 0, 0, 'R');
    $pdf->Cell(14, 6, number_format($totalQty, 2), 'T', 0, 'C');
    $pdf->Cell(40, 6, '', 0, 1);

    $pdf->Ln(10);

    // Footer Signature Box (Left)
    $boxY = $pdf->GetY();
    $pdf->Rect(10, $boxY, 62, 38);
    $pdf->SetXY(10, $boxY + 2);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(62, 4, 'APPROVED BY', 0, 1, 'C');
    $pdf->SetFont('Arial', 'B', 13);
    $pdf->Cell(62, 7, 'APPROVED', 0, 1, 'C');

    $pdf->SetFont('Arial', '', 8);
    $pdf->SetXY(14, $boxY + 16);
    $pdf->Cell(54, 4, $approver1, 'B', 1, 'C');
    $pdf->SetXY(14, $boxY + 22);
    $pdf->Cell(54, 4, $approver2, 'B', 1, 'C');
    $pdf->SetXY(14, $boxY + 28);
    $pdf->Cell(54, 4, $appDate, 0, 1, 'C');

    // Distribution Box (Right)
    $pdf->Rect(95, $boxY, 95, 38);
    $pdf->SetXY(100, $boxY + 4);
    $pdf->SetFont('Arial', 'B', 8.5);
    $pdf->Cell(90, 4, 'Distribusi', 0, 1, 'L');
    $pdf->SetFont('Arial', '', 8);
    $pdf->SetX(100);
    $pdf->Cell(25, 4.5, 'Asli', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(60, 4.5, 'Purchasing', 0, 1);

    $pdf->SetX(100);
    $pdf->Cell(25, 4.5, 'Merah', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(60, 4.5, 'Accounting', 0, 1);

    $pdf->SetX(100);
    $pdf->Cell(25, 4.5, 'Kuning', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(60, 4.5, 'File', 0, 1);

    $pdf->Output('F', $filename);
}

// =========================================================================
// 2. GENERATE PURCHASE ORDER (PO)
// =========================================================================
function generatePO($filename, $poNo, $date, $refNo, $vendor, $phone, $deliverTo, $notes, $items, $totals, $approvers, $appDate)
{
    $pdf = new TiseraPdf('P', 'mm', 'A4');
    $pdf->SetMargins(10, 10, 10);
    $pdf->AddPage();
    $pdf->drawHeader('Head Office', 'Jl. Dr. Soepomo No. 23 Solo', 'Phone : 0271 - 714344 Fax : 0271 - 716874', $date, 'iadijana');

    // Title
    $pdf->SetY(32);
    $pdf->SetFont('Arial', 'B', 13);
    $pdf->Cell(190, 6, 'PURCHASE ORDER', 0, 1, 'C');
    $pdf->Ln(2);

    $y = $pdf->GetY();
    // Left side: TO Vendor
    $pdf->SetXY(10, $y);
    $pdf->SetFont('Arial', 'B', 8.5);
    $pdf->Cell(15, 4.5, 'TO :', 0, 1);
    $pdf->SetX(10);
    $pdf->Cell(85, 4.5, $vendor, 0, 1);
    $pdf->SetFont('Arial', '', 8);
    $pdf->SetX(10);
    $pdf->Cell(85, 4, 'Telp: ' . $phone . '    Fax: -', 0, 1);

    // Right side: PO Details
    $pdf->SetXY(120, $y);
    $pdf->Cell(25, 4.5, 'PO No.', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->SetFont('Arial', 'B', 8.5);
    $pdf->Cell(50, 4.5, $poNo, 0, 1);

    $pdf->SetFont('Arial', '', 8);
    $pdf->SetXY(120, $y + 4.5);
    $pdf->Cell(25, 4.5, 'Date', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(50, 4.5, $date, 0, 1);

    $pdf->SetXY(120, $y + 9);
    $pdf->Cell(25, 4.5, 'No. Ref.', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(50, 4.5, $refNo, 0, 1);

    $pdf->SetXY(120, $y + 13.5);
    $pdf->Cell(25, 4.5, 'Currency', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(50, 4.5, 'IDR', 0, 1);

    $pdf->Ln(3);
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(30, 4, 'Deliver To', 0, 0);
    $pdf->Cell(5, 4, ':', 0, 0);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(150, 4, $deliverTo, 0, 1);

    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(30, 4, 'Notes', 0, 0);
    $pdf->Cell(5, 4, ':', 0, 0);
    $pdf->Cell(150, 4, $notes, 0, 1);
    $pdf->Ln(2);

    // Table Header
    $pdf->SetFont('Arial', 'B', 7.5);
    $pdf->Cell(8, 6, 'No', 1, 0, 'C');
    $pdf->Cell(24, 6, 'Delivery Date', 1, 0, 'C');
    $pdf->Cell(78, 6, 'Item Name', 1, 0, 'C');
    $pdf->Cell(14, 6, 'Unit', 1, 0, 'C');
    $pdf->Cell(16, 6, 'Quantity', 1, 0, 'C');
    $pdf->Cell(25, 6, 'Unit Price', 1, 0, 'C');
    $pdf->Cell(25, 6, 'Amount', 1, 1, 'C');

    // Table Rows
    $pdf->SetFont('Arial', '', 7.5);
    $totalQty = 0;
    foreach ($items as $idx => $it) {
        $pdf->Cell(8, 7, $idx + 1, 1, 0, 'C');
        $pdf->Cell(24, 7, $it['delDate'], 1, 0, 'C');
        $pdf->Cell(78, 7, ' ' . $it['name'], 1, 0, 'L');
        $pdf->Cell(14, 7, $it['unit'], 1, 0, 'C');
        $pdf->Cell(16, 7, number_format($it['qty']), 1, 0, 'C');
        $pdf->Cell(25, 7, number_format($it['price'], 2), 1, 0, 'R');
        $pdf->Cell(25, 7, number_format($it['amount'], 2), 1, 1, 'R');
        $totalQty += $it['qty'];
    }

    $pdf->Ln(2);

    // Totals Table on Right Side
    $calcY = $pdf->GetY();
    $pdf->SetXY(115, $calcY);
    $pdf->SetFont('Arial', '', 8);

    $finance = [
        ['Sub Total', $totals['subtotal']],
        ['Discount', $totals['discount']],
        ['DPPLainnya', $totals['dppLainnya']],
        ['PPN', $totals['ppn']],
        ['Transport', $totals['transport']],
        ['TOTAL', $totals['total']],
    ];

    foreach ($finance as $f) {
        $pdf->SetX(115);
        if ($f[0] === 'TOTAL') {
            $pdf->SetFont('Arial', 'B', 8.5);
            $pdf->Cell(45, 5, $f[0], 'T', 0, 'L');
            $pdf->Cell(30, 5, number_format($f[1], 2), 'T', 1, 'R');
        } else {
            $pdf->SetFont('Arial', '', 8);
            $pdf->Cell(45, 4, $f[0], 0, 0, 'L');
            $pdf->Cell(30, 4, number_format($f[1], 2), 0, 1, 'R');
        }
    }

    // Signature Box on Left Side
    $pdf->Rect(10, $calcY, 62, 38);
    $pdf->SetXY(10, $calcY + 2);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(62, 4, 'APPROVED BY', 0, 1, 'C');
    $pdf->SetFont('Arial', 'B', 13);
    $pdf->Cell(62, 7, 'APPROVED', 0, 1, 'C');

    $pdf->SetFont('Arial', '', 8);
    $pdf->SetXY(14, $calcY + 16);
    $pdf->Cell(54, 4, $approvers[0], 'B', 1, 'C');
    $pdf->SetXY(14, $calcY + 22);
    $pdf->Cell(54, 4, $approvers[1], 'B', 1, 'C');
    $pdf->SetXY(14, $calcY + 28);
    $pdf->Cell(54, 4, $appDate, 0, 1, 'C');

    $pdf->Output('F', $filename);
}

// =========================================================================
// 3. GENERATE CALCULATION NPK (CCA)
// =========================================================================
function generateNPK($filename, $npkNo, $date, $entity, $customer, $supplier, $items, $calc, $remarks)
{
    $pdf = new TiseraPdf('P', 'mm', 'A4');
    $pdf->SetMargins(10, 10, 10);
    $pdf->AddPage();
    $pdf->drawHeader($entity, 'Jl. Bau Massepe No.75 Sumpang Minange, Kec. Bacukiki Barat', 'Phone : 0421 - 24904 Fax : 0421 - 24904', $date, 'klick');

    // Title
    $pdf->SetY(32);
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->Cell(190, 6, 'CALCULATION BUSINESS PRODUCT CUSTOM', 0, 1, 'C');
    $pdf->Ln(2);

    $y = $pdf->GetY();
    // Left details
    $pdf->SetFont('Arial', '', 8);
    $pdf->SetXY(10, $y);
    $pdf->Cell(25, 4.5, 'NPK', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(60, 4.5, $npkNo, 0, 1);

    $pdf->SetFont('Arial', '', 8);
    $pdf->SetX(10);
    $pdf->Cell(25, 4.5, 'Entity Name', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(60, 4.5, $entity, 0, 1);

    $pdf->SetX(10);
    $pdf->Cell(25, 4.5, 'Customer Name', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(60, 4.5, $customer, 0, 1);

    $pdf->SetX(10);
    $pdf->Cell(25, 4.5, 'Suplier Name', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(60, 4.5, $supplier, 0, 1);

    // Right details
    $pdf->SetXY(120, $y);
    $pdf->Cell(25, 4.5, 'Date', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(40, 4.5, $date, 0, 1);

    $pdf->SetXY(120, $y + 4.5);
    $pdf->Cell(25, 4.5, 'Category', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(40, 4.5, 'Non Book', 0, 1);

    $pdf->SetXY(120, $y + 9);
    $pdf->Cell(25, 4.5, 'PKP', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->Cell(40, 4.5, 'True', 0, 1);

    $pdf->SetXY(120, $y + 13.5);
    $pdf->Cell(25, 4.5, 'Status', 0, 0);
    $pdf->Cell(5, 4.5, ':', 0, 0);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(40, 4.5, 'Clear', 0, 1);

    $pdf->Ln(3);

    // Table Header
    $pdf->SetFont('Arial', 'B', 7.5);
    $pdf->Cell(8, 6, 'No', 1, 0, 'C');
    $pdf->Cell(72, 6, 'Nama Produk', 1, 0, 'C');
    $pdf->Cell(12, 6, 'Unit', 1, 0, 'C');
    $pdf->Cell(25, 6, 'Harga Kulak', 1, 0, 'C');
    $pdf->Cell(25, 6, 'Harga Jual', 1, 0, 'C');
    $pdf->Cell(18, 6, 'Disc (%)', 1, 0, 'C');
    $pdf->Cell(30, 6, 'Jumlah Jual', 1, 1, 'C');

    // Table Rows
    $pdf->SetFont('Arial', '', 7.5);
    foreach ($items as $idx => $it) {
        $pdf->Cell(8, 7, $idx + 1, 1, 0, 'C');
        $pdf->Cell(72, 7, ' ' . $it['name'], 1, 0, 'L');
        $pdf->Cell(12, 7, $it['unit'], 1, 0, 'C');
        $pdf->Cell(25, 7, number_format($it['kulak'], 2), 1, 0, 'R');
        $pdf->Cell(25, 7, number_format($it['jual'], 2), 1, 0, 'R');
        $pdf->Cell(18, 7, number_format($it['disc'], 2), 1, 0, 'C');
        $pdf->Cell(30, 7, number_format($it['total'], 2), 1, 1, 'R');
    }

    $bottomY = $pdf->GetY();

    // Remarks (Left)
    $pdf->SetXY(10, $bottomY);
    $pdf->SetFont('Arial', '', 7.5);
    $remWidth = 115;
    foreach ($remarks as $type => $text) {
        $pdf->SetX(10);
        $pdf->SetFont('Arial', 'B', 7.5);
        $pdf->Cell(22, 5, 'Remark ' . $type, 1, 0, 'L');
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(95, 5, ' ' . $text, 1, 1, 'L');
    }

    // Financial Calculation Grid (Right)
    $pdf->SetXY(127, $bottomY);
    $calcRows = [
        ['Bruto', '', $calc['bruto']],
        ['DPP', '', $calc['dpp']],
        ['DPP Nilai Lainnya', '', $calc['dppLainnya']],
        ['PPN', '11.00', $calc['ppn']],
        ['PPH', '1.50', $calc['pph']],
        ['Disc', '4.92', $calc['disc']],
        ['Affiliate', '0.00', '0.00'],
        ['Netto', '95.07', $calc['netto']],
        ['COGS', '73.33', $calc['cogs']],
        ['GP', '21.74', $calc['gp']],
    ];

    $pdf->SetFont('Arial', '', 7.5);
    foreach ($calcRows as $r) {
        $pdf->SetX(127);
        $pdf->Cell(28, 4.5, $r[0], 1, 0, 'L');
        $pdf->Cell(12, 4.5, $r[1], 1, 0, 'C');
        $pdf->Cell(23, 4.5, number_format((float)$r[2], 2), 1, 1, 'R');
    }

    $pdf->Output('F', $filename);
}

// =========================================================================
// BUILD ALL TEMPLATES
// =========================================================================

echo "Generating realistic PDF templates...\n";

// 1. Purchase Request - Epson L3250
generatePR(
    $outputDir . '/RQE-22001433.pdf',
    'RQE-22001433/100000',
    '7/7/2026 2:15:34 PM',
    '142/TD-OPS SB/VII/2026',
    'MDC SOLO TD',
    'Head Office',
    '7/7/2026 2:15:34 PM',
    [
        [
            'kode' => '2691.0132',
            'nama' => 'Printer Epson L3250/L3251 print, scan, copy_kediri ( 2691.0132/ 4C1002.569 )',
            'satuan' => 'Unit',
            'qty' => 1,
            'keterangan' => '1 Customize BO Kediri PR OPS SB 142'
        ]
    ],
    'AGM',
    'M.M',
    '8/18/2026'
);

// PR 2 - Kertas HVS
generatePR(
    $outputDir . '/RQE-22001434.pdf',
    'RQE-22001434/100000',
    '8/1/2026 9:30:00 AM',
    '143/TD-OPS SB/VIII/2026',
    'MDC SOLO TD',
    'Head Office',
    '8/5/2026 9:00:00 AM',
    [
        [
            'kode' => '2691.0140',
            'nama' => 'Kertas HVS SiDU A4 70 GSM (Cetak Surat Jalan & Faktur Penjualan)',
            'satuan' => 'Rim',
            'qty' => 50,
            'keterangan' => 'Pengadaan ATK Rutin Operasional MDC Solo'
        ]
    ],
    'AGM',
    'M.M',
    '8/2/2026'
);

// PR 3 - Scanner Honeywell
generatePR(
    $outputDir . '/RQE-22001435.pdf',
    'RQE-22001435/100000',
    '8/15/2026 2:00:00 PM',
    '089/TD-OPS YK/VIII/2026',
    'WH-YOGYA',
    'Cab. Yogyakarta',
    '8/20/2026 10:00:00 AM',
    [
        [
            'kode' => '2691.0210',
            'nama' => 'Barcode Scanner Wireless 2D Honeywell (Area Packing Gudang Yogya)',
            'satuan' => 'Unit',
            'qty' => 2,
            'keterangan' => 'Penggantian Scanner Rusak di Gudang Yogya'
        ]
    ],
    'KADIV',
    'OPS',
    '8/16/2026'
);

// 2. Purchase Order - Grengseng Basa Jawa
generatePO(
    $outputDir . '/POE-22005020.pdf',
    'POE-22005020/100000',
    '8/10/2026 8:38:34 AM',
    'RQE-22001458/100000',
    'MEDIA KARYA PUTRA. CV',
    '0271 - 712684',
    'MDC SOLO TD',
    'PR OPS  021/TD/PR.SB-BLM/VIII/2026',
    [
        ['delDate' => '08/06/2026', 'name' => 'GRENGSENG Basa Jawa SMP 7 ( 2696.0228/ 4A2449.007 )', 'unit' => 'EXP', 'qty' => 198, 'price' => 22520, 'amount' => 4458960],
        ['delDate' => '08/06/2026', 'name' => 'GRENGSENG Basa Jawa SMP 8 ( 2696.0229/ 4A2449.008 )', 'unit' => 'EXP', 'qty' => 105, 'price' => 20800, 'amount' => 2184000],
        ['delDate' => '08/06/2026', 'name' => 'GRENGSENG Basa Jawa SMP 9 ( 2696.0230/ 4A2449.009 )', 'unit' => 'EXP', 'qty' => 108, 'price' => 25960, 'amount' => 2803680],
    ],
    [
        'subtotal' => 9446640,
        'discount' => 0,
        'dppLainnya' => 8659420,
        'ppn' => 0,
        'transport' => 0,
        'total' => 9446640
    ],
    ['NNR', 'P.A.M.'],
    '8/10/2026'
);

// PO 2 - Buku Siswa Merdeka
generatePO(
    $outputDir . '/POE-22005021.pdf',
    'POE-22005021/100000',
    '8/12/2026 10:15:00 AM',
    'RQE-22001459/100000',
    'PT TIGA SERANGKAI PUSTAKA MANDIRI',
    '0271 - 714344',
    'MDC SOLO TD',
    'PO Reguler Pengadaan Buku Kurikulum Merdeka Semester Gasal 2026',
    [
        ['delDate' => '08/18/2026', 'name' => 'Buku Siswa Bahasa Indonesia SMP Kelas VII Merdeka ( 2696.0101 )', 'unit' => 'EXP', 'qty' => 300, 'price' => 24000, 'amount' => 7200000],
        ['delDate' => '08/18/2026', 'name' => 'Buku Siswa Matematika SMP Kelas VII Merdeka ( 2696.0102 )', 'unit' => 'EXP', 'qty' => 250, 'price' => 26500, 'amount' => 6625000],
        ['delDate' => '08/18/2026', 'name' => 'Buku Siswa IPA SMP Kelas VII Merdeka ( 2696.0103 )', 'unit' => 'EXP', 'qty' => 200, 'price' => 28000, 'amount' => 5600000],
    ],
    [
        'subtotal' => 19425000,
        'discount' => 0,
        'dppLainnya' => 17500000,
        'ppn' => 0,
        'transport' => 0,
        'total' => 19425000
    ],
    ['NNR', 'P.A.M.'],
    '8/12/2026'
);

// PO 3 - Continuous Form Wangsa Jatra
generatePO(
    $outputDir . '/POE-22005022.pdf',
    'POE-22005022/100000',
    '8/20/2026 2:45:00 PM',
    'RQE-22001460/100000',
    'PT WANGSA JATRA LESTARI',
    '0271 - 781200',
    'MDC SOLO TD',
    'PO Cetak Continuous Form 3-Ply Surat Jalan & Faktur TD Logo Tisera',
    [
        ['delDate' => '08/25/2026', 'name' => 'Continuous Form 3 Ply W/NCR 9.5 x 11 Logo Tisera ( 3120.0045 )', 'unit' => 'BOX', 'qty' => 50, 'price' => 245000, 'amount' => 12250000],
    ],
    [
        'subtotal' => 12250000,
        'discount' => 0,
        'dppLainnya' => 11036036,
        'ppn' => 1213964,
        'transport' => 0,
        'total' => 12250000
    ],
    ['NNR', 'P.A.M.'],
    '8/20/2026'
);

// 3. Calculation NPK - Meja Siswa Kayu Jati
generateNPK(
    $outputDir . '/CCA-00000002.pdf',
    'CCA-00000002/110303',
    '08 August 2026',
    'pare-pare',
    'SD NEGERI 22 MURANTE',
    'UD Kembang Jati',
    [
        ['name' => 'Meja Siswa Kayu Jati 60 x 75 x 55 cm', 'unit' => 12, 'kulak' => 550000, 'jual' => 750000, 'disc' => 5.00, 'total' => 9000000]
    ],
    [
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
    [
        'BO' => 'Mohon pengajuan ini dapat diproses',
        'AM' => '# Pengajuan disetujui # Tidak ada harga standar baku # GP : 21,74%',
        'NSM' => 'Disetujuai, Harap dipastikan Spek sesuai pesanan dan pembayaran Lunas',
        'Akt' => 'Approved, dipastikan faktur pajak pembelian karena PKP, dan pembayaran aman'
    ]
);

// NPK 2 - Kursi Siswa Enrekang
generateNPK(
    $outputDir . '/CCA-00000003.pdf',
    'CCA-00000003/110303',
    '15 August 2026',
    'pare-pare',
    'SMP NEGERI 1 ENREKANG',
    'CV MEUBEL JATI INDAH',
    [
        ['name' => 'Kursi Siswa Besi & Kayu Standar SMP (Cabang Pare-pare)', 'unit' => 40, 'kulak' => 180000, 'jual' => 250000, 'disc' => 0.00, 'total' => 10000000]
    ],
    [
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
    [
        'BO' => 'Pengajuan pesanan sarana sekolah SMPN 1 Enrekang via Cabang Pare-Pare',
        'AM' => '# Pengajuan disetujui # Margin GP 18,58% sesuai target cabang #',
        'NSM' => 'Disetujui, pastikan pengiriman sebelum tahun ajaran aktif dan pembayaran aman',
        'Akt' => 'Approved, kelengkapan NPWP dan faktur pajak rekanan CV Meubel Jati Indah valid'
    ]
);

// NPK 3 - Modul Budaya Solo
generateNPK(
    $outputDir . '/CCA-00000004.pdf',
    'CCA-00000004/100000',
    '25 August 2026',
    'Head Office',
    'DINAS PENDIDIKAN SURAKARTA',
    'PT TIGA SERANGKAI PUSTAKA MANDIRI',
    [
        ['name' => 'Paket Modul Pengayaan Muatan Lokal Budaya Solo SD', 'unit' => 500, 'kulak' => 36000, 'jual' => 50000, 'disc' => 0.00, 'total' => 25000000]
    ],
    [
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
    [
        'BO' => 'Pengajuan pengadaan modul muatan lokal Disdik Kota Solo Tahun Ajaran 2026',
        'AM' => '# Menunggu review kelengkapan spesifikasi dari tim editorial TS # GP : 20.08%',
        'NSM' => 'Disetujui untuk diproses ke bagian produksi cetak',
        'Akt' => 'Dokumen anggaran dan verifikasi pajak rekanan telah lengkap'
    ]
);

echo "All 3 PDF templates created successfully!\n";
