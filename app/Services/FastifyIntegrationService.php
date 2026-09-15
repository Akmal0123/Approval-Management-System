<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FastifyIntegrationService
{
    /**
     * Dapatkan base URL dari Fastify Integration Service.
     */
    protected static function getBaseUrl(): string
    {
        return rtrim(config('services.fastify.url', 'http://localhost:5000'), '/');
    }

    /**
     * Cek apakah Fastify Integration Service sedang aktif.
     */
    public static function isAvailable(): bool
    {
        try {
            $response = Http::timeout(2)->get(self::getBaseUrl() . '/health');
            return $response->successful();
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Lookup daftar dokumen (PO & PR) dari External Inventory System via Fastify.
     */
    public static function lookup(string $query = ''): array
    {
        try {
            $url = self::getBaseUrl() . '/api/integration/lookup';
            $response = Http::timeout(5)->get($url, ['q' => $query]);

            if ($response->successful()) {
                return $response->json('data', []);
            }
        } catch (\Throwable $e) {
            Log::warning('FastifyIntegrationService::lookup failed: ' . $e->getMessage());
        }

        return [];
    }

    /**
     * Ambil data dokumen tunggal (PO / PR) dari External Inventory System via Fastify,
     * sudah ditransformasikan agar siap digunakan oleh AMS dan TransactionTemplatePdfService.
     */
    public static function getDocument(string $keyword): ?array
    {
        try {
            $url = self::getBaseUrl() . '/api/integration/document/' . rawurlencode(trim($keyword));
            $response = Http::timeout(8)->get($url);

            if ($response->successful() && $response->json('success')) {
                return $response->json('data');
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::getDocument('{$keyword}') failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Ambil stream biner PDF Purchase Order asli dari External Inventory System via Fastify.
     */
    public static function getPurchaseOrderPdf(string $idOrNumber): ?string
    {
        try {
            $url = self::getBaseUrl() . '/api/integration/purchase-orders/' . rawurlencode(trim($idOrNumber)) . '/pdf';
            $response = Http::timeout(10)->get($url);

            if ($response->successful()) {
                return $response->body();
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::getPurchaseOrderPdf('{$idOrNumber}') failed: " . $e->getMessage());
        }

        return null;
    }
}
