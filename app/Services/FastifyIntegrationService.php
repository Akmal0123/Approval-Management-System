<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FastifyIntegrationService
{
    /**
     * Dapatkan base URL dari Microservice Lookup.
     */
    protected static function getBaseUrl(): string
    {
        return rtrim(config('services.lookup.url', config('services.fastify.url', 'http://localhost:5000')), '/');
    }

    /**
     * Header autentikasi JWT A (AMS -> Fastify) dan tracing request_id.
     */
    protected static function getHeaders(?array $scopes = null): array
    {
        $token = AmsJwtService::generateToken($scopes);
        return [
            'Authorization' => "Bearer {$token}",
            'x-request-id' => 'ams_' . bin2hex(random_bytes(6)),
            'Accept' => 'application/json',
        ];
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
     * Lookup daftar dokumen (PO & PR) dari External Inventory System via Fastify (JWT Protected).
     */
    public static function lookup(string $query = ''): array
    {
        try {
            $url = self::getBaseUrl() . '/api/v1/integration/lookup';
            $response = Http::timeout(5)
                ->withHeaders(self::getHeaders())
                ->get($url, ['q' => $query]);

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
     * sudah ditransformasikan agar siap digunakan oleh AMS.
     */
    public static function getDocument(string $keyword): ?array
    {
        $clean = trim($keyword);
        $upper = strtoupper($clean);

        try {
            // Prioritaskan endpoint spesifik jika format jelas
            if (str_starts_with($upper, 'PO')) {
                $url = self::getBaseUrl() . '/api/v1/integration/purchase-orders/' . rawurlencode($clean);
                $res = Http::timeout(8)
                    ->withHeaders(self::getHeaders(['integration:purchase-order:read']))
                    ->get($url);
                if ($res->successful() && $res->json('success')) {
                    return $res->json('data');
                }
            } elseif (str_starts_with($upper, 'PR')) {
                $url = self::getBaseUrl() . '/api/v1/integration/purchase-requests/' . rawurlencode($clean);
                $res = Http::timeout(8)
                    ->withHeaders(self::getHeaders(['integration:purchase-request:read']))
                    ->get($url);
                if ($res->successful() && $res->json('success')) {
                    return $res->json('data');
                }
            }

            // Fallback ke unified document endpoint
            $url = self::getBaseUrl() . '/api/v1/integration/document/' . rawurlencode($clean);
            $response = Http::timeout(8)
                ->withHeaders(self::getHeaders())
                ->get($url);

            if ($response->successful() && $response->json('success')) {
                return $response->json('data');
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::getDocument('{$keyword}') failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Ambil Purchase Order spesifik via API v1.
     */
    public static function getPurchaseOrder(string $numberOrId): ?array
    {
        try {
            $url = self::getBaseUrl() . '/api/v1/integration/purchase-orders/' . rawurlencode(trim($numberOrId));
            $response = Http::timeout(8)
                ->withHeaders(self::getHeaders(['integration:purchase-order:read']))
                ->get($url);

            if ($response->successful() && $response->json('success')) {
                return $response->json('data');
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::getPurchaseOrder('{$numberOrId}') failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Ambil Purchase Request spesifik via API v1.
     */
    public static function getPurchaseRequest(string $numberOrId): ?array
    {
        try {
            $url = self::getBaseUrl() . '/api/v1/integration/purchase-requests/' . rawurlencode(trim($numberOrId));
            $response = Http::timeout(8)
                ->withHeaders(self::getHeaders(['integration:purchase-request:read']))
                ->get($url);

            if ($response->successful() && $response->json('success')) {
                return $response->json('data');
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::getPurchaseRequest('{$numberOrId}') failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Ambil stream biner PDF Purchase Order asli dari External Inventory System via Fastify.
     */
    public static function getPurchaseOrderPdf(string $idOrNumber): ?string
    {
        try {
            $url = self::getBaseUrl() . '/api/v1/integration/purchase-orders/' . rawurlencode(trim($idOrNumber)) . '/pdf';
            $response = Http::timeout(10)
                ->withHeaders(self::getHeaders(['integration:purchase-order:read']))
                ->get($url);

            if ($response->successful()) {
                return $response->body();
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::getPurchaseOrderPdf('{$idOrNumber}') failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Ambil stream biner PDF Purchase Request dari External Inventory System via Fastify.
     */
    public static function getPurchaseRequestPdf(string $idOrNumber): ?string
    {
        try {
            $url = self::getBaseUrl() . '/api/v1/integration/purchase-requests/' . rawurlencode(trim($idOrNumber)) . '/pdf';
            $response = Http::timeout(10)
                ->withHeaders(self::getHeaders(['integration:purchase-request:read']))
                ->get($url);

            if ($response->successful()) {
                return $response->body();
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::getPurchaseRequestPdf('{$idOrNumber}') failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Ambil file PDF dokumen (PO atau PR) langsung dari Fastify Microservice.
     */
    public static function getDocumentPdf(string $keyword): ?string
    {
        try {
            $url = self::getBaseUrl() . '/api/v1/integration/document/' . rawurlencode(trim($keyword)) . '/pdf';
            $response = Http::timeout(10)
                ->withHeaders(self::getHeaders())
                ->get($url);

            if ($response->successful()) {
                return $response->body();
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::getDocumentPdf('{$keyword}') failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Kirim data JSON transaksi ke Fastify Microservice untuk diubah menjadi file PDF jadi.
     */
    public static function generatePdf(array $txData): ?string
    {
        try {
            $url = self::getBaseUrl() . '/api/v1/integration/pdf/generate';
            $response = Http::timeout(10)
                ->withHeaders(self::getHeaders())
                ->post($url, ['data' => $txData]);

            if ($response->successful()) {
                return $response->body();
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::generatePdf failed: " . $e->getMessage());
        }

        return null;
    }
}
