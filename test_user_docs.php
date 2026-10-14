<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Dokumen;
use App\Http\Controllers\DokumenController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

$user = User::find(2);
Auth::login($user);

// Initialize context service if needed
$contextService = app(\App\Services\ContextService::class);
echo "User ID: " . Auth::id() . "\n";
echo "Current Company ID: " . $contextService->getCurrentCompanyId() . "\n";
echo "Current Aplikasi ID: " . $contextService->getCurrentAplikasiId() . "\n";
echo "Is SuperAdmin: " . ($contextService->isSuperAdmin() ? 'yes' : 'no') . "\n";

$request = new Request(['my_documents' => true]);
$controller = app(DokumenController::class);
$response = $controller->apiIndex($request);
$data = $response->getData()->data;

echo "Total documents returned: " . count($data) . "\n";
foreach ($data as $doc) {
    echo "ID: {$doc->id} | {$doc->judul_dokumen} | Status: {$doc->status} | App ID: {$doc->aplikasi_id} | User ID: {$doc->user_id}\n";
}
