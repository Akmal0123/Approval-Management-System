<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$approvals = App\Models\DokumenApproval::whereNotNull('signature_path')->get(); 
foreach($approvals as $app){ 
    echo "Doc ID: {$app->dokumen_id}, App ID: {$app->id}, Path: {$app->signature_path} - " . (file_exists(Storage::disk('public')->path($app->signature_path)) ? 'EXISTS' : 'MISSING') . PHP_EOL; 
}
