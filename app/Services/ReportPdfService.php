<?php

namespace App\Services;

use setasign\Fpdi\Fpdi;

class ReportPdfService extends Fpdi
{
    private string $reportTitle = 'REPORT DOKUMEN';
    private string $companyFilter = 'Semua Company';
    private string $aplikasiFilter = 'Semua Aplikasi';
    private string $statusFilter = 'Semua Status';
    private string $periodeFilter = 'Semua Periode';
    private string $printDate = '';
    private bool $isMobile = false;

    public function setIsMobile(bool $isMobile): void
    {
        $this->isMobile = $isMobile;
    }

    public function setFilterInfo(
        string $company,
        string $aplikasi,
        string $status,
        string $title = 'REPORT DOKUMEN',
        string $periode = 'Semua Periode'
    ): void {
        $this->companyFilter = $company;
        $this->aplikasiFilter = $aplikasi;
        $this->statusFilter = $status;
        $this->reportTitle = strtoupper($title);
        $this->periodeFilter = $periode;
        $this->printDate = date('d/m/Y H:i');
    }

    // Page header
    public function Header(): void
    {
        if ($this->isMobile) {
            $this->renderMobileHeader();
        } else {
            $this->renderDesktopHeader();
        }
    }

    private function renderDesktopHeader(): void
    {
        $this->SetFont('Arial', 'B', 15);
        $this->SetTextColor(30, 58, 138); // Dark blue primary
        $this->Cell(0, 7, $this->reportTitle, 0, 1, 'L');

        $this->SetFont('Arial', '', 9);
        $this->SetTextColor(100, 116, 139); // Slate muted
        $this->Cell(0, 5, 'Sistem Approval Management System (AMS)', 0, 1, 'L');
        $this->Ln(2);

        // Metadata box (273mm width)
        $this->SetX(12);
        $this->SetFillColor(241, 245, 249); // Slate 100
        $this->SetDrawColor(203, 213, 225); // Slate 300
        $this->RoundedRect(12, $this->GetY(), 273, 14, 1.5, 'DF');

        $this->SetFont('Arial', 'B', 8);
        $this->SetTextColor(51, 65, 85);
        $this->SetY($this->GetY() + 2);

        // Row 1: Company, Aplikasi, Status
        $this->SetX(14);
        $this->Cell(17, 4.5, 'Company:', 0, 0);
        $this->SetFont('Arial', '', 8);
        $this->Cell(65, 4.5, $this->truncateText($this->companyFilter, 38), 0, 0);

        $this->SetFont('Arial', 'B', 8);
        $this->Cell(15, 4.5, 'Aplikasi:', 0, 0);
        $this->SetFont('Arial', '', 8);
        $this->Cell(65, 4.5, $this->truncateText($this->aplikasiFilter, 38), 0, 0);

        $this->SetFont('Arial', 'B', 8);
        $this->Cell(13, 4.5, 'Status:', 0, 0);
        $this->SetFont('Arial', '', 8);
        $this->Cell(45, 4.5, $this->truncateText($this->statusFilter, 24), 0, 1);

        // Row 2: Periode, Tgl Cetak
        $this->SetX(14);
        $this->SetFont('Arial', 'B', 8);
        $this->Cell(17, 4.5, 'Periode:', 0, 0);
        $this->SetFont('Arial', '', 8);
        $this->Cell(65, 4.5, $this->periodeFilter, 0, 0);

        $this->SetFont('Arial', 'B', 8);
        $this->Cell(15, 4.5, 'Tgl Cetak:', 0, 0);
        $this->SetFont('Arial', '', 8);
        $this->Cell(65, 4.5, $this->printDate, 0, 1);

        $this->Ln(3);

        // Table Header
        $this->renderDesktopTableHeader();
    }

    private function renderMobileHeader(): void
    {
        $this->SetFont('Arial', 'B', 12.5);
        $this->SetTextColor(30, 58, 138); // Dark blue primary
        $this->Cell(0, 6, $this->reportTitle, 0, 1, 'L');

        $this->SetFont('Arial', '', 8);
        $this->SetTextColor(100, 116, 139); // Slate muted
        $this->Cell(0, 4.5, 'Sistem Approval Management System (AMS) - Mobile Edition', 0, 1, 'L');
        $this->Ln(1.5);

        // Metadata box (190mm width, portrait: X 10 to 200)
        $this->SetX(10);
        $this->SetFillColor(241, 245, 249);
        $this->SetDrawColor(203, 213, 225);
        $this->RoundedRect(10, $this->GetY(), 190, 15, 1.5, 'DF');

        $boxY = $this->GetY() + 1.8;

        // Kolom 1 (X: 12 -> 76)
        // Row 1: Company
        $this->SetXY(12, $boxY);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(51, 65, 85);
        $this->Cell(15, 3.8, 'Company:', 0, 0);
        $this->SetFont('Arial', '', 7.5);
        $this->Cell(49, 3.8, $this->truncateText($this->companyFilter, 26), 0, 0);

        // Row 2: Periode (tepat di bawah Company)
        $this->SetXY(12, $boxY + 5.5);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(51, 65, 85);
        $this->Cell(15, 3.8, 'Periode:', 0, 0);
        $this->SetFont('Arial', '', 7.5);
        $this->Cell(49, 3.8, $this->truncateText($this->periodeFilter, 26), 0, 0);

        // Kolom 2 (X: 78 -> 132)
        // Row 1: Aplikasi
        $this->SetXY(78, $boxY);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(51, 65, 85);
        $this->Cell(13, 3.8, 'Aplikasi:', 0, 0);
        $this->SetFont('Arial', '', 7.5);
        $this->Cell(42, 3.8, $this->truncateText($this->aplikasiFilter, 22), 0, 0);

        // Kolom 3 (X: 135 -> 198) - Sejajar Lurus Sempurna!
        // Row 1: Status
        $this->SetXY(135, $boxY);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(51, 65, 85);
        $this->Cell(15, 3.8, 'Status:', 0, 0);
        $this->SetFont('Arial', '', 7.5);
        $this->Cell(48, 3.8, $this->truncateText($this->statusFilter, 24), 0, 0);

        // Row 2: Tgl Cetak (tepat lurus di bawah Status)
        $this->SetXY(135, $boxY + 5.5);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(51, 65, 85);
        $this->Cell(15, 3.8, 'Tgl Cetak:', 0, 0);
        $this->SetFont('Arial', '', 7.5);
        $this->Cell(48, 3.8, $this->printDate, 0, 0);

        $this->SetY($boxY + 13.5);

        // Table Header
        $this->renderMobileTableHeader();
    }

    public function renderDesktopTableHeader(): void
    {
        $this->SetX(12);
        $this->SetFillColor(30, 58, 138);
        $this->SetTextColor(255, 255, 255);
        $this->SetDrawColor(30, 58, 138);
        $this->SetFont('Arial', 'B', 8);

        // Column widths: Total = 273mm (12mm + 273mm = 285mm, margin kanan 12mm pada A4 297mm)
        $this->Cell(8, 7, 'No', 1, 0, 'C', true);
        $this->Cell(34, 7, 'No Dokumen', 1, 0, 'L', true);
        $this->Cell(46, 7, 'Judul Dokumen', 1, 0, 'L', true);
        $this->Cell(28, 7, 'Pengaju', 1, 0, 'L', true);
        $this->Cell(26, 7, 'Company', 1, 0, 'L', true);
        $this->Cell(24, 7, 'Aplikasi', 1, 0, 'L', true);
        $this->Cell(26, 7, 'Transaksi', 1, 0, 'L', true);
        $this->Cell(27, 7, 'Nominal (Rp)', 1, 0, 'R', true);
        $this->Cell(28, 7, 'Status', 1, 0, 'C', true);
        $this->Cell(26, 7, 'Tgl Pengajuan', 1, 1, 'C', true);
    }

    public function renderMobileTableHeader(): void
    {
        $this->SetX(10);
        $this->SetFillColor(30, 58, 138);
        $this->SetTextColor(255, 255, 255);
        $this->SetDrawColor(30, 58, 138);
        $this->SetFont('Arial', 'B', 7.5);

        // Total width = 190mm (A4 Portrait width: 210mm - 20mm margins)
        $this->Cell(8, 7, 'No', 1, 0, 'C', true);
        $this->Cell(64, 7, 'No Dokumen & Judul', 1, 0, 'L', true);
        $this->Cell(35, 7, 'Pengaju / Aplikasi', 1, 0, 'L', true);
        $this->Cell(16, 7, 'Tipe', 1, 0, 'C', true);
        $this->Cell(35, 7, 'Nominal (Rp)', 1, 0, 'R', true);
        $this->Cell(32, 7, 'Status & Tgl', 1, 1, 'C', true);
    }

    // Page footer
    public function Footer(): void
    {
        $this->SetY(-10);
        $this->SetFont('Arial', 'I', 7.5);
        $this->SetTextColor(148, 163, 184); // Slate 400
        $leftWidth = $this->isMobile ? 100 : 136;
        $rightWidth = $this->isMobile ? 90 : 137;
        $this->Cell($leftWidth, 6, 'Dicetak otomatis oleh Approval Management System', 0, 0, 'L');
        $this->Cell($rightWidth, 6, 'Halaman ' . $this->PageNo() . ' / {nb}', 0, 0, 'R');
    }

    /**
     * Render the table content from items
     */
    public function renderContent(array $items): void
    {
        $this->AliasNbPages();

        if ($this->isMobile) {
            $this->SetMargins(10, 10, 10);
            $this->SetAutoPageBreak(true, 15);
            $this->AddPage('P', 'A4');
        } else {
            $this->SetMargins(12, 12, 12);
            $this->SetAutoPageBreak(true, 15);
            $this->AddPage('L', 'A4');
        }

        if (empty($items)) {
            $this->SetFont('Arial', 'I', 10);
            $this->SetTextColor(100, 116, 139);
            $this->Ln(10);
            $this->Cell(0, 10, 'Tidak ada data dokumen yang sesuai dengan filter yang dipilih.', 0, 1, 'C');
            return;
        }

        $no = 1;
        foreach ($items as $item) {
            if ($this->isMobile) {
                // Check if page break will happen soon in Portrait (297mm height)
                if ($this->GetY() > 268) {
                    $this->AddPage('P', 'A4');
                }
                $this->renderMobileRow($no, $item);
            } else {
                // Check if page break will happen soon in Landscape (210mm height)
                if ($this->GetY() > 185) {
                    $this->AddPage('L', 'A4');
                }
                $this->renderDesktopRow($no, $item);
            }
            $no++;
        }
    }

    private function renderMobileRow(int $no, array $item): void
    {
        $fill = ($no % 2 === 0);
        $this->SetFillColor(248, 250, 252);
        $this->SetDrawColor(226, 232, 240);
        $this->SetTextColor(30, 41, 59);

        $rowHeight = 10.5;
        $x = 10;
        $y = $this->GetY();

        // Background
        if ($fill) {
            $this->Rect($x, $y, 190, $rowHeight, 'F');
        }
        $this->Rect($x, $y, 190, $rowHeight, 'D');

        // Internal vertical grid lines
        $cols = [8, 64, 35, 16, 35, 32];
        $currentX = $x;
        foreach ($cols as $colWidth) {
            $currentX += $colWidth;
            if ($currentX < $x + 190) {
                $this->Line($currentX, $y, $currentX, $y + $rowHeight);
            }
        }

        // 1. Kolom No (8mm)
        $this->SetXY($x, $y);
        $this->SetFont('Arial', '', 7.5);
        $this->Cell(8, $rowHeight, (string)$no, 0, 0, 'C');

        // 2. Kolom No Dokumen & Judul (64mm)
        $this->SetXY($x + 9, $y + 1);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(30, 41, 59);
        $this->Cell(62, 4.2, $this->truncateText($item['nomor_dokumen'] ?? '-', 32), 0, 0, 'L');

        $this->SetXY($x + 9, $y + 5.2);
        $this->SetFont('Arial', '', 6.8);
        $this->SetTextColor(100, 116, 139);
        $this->Cell(62, 4.2, $this->truncateText($item['judul_dokumen'] ?? '-', 38), 0, 0, 'L');

        // 3. Kolom Pengaju / Aplikasi (35mm)
        $this->SetXY($x + 73, $y + 1);
        $this->SetFont('Arial', 'B', 7);
        $this->SetTextColor(51, 65, 85);
        $this->Cell(33, 4.2, $this->truncateText($item['user'] ?? '-', 18), 0, 0, 'L');

        $this->SetXY($x + 73, $y + 5.2);
        $this->SetFont('Arial', '', 6.5);
        $this->SetTextColor(100, 116, 139);
        $this->Cell(33, 4.2, $this->truncateText($item['aplikasi'] ?? '-', 18), 0, 0, 'L');

        // 4. Kolom Transaksi / Tipe (16mm)
        $this->SetXY($x + 107, $y);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(30, 58, 138);
        $this->Cell(16, $rowHeight, $this->truncateText($item['transaksi'] ?? '-', 8), 0, 0, 'C');

        // 5. Kolom Nominal (35mm)
        $nominalStr = isset($item['nominal']) && $item['nominal'] > 0
            ? number_format((float)$item['nominal'], 0, ',', '.')
            : '-';
        $this->SetXY($x + 123, $y);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(15, 23, 42);
        $this->Cell(33, $rowHeight, $nominalStr, 0, 0, 'R');

        // 6. Kolom Status & Tanggal (32mm)
        $statusText = $item['status'] ?? '-';
        $this->SetXY($x + 158, $y + 1.2);
        $this->SetFont('Arial', 'B', 7);
        if ($statusText === 'Approved') {
            $this->SetTextColor(22, 101, 52); // Green
        } elseif ($statusText === 'Rejected') {
            $this->SetTextColor(185, 28, 28); // Red
        } else {
            $this->SetTextColor(180, 83, 9); // Amber
        }
        $this->Cell(32, 4, $this->truncateText($statusText, 18), 0, 0, 'C');

        // Format tanggal pengajuan: d/m/Y (misal 12/09/2026)
        $rawDate = $item['tgl_pengajuan'] ?? '-';
        $formattedDate = '-';
        if ($rawDate && $rawDate !== '-') {
            $ts = strtotime($rawDate);
            $formattedDate = $ts ? date('d/m/Y', $ts) : $rawDate;
        }

        $this->SetXY($x + 158, $y + 5.5);
        $this->SetFont('Arial', '', 6.8);
        $this->SetTextColor(71, 85, 105); // Slate 600, tajam dan pas di HP
        $this->Cell(32, 4, $formattedDate, 0, 0, 'C');

        // Pindah baris
        $this->SetY($y + $rowHeight);
    }

    private function renderDesktopRow(int $no, array $item): void
    {
        $this->SetX(12);
        $fill = ($no % 2 === 0);
        $this->SetFillColor(248, 250, 252); // Light zebra
        $this->SetDrawColor(226, 232, 240); // Soft border
        $this->SetTextColor(30, 41, 59);
        $this->SetFont('Arial', '', 7.5);

        $nominalStr = isset($item['nominal']) && $item['nominal'] > 0
            ? number_format((float)$item['nominal'], 0, ',', '.')
            : '-';

        $statusText = $item['status'] ?? '-';
        if (!empty($item['status_detail']) && $item['status_detail'] !== $statusText) {
            $statusText .= ' (' . $item['status_detail'] . ')';
        }

        $this->Cell(8, 6, (string)$no, 1, 0, 'C', $fill);
        $this->Cell(34, 6, $this->truncateText($item['nomor_dokumen'] ?? '-', 22), 1, 0, 'L', $fill);
        $this->Cell(46, 6, $this->truncateText($item['judul_dokumen'] ?? '-', 30), 1, 0, 'L', $fill);
        $this->Cell(28, 6, $this->truncateText($item['user'] ?? '-', 18), 1, 0, 'L', $fill);
        $this->Cell(26, 6, $this->truncateText($item['company'] ?? '-', 16), 1, 0, 'L', $fill);
        $this->Cell(24, 6, $this->truncateText($item['aplikasi'] ?? '-', 15), 1, 0, 'L', $fill);
        $this->Cell(26, 6, $this->truncateText($item['transaksi'] ?? '-', 16), 1, 0, 'L', $fill);
        $this->Cell(27, 6, $nominalStr, 1, 0, 'R', $fill);

        $this->Cell(28, 6, $this->truncateText($statusText, 18), 1, 0, 'C', $fill);
        $this->Cell(26, 6, $item['tgl_pengajuan'] ?? '-', 1, 1, 'C', $fill);
    }

    private function truncateText(?string $text, int $maxLen): string
    {
        if ($text === null) return '-';
        if (mb_strlen($text) <= $maxLen) return $text;
        return mb_substr($text, 0, $maxLen - 2) . '..';
    }

    // Helper for rounded rectangle in FPDF
    private function RoundedRect($x, $y, $w, $h, $r, $style = ''): void
    {
        $k = $this->k;
        $hp = $this->h;
        if ($style == 'F')
            $op = 'f';
        elseif ($style == 'FD' || $style == 'DF')
            $op = 'B';
        else
            $op = 'S';
        $MyArc = 4 / 3 * (sqrt(2) - 1);
        $this->_out(sprintf('%.2F %.2F m', ($x + $r) * $k, ($hp - $y) * $k));
        $xc = $x + $w - $r;
        $yc = $y + $r;
        $this->_out(sprintf('%.2F %.2F l', $xc * $k, ($hp - $y) * $k));

        $this->_Arc($xc + $r * $MyArc, $yc - $r, $xc + $r, $yc - $r * $MyArc, $xc + $r, $yc);
        $xc = $x + $w - $r;
        $yc = $y + $h - $r;
        $this->_out(sprintf('%.2F %.2F l', ($x + $w) * $k, ($hp - $yc) * $k));
        $this->_Arc($xc + $r, $yc + $r * $MyArc, $xc + $r * $MyArc, $yc + $r, $xc, $yc + $r);
        $xc = $x + $r;
        $yc = $y + $h - $r;
        $this->_out(sprintf('%.2F %.2F l', $xc * $k, ($hp - ($y + $h)) * $k));
        $this->_Arc($xc - $r * $MyArc, $yc + $r, $xc - $r, $yc + $r * $MyArc, $xc - $r, $yc);
        $xc = $x + $r;
        $yc = $y + $r;
        $this->_out(sprintf('%.2F %.2F l', ($x) * $k, ($hp - $yc) * $k));
        $this->_Arc($xc - $r, $yc - $r * $MyArc, $xc - $r * $MyArc, $yc - $r, $xc, $yc - $r);
        $this->_out($op);
    }

    private function _Arc($x1, $y1, $x2, $y2, $x3, $y3): void
    {
        $h = $this->h;
        $this->_out(sprintf(
            '%.2F %.2F %.2F %.2F %.2F %.2F c',
            $x1 * $this->k,
            ($h - $y1) * $this->k,
            $x2 * $this->k,
            ($h - $y2) * $this->k,
            $x3 * $this->k,
            ($h - $y3) * $this->k
        ));
    }
}
