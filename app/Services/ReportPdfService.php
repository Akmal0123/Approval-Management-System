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
    private int $totalDocs = 0;
    private bool $isMobile = false;

    public function setIsMobile(bool $isMobile): void
    {
        $this->isMobile = $isMobile;
    }

    public function setTotalDocs(int $total): void
    {
        $this->totalDocs = $total;
    }

    public function setFilterInfo(
        string $companyOrTitle,
        string $aplikasiOrPeriode = '',
        string $status = '',
        string $title = '',
        string $periode = 'Semua Periode'
    ): void {
        // If called with (title, periode, total) or legacy (company, aplikasi, status, title, periode)
        if ($title !== '') {
            $this->companyFilter = $companyOrTitle;
            $this->aplikasiFilter = $aplikasiOrPeriode;
            $this->statusFilter = $status;
            $this->reportTitle = strtoupper($title);
            $this->periodeFilter = $periode;
        } else {
            $this->reportTitle = strtoupper($companyOrTitle);
            $this->periodeFilter = $aplikasiOrPeriode ?: 'Semua Periode';
        }
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
        $this->SetFont('Arial', 'B', 14);
        $this->SetTextColor(21, 128, 61); // Primary green
        $this->Cell(0, 7, $this->reportTitle, 0, 1, 'L');

        $this->SetFont('Arial', '', 8.5);
        $this->SetTextColor(100, 116, 139); // Slate muted
        $this->Cell(0, 4.5, 'Sistem Approval Management System (AMS)', 0, 1, 'L');
        $this->Ln(1.5);

        // Metadata box (273mm width on Landscape A4: X 12 to 285)
        $this->SetX(12);
        $this->SetFillColor(248, 250, 252); // Slate 50
        $this->SetDrawColor(203, 213, 225); // Slate 300
        $this->RoundedRect(12, $this->GetY(), 273, 9, 1.2, 'DF');

        $boxY = $this->GetY() + 2.2;
        $this->SetXY(15, $boxY);
        $this->SetFont('Arial', 'B', 8);
        $this->SetTextColor(51, 65, 85);
        $this->Cell(15, 4.5, 'Periode:', 0, 0);
        $this->SetFont('Arial', '', 8);
        $this->Cell(75, 4.5, $this->periodeFilter, 0, 0);

        $this->SetFont('Arial', 'B', 8);
        $this->Cell(17, 4.5, 'Tgl Cetak:', 0, 0);
        $this->SetFont('Arial', '', 8);
        $this->Cell(65, 4.5, $this->printDate, 0, 0);

        if ($this->totalDocs > 0) {
            $this->SetFont('Arial', 'B', 8);
            $this->Cell(22, 4.5, 'Total Data:', 0, 0);
            $this->SetFont('Arial', '', 8);
            $this->Cell(45, 4.5, $this->totalDocs . ' dokumen', 0, 0);
        }

        $this->SetY($boxY + 9.5);
    }

    private function renderMobileHeader(): void
    {
        $this->SetFont('Arial', 'B', 12);
        $this->SetTextColor(21, 128, 61); // Primary green
        $this->Cell(0, 6, $this->reportTitle, 0, 1, 'L');

        $this->SetFont('Arial', '', 7.5);
        $this->SetTextColor(100, 116, 139); // Slate muted
        $this->Cell(0, 4, 'Sistem Approval Management System (AMS) - Mobile Edition', 0, 1, 'L');
        $this->Ln(1);

        // Metadata box (190mm width, portrait: X 10 to 200)
        $this->SetX(10);
        $this->SetFillColor(248, 250, 252);
        $this->SetDrawColor(203, 213, 225);
        $this->RoundedRect(10, $this->GetY(), 190, 8.5, 1.2, 'DF');

        $boxY = $this->GetY() + 2;
        $this->SetXY(13, $boxY);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(51, 65, 85);
        $this->Cell(14, 4, 'Periode:', 0, 0);
        $this->SetFont('Arial', '', 7.5);
        $this->Cell(65, 4, $this->periodeFilter, 0, 0);

        $this->SetFont('Arial', 'B', 7.5);
        $this->Cell(16, 4, 'Tgl Cetak:', 0, 0);
        $this->SetFont('Arial', '', 7.5);
        $this->Cell(45, 4, $this->printDate, 0, 0);

        if ($this->totalDocs > 0) {
            $this->SetFont('Arial', 'B', 7.5);
            $this->Cell(18, 4, 'Total:', 0, 0);
            $this->SetFont('Arial', '', 7.5);
            $this->Cell(30, 4, $this->totalDocs . ' dok', 0, 0);
        }

        $this->SetY($boxY + 8.5);
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
     * Render grouped report content: Company -> Aplikasi -> Transaksi -> Docs
     */
    public function renderGroupedContent(array $groupedData): void
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

        if (empty($groupedData)) {
            $this->SetFont('Arial', 'I', 10);
            $this->SetTextColor(100, 116, 139);
            $this->Ln(10);
            $this->Cell(0, 10, 'Tidak ada data dokumen yang sesuai dengan periode yang dipilih.', 0, 1, 'C');
            return;
        }

        $pageWidth = $this->isMobile ? 190 : 273;
        $startX = $this->isMobile ? 10 : 12;
        $maxY = $this->isMobile ? 268 : 185;

        foreach ($groupedData as $company => $aplikasiGroup) {
            // Calculate total documents for this company
            $companyTotal = 0;
            foreach ($aplikasiGroup as $transGroup) {
                foreach ($transGroup as $docTypeGroup) {
                    foreach ($docTypeGroup as $docs) {
                        $companyTotal += count($docs);
                    }
                }
            }

            // Page break check for Company Banner (requires at least 32mm)
            if ($this->GetY() > ($maxY - 25)) {
                $this->AddPage($this->isMobile ? 'P' : 'L', 'A4');
            }

            // 1. Company Banner (Primary Green)
            $this->SetX($startX);
            $this->SetFillColor(21, 128, 61); // #15803D
            $this->SetTextColor(255, 255, 255);
            $this->SetFont('Arial', 'B', $this->isMobile ? 8.5 : 9.5);
            $this->RoundedRect($startX, $this->GetY(), $pageWidth, 7.5, 1, 'F');

            $compY = $this->GetY();
            $this->SetXY($startX + 3, $compY + 1.2);
            $this->Cell($pageWidth - 30, 5, 'Company: ' . $this->truncateText($company, 55), 0, 0, 'L');
            $this->SetXY($startX + $pageWidth - 32, $compY + 1.2);
            $this->SetFont('Arial', '', $this->isMobile ? 7.5 : 8.5);
            $this->Cell(29, 5, $companyTotal . ' dokumen', 0, 0, 'R');
            $this->SetY($compY + 9);

            foreach ($aplikasiGroup as $aplikasi => $transaksiGroup) {
                // Page break check for Aplikasi Banner
                if ($this->GetY() > ($maxY - 20)) {
                    $this->AddPage($this->isMobile ? 'P' : 'L', 'A4');
                }

                // 2. Aplikasi Banner (Soft Mint Green)
                $this->SetX($startX);
                $this->SetFillColor(220, 252, 231); // #DCFCE7
                $this->SetDrawColor(134, 239, 172); // #86EFAC
                $this->RoundedRect($startX, $this->GetY(), $pageWidth, 6.5, 1, 'DF');

                $appY = $this->GetY();
                $this->SetXY($startX + 3, $appY + 1);
                $this->SetTextColor(21, 128, 61);
                $this->SetFont('Arial', 'B', $this->isMobile ? 8 : 9);
                $this->Cell($pageWidth - 6, 4.5, 'Aplikasi: ' . $this->truncateText($aplikasi, 45), 0, 0, 'L');
                $this->SetY($appY + 8);

                foreach ($transaksiGroup as $transaksi => $docTypeGroup) {
                    foreach ($docTypeGroup as $docType => $docs) {
                        // Page break check for Transaksi Header + Table Header (requires at least 22mm)
                        if ($this->GetY() > ($maxY - 18)) {
                            $this->AddPage($this->isMobile ? 'P' : 'L', 'A4');
                        }

                        // 3. Transaksi Subheader
                        $this->SetX($startX);
                        $this->SetFillColor(241, 245, 249); // #F1F5F9
                        $this->SetDrawColor(203, 213, 225); // #CBD5E1
                        $this->RoundedRect($startX, $this->GetY(), $pageWidth, 6, 0.8, 'DF');

                        $tranY = $this->GetY();
                        $this->SetXY($startX + 3, $tranY + 0.8);
                        $this->SetTextColor(30, 41, 59);
                        $this->SetFont('Arial', 'B', $this->isMobile ? 7.5 : 8);
                        $tranLabel = 'Transaksi: ' . $transaksi . '  [' . $docType . '] (' . count($docs) . ' dokumen)';
                        $this->Cell($pageWidth - 6, 4.5, $tranLabel, 0, 0, 'L');
                        $this->SetY($tranY + 7);

                        // 4. Table Header
                        $this->renderGroupTableHeader();

                        // 5. Document Rows
                        $no = 1;
                        foreach ($docs as $doc) {
                            if ($this->GetY() > $maxY) {
                                $this->AddPage($this->isMobile ? 'P' : 'L', 'A4');
                                $this->renderGroupTableHeader();
                            }

                            if ($this->isMobile) {
                                $this->renderMobileGroupRow($no, $doc);
                            } else {
                                $this->renderDesktopGroupRow($no, $doc);
                            }
                            $no++;
                        }

                        $this->Ln(3.5);
                    }
                }

                $this->Ln(2);
            }

            $this->Ln(3);
        }
    }

    private function renderGroupTableHeader(): void
    {
        if ($this->isMobile) {
            $this->SetX(10);
            $this->SetFillColor(51, 65, 85); // Slate 700
            $this->SetTextColor(255, 255, 255);
            $this->SetDrawColor(51, 65, 85);
            $this->SetFont('Arial', 'B', 7.5);

            // Total = 190mm
            $this->Cell(8, 6, 'No', 1, 0, 'C', true);
            $this->Cell(70, 6, 'No Dokumen & Judul', 1, 0, 'L', true);
            $this->Cell(32, 6, 'Pengaju', 1, 0, 'L', true);
            $this->Cell(38, 6, 'Nominal (Rp)', 1, 0, 'R', true);
            $this->Cell(42, 6, 'Status & Tgl', 1, 1, 'C', true);
        } else {
            $this->SetX(12);
            $this->SetFillColor(51, 65, 85); // Slate 700
            $this->SetTextColor(255, 255, 255);
            $this->SetDrawColor(51, 65, 85);
            $this->SetFont('Arial', 'B', 8);

            // Total = 273mm
            $this->Cell(8, 6, 'No', 1, 0, 'C', true);
            $this->Cell(38, 6, 'No Dokumen', 1, 0, 'L', true);
            $this->Cell(78, 6, 'Judul Dokumen', 1, 0, 'L', true);
            $this->Cell(35, 6, 'Pengaju', 1, 0, 'L', true);
            $this->Cell(34, 6, 'Nominal (Rp)', 1, 0, 'R', true);
            $this->Cell(44, 6, 'Status', 1, 0, 'C', true);
            $this->Cell(36, 6, 'Tgl Pengajuan', 1, 1, 'C', true);
        }
    }

    private function renderDesktopGroupRow(int $no, array $doc): void
    {
        $this->SetX(12);
        $fill = ($no % 2 === 0);
        $this->SetFillColor(248, 250, 252);
        $this->SetDrawColor(226, 232, 240);
        $this->SetTextColor(30, 41, 59);
        $this->SetFont('Arial', '', 7.5);

        $nominalStr = isset($doc['nominal']) && $doc['nominal'] > 0
            ? number_format((float)$doc['nominal'], 0, ',', '.')
            : '-';

        $statusText = $doc['status'] ?? '-';
        if (!empty($doc['status_detail']) && $doc['status_detail'] !== $statusText) {
            $statusText .= ' (' . $doc['status_detail'] . ')';
        }

        $this->Cell(8, 6, (string)$no, 1, 0, 'C', $fill);
        $this->Cell(38, 6, $this->truncateText($doc['nomor_dokumen'] ?? '-', 24), 1, 0, 'L', $fill);
        $this->Cell(78, 6, $this->truncateText($doc['judul_dokumen'] ?? '-', 52), 1, 0, 'L', $fill);
        $this->Cell(35, 6, $this->truncateText($doc['user'] ?? '-', 22), 1, 0, 'L', $fill);
        $this->Cell(34, 6, $nominalStr, 1, 0, 'R', $fill);

        // Status text color
        if ($doc['status'] === 'Approved') {
            $this->SetTextColor(22, 101, 52); // Green
        } elseif ($doc['status'] === 'Rejected') {
            $this->SetTextColor(185, 28, 28); // Red
        } elseif ($doc['status'] === 'Revision') {
            $this->SetTextColor(126, 34, 206); // Purple
        } else {
            $this->SetTextColor(180, 83, 9); // Amber
        }
        $this->Cell(44, 6, $this->truncateText($statusText, 28), 1, 0, 'C', $fill);

        $this->SetTextColor(30, 41, 59);
        $this->Cell(36, 6, $doc['tgl_pengajuan'] ?? '-', 1, 1, 'C', $fill);
    }

    private function renderMobileGroupRow(int $no, array $doc): void
    {
        $fill = ($no % 2 === 0);
        $this->SetFillColor(248, 250, 252);
        $this->SetDrawColor(226, 232, 240);
        $this->SetTextColor(30, 41, 59);

        $rowHeight = 10;
        $x = 10;
        $y = $this->GetY();

        if ($fill) {
            $this->Rect($x, $y, 190, $rowHeight, 'F');
        }
        $this->Rect($x, $y, 190, $rowHeight, 'D');

        // Internal dividers: 8, 70, 32, 38, 42
        $cols = [8, 70, 32, 38, 42];
        $currX = $x;
        foreach ($cols as $w) {
            $currX += $w;
            if ($currX < $x + 190) {
                $this->Line($currX, $y, $currX, $y + $rowHeight);
            }
        }

        // 1. No
        $this->SetXY($x, $y);
        $this->SetFont('Arial', '', 7.5);
        $this->Cell(8, $rowHeight, (string)$no, 0, 0, 'C');

        // 2. No Dokumen & Judul
        $this->SetXY($x + 9, $y + 1);
        $this->SetFont('Arial', 'B', 7.5);
        $this->Cell(68, 4, $this->truncateText($doc['nomor_dokumen'] ?? '-', 35), 0, 0, 'L');

        $this->SetXY($x + 9, $y + 5.2);
        $this->SetFont('Arial', '', 6.8);
        $this->SetTextColor(100, 116, 139);
        $this->Cell(68, 4, $this->truncateText($doc['judul_dokumen'] ?? '-', 44), 0, 0, 'L');

        // 3. Pengaju
        $this->SetXY($x + 79, $y);
        $this->SetFont('Arial', '', 7.2);
        $this->SetTextColor(51, 65, 85);
        $this->Cell(30, $rowHeight, $this->truncateText($doc['user'] ?? '-', 16), 0, 0, 'L');

        // 4. Nominal
        $nominalStr = isset($doc['nominal']) && $doc['nominal'] > 0
            ? number_format((float)$doc['nominal'], 0, ',', '.')
            : '-';
        $this->SetXY($x + 111, $y);
        $this->SetFont('Arial', 'B', 7.5);
        $this->SetTextColor(15, 23, 42);
        $this->Cell(36, $rowHeight, $nominalStr, 0, 0, 'R');

        // 5. Status & Tgl
        $statusText = $doc['status'] ?? '-';
        $this->SetXY($x + 149, $y + 1);
        $this->SetFont('Arial', 'B', 7);
        if ($statusText === 'Approved') {
            $this->SetTextColor(22, 101, 52);
        } elseif ($statusText === 'Rejected') {
            $this->SetTextColor(185, 28, 28);
        } elseif ($statusText === 'Revision') {
            $this->SetTextColor(126, 34, 206);
        } else {
            $this->SetTextColor(180, 83, 9);
        }
        $this->Cell(40, 4, $this->truncateText($statusText, 22), 0, 0, 'C');

        $this->SetXY($x + 149, $y + 5.2);
        $this->SetFont('Arial', '', 6.8);
        $this->SetTextColor(71, 85, 105);
        $this->Cell(40, 4, $doc['tgl_pengajuan'] ?? '-', 0, 0, 'C');

        $this->SetY($y + $rowHeight);
    }

    /**
     * Backward compatible renderContent for flat item arrays
     */
    public function renderContent(array $items): void
    {
        // Re-group flat items into company -> aplikasi -> transaksi -> docType structure
        $grouped = [];
        foreach ($items as $item) {
            $comp = $item['company'] ?? 'Unknown Company';
            $app = $item['aplikasi'] ?? 'Unknown Aplikasi';
            $tran = $item['transaksi'] ?? '-';
            $dt = $item['doc_type'] ?? 'PO';
            $grouped[$comp][$app][$tran][$dt][] = $item;
        }

        $this->renderGroupedContent($grouped);
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
