<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\FastifyNotificationService;

echo "Testing FastifyNotificationService from Laravel...\n";

// Test getStats
$stats = FastifyNotificationService::getStats();
echo "Fastify Service Stats:\n";
print_r($stats);

// Test sendToUser
$result = FastifyNotificationService::sendToUser(
    14,
    'Uji Notifikasi Laravel -> Fastify',
    'Notifikasi push real-time berhasil dikirim via Fastify backend.',
    '/dokumen',
    'info'
);

echo "\nPush result: " . ($result ? "SUCCESS ✅" : "FAILED ❌") . "\n";
