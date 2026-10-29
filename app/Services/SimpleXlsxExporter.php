<?php

namespace App\Services;

class SimpleXlsxExporter
{
    /**
     * Generate an .xlsx file binary string from given headers and rows.
     *
     * @param string $sheetName
     * @param array $headers Array of column header strings
     * @param array $rows Array of array of values
     * @return string Binary XLSX data
     */
    public static function create(string $sheetName, array $headers, array $rows): string
    {
        $zip = new SimpleZipArchive();

        // 1. [Content_Types].xml
        $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' .
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' .
            '<Default Extension="xml" ContentType="application/xml"/>' .
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' .
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' .
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' .
            '</Types>';
        $zip->addFromString('[Content_Types].xml', $contentTypes);

        // 2. _rels/.rels
        $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' .
            '</Relationships>';
        $zip->addFromString('_rels/.rels', $rels);

        // 3. xl/_rels/workbook.xml.rels
        $wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' .
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' .
            '</Relationships>';
        $zip->addFromString('xl/_rels/workbook.xml.rels', $wbRels);

        // 4. xl/workbook.xml
        $safeSheetName = htmlspecialchars(mb_substr($sheetName, 0, 31), ENT_XML1, 'UTF-8');
        $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' .
            '<sheets>' .
            '<sheet name="' . $safeSheetName . '" sheetId="1" r:id="rId1"/>' .
            '</sheets>' .
            '</workbook>';
        $zip->addFromString('xl/workbook.xml', $workbook);

        // 5. xl/styles.xml
        $styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
            '<fonts count="2">' .
            '<font><sz val="11"/><name val="Calibri"/></font>' .
            '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' .
            '</fonts>' .
            '<fills count="3">' .
            '<fill><patternFill patternType="none"/></fill>' .
            '<fill><patternFill patternType="gray125"/></fill>' .
            '<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/></patternFill></fill>' . // Dark blue header
            '</fills>' .
            '<borders count="2">' .
            '<border><left/><right/><top/><bottom/></border>' .
            '<border>' .
            '<left style="thin"><color rgb="FFD1D5DB"/></left>' .
            '<right style="thin"><color rgb="FFD1D5DB"/></right>' .
            '<top style="thin"><color rgb="FFD1D5DB"/></top>' .
            '<bottom style="thin"><color rgb="FFD1D5DB"/></bottom>' .
            '</border>' .
            '</borders>' .
            '<cellStyleXfs count="1">' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' .
            '</cellStyleXfs>' .
            '<cellXfs count="3">' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>' . // Normal data (style 0)
            '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' . // Header (style 1)
            '<xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>' . // Currency / number (style 2)
            '</cellXfs>' .
            '</styleSheet>';
        $zip->addFromString('xl/styles.xml', $styles);

        // 6. xl/worksheets/sheet1.xml
        $sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
            '<sheetData>';

        $rowIdx = 1;

        // Header row
        if (!empty($headers)) {
            $sheetXml .= '<row r="' . $rowIdx . '" spans="1:' . count($headers) . '">';
            $colIdx = 0;
            foreach ($headers as $headerText) {
                $cellRef = self::columnLetter($colIdx) . $rowIdx;
                $escaped = htmlspecialchars((string)$headerText, ENT_XML1, 'UTF-8');
                $sheetXml .= '<c r="' . $cellRef . '" s="1" t="inlineStr"><is><t>' . $escaped . '</t></is></c>';
                $colIdx++;
            }
            $sheetXml .= '</row>';
            $rowIdx++;
        }

        // Data rows
        foreach ($rows as $row) {
            $sheetXml .= '<row r="' . $rowIdx . '" spans="1:' . count($headers) . '">';
            $colIdx = 0;
            foreach ($row as $cellVal) {
                $cellRef = self::columnLetter($colIdx) . $rowIdx;
                if (is_numeric($cellVal) && !is_string($cellVal)) {
                    $sheetXml .= '<c r="' . $cellRef . '" s="0" t="n"><v>' . $cellVal . '</v></c>';
                } elseif ($cellVal === null || $cellVal === '') {
                    $sheetXml .= '<c r="' . $cellRef . '" s="0"/>';
                } else {
                    $escaped = htmlspecialchars((string)$cellVal, ENT_XML1, 'UTF-8');
                    $sheetXml .= '<c r="' . $cellRef . '" s="0" t="inlineStr"><is><t>' . $escaped . '</t></is></c>';
                }
                $colIdx++;
            }
            $sheetXml .= '</row>';
            $rowIdx++;
        }

        $sheetXml .= '</sheetData></worksheet>';
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);

        return $zip->getZipData();
    }

    /**
     * Generate an .xlsx file binary string for grouped report data (Company -> Aplikasi -> Transaksi -> Docs).
     *
     * @param string $sheetTitle
     * @param string $reportTitle
     * @param string $periodeInfo
     * @param array $groupedData
     * @return string Binary XLSX data
     */
    public static function createGroupedReport(string $sheetTitle, string $reportTitle, string $periodeInfo, array $groupedData): string
    {
        $zip = new SimpleZipArchive();

        // 1. [Content_Types].xml
        $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' .
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' .
            '<Default Extension="xml" ContentType="application/xml"/>' .
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' .
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' .
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' .
            '</Types>';
        $zip->addFromString('[Content_Types].xml', $contentTypes);

        // 2. _rels/.rels
        $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' .
            '</Relationships>';
        $zip->addFromString('_rels/.rels', $rels);

        // 3. xl/_rels/workbook.xml.rels
        $wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' .
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' .
            '</Relationships>';
        $zip->addFromString('xl/_rels/workbook.xml.rels', $wbRels);

        // 4. xl/workbook.xml
        $safeSheetName = htmlspecialchars(mb_substr($sheetTitle, 0, 31), ENT_XML1, 'UTF-8');
        $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' .
            '<sheets>' .
            '<sheet name="' . $safeSheetName . '" sheetId="1" r:id="rId1"/>' .
            '</sheets>' .
            '</workbook>';
        $zip->addFromString('xl/workbook.xml', $workbook);

        // 5. xl/styles.xml
        $styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
            '<fonts count="7">' .
            '<font><sz val="10"/><name val="Calibri"/></font>' . // 0: Normal
            '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' . // 1: Header white
            '<font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' . // 2: Company banner white
            '<font><b/><sz val="11"/><color rgb="FF15803D"/><name val="Calibri"/></font>' . // 3: Aplikasi bold green
            '<font><b/><sz val="10"/><color rgb="FF1E293B"/><name val="Calibri"/></font>' . // 4: Transaksi bold slate
            '<font><b/><sz val="14"/><color rgb="FF15803D"/><name val="Calibri"/></font>' . // 5: Title green
            '<font><i/><sz val="9"/><color rgb="FF64748B"/><name val="Calibri"/></font>' . // 6: Subtitle italic slate
            '</fonts>' .
            '<fills count="7">' .
            '<fill><patternFill patternType="none"/></fill>' .
            '<fill><patternFill patternType="gray125"/></fill>' .
            '<fill><patternFill patternType="solid"><fgColor rgb="FF15803D"/></patternFill></fill>' . // 2: Dark green (Company)
            '<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill>' . // 3: Light mint (Aplikasi)
            '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>' . // 4: Light slate (Transaksi)
            '<fill><patternFill patternType="solid"><fgColor rgb="FF334155"/></patternFill></fill>' . // 5: Dark slate (Table header)
            '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>' . // 6: Zebra row
            '</fills>' .
            '<borders count="2">' .
            '<border><left/><right/><top/><bottom/></border>' .
            '<border>' .
            '<left style="thin"><color rgb="FFCBD5E1"/></left>' .
            '<right style="thin"><color rgb="FFCBD5E1"/></right>' .
            '<top style="thin"><color rgb="FFCBD5E1"/></top>' .
            '<bottom style="thin"><color rgb="FFCBD5E1"/></bottom>' .
            '</border>' .
            '</borders>' .
            '<cellStyleXfs count="1">' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' .
            '</cellStyleXfs>' .
            '<cellXfs count="9">' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>' . // 0: Normal data
            '<xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' . // 1: Table column header
            '<xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' . // 2: Number / currency
            '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' . // 3: Company banner
            '<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' . // 4: Aplikasi banner
            '<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' . // 5: Transaksi banner
            '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>' . // 6: Title
            '<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1"/>' . // 7: Subtitle
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>' . // 8: Center cell
            '</cellXfs>' .
            '</styleSheet>';
        $zip->addFromString('xl/styles.xml', $styles);

        // 6. xl/worksheets/sheet1.xml
        $mergeCells = [];
        $sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
            '<cols>' .
            '<col min="1" max="1" width="6" customWidth="1"/>' .
            '<col min="2" max="2" width="22" customWidth="1"/>' .
            '<col min="3" max="3" width="46" customWidth="1"/>' .
            '<col min="4" max="4" width="18" customWidth="1"/>' .
            '<col min="5" max="5" width="18" customWidth="1"/>' .
            '<col min="6" max="6" width="18" customWidth="1"/>' .
            '<col min="7" max="7" width="22" customWidth="1"/>' .
            '<col min="8" max="8" width="16" customWidth="1"/>' .
            '</cols>' .
            '<sheetData>';

        $rowIdx = 1;

        // Title row
        $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8">';
        $sheetXml .= '<c r="A' . $rowIdx . '" s="6" t="inlineStr"><is><t>' . htmlspecialchars($reportTitle, ENT_XML1, 'UTF-8') . '</t></is></c>';
        $sheetXml .= '</row>';
        $mergeCells[] = 'A' . $rowIdx . ':H' . $rowIdx;
        $rowIdx++;

        // Periode row
        $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8">';
        $sheetXml .= '<c r="A' . $rowIdx . '" s="7" t="inlineStr"><is><t>' . htmlspecialchars($periodeInfo, ENT_XML1, 'UTF-8') . '</t></is></c>';
        $sheetXml .= '</row>';
        $mergeCells[] = 'A' . $rowIdx . ':H' . $rowIdx;
        $rowIdx++;

        // Blank row
        $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8"></row>';
        $rowIdx++;

        $tableHeaders = ['No', 'No Dokumen', 'Judul Dokumen', 'Pengaju', 'Nominal (Rp)', 'Status', 'Status Detail', 'Tgl Pengajuan'];

        foreach ($groupedData as $company => $aplikasiGroup) {
            // Calculate total documents for company
            $companyTotal = 0;
            foreach ($aplikasiGroup as $transGroup) {
                foreach ($transGroup as $docTypeGroup) {
                    foreach ($docTypeGroup as $docs) {
                        $companyTotal += count($docs);
                    }
                }
            }

            // Company banner
            $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8">';
            $companyLabel = 'Company: ' . $company . ' (' . $companyTotal . ' dokumen)';
            $sheetXml .= '<c r="A' . $rowIdx . '" s="3" t="inlineStr"><is><t>' . htmlspecialchars($companyLabel, ENT_XML1, 'UTF-8') . '</t></is></c>';
            for ($c = 1; $c < 8; $c++) {
                $sheetXml .= '<c r="' . self::columnLetter($c) . $rowIdx . '" s="3"/>';
            }
            $sheetXml .= '</row>';
            $mergeCells[] = 'A' . $rowIdx . ':H' . $rowIdx;
            $rowIdx++;

            foreach ($aplikasiGroup as $aplikasi => $transaksiGroup) {
                // Aplikasi banner
                $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8">';
                $aplikasiLabel = '  Aplikasi: ' . $aplikasi;
                $sheetXml .= '<c r="A' . $rowIdx . '" s="4" t="inlineStr"><is><t>' . htmlspecialchars($aplikasiLabel, ENT_XML1, 'UTF-8') . '</t></is></c>';
                for ($c = 1; $c < 8; $c++) {
                    $sheetXml .= '<c r="' . self::columnLetter($c) . $rowIdx . '" s="4"/>';
                }
                $sheetXml .= '</row>';
                $mergeCells[] = 'A' . $rowIdx . ':H' . $rowIdx;
                $rowIdx++;

                foreach ($transaksiGroup as $transaksi => $docTypeGroup) {
                    foreach ($docTypeGroup as $docType => $docs) {
                        // Transaksi & docType banner
                        $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8">';
                        $transaksiLabel = '    Transaksi: ' . $transaksi . ' [' . $docType . '] (' . count($docs) . ' dokumen)';
                        $sheetXml .= '<c r="A' . $rowIdx . '" s="5" t="inlineStr"><is><t>' . htmlspecialchars($transaksiLabel, ENT_XML1, 'UTF-8') . '</t></is></c>';
                        for ($c = 1; $c < 8; $c++) {
                            $sheetXml .= '<c r="' . self::columnLetter($c) . $rowIdx . '" s="5"/>';
                        }
                        $sheetXml .= '</row>';
                        $mergeCells[] = 'A' . $rowIdx . ':H' . $rowIdx;
                        $rowIdx++;

                        // Table header
                        $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8">';
                        foreach ($tableHeaders as $cIdx => $th) {
                            $cellRef = self::columnLetter($cIdx) . $rowIdx;
                            $sheetXml .= '<c r="' . $cellRef . '" s="1" t="inlineStr"><is><t>' . htmlspecialchars($th, ENT_XML1, 'UTF-8') . '</t></is></c>';
                        }
                        $sheetXml .= '</row>';
                        $rowIdx++;

                        // Document rows
                        $no = 1;
                        foreach ($docs as $doc) {
                            $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8">';

                            // No
                            $sheetXml .= '<c r="A' . $rowIdx . '" s="8" t="n"><v>' . $no . '</v></c>';

                            // No Dokumen
                            $sheetXml .= '<c r="B' . $rowIdx . '" s="0" t="inlineStr"><is><t>' . htmlspecialchars($doc['nomor_dokumen'] ?? '-', ENT_XML1, 'UTF-8') . '</t></is></c>';

                            // Judul Dokumen
                            $sheetXml .= '<c r="C' . $rowIdx . '" s="0" t="inlineStr"><is><t>' . htmlspecialchars($doc['judul_dokumen'] ?? '-', ENT_XML1, 'UTF-8') . '</t></is></c>';

                            // Pengaju
                            $sheetXml .= '<c r="D' . $rowIdx . '" s="0" t="inlineStr"><is><t>' . htmlspecialchars($doc['user'] ?? '-', ENT_XML1, 'UTF-8') . '</t></is></c>';

                            // Nominal
                            $nominalVal = isset($doc['nominal']) && is_numeric($doc['nominal']) ? (float)$doc['nominal'] : 0;
                            $sheetXml .= '<c r="E' . $rowIdx . '" s="2" t="n"><v>' . $nominalVal . '</v></c>';

                            // Status
                            $sheetXml .= '<c r="F' . $rowIdx . '" s="8" t="inlineStr"><is><t>' . htmlspecialchars($doc['status'] ?? '-', ENT_XML1, 'UTF-8') . '</t></is></c>';

                            // Status Detail
                            $sheetXml .= '<c r="G' . $rowIdx . '" s="0" t="inlineStr"><is><t>' . htmlspecialchars($doc['status_detail'] ?? '-', ENT_XML1, 'UTF-8') . '</t></is></c>';

                            // Tgl Pengajuan
                            $sheetXml .= '<c r="H' . $rowIdx . '" s="8" t="inlineStr"><is><t>' . htmlspecialchars($doc['tgl_pengajuan'] ?? '-', ENT_XML1, 'UTF-8') . '</t></is></c>';

                            $sheetXml .= '</row>';
                            $rowIdx++;
                            $no++;
                        }

                        // Blank row after table
                        $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8"></row>';
                        $rowIdx++;
                    }
                }
            }

            // Extra space between companies
            $sheetXml .= '<row r="' . $rowIdx . '" spans="1:8"></row>';
            $rowIdx++;
        }

        $sheetXml .= '</sheetData>';

        if (!empty($mergeCells)) {
            $sheetXml .= '<mergeCells count="' . count($mergeCells) . '">';
            foreach ($mergeCells as $ref) {
                $sheetXml .= '<mergeCell ref="' . $ref . '"/>';
            }
            $sheetXml .= '</mergeCells>';
        }

        $sheetXml .= '</worksheet>';
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);

        return $zip->getZipData();
    }

    private static function columnLetter(int $colIndex): string
    {
        $letter = '';
        while ($colIndex >= 0) {
            $letter = chr($colIndex % 26 + 65) . $letter;
            $colIndex = intdiv($colIndex, 26) - 1;
        }
        return $letter;
    }
}
