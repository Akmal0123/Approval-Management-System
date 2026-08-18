<?php
/**
 * Script untuk menghasilkan logo putih transparan dari logo TS asli.
 * Jalankan dengan: php generate-white-logo.php
 */

$srcPath        = __DIR__ . '/public/images/logo-tiga-serangkai.png';
$whitePath      = __DIR__ . '/public/images/logo-tiga-serangkai-white.png';
$transparentPath = __DIR__ . '/public/images/logo-tiga-serangkai-transparent.png';

if (!file_exists($srcPath)) {
    echo "ERROR: Logo asli tidak ditemukan di: $srcPath\n";
    exit(1);
}

if (!function_exists('imagecreatefrompng')) {
    echo "ERROR: PHP GD extension tidak aktif.\n";
    exit(1);
}

echo "Membaca logo asli...\n";
$img = imagecreatefrompng($srcPath);
if (!$img) {
    echo "ERROR: Gagal membaca gambar PNG.\n";
    exit(1);
}

$w = imagesx($img);
$h = imagesy($img);
echo "Ukuran gambar: {$w}x{$h}px\n";

// --- Buat logo PUTIH transparan ---
$whiteImg = imagecreatetruecolor($w, $h);
imagealphablending($whiteImg, false);
imagesavealpha($whiteImg, true);
$transparent = imagecolorallocatealpha($whiteImg, 0, 0, 0, 127);
imagefill($whiteImg, 0, 0, $transparent);

// --- Buat logo asli tanpa background putih ---
$transImg = imagecreatetruecolor($w, $h);
imagealphablending($transImg, false);
imagesavealpha($transImg, true);
imagefill($transImg, 0, 0, $transparent);

$pixelChanged = 0;
for ($x = 0; $x < $w; $x++) {
    for ($y = 0; $y < $h; $y++) {
        $rgba = imagecolorat($img, $x, $y);
        $r    = ($rgba >> 16) & 0xFF;
        $g    = ($rgba >> 8) & 0xFF;
        $b    = $rgba & 0xFF;
        $a    = ($rgba >> 24) & 0x7F; // 0=opaque, 127=transparent

        // Jika sudah transparan, skip
        if ($a > 100) {
            continue;
        }

        // Jika pixel sangat terang (putih/near-white background) → jadikan transparan
        if ($r > 230 && $g > 230 && $b > 230) {
            // Pixel background putih → transparan di kedua gambar
            imagesetpixel($transImg, $x, $y, $transparent);
            imagesetpixel($whiteImg, $x, $y, $transparent);
        } else {
            // Pixel logo (teal/berwarna) → simpan asli di transImg, jadikan putih di whiteImg
            imagesetpixel($transImg, $x, $y, $rgba);
            $pureWhite = imagecolorallocatealpha($whiteImg, 255, 255, 255, 0);
            imagesetpixel($whiteImg, $x, $y, $pureWhite);
            $pixelChanged++;
        }
    }
}

echo "Pixel logo yang dikonversi ke putih: $pixelChanged\n";

// Simpan hasilnya
imagepng($whiteImg, $whitePath, 9);
imagepng($transImg, $transparentPath, 9);
imagedestroy($img);
imagedestroy($whiteImg);
imagedestroy($transImg);

echo "Berhasil!\n";
echo "  → Logo putih: $whitePath (" . round(filesize($whitePath)/1024, 1) . " KB)\n";
echo "  → Logo transparan: $transparentPath (" . round(filesize($transparentPath)/1024, 1) . " KB)\n";
