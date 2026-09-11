<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\DummyTransactionService;
use App\Services\TransactionTemplatePdfService;

$outputDir = storage_path('app/dummy_templates');
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0777, true);
}

echo "Generating realistic & responsive PDF templates from DummyTransactionService...\n";

$allTransactions = DummyTransactionService::all();
$count = 0;

foreach ($allTransactions as $key => $tx) {
    $targetFile = $outputDir . '/' . $key . '.pdf';
    echo "  -> Generating [{$tx['tipe']}] {$key}: {$targetFile}\n";
    TransactionTemplatePdfService::generate($tx, 'F', $targetFile);
    $count++;
}

echo "Successfully generated {$count} PDF templates in: {$outputDir}\n";
