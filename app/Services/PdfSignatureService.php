<?php

namespace App\Services;

use setasign\Fpdi\Fpdi;
use Illuminate\Support\Facades\Storage;
use Exception;

class PdfSignatureService
{
    /**
     * Add signature to PDF document
     *
     * @param string $pdfPath Path to the original PDF file
     * @param string $signaturePath Path to the signature image
     * @param array $options Options for signature placement
     * @return string Path to the signed PDF
     * @throws Exception
     */
    public function addSignatureToPdf(string $pdfPath, string $signaturePath, array $options = []): string
    {
        try {
            $pdf = new Fpdi();

            // Get full paths
            $fullPdfPath = Storage::disk('public')->path($pdfPath);
            $fullSignaturePath = Storage::disk('public')->path($signaturePath);

            // Validate files exist
            if (!file_exists($fullPdfPath)) {
                throw new Exception("PDF file not found: {$fullPdfPath}");
            }

            if (!file_exists($fullSignaturePath)) {
                throw new Exception("Signature file not found: {$fullSignaturePath}");
            }

            // Get total pages
            $pageCount = $pdf->setSourceFile($fullPdfPath);

            // Default options
            $defaultOptions = [
                'page' => $pageCount, // Last page by default
                'x' => 140, // X position from left (mm)
                'y' => 250, // Y position from top (mm)
                'width' => 40, // Width of signature (mm)
                'height' => 15, // Height of signature (mm)
                'add_text' => true, // Add text below signature
                'text' => 'Digitally Signed',
                'date' => now()->format('d/m/Y H:i'),
                'name' => null,
            ];

            $options = array_merge($defaultOptions, $options);

            // Import all pages
            for ($i = 1; $i <= $pageCount; $i++) {
                $pdf->AddPage();
                $tplIdx = $pdf->importPage($i);
                $pdf->useTemplate($tplIdx);

                // Add signature on specified page
                if ($i == $options['page']) {
                    $this->addSignatureToPage($pdf, $fullSignaturePath, $options);
                }
            }

            // Generate output filename
            $pathInfo = pathinfo($pdfPath);
            $signedFilename = $pathInfo['filename'] . '_signed_' . time() . '.pdf';
            $signedPath = $pathInfo['dirname'] . '/' . $signedFilename;
            $fullSignedPath = Storage::disk('public')->path($signedPath);

            // Ensure directory exists
            $directory = dirname($fullSignedPath);
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            // Save the signed PDF
            $pdf->Output('F', $fullSignedPath);

            return $signedPath;
        } catch (Exception $e) {
            throw new Exception("Failed to add signature to PDF: " . $e->getMessage());
        }
    }

    /**
     * Prepare signature image (converts transparent PNG to solid white background JPG to avoid FPDF black alpha box bug)
     */
    private function prepareSignatureForPdf(string $signaturePath): string
    {
        if (!file_exists($signaturePath)) {
            return $signaturePath;
        }

        $imageInfo = @getimagesize($signaturePath);
        if (!$imageInfo) {
            return $signaturePath;
        }

        // If it's a PNG image, process alpha transparency with GD
        if ($imageInfo[2] === IMAGETYPE_PNG && function_exists('imagecreatefrompng')) {
            try {
                $srcImg = @imagecreatefrompng($signaturePath);
                if ($srcImg) {
                    $width = imagesx($srcImg);
                    $height = imagesy($srcImg);

                    // Create truecolor image with white background
                    $destImg = imagecreatetruecolor($width, $height);
                    $white = imagecolorallocate($destImg, 255, 255, 255);
                    imagefill($destImg, 0, 0, $white);

                    // Copy PNG onto white background
                    imagecopy($destImg, $srcImg, 0, 0, 0, 0, $width, $height);

                    // Save to sys_get_temp_dir as clean JPG
                    $tempFile = sys_get_temp_dir() . '/sig_clean_' . md5($signaturePath . filemtime($signaturePath)) . '.jpg';
                    imagejpeg($destImg, $tempFile, 95);

                    imagedestroy($srcImg);
                    imagedestroy($destImg);

                    return $tempFile;
                }
            } catch (\Throwable $t) {
                // Fallback to original path if GD fails
            }
        }

        return $signaturePath;
    }

    /**
     * Add signature image and text to current page
     *
     * @param Fpdi $pdf
     * @param string $signaturePath
     * @param array $options
     * @return void
     */
    private function addSignatureToPage(Fpdi $pdf, string $signaturePath, array $options): void
    {
        // Clean transparent PNG to avoid black background bug in FPDF
        $cleanPath = $this->prepareSignatureForPdf($signaturePath);

        $imageInfo = @getimagesize($cleanPath);
        $imageType = $imageInfo ? $imageInfo[2] : IMAGETYPE_JPEG;

        // Determine image type and use appropriate method
        if ($imageType === IMAGETYPE_PNG) {
            $pdf->Image($cleanPath, $options['x'], $options['y'], $options['width'], $options['height'], 'PNG');
        } else {
            $pdf->Image($cleanPath, $options['x'], $options['y'], $options['width'], $options['height'], 'JPG');
        }

        // Clean up temp file if generated
        if ($cleanPath !== $signaturePath && file_exists($cleanPath)) {
            @unlink($cleanPath);
        }

        // Add text information below signature
        if ($options['add_text']) {
            $textY = $options['y'] + $options['height'] + 1;

            // Add name if provided
            if (!empty($options['name'])) {
                $pdf->SetFont('Arial', 'B', 9.5);
                $pdf->SetTextColor(30, 41, 59);
                $pdf->SetXY($options['x'] - 5, $textY);
                $pdf->Cell($options['width'] + 10, 5, $options['name'], 0, 0, 'C');
                $textY += 5;
            }

            // Add step / role text
            $pdf->SetFont('Arial', '', 8.5);
            $pdf->SetTextColor(71, 85, 105);
            $pdf->SetXY($options['x'] - 5, $textY);
            $pdf->Cell($options['width'] + 10, 4.5, $options['text'], 0, 0, 'C');

            // Add date
            $pdf->SetFont('Arial', '', 7.5);
            $pdf->SetTextColor(100, 116, 139);
            $pdf->SetXY($options['x'] - 5, $textY + 4.5);
            $pdf->Cell($options['width'] + 10, 4.5, 'Tgl: ' . $options['date'], 0, 0, 'C');
        }
    }

    /**
     * Add multiple signatures to PDF (for multiple approvers)
     *
     * @param string $pdfPath
     * @param array $signatures Array of signature data with paths and options
     * @return string
     * @throws Exception
     */
    public function addMultipleSignaturesToPdf(string $pdfPath, array $signatures): string
    {
        try {
            $pdf = new Fpdi();

            $fullPdfPath = Storage::disk('public')->path($pdfPath);

            if (!file_exists($fullPdfPath)) {
                throw new Exception("PDF file not found: {$fullPdfPath}");
            }

            $pageCount = $pdf->setSourceFile($fullPdfPath);

            // Import all pages
            for ($i = 1; $i <= $pageCount; $i++) {
                $pdf->AddPage();
                $tplIdx = $pdf->importPage($i);
                $pdf->useTemplate($tplIdx);

                // Add signatures on the last page
                if ($i == $pageCount) {
                    $yPosition = 220; // Starting Y position
                    $xPosition = 20; // Starting X position
                    $signaturesPerRow = 3;
                    $signatureWidth = 35;
                    $signatureHeight = 13;
                    $spacing = 60; // Horizontal spacing

                    foreach ($signatures as $index => $signature) {
                        $fullSignaturePath = Storage::disk('public')->path($signature['path']);

                        if (!file_exists($fullSignaturePath)) {
                            continue; // Skip if signature file not found
                        }

                        // Calculate position
                        $row = floor($index / $signaturesPerRow);
                        $col = $index % $signaturesPerRow;

                        $x = $xPosition + ($col * $spacing);
                        $y = $yPosition + ($row * 30); // 30mm vertical spacing

                        $options = array_merge([
                            'x' => $x,
                            'y' => $y,
                            'width' => $signatureWidth,
                            'height' => $signatureHeight,
                            'add_text' => true,
                            'text' => $signature['text'] ?? 'Approved',
                            'date' => $signature['date'] ?? now()->format('d/m/Y'),
                            'name' => $signature['name'] ?? null,
                        ], $signature['options'] ?? []);

                        $this->addSignatureToPage($pdf, $fullSignaturePath, $options);
                    }
                }
            }

            // Generate output filename
            $pathInfo = pathinfo($pdfPath);
            $signedFilename = $pathInfo['filename'] . '_fully_signed_' . time() . '.pdf';
            $signedPath = $pathInfo['dirname'] . '/' . $signedFilename;
            $fullSignedPath = Storage::disk('public')->path($signedPath);

            // Ensure directory exists
            $directory = dirname($fullSignedPath);
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            // Save the signed PDF
            $pdf->Output('F', $fullSignedPath);

            return $signedPath;
        } catch (Exception $e) {
            throw new Exception("Failed to add multiple signatures to PDF: " . $e->getMessage());
        }
    }

    /**
     * Generate signed PDF as stream (no file saved to disk)
     * This is used for on-demand rendering to save storage space
     *
     * @param string $pdfPath Path to the original PDF file
     * @param \Illuminate\Support\Collection $approvals Collection of approved DokumenApproval models
     * @return string PDF binary content
     * @throws Exception
     */
    public function generateSignedPdfStream(string $pdfPath, $approvals, ?string $qrCodePath = null): string
    {
        try {
            $pdf = new Fpdi();

            $fullPdfPath = Storage::disk('public')->path($pdfPath);

            if (!file_exists($fullPdfPath)) {
                throw new Exception("PDF file not found: {$fullPdfPath}");
            }

            $pageCount = $pdf->setSourceFile($fullPdfPath);

            // Import all pages
            for ($i = 1; $i <= $pageCount; $i++) {
                $pdf->AddPage();
                $tplIdx = $pdf->importPage($i);
                $pdf->useTemplate($tplIdx);

                // Add QR Code on top right of each page if provided
                if ($qrCodePath) {
                    $fullQrPath = Storage::disk('public')->path($qrCodePath);
                    if (file_exists($fullQrPath)) {
                        $pdf->Image($fullQrPath, 182, 8, 14, 14, 'PNG');
                        $pdf->SetFont('Arial', 'B', 5);
                        $pdf->SetTextColor(71, 85, 105);
                        $pdf->SetXY(174, 22.5);
                        $pdf->Cell(30, 3, 'VERIFIED DOCUMENT', 0, 0, 'C');
                    }
                }

                // Add signatures on the last page
                if ($i == $pageCount && $approvals->count() > 0) {
                    $yPosition = 195; // Starting Y position for perfectly aligned row
                    $signatureWidth = 50;  // 50mm width per signature block
                    $signatureHeight = 22; // 22mm height per signature block
                    // A4 = 210mm. Symmetric 22mm margins (aligns left signature with paragraph text indent)
                    // Kanan: x=138 (138+50=188mm), Tengah: x=80 (80+50=130mm), Kiri: x=22 (22+50=72mm)
                    $columnXPositions = [138, 80, 22]; // Order: 0=Kanan, 1=Tengah, 2=Kiri

                    // Sort by step_order so Kepala Divisi (highest step) gets correct column
                    $sortedApprovals = $approvals->sortBy(fn($a) => $a->masterflowStep?->step_order ?? 999);

                    $sigIndex = 0; // Separate counter — only increments for approvals with a valid signature

                    \Illuminate\Support\Facades\Log::info('[PdfSignature] Rendering signatures', [
                        'total_approvals' => $sortedApprovals->count(),
                    ]);

                    foreach ($sortedApprovals as $approval) {
                        $sigPath = $approval->signature_path;
                        $fullSignaturePath = $sigPath ? Storage::disk('public')->path($sigPath) : null;

                        // Fallback to user default/first signature if missing or file deleted
                        if (!$fullSignaturePath || !file_exists($fullSignaturePath)) {
                            $userSig = $approval->user?->defaultSignature?->signature_path
                                    ?? $approval->user?->signatures?->first()?->signature_path;

                            if ($userSig) {
                                $candidatePath = Storage::disk('public')->path($userSig);
                                if (file_exists($candidatePath)) {
                                    $sigPath = $userSig;
                                    $fullSignaturePath = $candidatePath;

                                    // Persist repaired signature path back to database
                                    try {
                                        $approval->update(['signature_path' => $sigPath]);
                                    } catch (\Throwable $e) {
                                        // Ignore DB write errors during PDF rendering
                                    }
                                }
                            }
                        }

                        if (!$fullSignaturePath || !file_exists($fullSignaturePath)) {
                            \Illuminate\Support\Facades\Log::warning('[PdfSignature] Skipping - no valid signature file found', [
                                'approval_id' => $approval->id,
                                'user'        => $approval->user?->name,
                                'step'        => $approval->masterflowStep?->step_name,
                            ]);
                            continue;
                        }

                        // Calculate position (Kanan → Tengah → Kiri) using sigIndex, not collection key
                        $col = $sigIndex % 3;
                        $row = floor($sigIndex / 3);

                        $x = $columnXPositions[$col];
                        $y = $yPosition + ($row * 40); // 40mm vertical spacing if wrapping past 3

                        \Illuminate\Support\Facades\Log::info('[PdfSignature] Placing signature', [
                            'approval_id' => $approval->id,
                            'user' => $approval->user?->name,
                            'step' => $approval->masterflowStep?->step_name,
                            'sigIndex' => $sigIndex,
                            'col' => $col,
                            'x' => $x,
                            'y' => $y,
                        ]);

                        $options = [
                            'x'        => $x,
                            'y'        => $y,
                            'width'    => $signatureWidth,
                            'height'   => $signatureHeight,
                            'add_text' => true,
                            'text'     => $approval->masterflowStep?->step_name ?? 'Approved',
                            'date'     => $approval->tgl_approve?->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i'),
                            'name'     => $approval->user?->name ?? null,
                        ];

                        $this->addSignatureToPage($pdf, $fullSignaturePath, $options);
                        $sigIndex++; // Only increment after a valid signature is placed
                    }
                }
            }

            // Return PDF content as string (no file saved)
            return $pdf->Output('S');
        } catch (Exception $e) {
            throw new Exception("Failed to generate signed PDF stream: " . $e->getMessage());
        }
    }

    /**
     * Get signature placement suggestions based on document size
     *
     * @param string $pdfPath
     * @return array
     */
    public function getSignaturePlacementSuggestions(string $pdfPath): array
    {
        try {
            $pdf = new Fpdi();
            $fullPdfPath = Storage::disk('public')->path($pdfPath);

            $pageCount = $pdf->setSourceFile($fullPdfPath);
            $pdf->AddPage();
            $tplIdx = $pdf->importPage($pageCount);
            $pdf->useTemplate($tplIdx);

            $pageWidth = $pdf->GetPageWidth();
            $pageHeight = $pdf->GetPageHeight();

            return [
                'bottom_right' => [
                    'x' => $pageWidth - 60,
                    'y' => $pageHeight - 40,
                    'label' => 'Bottom Right',
                ],
                'bottom_left' => [
                    'x' => 20,
                    'y' => $pageHeight - 40,
                    'label' => 'Bottom Left',
                ],
                'bottom_center' => [
                    'x' => ($pageWidth / 2) - 20,
                    'y' => $pageHeight - 40,
                    'label' => 'Bottom Center',
                ],
            ];
        } catch (Exception $e) {
            // Return default suggestions
            return [
                'bottom_right' => ['x' => 140, 'y' => 250, 'label' => 'Bottom Right'],
                'bottom_left' => ['x' => 20, 'y' => 250, 'label' => 'Bottom Left'],
                'bottom_center' => ['x' => 85, 'y' => 250, 'label' => 'Bottom Center'],
            ];
        }
    }
}
