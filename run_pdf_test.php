<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$dokumen = App\Models\Dokumen::where('nomor_dokumen', '2026088114')->first();
if ($dokumen) {
    echo "Dokumen ID: {$dokumen->id}\n";
    $approvedSignatures = $dokumen->approvals()->whereNotNull('signature_path')->get();
    
    $pdfSignatureService = app(\App\Services\PdfSignatureService::class);
    $version = $dokumen->latestVersion;
    
    if ($version && $version->file_url) {
        $pdfContent = $pdfSignatureService->generateSignedPdfStream(
            $version->file_url,
            $approvedSignatures
        );
        
        file_put_contents(__DIR__ . '/test_signed_output.pdf', $pdfContent);
        echo "Done writing to test_signed_output.pdf. Size: " . strlen($pdfContent) . " bytes\n";
    }
} else {
    echo "Document 2026088114 not found.\n";
}
