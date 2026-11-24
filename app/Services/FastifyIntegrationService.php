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
     * Ambil daftar dokumen eksternal (list) dari Microservice Lookup menggunakan Lookup Path API dinamis.
     * Membersihkan parameter placeholder seperti :number atau {id} agar memanggil list endpoint.
     */
    public static function fetchDocumentsList(string $lookupPath, array $params = []): array
    {
        $cleanPath = trim($lookupPath);
        if (empty($cleanPath)) {
            return [];
        }

        // Hapus parameter placeholder jika ada (:number, :id, {number}, {id}, dll)
        $cleanPath = preg_replace('/(:number|:id|:keyword|\{number\}|\{id\}|\{keyword\})/i', '', $cleanPath);
        $cleanPath = trim($cleanPath, '/');

        try {
            $url = self::getBaseUrl() . '/' . $cleanPath;
            $scopes = [
                'lookup:read',
                'integration:purchase-order:read',
                'integration:purchase-request:read',
            ];

            $response = Http::timeout(10)
                ->withHeaders(self::getHeaders($scopes))
                ->get($url, $params);

            if ($response->successful()) {
                $json = $response->json();
                if (isset($json['data']) && is_array($json['data'])) {
                    return $json['data'];
                }
                if (is_array($json)) {
                    return $json;
                }
            } else {
                Log::warning("FastifyIntegrationService::fetchDocumentsList failed [{$url}]: HTTP " . $response->status());
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::fetchDocumentsList [{$cleanPath}] failed: " . $e->getMessage());
        }

        return [];
    }

    /**
     * Bangun full URL berdasarkan konfigurasi path dinamis dari Transaksi Management.
     * Mendukung:
     * - Path dengan trailing slash: 'api/v1/integration/purchase-order/'
     * - Path tanpa trailing slash: 'api/v1/integration/purchase-orders'
     * - Path dengan placeholder: 'api/v1/integration/purchase-orders/:number' atau '{id}'
     * - Path dengan awalan slash atau tanpa awalan slash
     */
    public static function buildUrlFromPath(string $basePath, string $param): string
    {
        $base = self::getBaseUrl();
        $path = trim($basePath);

        // Jika path memiliki placeholder (:number, :id, :keyword, {number}, {id}, {keyword})
        if (preg_match('/(:number|:id|:keyword|\{number\}|\{id\}|\{keyword\})/i', $path)) {
            $replaced = preg_replace('/(:number|:id|:keyword|\{number\}|\{id\}|\{keyword\})/i', rawurlencode($param), $path);
            return $base . '/' . ltrim($replaced, '/');
        }

        // Default: gabungkan base + trimmed path + '/' + encoded param
        return $base . '/' . trim($path, '/') . '/' . rawurlencode($param);
    }

    /**
     * Ambil data dokumen tunggal dari Microservice Lookup menggunakan Lookup Path API dinamis
     * yang dikonfigurasi Super Admin pada menu Manajemen Transaksi.
     */
    public static function fetchDocumentByPath(string $lookupPath, string $keyword): ?array
    {
        $clean = trim($keyword);
        if (empty($clean) || empty($lookupPath)) {
            return null;
        }

        try {
            $url = self::buildUrlFromPath($lookupPath, $clean);
            $scopes = [
                'lookup:read',
                'integration:purchase-order:read',
                'integration:purchase-request:read',
            ];

            $response = Http::timeout(8)
                ->withHeaders(self::getHeaders($scopes))
                ->get($url);

            if ($response->successful()) {
                $json = $response->json();
                if (isset($json['success']) && $json['success'] && isset($json['data'])) {
                    return $json['data'];
                }
                return $json['data'] ?? $json;
            } else {
                Log::warning("FastifyIntegrationService::fetchDocumentByPath failed [{$url}]: HTTP " . $response->status());
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::fetchDocumentByPath [{$lookupPath}] failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Ambil file stream biner PDF dari Microservice Lookup menggunakan Get PDF Path API atau Lookup Path API.
     */
    public static function fetchPdfByPath(string $keyword, ?string $pdfPath = null, ?string $lookupPath = null): ?string
    {
        $clean = trim($keyword);
        if (empty($clean)) {
            return null;
        }

        try {
            $scopes = [
                'lookup:read',
                'integration:purchase-order:read',
                'integration:purchase-request:read',
            ];

            $url = null;
            if (!empty($pdfPath)) {
                $trimmedPdf = trim($pdfPath);
                if (preg_match('/(:number|:id|:keyword|\{number\}|\{id\}|\{keyword\})/i', $trimmedPdf)) {
                    $url = self::buildUrlFromPath($trimmedPdf, $clean);
                } elseif (str_ends_with($trimmedPdf, '/pdf') || str_contains($trimmedPdf, '/pdf')) {
                    $url = self::buildUrlFromPath($trimmedPdf, $clean);
                } else {
                    $url = self::buildUrlFromPath($trimmedPdf, $clean) . '/pdf';
                }
            } elseif (!empty($lookupPath)) {
                $url = self::buildUrlFromPath($lookupPath, $clean) . '/pdf';
            } else {
                $url = self::getBaseUrl() . '/api/v1/integration/document/' . rawurlencode($clean) . '/pdf';
            }

            $response = Http::timeout(10)
                ->withHeaders(self::getHeaders($scopes))
                ->get($url);

            if ($response->successful()) {
                return $response->body();
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::fetchPdfByPath [{$keyword}] failed: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Ambil data dokumen tunggal via unified endpoint (Fallback jika path spesifik tidak ada).
     */
    public static function getDocument(string $keyword): ?array
    {
        $clean = trim($keyword);

        try {
            // Unified document endpoint
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

    /**
     * Kirim pembaruan status dokumen (PO/PR) dari AMS ke EIS melalui microservice-lookup.
     */
    public static function updateEisStatus(string $nomorDokumen, string $status, ?string $notes = null): ?array
    {
        try {
            $url = self::getBaseUrl() . '/api/v1/integration/sync/status';
            $response = Http::timeout(3)
                ->connectTimeout(1)
                ->withHeaders(self::getHeaders())
                ->post($url, [
                    'nomor_dokumen' => $nomorDokumen,
                    'status' => $status,
                    'notes' => $notes,
                ]);

            if ($response->successful() && $response->json('success')) {
                Log::info("Status dokumen '{$nomorDokumen}' berhasil disinkronkan ke EIS via Fastify: {$status}");
                return $response->json('data');
            } else {
                Log::warning("Gagal update status EIS via Fastify [{$nomorDokumen}]: " . $response->body());
            }
        } catch (\Throwable $e) {
            Log::warning("FastifyIntegrationService::updateEisStatus('{$nomorDokumen}', '{$status}') failed: " . $e->getMessage());
        }

        return null;
    }
}

