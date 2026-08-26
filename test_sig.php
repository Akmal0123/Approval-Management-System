<?php

$dokumen = App\Models\Dokumen::latest()->first();

if ($dokumen) {
    echo "Dokumen ID: {$dokumen->id}\n";
    $approvedSignatures = App\Models\DokumenApproval::where('dokumen_id', $dokumen->id)
        ->get();

    foreach ($approvedSignatures as $approval) {
        $pos = $approval->signaturePosition;
        echo "Approval ID: {$approval->id}, Has Position: " . ($pos ? 'Yes' : 'No') . "\n";
        if ($pos) {
            echo "  Page: {$pos->page}, X: {$pos->x}, Y: {$pos->y}, W: {$pos->width}, H: {$pos->height}\n";
        }
    }
} else {
    echo "Document not found.\n";
}
