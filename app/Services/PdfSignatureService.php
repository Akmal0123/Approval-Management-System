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
            $fullPdfPath = Storage::disk('local')->path($pdfPath);
            $fullSignaturePath = Storage::disk('local')->path($signaturePath);

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
            $fullSignedPath = Storage::disk('local')->path($signedPath);

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
     * Add signature image and text to current page
     *
     * @param Fpdi $pdf
     * @param string $signaturePath
     * @param array $options
     * @return void
     */
    private function addSignatureToPage(Fpdi $pdf, string $signaturePath, array $options): void
    {
        // Add signature image
        $imageInfo = getimagesize($signaturePath);
        $imageType = $imageInfo[2];

        // Determine image type and use appropriate method
        if ($imageType === IMAGETYPE_PNG) {
            $pdf->Image($signaturePath, $options['x'], $options['y'], $options['width'], $options['height'], 'PNG');
        } elseif ($imageType === IMAGETYPE_JPEG) {
            $pdf->Image($signaturePath, $options['x'], $options['y'], $options['width'], $options['height'], 'JPG');
        } else {
            // Try as PNG by default
            $pdf->Image($signaturePath, $options['x'], $options['y'], $options['width'], $options['height'], 'PNG');
        }

        // Add text information below signature
        if ($options['add_text']) {
            $pdf->SetFont('Arial', '', 8);
            $pdf->SetTextColor(0, 0, 0);

            $textY = $options['y'] + $options['height'] + 2;

            // Add name if provided
            if ($options['name']) {
                $pdf->SetXY($options['x'], $textY);
                $pdf->Cell($options['width'], 4, $options['name'], 0, 0, 'C');
                $textY += 4;
            }

            // Add signed text
            $pdf->SetXY($options['x'], $textY);
            $pdf->Cell($options['width'], 4, $options['text'], 0, 0, 'C');

            // Add date
            $pdf->SetXY($options['x'], $textY + 4);
            $pdf->Cell($options['width'], 4, $options['date'], 0, 0, 'C');
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

            $fullPdfPath = Storage::disk('local')->path($pdfPath);

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
                        $fullSignaturePath = Storage::disk('local')->path($signature['path']);

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
            $fullSignedPath = Storage::disk('local')->path($signedPath);

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
     * @param \App\Models\Dokumen|null $dokumen
     * @return string PDF binary content
     * @throws Exception
     */
    public function generateSignedPdfStream(string $pdfPath, $approvals, $dokumen = null): string
    {
        try {
            $fullPdfPath = Storage::disk('local')->path($pdfPath);

            if (!file_exists($fullPdfPath)) {
                throw new Exception("PDF file not found: {$fullPdfPath}");
            }

            $signaturesData = [];
            
            if ($approvals && $approvals->count() > 0) {
                // Determine page count using FPDI for unpositioned signatures fallback
                // (Note: FPDI might fail on compressed PDFs, so we wrap it)
                $pageCount = 1;
                try {
                    $pdf = new Fpdi();
                    $pageCount = $pdf->setSourceFile($fullPdfPath);
                } catch (\Exception $e) {
                    // Ignore FPDI compression error, assume large page count for unpositioned
                    $pageCount = 999;
                }

                $unpositionedIndex = 0;
                $yPosition = 220; // Starting Y position for fallback
                $xPosition = 20; // Starting X position for fallback
                $signaturesPerRow = 3;
                $spacing = 60; // Horizontal spacing

                foreach ($approvals as $approval) {
                    if (!$approval->signature_path) {
                        continue;
                    }
                    
                    $fullSignaturePath = Storage::disk('local')->path($approval->signature_path);
                    if (!file_exists($fullSignaturePath)) {
                        continue;
                    }

                    $pos = $approval->signaturePosition;
                    
                    if ($pos) {
                        $signaturesData[] = [
                            'imagePath' => $fullSignaturePath,
                            'page' => $pos->page,
                            'x' => $pos->x,
                            'y' => $pos->y,
                            'width' => $pos->width,
                            'height' => $pos->height,
                            'add_text' => true,
                            'text' => $approval->masterflowStep?->step_name ?? 'Approved',
                            'date' => $approval->tgl_approve?->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i'),
                            'name' => $approval->user?->name ?? null,
                        ];
                    } else {
                        // Fallback positioning
                        $row = floor($unpositionedIndex / $signaturesPerRow);
                        $col = $unpositionedIndex % $signaturesPerRow;

                        $x = $xPosition + ($col * $spacing);
                        $y = $yPosition + ($row * 30); // 30mm vertical spacing
                        
                        $signaturesData[] = [
                            'imagePath' => $fullSignaturePath,
                            'page' => $pageCount, // Last page
                            'x' => $x,
                            'y' => $y,
                            'width' => 35,
                            'height' => 13,
                            'add_text' => true,
                            'text' => $approval->masterflowStep?->step_name ?? 'Approved',
                            'date' => $approval->tgl_approve?->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i'),
                            'name' => $approval->user?->name ?? null,
                        ];
                        $unpositionedIndex++;
                    }
                }
            }

            if (!$dokumen && $approvals && $approvals->count() > 0) {
                $firstApproval = $approvals->first();
                if ($firstApproval) {
                    $dokumen = $firstApproval->dokumen;
                }
            }

            $qrCodeData = null;
            if ($dokumen) {
                $qrPosition = \App\Models\DocumentSignaturePosition::where('dokumen_id', $dokumen->id)
                    ->whereNull('dokumen_approval_id')
                    ->first();
                
                if ($qrPosition) {
                    $qrCodeData = [
                        'text' => url('/api/dokumen/' . $dokumen->id),
                        'page' => $qrPosition->page,
                        'x' => $qrPosition->x,
                        'y' => $qrPosition->y,
                        'width' => $qrPosition->width,
                        'height' => $qrPosition->height,
                    ];
                }
            }

            // Write config to temp file
            $config = [
                'pdfPath' => $fullPdfPath,
                'signatures' => $signaturesData,
                'qrCode' => $qrCodeData
            ];
            
            $tempConfigFile = tempnam(sys_get_temp_dir(), 'pdf_sig_config_') . '.json';
            file_put_contents($tempConfigFile, json_encode($config));

            $nodeScriptPath = base_path('scripts/sign-pdf.cjs');
            
            // Execute node script
            $process = new \Symfony\Component\Process\Process(['node', $nodeScriptPath, $tempConfigFile]);
            // Increase timeout for large PDFs
            $process->setTimeout(60); 
            $process->run();

            // Cleanup config file
            if (file_exists($tempConfigFile)) {
                unlink($tempConfigFile);
            }

            if (!$process->isSuccessful()) {
                throw new \Symfony\Component\Process\Exception\ProcessFailedException($process);
            }

            return $process->getOutput();
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
            $fullPdfPath = Storage::disk('local')->path($pdfPath);

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
