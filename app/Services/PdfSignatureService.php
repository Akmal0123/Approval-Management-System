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
                    $signatureWidth = 25;
                    $signatureHeight = 25;
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
                        $y = $yPosition + ($row * 35); // 35mm vertical spacing

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
        $tempConfigFile = null;
        $tempOutputFile = null;

        try {
            // Cek file PDF utama di local, lalu fallback ke public
            $fullPdfPath = Storage::disk('local')->exists($pdfPath) 
                ? Storage::disk('local')->path($pdfPath) 
                : (Storage::disk('public')->exists($pdfPath) ? Storage::disk('public')->path($pdfPath) : null);

            if (!$fullPdfPath || !file_exists($fullPdfPath)) {
                throw new Exception("PDF file not found: {$pdfPath}");
            }

            // Ekstraksi Dokumen Secara Agresif
            // Memastikan $dokumen terisi penuh meskipun $approvals kosong pada awal masa review
            if (!$dokumen) {
                if ($approvals && $approvals->count() > 0) {
                    $dokumen = $approvals->first()->dokumen()->first() ?? \App\Models\Dokumen::find($approvals->first()->dokumen_id);
                } else {
                    $dokumen = \App\Models\Dokumen::whereHas('versions', function ($q) use ($pdfPath) {
                        $q->where('file_url', $pdfPath);
                    })->first();
                }
            }

            $signaturesData = [];

            if ($approvals && $approvals->count() > 0) {
                $pageCount = 1;
                try {
                    $pdf = new Fpdi();
                    $pageCount = $pdf->setSourceFile($fullPdfPath);
                } catch (\Exception $e) {
                    $pageCount = 999;
                }

                $unpositionedIndex = 0;
                $yPosition = 220;
                $xPosition = 20;
                $signaturesPerRow = 3;
                $spacing = 60;

                foreach ($approvals as $approval) {
                    if ($approval->signature_method !== 'qr' && !$approval->signature_path && (!$approval->user || !$approval->user->signature)) {
                        continue;
                    }

                    $fullSignaturePath = null;
                    
                    $pathsToCheck = array_filter([
                        $approval->signature_path,
                        $approval->user->signature ?? null
                    ]);

                    foreach ($pathsToCheck as $relPath) {
                        if (Storage::disk('public')->exists($relPath)) {
                            $fullSignaturePath = Storage::disk('public')->path($relPath);
                            break;
                        } elseif (Storage::disk('local')->exists($relPath)) {
                            $fullSignaturePath = Storage::disk('local')->path($relPath);
                            break;
                        } elseif (file_exists(storage_path('app/private/' . $relPath))) {
                            $fullSignaturePath = storage_path('app/private/' . $relPath);
                            break;
                        } elseif (file_exists(public_path('storage/' . $relPath))) {
                            $fullSignaturePath = public_path('storage/' . $relPath);
                            break;
                        }
                    }

                    $pos = $approval->signaturePosition;
                    $jabatan = $approval->approver_jabatan ?? $approval->masterflowStep?->jabatan?->name ?? 'Approver';
                    $showSignature = $approval->show_signature ?? true;
                    $showDate = $approval->show_date ?? true;
                    $showJabatan = $approval->show_jabatan ?? true;

                    if ($pos) {
                        $page = $pos->page;
                        $x = $pos->x;
                        $y = $pos->y;
                        $width = $pos->width;
                        $height = $pos->height;
                    } else {
                        $row = floor($unpositionedIndex / $signaturesPerRow);
                        $col = $unpositionedIndex % $signaturesPerRow;

                        $page = $pageCount;
                        $x = $xPosition + ($col * $spacing);
                        $y = $yPosition + ($row * 35);
                        $width = 35;
                        $height = 15;
                        
                        $unpositionedIndex++;
                    }

                    if ($approval->signature_method === 'qr' || $width !== $height) {
                        $squareSize = min($width, $height);
                        $width = $squareSize;
                        $height = $squareSize;
                    }

                    $sigDetails = [
                        'page' => (int)$page,
                        'x' => (float)$x,
                        'y' => (float)$y,
                        'width' => (float)$width,
                        'height' => (float)$height,
                        'add_text' => true,
                        'show_signature' => $showSignature,
                        'show_date' => $showDate,
                        'show_jabatan' => $showJabatan,
                        'text' => $approval->masterflowStep?->step_name ?? 'Disetujui',
                        'jabatan' => $jabatan,
                        'date' => $approval->tgl_approve?->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i'),
                        'name' => $approval->user?->name ?? null,
                        'signature_type' => $approval->signature_type ?? 'signature',
                    ];

                    if ($approval->signature_method === 'qr') {
                        $token = $approval->verification_token;
                        if (!$token) {
                            $token = \Illuminate\Support\Str::uuid()->toString();
                            try {
                                $approval->update(['verification_token' => $token]);
                            } catch (\Throwable $th) {}
                        }
                        $sigDetails['qrText'] = url('/verify/signature/' . $token);
                    } else {
                        $sigDetails['imagePath'] = $fullSignaturePath;
                    }

                    $signaturesData[] = $sigDetails;
                }
            }

            // Pengumpulan QR Code Dokumen dengan Fallback & Auto-Generate
            $qrCodesData = [];
            $targetDokumenId = $dokumen->id ?? ($approvals->first()->dokumen_id ?? null);
            $verificationUrl = url('/verify/' . ($dokumen->verification_hash ?? $targetDokumenId));

            if ($targetDokumenId) {
                $qrPositions = \App\Models\DocumentSignaturePosition::where('dokumen_id', $targetDokumenId)
                    ->whereNull('dokumen_approval_id')
                    ->orderBy('page')
                    ->get();

                if ($qrPositions->count() > 0) {
                    foreach ($qrPositions as $qrPosition) {
                        $qrCodesData[] = [
                            'text' => $verificationUrl,
                            'page' => (int)$qrPosition->page,
                            'x' => (float)$qrPosition->x,
                            'y' => (float)$qrPosition->y,
                            'width' => (float)$qrPosition->width,
                            'height' => (float)$qrPosition->height,
                        ];
                    }
                } else {
                    // Fallback mutlak di pojok kanan atas jika database kosong
                    $qrCodesData[] = [
                        'text' => $verificationUrl,
                        'page' => 1,
                        'x' => 170,
                        'y' => 15,
                        'width' => 25,
                        'height' => 25,
                    ];
                }
            }

            // Tambahkan baris log ini untuk debugging di storage/logs/laravel.log
            \Illuminate\Support\Facades\Log::info('QR Codes Data Sent to Node:', $qrCodesData);

            $tempConfigFile = tempnam(sys_get_temp_dir(), 'pdf_sig_config_') . '.json';
            $tempOutputFile = tempnam(sys_get_temp_dir(), 'pdf_sig_out_') . '.pdf';

            $config = [
                'pdfPath' => $fullPdfPath,
                'outPath' => $tempOutputFile,
                'signatures' => $signaturesData,
                'qrCode' => $qrCodesData[0] ?? null,
                'qrCodes' => $qrCodesData
            ];

            file_put_contents($tempConfigFile, json_encode($config));

            $nodeScriptPath = base_path('scripts/sign-pdf.cjs');
            $process = new \Symfony\Component\Process\Process(['node', $nodeScriptPath, $tempConfigFile]);
            $process->setTimeout(60);
            $process->run();

            if (!$process->isSuccessful()) {
                throw new \Symfony\Component\Process\Exception\ProcessFailedException($process);
            }

            if (!file_exists($tempOutputFile) || filesize($tempOutputFile) === 0) {
                throw new Exception("Signed PDF output was not generated");
            }

            return file_get_contents($tempOutputFile);
        } catch (Exception $e) {
            throw new Exception("Failed to generate signed PDF stream: " . $e->getMessage());
        } finally {
            if ($tempConfigFile && file_exists($tempConfigFile)) @unlink($tempConfigFile);
            if ($tempOutputFile && file_exists($tempOutputFile)) @unlink($tempOutputFile);
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
            return [
                'bottom_right' => ['x' => 140, 'y' => 250, 'label' => 'Bottom Right'],
                'bottom_left' => ['x' => 20, 'y' => 250, 'label' => 'Bottom Left'],
                'bottom_center' => ['x' => 85, 'y' => 250, 'label' => 'Bottom Center'],
            ];
        }
    }
}
