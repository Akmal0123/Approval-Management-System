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
        $this->SetFont('Arial', 'B', 15);
        $this->SetTextColor(30, 58, 138); // Dark blue primary
        $this->Cell(0, 7, $this->reportTitle, 0, 1, 'L');

        $this->SetFont('Arial', '', 9);
        $this->SetTextColor(100, 116, 139); // Slate muted
        $this->Cell(0, 5, 'Sistem Approval Management System (AMS)', 0, 1, 'L');
        $this->Ln(2);

        // Metadata box (273mm width)
        $this->SetFillColor(241, 245, 249); // Slate 100
        $this->SetDrawColor(203, 213, 225); // Slate 300
        $this->RoundedRect($this->GetX(), $this->GetY(), 273, 14, 1.5, 'DF');

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
        $this->renderTableHeader();
    }

    public function renderTableHeader(): void
    {
        $this->SetFillColor(30, 58, 138);
        $this->SetTextColor(255, 255, 255);
        $this->SetDrawColor(30, 58, 138);
        $this->SetFont('Arial', 'B', 8);

        // Column widths: Total = 273mm
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

    // Page footer
    public function Footer(): void
    {
        $this->SetY(-10);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(148, 163, 184); // Slate 400
        $this->Cell(136, 6, 'Dicetak otomatis oleh Approval Management System', 0, 0, 'L');
        $this->Cell(137, 6, 'Halaman ' . $this->PageNo() . ' / {nb}', 0, 0, 'R');
    }

    /**
     * Render the table content from items
     */
    public function renderContent(array $items): void
    {
        $this->AliasNbPages();
        $this->AddPage('L', 'A4');
        $this->SetMargins(12, 12, 12);
        $this->SetAutoPageBreak(true, 15);

        if (empty($items)) {
            $this->SetFont('Arial', 'I', 10);
            $this->SetTextColor(100, 116, 139);
            $this->Ln(10);
            $this->Cell(0, 10, 'Tidak ada data dokumen yang sesuai dengan filter yang dipilih.', 0, 1, 'C');
            return;
        }

        $no = 1;
        foreach ($items as $item) {
            // Check if page break will happen soon to re-render header cleanly
            if ($this->GetY() > 185) {
                $this->AddPage('L', 'A4');
            }

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

            $no++;
        }
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
