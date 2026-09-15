<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\FastifyIntegrationService;
use App\Services\TransactionTemplatePdfService;
use Illuminate\Support\Facades\Http;

echo "===============================================================\n";
echo "INTEGRATION TEST: AMS <-> Fastify <-> External Inventory System\n";
echo "===============================================================\n\n";

$passed = 0;
$failed = 0;

function assertTest($description, $condition) {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$description}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$description}\n";
        $failed++;
    }
}

// 1. Test Fastify Health
echo "1. Checking Fastify Health Endpoint...\n";
try {
    $res = Http::get('http://localhost:5000/health');
    assertTest("Fastify /health returns 200 OK", $res->successful());
    assertTest("Fastify status is 'ok'", $res->json('status') === 'ok');
} catch (\Exception $e) {
    assertTest("Fastify is reachable (" . $e->getMessage() . ")", false);
}

// 2. Test External Inventory System JWT Enforcement
echo "\n2. Checking External Inventory System JWT Security (API_JWT_ENABLED=true)...\n";
try {
    // Tanpa token -> harus 401 Unauthorized
    $resNoAuth = Http::get('http://localhost:9000/api/purchase-orders/lookup');
    assertTest("External API returns 401 Unauthorized without Bearer token", $resNoAuth->status() === 401);

    // Login untuk ambil token
    $resLogin = Http::post('http://localhost:9000/api/auth/login', [
        'username' => 'integration-service',
        'password' => 'password'
    ]);
    assertTest("External API login succeeds (200)", $resLogin->successful());
    $token = $resLogin->json('token');
    assertTest("External API returns token", !empty($token));

    // Dengan token -> harus 200 OK
    $resWithAuth = Http::withToken($token)->get('http://localhost:9000/api/purchase-orders/lookup');
    assertTest("External API returns 200 OK with Bearer token", $resWithAuth->successful());
} catch (\Exception $e) {
    assertTest("External inventory system test (" . $e->getMessage() . ")", false);
}

// 3. Test Fastify Auto-Auth & Unified Lookup
echo "\n3. Testing Fastify Auto-Auth & Lookup Endpoint...\n";
try {
    $resLookup = Http::get('http://localhost:5000/api/integration/lookup?q=2026');
    assertTest("Fastify /api/integration/lookup returns 200", $resLookup->successful());
    $data = $resLookup->json('data', []);
    assertTest("Fastify returns unified PO & PR items", count($data) > 0);
    echo "     -> Found " . count($data) . " items in lookup\n";
    foreach (array_slice($data, 0, 3) as $it) {
        echo "        • [{$it['type']}] {$it['code']}: {$it['title']} ({$it['subtitle']})\n";
    }
} catch (\Exception $e) {
    assertTest("Fastify lookup failed: " . $e->getMessage(), false);
}

// 4. Test Fastify PO Transformation & PDF Service Compatibility
echo "\n4. Testing PO Data Transformation & TransactionTemplatePdfService Compatibility...\n";
try {
    $poData = FastifyIntegrationService::getDocument('PO-2026-0001');
    assertTest("Fastify retrieved PO-2026-0001", !empty($poData));
    assertTest("PO data has 'tipe' => 'PO'", ($poData['tipe'] ?? '') === 'PO');
    assertTest("PO data has 'nominal' > 0", ($poData['nominal'] ?? 0) > 0);
    assertTest("PO data has 'vendor'", !empty($poData['vendor']));
    assertTest("PO data has 'items' array", is_array($poData['items'] ?? null) && count($poData['items']) > 0);
    assertTest("PO data has 'totals' structure", isset($poData['totals']['subtotal']) && isset($poData['totals']['total']));

    // Generate PDF using TransactionTemplatePdfService
    $pdfBinary = TransactionTemplatePdfService::generate($poData, 'S');
    assertTest("TransactionTemplatePdfService successfully generates PO PDF binary", !empty($pdfBinary) && str_starts_with($pdfBinary, '%PDF'));
    echo "     -> PO PDF Generated successfully: " . strlen($pdfBinary) . " bytes\n";
} catch (\Exception $e) {
    assertTest("PO test failed: " . $e->getMessage(), false);
}

// 5. Test Fastify PR Transformation & PDF Service Compatibility
echo "\n5. Testing PR Data Transformation & TransactionTemplatePdfService Compatibility...\n";
try {
    $prData = FastifyIntegrationService::getDocument('PR-2026-0001');
    assertTest("Fastify retrieved PR-2026-0001", !empty($prData));
    assertTest("PR data has 'tipe' => 'PR'", ($prData['tipe'] ?? '') === 'PR');
    assertTest("PR data has 'nominal' > 0", ($prData['nominal'] ?? 0) > 0);
    assertTest("PR data has 'gudang'", !empty($prData['gudang']));
    assertTest("PR data has 'items' array", is_array($prData['items'] ?? null) && count($prData['items']) > 0);

    // Generate PDF using TransactionTemplatePdfService
    $pdfBinaryPR = TransactionTemplatePdfService::generate($prData, 'S');
    assertTest("TransactionTemplatePdfService successfully generates PR PDF binary", !empty($pdfBinaryPR) && str_starts_with($pdfBinaryPR, '%PDF'));
    echo "     -> PR PDF Generated successfully: " . strlen($pdfBinaryPR) . " bytes\n";
} catch (\Exception $e) {
    assertTest("PR test failed: " . $e->getMessage(), false);
}

echo "\n===============================================================\n";
echo "SUMMARY: Passed = {$passed}, Failed = {$failed}\n";
echo "===============================================================\n";

if ($failed === 0) {
    echo "🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!\n";
} else {
    exit(1);
}
