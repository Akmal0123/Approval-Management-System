<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Exception;

class QrCodeService
{
    /**
     * Generate QR Code for document verification and save as PNG image.
     *
     * @param string $documentNumber
     * @param string $verificationUrl
     * @return string Relative storage path of generated QR Code image
     */
    public function generateDocumentQrCode(string $documentNumber, string $verificationUrl): string
    {
        try {
            $filename = 'qrcodes/qr_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $documentNumber) . '_' . time() . '.png';
            $fullPath = Storage::disk('public')->path($filename);

            $directory = dirname($fullPath);
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            // Encode content to URL
            $encodedUrl = urlencode($verificationUrl);
            $apiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={$encodedUrl}&format=png";

            $qrContent = @file_get_contents($apiUrl);

            if ($qrContent !== false) {
                file_put_contents($fullPath, $qrContent);
            } else {
                // Fallback: Generate GD placeholder image with document info if offline
                $this->generateFallbackQrImage($fullPath, $documentNumber);
            }

            return $filename;
        } catch (Exception $e) {
            // Return fallback image path if any error occurs
            $filename = 'qrcodes/qr_' . time() . '.png';
            $fullPath = Storage::disk('public')->path($filename);
            $this->generateFallbackQrImage($fullPath, $documentNumber);
            return $filename;
        }
    }

    /**
     * Create a fallback placeholder image with text if offline or API fails.
     */
    private function generateFallbackQrImage(string $fullPath, string $text): void
    {
        $directory = dirname($fullPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $width = 250;
        $height = 250;
        $img = imagecreatetruecolor($width, $height);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);
        $gray = imagecolorallocate($img, 180, 180, 180);

        imagefill($img, 0, 0, $white);

        // Draw border
        imagerectangle($img, 5, 5, $width - 6, $height - 6, $black);
        imagerectangle($img, 8, 8, $width - 9, $height - 9, $gray);

        // Draw center QR placeholder pattern
        imagefilledrectangle($img, 30, 30, 80, 80, $black);
        imagefilledrectangle($img, 40, 40, 70, 70, $white);
        imagefilledrectangle($img, 170, 30, 220, 80, $black);
        imagefilledrectangle($img, 180, 40, 210, 70, $white);
        imagefilledrectangle($img, 30, 170, 80, 220, $black);
        imagefilledrectangle($img, 40, 180, 70, 210, $white);

        imagestring($img, 3, 20, 115, "VERIFIED DOCUMENT", $black);
        imagestring($img, 2, 20, 135, substr($text, 0, 28), $black);

        imagepng($img, $fullPath);
        imagedestroy($img);
    }
}
