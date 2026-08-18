<?php
$file = __DIR__ . '/app/Http/Controllers/DokumenApprovalController.php';
$content = file_get_contents($file);
$content = str_replace(
    '\Illuminate\Support\Facades\Storage::disk(\'public\')',
    '\Illuminate\Support\Facades\Storage::disk(\'local\')',
    $content
);
$content = str_replace(
    'Storage::disk(\'public\')',
    'Storage::disk(\'local\')',
    $content
);
file_put_contents($file, $content);
echo "Updated DokumenApprovalController.\n";

$file = __DIR__ . '/app/Http/Controllers/DokumenVersionController.php';
$content = file_get_contents($file);
$content = str_replace(
    'path = $file->storeAs(\'dokumen\', $filename, \'public\')',
    'path = $file->storeAs(\'dokumen\', $filename, \'local\')',
    $content
);
$content = str_replace(
    'Storage::disk(\'public\')',
    'Storage::disk(\'local\')',
    $content
);
file_put_contents($file, $content);
echo "Updated DokumenVersionController.\n";
