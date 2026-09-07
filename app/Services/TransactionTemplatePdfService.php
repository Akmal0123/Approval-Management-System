<?php

namespace App\Services;

use setasign\Fpdi\Fpdi;

class TiseraPdf extends Fpdi
{
    protected string $headerEntity = 'Head Office';
    protected string $headerAddress = 'Jl. Dr. Soepomo No. 23 Solo';
    protected string $headerPhone = 'Phone : 0271 - 714344 Fax : 0271 - 716874';
    protected string $headerPrintDate = '';
    protected string $headerPrintBy = 'iadijana';
    protected bool $showHeader = true;

    public function setHeaderMeta(string $entity, string $address, string $phone, string $printDate, string $printBy = 'iadijana'): void
    {
        $this->headerEntity = $entity;
        $this->headerAddress = $address;
        $this->headerPhone = $phone;
        $this->headerPrintDate = $printDate;
        $this->headerPrintBy = $printBy;
    }

    public function drawHeader(
        ?string $entity = null,
        ?string $address = null,
        ?string $phone = null,
        ?string $printDate = null,
        ?string $printBy = null
    ): void {
        $entity = $entity ?? $this->headerEntity;
        $address = $address ?? $this->headerAddress;
        $phone = $phone ?? $this->headerPhone;
        $printDate = $printDate ?? $this->headerPrintDate;
        $printBy = $printBy ?? $this->headerPrintBy;

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
        $this->SetY(30);
    }

    public function Footer(): void
    {
        $this->SetY(-10);
        $this->SetFont('Arial', 'I', 7.5);
        $this->SetTextColor(120, 120, 120);
        $this->Cell(0, 6, 'Approval Management System - Halaman ' . $this->PageNo() . ' dari {nb}', 0, 0, 'R');
    }
}

class TransactionTemplatePdfService
{
    /**
     * Dispatcher to generate PDF based on transaction data.
     *
     * @param array $data
     * @param string $outputDest 'S' for string binary, 'F' for file
     * @param string|null $filepath Path when outputDest is 'F'
     * @return string
     */
    public static function generate(array $data, string $outputDest = 'S', ?string $filepath = null): string
    {
        $tipe = strtoupper($data['tipe'] ?? '');
        $kode = strtoupper($data['kode'] ?? $data['nomor_dokumen'] ?? '');

        if ($tipe === 'PR' || str_starts_with($kode, 'RQE') || str_starts_with($kode, 'PR')) {
            return self::generatePR($data, $outputDest, $filepath);
        }

        if ($tipe === 'PO' || str_starts_with($kode, 'POE') || str_starts_with($kode, 'PO')) {
            return self::generatePO($data, $outputDest, $filepath);
        }

        // Default to NPK / CCA
        return self::generateNPK($data, $outputDest, $filepath);
    }

    /**
     * Generate Purchase Request (PR / RQE) Template.
     */
    public static function generatePR(array $data, string $outputDest = 'S', ?string $filepath = null): string
    {
        $pdf = new TiseraPdf('P', 'mm', 'A4');
        $pdf->AliasNbPages();
        $pdf->SetMargins(10, 10, 10);
        $pdf->SetAutoPageBreak(false); // Manual controlled page breaks for responsive tables

        $entity = $data['entity'] ?? 'Head Office';
        $printDate = $data['print_date'] ?? $data['tanggal'] ?? date('d/m/Y H:i:s');
        $pdf->setHeaderMeta($entity, 'Jl. Dr. Soepomo No. 23 Solo', 'Phone : 0271 - 714344 Fax : 0271 - 716874', $printDate, 'iadijana');

        $pdf->AddPage();
        $pdf->drawHeader();

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
        $pdf->Cell(65, 4.5, $data['nomor_dokumen'] ?? $data['kode'] ?? '', 0, 1);

        $pdf->SetFont('Arial', '', 8.5);
        $pdf->SetX($startX);
        $pdf->Cell(25, 4.5, 'Tanggal', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(65, 4.5, $data['tanggal'] ?? '', 0, 1);

        $pdf->SetX($startX);
        $pdf->Cell(25, 4.5, 'No. Referensi', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(65, 4.5, $data['no_ref'] ?? '-', 0, 1);

        // Right Column
        $rightX = 115;
        $pdf->SetXY($rightX, $y);
        $pdf->Cell(30, 4.5, 'Gudang', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(50, 4.5, $data['gudang'] ?? 'MDC SOLO TD', 0, 1);

        $pdf->SetXY($rightX, $y + 4.5);
        $pdf->Cell(30, 4.5, 'Entity Gudang', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(50, 4.5, $entity, 0, 1);

        $pdf->SetXY($rightX, $y + 9);
        $pdf->Cell(30, 4.5, 'Jadwal Kedatangan', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(50, 4.5, $data['del_date'] ?? $data['tanggal'] ?? '-', 0, 1);

        $pdf->Ln(4);
        $pdf->SetFont('Arial', '', 8.5);
        $pdf->Cell(190, 5, 'Mohon untuk dibeli barang-barang sebagai berikut :', 0, 1);
        $pdf->Ln(1);

        // Function to render table header
        $drawTableHeader = function () use ($pdf) {
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->SetDrawColor(0, 0, 0);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(10, 6, 'No', 1, 0, 'C', true);
            $pdf->Cell(25, 6, 'Kode', 1, 0, 'C', true);
            $pdf->Cell(85, 6, 'Nama', 1, 0, 'C', true);
            $pdf->Cell(16, 6, 'Satuan', 1, 0, 'C', true);
            $pdf->Cell(14, 6, 'Qty', 1, 0, 'C', true);
            $pdf->Cell(40, 6, 'Keterangan', 1, 1, 'C', true);
        };

        $drawTableHeader();

        // Responsive Table Rows
        $pdf->SetFont('Arial', '', 7.5);
        $totalQty = 0;
        $items = $data['items'] ?? [];

        foreach ($items as $idx => $item) {
            $rowHeight = 8;
            $nama = $item['nama'] ?? '';
            $ket = $item['keterangan'] ?? '';

            // Check if text is long to expand row height
            if (strlen($nama) > 55 || strlen($ket) > 28) {
                $rowHeight = 11;
            }

            // Responsiveness: If table reaches page bottom margin (260mm), add new page
            if ($pdf->GetY() + $rowHeight > 255) {
                $pdf->AddPage();
                $pdf->drawHeader();
                $pdf->Ln(3);
                $drawTableHeader();
            }

            $currentY = $pdf->GetY();
            $pdf->Cell(10, $rowHeight, $idx + 1, 1, 0, 'C');
            $pdf->Cell(25, $rowHeight, $item['kode'] ?? '', 1, 0, 'C');

            // Draw Nama with wrapping
            $startXNama = $pdf->GetX();
            $pdf->Cell(85, $rowHeight, '', 1, 0); // border
            $pdf->SetXY($startXNama + 1, $currentY + 1);
            $pdf->MultiCell(83, 3.8, $nama, 0, 'L');

            // Reset cursor for remaining columns
            $pdf->SetXY($startXNama + 85, $currentY);
            $pdf->Cell(16, $rowHeight, $item['satuan'] ?? 'Unit', 1, 0, 'C');
            $pdf->Cell(14, $rowHeight, (string)($item['qty'] ?? 1), 1, 0, 'C');

            $startXKet = $pdf->GetX();
            $pdf->Cell(40, $rowHeight, '', 1, 1);
            $pdf->SetXY($startXKet + 1, $currentY + 1);
            $pdf->MultiCell(38, 3.8, $ket, 0, 'L');

            $pdf->SetY($currentY + $rowHeight);
            $totalQty += (float)($item['qty'] ?? 0);
        }

        // Total Row
        if ($pdf->GetY() + 6 > 260) {
            $pdf->AddPage();
            $pdf->drawHeader();
        }
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(136, 6, 'TOTAL', 0, 0, 'R');
        $pdf->Cell(14, 6, number_format($totalQty, 2), 'T', 0, 'C');
        $pdf->Cell(40, 6, '', 0, 1);

        $pdf->Ln(6);

        // Check if remaining page has enough height for footer boxes (needs 45mm)
        if ($pdf->GetY() + 45 > 270) {
            $pdf->AddPage();
            $pdf->drawHeader();
            $pdf->Ln(6);
        }

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
        $pdf->Cell(54, 4, $data['approver1'] ?? 'AGM', 'B', 1, 'C');
        $pdf->SetXY(14, $boxY + 22);
        $pdf->Cell(54, 4, $data['approver2'] ?? 'M.M', 'B', 1, 'C');
        $pdf->SetXY(14, $boxY + 28);
        $pdf->Cell(54, 4, $data['app_date'] ?? date('d/m/Y'), 0, 1, 'C');

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

        if ($outputDest === 'F' && $filepath) {
            $pdf->Output('F', $filepath);
            return $filepath;
        }

        return $pdf->Output('S');
    }

    /**
     * Generate Purchase Order (PO / POE) Template.
     */
    public static function generatePO(array $data, string $outputDest = 'S', ?string $filepath = null): string
    {
        $pdf = new TiseraPdf('P', 'mm', 'A4');
        $pdf->AliasNbPages();
        $pdf->SetMargins(10, 10, 10);
        $pdf->SetAutoPageBreak(false);

        $printDate = $data['print_date'] ?? $data['tanggal'] ?? date('d/m/Y H:i:s');
        $pdf->setHeaderMeta('Head Office', 'Jl. Dr. Soepomo No. 23 Solo', 'Phone : 0271 - 714344 Fax : 0271 - 716874', $printDate, 'iadijana');

        $pdf->AddPage();
        $pdf->drawHeader();

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
        $pdf->Cell(85, 4.5, $data['vendor'] ?? 'MEDIA KARYA PUTRA. CV', 0, 1);
        $pdf->SetFont('Arial', '', 8);
        $pdf->SetX(10);
        $pdf->Cell(85, 4, 'Telp: ' . ($data['phone'] ?? '-') . '    Fax: -', 0, 1);

        // Right side: PO Details
        $pdf->SetXY(120, $y);
        $pdf->Cell(25, 4.5, 'PO No.', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->SetFont('Arial', 'B', 8.5);
        $pdf->Cell(50, 4.5, $data['nomor_dokumen'] ?? $data['kode'] ?? '', 0, 1);

        $pdf->SetFont('Arial', '', 8);
        $pdf->SetXY(120, $y + 4.5);
        $pdf->Cell(25, 4.5, 'Date', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(50, 4.5, $data['tanggal'] ?? '', 0, 1);

        $pdf->SetXY(120, $y + 9);
        $pdf->Cell(25, 4.5, 'No. Ref.', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(50, 4.5, $data['ref_no'] ?? '-', 0, 1);

        $pdf->SetXY(120, $y + 13.5);
        $pdf->Cell(25, 4.5, 'Currency', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(50, 4.5, 'IDR', 0, 1);

        $pdf->Ln(3);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(30, 4, 'Deliver To', 0, 0);
        $pdf->Cell(5, 4, ':', 0, 0);
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(150, 4, $data['deliver_to'] ?? 'MDC SOLO TD', 0, 1);

        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(30, 4, 'Notes', 0, 0);
        $pdf->Cell(5, 4, ':', 0, 0);
        $pdf->Cell(150, 4, $data['notes'] ?? '-', 0, 1);
        $pdf->Ln(2);

        // Table Header
        $drawTableHeader = function () use ($pdf) {
            $pdf->SetFont('Arial', 'B', 7.5);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(8, 6, 'No', 1, 0, 'C', true);
            $pdf->Cell(24, 6, 'Delivery Date', 1, 0, 'C', true);
            $pdf->Cell(78, 6, 'Item Name', 1, 0, 'C', true);
            $pdf->Cell(14, 6, 'Unit', 1, 0, 'C', true);
            $pdf->Cell(16, 6, 'Quantity', 1, 0, 'C', true);
            $pdf->Cell(25, 6, 'Unit Price', 1, 0, 'C', true);
            $pdf->Cell(25, 6, 'Amount', 1, 1, 'C', true);
        };

        $drawTableHeader();

        // Table Rows
        $pdf->SetFont('Arial', '', 7.5);
        $items = $data['items'] ?? [];
        $totalQty = 0;

        foreach ($items as $idx => $it) {
            $name = $it['name'] ?? '';
            $rowHeight = strlen($name) > 48 ? 11 : 7;

            // Page overflow check
            if ($pdf->GetY() + $rowHeight > 255) {
                $pdf->AddPage();
                $pdf->drawHeader();
                $pdf->Ln(3);
                $drawTableHeader();
            }

            $currentY = $pdf->GetY();
            $pdf->Cell(8, $rowHeight, $idx + 1, 1, 0, 'C');
            $pdf->Cell(24, $rowHeight, $it['delDate'] ?? $data['tanggal'] ?? '', 1, 0, 'C');

            $startXName = $pdf->GetX();
            $pdf->Cell(78, $rowHeight, '', 1, 0);
            $pdf->SetXY($startXName + 1, $currentY + 1);
            $pdf->MultiCell(76, 3.8, $name, 0, 'L');

            $pdf->SetXY($startXName + 78, $currentY);
            $pdf->Cell(14, $rowHeight, $it['unit'] ?? 'EXP', 1, 0, 'C');
            $pdf->Cell(16, $rowHeight, number_format((float)($it['qty'] ?? 0)), 1, 0, 'C');
            $pdf->Cell(25, $rowHeight, number_format((float)($it['price'] ?? 0), 2), 1, 0, 'R');
            $pdf->Cell(25, $rowHeight, number_format((float)($it['amount'] ?? 0), 2), 1, 1, 'R');

            $pdf->SetY($currentY + $rowHeight);
            $totalQty += (float)($it['qty'] ?? 0);
        }

        $pdf->Ln(2);

        // Check if remaining page has enough height for Totals & Signature box (needs 48mm)
        if ($pdf->GetY() + 48 > 270) {
            $pdf->AddPage();
            $pdf->drawHeader();
            $pdf->Ln(4);
        }

        $calcY = $pdf->GetY();
        $totals = $data['totals'] ?? [
            'subtotal' => $data['nominal'] ?? 0,
            'discount' => 0,
            'dppLainnya' => round(($data['nominal'] ?? 0) * 0.917),
            'ppn' => 0,
            'transport' => 0,
            'total' => $data['nominal'] ?? 0
        ];

        // Totals Table on Right Side
        $pdf->SetXY(115, $calcY);
        $pdf->SetFont('Arial', '', 8);

        $finance = [
            ['Sub Total', $totals['subtotal'] ?? 0],
            ['Discount', $totals['discount'] ?? 0],
            ['DPPLainnya', $totals['dppLainnya'] ?? 0],
            ['PPN', $totals['ppn'] ?? 0],
            ['Transport', $totals['transport'] ?? 0],
            ['TOTAL', $totals['total'] ?? 0],
        ];

        foreach ($finance as $f) {
            $pdf->SetX(115);
            if ($f[0] === 'TOTAL') {
                $pdf->SetFont('Arial', 'B', 8.5);
                $pdf->Cell(45, 5, $f[0], 'T', 0, 'L');
                $pdf->Cell(30, 5, number_format((float)$f[1], 2), 'T', 1, 'R');
            } else {
                $pdf->SetFont('Arial', '', 8);
                $pdf->Cell(45, 4, $f[0], 0, 0, 'L');
                $pdf->Cell(30, 4, number_format((float)$f[1], 2), 0, 1, 'R');
            }
        }

        // Signature Box on Left Side
        $approvers = $data['approvers'] ?? ['NNR', 'P.A.M.'];
        $appDate = $data['app_date'] ?? $data['tanggal'] ?? date('d/m/Y');

        $pdf->Rect(10, $calcY, 62, 38);
        $pdf->SetXY(10, $calcY + 2);
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(62, 4, 'APPROVED BY', 0, 1, 'C');
        $pdf->SetFont('Arial', 'B', 13);
        $pdf->Cell(62, 7, 'APPROVED', 0, 1, 'C');

        $pdf->SetFont('Arial', '', 8);
        $pdf->SetXY(14, $calcY + 16);
        $pdf->Cell(54, 4, $approvers[0] ?? 'NNR', 'B', 1, 'C');
        $pdf->SetXY(14, $calcY + 22);
        $pdf->Cell(54, 4, $approvers[1] ?? 'P.A.M.', 'B', 1, 'C');
        $pdf->SetXY(14, $calcY + 28);
        $pdf->Cell(54, 4, $appDate, 0, 1, 'C');

        if ($outputDest === 'F' && $filepath) {
            $pdf->Output('F', $filepath);
            return $filepath;
        }

        return $pdf->Output('S');
    }

    /**
     * Generate Calculation NPK (CCA) Template.
     */
    public static function generateNPK(array $data, string $outputDest = 'S', ?string $filepath = null): string
    {
        $pdf = new TiseraPdf('P', 'mm', 'A4');
        $pdf->AliasNbPages();
        $pdf->SetMargins(10, 10, 10);
        $pdf->SetAutoPageBreak(false);

        $entity = $data['entity'] ?? 'Head Office';
        $dateFormatted = $data['date_formatted'] ?? $data['tanggal'] ?? date('d F Y');
        $pdf->setHeaderMeta($entity, 'Jl. Bau Massepe No.75 Sumpang Minange, Kec. Bacukiki Barat', 'Phone : 0421 - 24904 Fax : 0421 - 24904', $dateFormatted, 'klick');

        $pdf->AddPage();
        $pdf->drawHeader();

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
        $pdf->Cell(60, 4.5, $data['nomor_dokumen'] ?? $data['kode'] ?? '', 0, 1);

        $pdf->SetFont('Arial', '', 8);
        $pdf->SetX(10);
        $pdf->Cell(25, 4.5, 'Entity Name', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(60, 4.5, $entity, 0, 1);

        $pdf->SetX(10);
        $pdf->Cell(25, 4.5, 'Customer Name', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(60, 4.5, $data['customer'] ?? 'SD NEGERI 22 MURANTE', 0, 1);

        $pdf->SetX(10);
        $pdf->Cell(25, 4.5, 'Suplier Name', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(60, 4.5, $data['supplier'] ?? 'UD Kembang Jati', 0, 1);

        // Right details
        $pdf->SetXY(120, $y);
        $pdf->Cell(25, 4.5, 'Date', 0, 0);
        $pdf->Cell(5, 4.5, ':', 0, 0);
        $pdf->Cell(40, 4.5, $dateFormatted, 0, 1);

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
        $drawTableHeader = function () use ($pdf) {
            $pdf->SetFont('Arial', 'B', 7.5);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(8, 6, 'No', 1, 0, 'C', true);
            $pdf->Cell(72, 6, 'Nama Produk', 1, 0, 'C', true);
            $pdf->Cell(12, 6, 'Unit', 1, 0, 'C', true);
            $pdf->Cell(25, 6, 'Harga Kulak', 1, 0, 'C', true);
            $pdf->Cell(25, 6, 'Harga Jual', 1, 0, 'C', true);
            $pdf->Cell(18, 6, 'Disc (%)', 1, 0, 'C', true);
            $pdf->Cell(30, 6, 'Jumlah Jual', 1, 1, 'C', true);
        };

        $drawTableHeader();

        // Table Rows
        $pdf->SetFont('Arial', '', 7.5);
        $items = $data['items'] ?? [];

        foreach ($items as $idx => $it) {
            $name = $it['name'] ?? '';
            $rowHeight = strlen($name) > 42 ? 11 : 7;

            // Page overflow check
            if ($pdf->GetY() + $rowHeight > 255) {
                $pdf->AddPage();
                $pdf->drawHeader();
                $pdf->Ln(3);
                $drawTableHeader();
            }

            $currentY = $pdf->GetY();
            $pdf->Cell(8, $rowHeight, $idx + 1, 1, 0, 'C');

            $startXName = $pdf->GetX();
            $pdf->Cell(72, $rowHeight, '', 1, 0);
            $pdf->SetXY($startXName + 1, $currentY + 1);
            $pdf->MultiCell(70, 3.8, $name, 0, 'L');

            $pdf->SetXY($startXName + 72, $currentY);
            $pdf->Cell(12, $rowHeight, (string)($it['unit'] ?? 1), 1, 0, 'C');
            $pdf->Cell(25, $rowHeight, number_format((float)($it['kulak'] ?? 0), 2), 1, 0, 'R');
            $pdf->Cell(25, $rowHeight, number_format((float)($it['jual'] ?? 0), 2), 1, 0, 'R');
            $pdf->Cell(18, $rowHeight, number_format((float)($it['disc'] ?? 0), 2), 1, 0, 'C');
            $pdf->Cell(30, $rowHeight, number_format((float)($it['total'] ?? 0), 2), 1, 1, 'R');

            $pdf->SetY($currentY + $rowHeight);
        }

        $pdf->Ln(3);

        // Check if remaining page has enough height for Remarks & Calc Grid (needs ~55mm)
        if ($pdf->GetY() + 55 > 270) {
            $pdf->AddPage();
            $pdf->drawHeader();
            $pdf->Ln(4);
        }

        $bottomY = $pdf->GetY();

        // Remarks (Left)
        $remarks = $data['remarks'] ?? [
            'BO' => 'Mohon pengajuan ini dapat diproses',
            'AM' => '# Pengajuan disetujui # Tidak ada harga standar baku # GP : 21,74%',
            'NSM' => 'Disetujui, Harap dipastikan Spek sesuai pesanan dan pembayaran Lunas',
            'Akt' => 'Approved, dipastikan faktur pajak pembelian karena PKP, dan pembayaran aman'
        ];

        $pdf->SetXY(10, $bottomY);
        $pdf->SetFont('Arial', '', 7.5);
        $currentRemY = $bottomY;
        foreach ($remarks as $type => $text) {
            $pdf->SetXY(10, $currentRemY);
            $pdf->SetFont('Arial', 'B', 7.5);
            $pdf->Cell(22, 5, 'Remark ' . $type, 1, 0, 'L');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(95, 5, ' ' . $text, 1, 1, 'L');
            $currentRemY += 5;
        }

        // Financial Calculation Grid (Right)
        $calc = $data['calc'] ?? [
            'bruto' => $data['nominal'] ?? 0,
            'dpp' => round(($data['nominal'] ?? 0) * 0.9),
            'dppLainnya' => round(($data['nominal'] ?? 0) * 0.82),
            'ppn' => round(($data['nominal'] ?? 0) * 0.1),
            'pph' => round(($data['nominal'] ?? 0) * 0.015),
            'disc' => 0,
            'netto' => round(($data['nominal'] ?? 0) * 0.95),
            'cogs' => round(($data['nominal'] ?? 0) * 0.7),
            'gp' => round(($data['nominal'] ?? 0) * 0.2),
        ];

        $pdf->SetXY(127, $bottomY);
        $calcRows = [
            ['Bruto', '', $calc['bruto'] ?? 0],
            ['DPP', '', $calc['dpp'] ?? 0],
            ['DPP Nilai Lainnya', '', $calc['dppLainnya'] ?? 0],
            ['PPN', '11.00', $calc['ppn'] ?? 0],
            ['PPH', '1.50', $calc['pph'] ?? 0],
            ['Disc', '4.92', $calc['disc'] ?? 0],
            ['Affiliate', '0.00', '0.00'],
            ['Netto', '95.07', $calc['netto'] ?? 0],
            ['COGS', '73.33', $calc['cogs'] ?? 0],
            ['GP', '21.74', $calc['gp'] ?? 0],
        ];

        $pdf->SetFont('Arial', '', 7.5);
        foreach ($calcRows as $r) {
            $pdf->SetX(127);
            $pdf->Cell(28, 4.5, $r[0], 1, 0, 'L');
            $pdf->Cell(12, 4.5, $r[1], 1, 0, 'C');
            $pdf->Cell(23, 4.5, number_format((float)$r[2], 2), 1, 1, 'R');
        }

        if ($outputDest === 'F' && $filepath) {
            $pdf->Output('F', $filepath);
            return $filepath;
        }

        return $pdf->Output('S');
    }
}
