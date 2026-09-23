<?php

/**
 * Isolated Integration Service Architecture — Comprehensive Test Suite
 * Tests AMS <-> Fastify Integration Service <-> External Inventory System (EIS)
 *
 * Verifies:
 * - JWT A security boundary (AMS -> Fastify)
 * - JWT B security boundary (Fastify -> EIS)
 * - Scope authorization (403 when scope mismatch)
 * - Token invalidation & expiration (401)
 * - End-to-end data transformation & PDF generation
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\AmsJwtService;
use App\Services\FastifyIntegrationService;
use App\Services\TransactionTemplatePdfService;
use Illuminate\Support\Facades\Http;

$fastifyUrl = rtrim(config('services.fastify.url', 'http://localhost:5000'), '/');
$eisUrl = 'http://localhost:9000/api/v1';

$jwtASecret = config('services.fastify.jwt_secret', 'ams-fastify-secret-key-super-secure-token-a');
$jwtBSecret = 'fastify-eis-secret-key-super-secure-token-b';

echo "=======================================================================\n";
echo "ISOLATED INTEGRATION SERVICE ARCHITECTURE TEST SUITE\n";
echo "AMS (Laravel 12) <-> Fastify (TypeScript) <-> EIS (Laravel 13)\n";
echo "=======================================================================\n\n";

$passed = 0;
$failed = 0;

function assertTest(string $description, bool $condition, ?string $detail = null) {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$description}\n";
        if ($detail) echo "         -> {$detail}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$description}\n";
        if ($detail) echo "         -> ERROR: {$detail}\n";
        $failed++;
    }
}

function makeJwt(string $secret, array $payload, string $alg = 'HS256'): string {
    $header = ['typ' => 'JWT', 'alg' => $alg];
    $b64Header = rtrim(strtr(base64_encode(json_encode($header)), '+/', '-_'), '=');
    $b64Payload = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $sig = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", $secret, true);
    $b64Sig = rtrim(strtr(base64_encode($sig), '+/', '-_'), '=');
    return "{$b64Header}.{$b64Payload}.{$b64Sig}";
}

// -------------------------------------------------------------------------
// 1. FASTIFY HEALTH CHECK
// -------------------------------------------------------------------------
echo "[SECTION 1] Checking Fastify Service Health...\n";
try {
    $healthRes = Http::timeout(3)->get("{$fastifyUrl}/health");
    assertTest("Fastify /health returns 200 OK", $healthRes->successful(), "HTTP " . $healthRes->status());
    assertTest("Fastify service status is 'ok'", $healthRes->json('status') === 'ok', "version: " . $healthRes->json('version'));
} catch (\Throwable $e) {
    assertTest("Fastify is reachable", false, $e->getMessage());
}

// -------------------------------------------------------------------------
// 2. EIS DIRECT SECURITY (JWT B Boundary: Fastify -> EIS)
// -------------------------------------------------------------------------
echo "\n[SECTION 2] Checking EIS Direct Security (JWT B Boundary)...\n";
try {
    // 2.1 Missing Token -> 401
    $resNoAuth = Http::timeout(3)->get("{$eisUrl}/purchase-orders/lookup");
    assertTest("EIS returns 401 Unauthorized without Bearer token", $resNoAuth->status() === 401, "HTTP " . $resNoAuth->status());

    // 2.2 Forged Token -> 401
    $forgedJwtB = makeJwt('wrong-secret-key-12345', [
        'iss' => 'integration-service',
        'aud' => 'eis',
        'sub' => 'integration-service',
        'scope' => ['purchase-order:read'],
        'exp' => time() + 300,
    ]);
    $resForged = Http::timeout(3)->withToken($forgedJwtB)->get("{$eisUrl}/purchase-orders/lookup");
    assertTest("EIS returns 401 Unauthorized for forged JWT B", $resForged->status() === 401, "HTTP " . $resForged->status());

    // 2.3 Wrong Scope -> 403
    $wrongScopeJwtB = makeJwt($jwtBSecret, [
        'iss' => 'integration-service',
        'aud' => 'eis',
        'sub' => 'integration-service',
        'scope' => ['some:other:scope'],
        'exp' => time() + 300,
    ]);
    $resWrongScope = Http::timeout(3)->withToken($wrongScopeJwtB)->get("{$eisUrl}/purchase-orders/lookup");
    assertTest("EIS returns 403 Forbidden when required scope is missing", $resWrongScope->status() === 403, "HTTP " . $resWrongScope->status());

    // 2.4 Valid JWT B -> 200 OK
    $validJwtB = makeJwt($jwtBSecret, [
        'iss' => 'integration-service',
        'aud' => 'eis',
        'sub' => 'integration-service',
        'scope' => ['purchase-order:read', 'purchase-request:read'],
        'exp' => time() + 300,
    ]);
    $resValidB = Http::timeout(3)->withToken($validJwtB)->get("{$eisUrl}/purchase-orders/lookup");
    assertTest("EIS returns 200 OK with valid JWT B and correct scope", $resValidB->successful(), "Found " . count($resValidB->json('data', [])) . " items");
} catch (\Throwable $e) {
    assertTest("EIS direct security tests", false, $e->getMessage());
}

// -------------------------------------------------------------------------
// 3. FASTIFY SECURITY (JWT A Boundary: AMS -> Fastify)
// -------------------------------------------------------------------------
echo "\n[SECTION 3] Checking Fastify Security (JWT A Boundary)...\n";
try {
    // 3.1 Missing Token -> 401
    $resNoAuthFastify = Http::timeout(3)->get("{$fastifyUrl}/api/v1/integration/purchase-orders/PO-2026-0001");
    assertTest("Fastify returns 401 Unauthorized without Bearer token", $resNoAuthFastify->status() === 401, "HTTP " . $resNoAuthFastify->status());

    // 3.2 Forged Token -> 401
    $forgedJwtA = makeJwt('wrong-secret-key-12345', [
        'iss' => 'ams',
        'aud' => 'integration-service',
        'sub' => 'ams-service',
        'scope' => ['integration:purchase-order:read'],
        'exp' => time() + 300,
    ]);
    $resForgedFastify = Http::timeout(3)->withToken($forgedJwtA)->get("{$fastifyUrl}/api/v1/integration/purchase-orders/PO-2026-0001");
    assertTest("Fastify returns 401 Unauthorized for forged JWT A", $resForgedFastify->status() === 401, "HTTP " . $resForgedFastify->status());

    // 3.3 Expired Token -> 401
    $expiredJwtA = makeJwt($jwtASecret, [
        'iss' => 'ams',
        'aud' => 'integration-service',
        'sub' => 'ams-service',
        'scope' => ['integration:purchase-order:read'],
        'exp' => time() - 100, // Expired
    ]);
    $resExpired = Http::timeout(3)->withToken($expiredJwtA)->get("{$fastifyUrl}/api/v1/integration/purchase-orders/PO-2026-0001");
    assertTest("Fastify returns 401 Unauthorized for expired JWT A", $resExpired->status() === 401, "code: " . ($resExpired->json('error.code') ?? ''));

    // 3.4 Wrong Scope -> 403
    $wrongScopeJwtA = makeJwt($jwtASecret, [
        'iss' => 'ams',
        'aud' => 'integration-service',
        'sub' => 'ams-service',
        'scope' => ['integration:some-unrelated-scope:read'],
        'exp' => time() + 300,
    ]);
    $resWrongScopeFastify = Http::timeout(3)->withToken($wrongScopeJwtA)->get("{$fastifyUrl}/api/v1/integration/purchase-orders/PO-2026-0001");
    assertTest("Fastify returns 403 Forbidden when required scope is missing", $resWrongScopeFastify->status() === 403, "code: " . ($resWrongScopeFastify->json('error.code') ?? ''));

    // 3.5 Valid JWT A -> 200 OK
    $validJwtA = AmsJwtService::generateToken(['integration:purchase-order:read']);
    $resValidFastify = Http::timeout(5)->withToken($validJwtA)->get("{$fastifyUrl}/api/v1/integration/purchase-orders/PO-2026-0001");
    assertTest("Fastify returns 200 OK with valid JWT A and correct scope", $resValidFastify->successful(), "HTTP " . $resValidFastify->status());
} catch (\Throwable $e) {
    assertTest("Fastify security tests", false, $e->getMessage());
}

// -------------------------------------------------------------------------
// 4. END-TO-END FLOW: UNIFIED LOOKUP (AUTOCOMPLETE)
// -------------------------------------------------------------------------
echo "\n[SECTION 4] Testing End-to-End Fastify Unified Lookup...\n";
try {
    $lookupResults = FastifyIntegrationService::lookup('2026');
    assertTest("FastifyIntegrationService::lookup returns items", !empty($lookupResults) && count($lookupResults) > 0, "Count: " . count($lookupResults));

    $hasPo = false;
    $hasPr = false;
    foreach ($lookupResults as $item) {
        if (($item['type'] ?? '') === 'PO') $hasPo = true;
        if (($item['type'] ?? '') === 'PR') $hasPr = true;
    }
    assertTest("Lookup results contain unified PO items", $hasPo);
    assertTest("Lookup results contain unified PR items", $hasPr);
} catch (\Throwable $e) {
    assertTest("Unified lookup test", false, $e->getMessage());
}

// -------------------------------------------------------------------------
// 5. END-TO-END FLOW: PURCHASE ORDER TRANSFORMATION & PDF
// -------------------------------------------------------------------------
echo "\n[SECTION 5] Testing PO Transformation & PDF Service Compatibility...\n";
try {
    $poData = FastifyIntegrationService::getDocument('PO-2026-0001');
    assertTest("Fastify successfully retrieved PO-2026-0001", !empty($poData));
    assertTest("PO data has 'document_number' => 'PO-2026-0001'", ($poData['document_number'] ?? '') === 'PO-2026-0001');
    assertTest("PO data has 'tipe' => 'PO'", ($poData['tipe'] ?? '') === 'PO');
    assertTest("PO data has 'nominal' > 0", ($poData['nominal'] ?? 0) > 0, "Rp " . number_format($poData['nominal'] ?? 0));
    assertTest("PO data has 'vendor'", !empty($poData['vendor']), $poData['vendor'] ?? '');
    assertTest("PO data has 'items' array", is_array($poData['items'] ?? null) && count($poData['items']) > 0, count($poData['items']) . " item(s)");
    assertTest("PO data has 'totals' structure", isset($poData['totals']['subtotal']) && isset($poData['totals']['total']));

    // Generate PDF using TransactionTemplatePdfService in AMS
    $pdfBinary = TransactionTemplatePdfService::generate($poData, 'S');
    assertTest("TransactionTemplatePdfService generates PO PDF binary", !empty($pdfBinary) && str_starts_with($pdfBinary, '%PDF'), strlen($pdfBinary) . " bytes");
} catch (\Throwable $e) {
    assertTest("PO transformation test", false, $e->getMessage());
}

// -------------------------------------------------------------------------
// 6. END-TO-END FLOW: PURCHASE REQUEST TRANSFORMATION & PDF
// -------------------------------------------------------------------------
echo "\n[SECTION 6] Testing PR Transformation & PDF Service Compatibility...\n";
try {
    $prData = FastifyIntegrationService::getDocument('PR-2026-0001');
    assertTest("Fastify successfully retrieved PR-2026-0001", !empty($prData));
    assertTest("PR data has 'document_number' => 'PR-2026-0001'", ($prData['document_number'] ?? '') === 'PR-2026-0001');
    assertTest("PR data has 'tipe' => 'PR'", ($prData['tipe'] ?? '') === 'PR');
    assertTest("PR data has 'nominal' > 0", ($prData['nominal'] ?? 0) > 0, "Rp " . number_format($prData['nominal'] ?? 0));
    assertTest("PR data has 'gudang'", !empty($prData['gudang']), $prData['gudang'] ?? '');
    assertTest("PR data has 'items' array", is_array($prData['items'] ?? null) && count($prData['items']) > 0, count($prData['items']) . " item(s)");

    // Generate PDF using TransactionTemplatePdfService in AMS
    $pdfBinaryPR = TransactionTemplatePdfService::generate($prData, 'S');
    assertTest("TransactionTemplatePdfService generates PR PDF binary", !empty($pdfBinaryPR) && str_starts_with($pdfBinaryPR, '%PDF'), strlen($pdfBinaryPR) . " bytes");
} catch (\Throwable $e) {
    assertTest("PR transformation test", false, $e->getMessage());
}

// -------------------------------------------------------------------------
// 7. ERROR HANDLING & 404 RESILIENCE
// -------------------------------------------------------------------------
echo "\n[SECTION 7] Testing 404 Error Contract & Resilience...\n";
try {
    $nonExistent = FastifyIntegrationService::getDocument('PO-9999-NOTFOUND');
    assertTest("Non-existent document returns null safely without exception", $nonExistent === null);

    $raw404 = Http::timeout(3)->withToken(AmsJwtService::generateToken())->get("{$fastifyUrl}/api/v1/integration/purchase-orders/PO-9999-NOTFOUND");
    assertTest("Fastify returns 404 for non-existent document", $raw404->status() === 404, "HTTP " . $raw404->status());
    assertTest("Fastify 404 response follows standard error contract", $raw404->json('success') === false && !empty($raw404->json('error.code')), json_encode($raw404->json()));
} catch (\Throwable $e) {
    assertTest("404 error contract test", false, $e->getMessage());
}

echo "\n=======================================================================\n";
echo "SUMMARY: Passed = {$passed}, Failed = {$failed}\n";
echo "=======================================================================\n";

if ($failed === 0) {
    echo "🎉 ALL ISOLATED ARCHITECTURE TESTS PASSED WITH 100% SUCCESS!\n";
    exit(0);
} else {
    echo "❌ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.\n";
    exit(1);
}
