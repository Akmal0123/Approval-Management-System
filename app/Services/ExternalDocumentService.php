<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ExternalDocumentService
{
    /**
     * Dapatkan JWT Token dari server eksternal menggunakan API Key & Secret.
     * Token di-cache sementara agar hemat request dan performa cepat.
     */
    public function getJwtToken(?string $baseUrl = null): string
    {
        $baseUrl = $baseUrl ?: config('services.external_api.base_url');
        $apiKey = config('services.external_api.key');
        $apiSecret = config('services.external_api.secret');

        $cacheKey = 'ext_jwt_token_' . md5($baseUrl . $apiKey);

        return Cache::remember($cacheKey, 3000, function () use ($baseUrl, $apiKey, $apiSecret) {
            // Jika memanggil mock eksternal lokal, eksekusi langsung via controller (menghindari loopback socket lag di php artisan serve)
            if ($this->isLocalMock($baseUrl)) {
                $mockController = app(\App\Http\Controllers\MockExternalApiController::class);
                $req = \Illuminate\Http\Request::create('/api/mock-external/oauth/token', 'POST', [
                    'api_key' => $apiKey,
                    'api_secret' => $apiSecret,
                ]);
                $res = $mockController->issueToken($req);
                $data = json_decode($res->getContent(), true);

                if ($res->getStatusCode() !== 200 || empty($data['access_token'])) {
                    throw new \Exception('Gagal generate token JWT mock: ' . ($data['message'] ?? 'Error'));
                }

                return $data['access_token'];
            }

            // Jika memanggil server eksternal sungguhan (Real API)
            $tokenUrl = rtrim($baseUrl, '/') . '/oauth/token';

            $response = Http::timeout(10)->post($tokenUrl, [
                'api_key' => $apiKey,
                'api_secret' => $apiSecret,
            ]);

            if (!$response->successful()) {
                Log::error('Gagal mendapatkan token JWT eksternal', [
                    'url' => $tokenUrl,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                throw new \Exception('Gagal melakukan autentikasi JWT ke sistem eksternal: ' . ($response->json('message') ?? 'Unknown error'));
            }

            $token = $response->json('access_token');
            if (!$token) {
                throw new \Exception('Token JWT tidak ditemukan dalam respons autentikasi eksternal.');
            }

            return $token;
        });
    }

    /**
     * Alur lengkap sesuai arahan mentor:
     * 1. Autentikasi -> dapat Token JWT
     * 2. Lookup keyword -> dapat ID dokumen (Header: Bearer <token>)
     * 3. Get Dokumen -> panggil endpoint dokumen dengan ID + Token JWT
     */
    public function fetchDocumentByKeyword(string $keyword, ?string $baseUrl = null): array
    {
        $baseUrl = $baseUrl ?: config('services.external_api.base_url');

        // 1. Dapatkan Token JWT
        $jwtToken = $this->getJwtToken($baseUrl);

        // Jika memanggil mock eksternal lokal (Internal Mock)
        if ($this->isLocalMock($baseUrl)) {
            $mockController = app(\App\Http\Controllers\MockExternalApiController::class);

            // 2. Lookup dokumen (Wajib bawa Header Bearer Token JWT)
            $lookupReq = \Illuminate\Http\Request::create('/api/mock-external/documents/lookup', 'GET', ['keyword' => $keyword]);
            $lookupReq->headers->set('Authorization', 'Bearer ' . $jwtToken);
            $lookupRes = $mockController->lookup($lookupReq);
            $lookupData = json_decode($lookupRes->getContent(), true);

            if ($lookupRes->getStatusCode() !== 200) {
                throw new \Exception($lookupData['message'] ?? "Dokumen dengan kata kunci '{$keyword}' tidak ditemukan di sistem eksternal.", $lookupRes->getStatusCode());
            }

            $documentId = $lookupData['data']['document_id'] ?? null;
            if (!$documentId) {
                throw new \Exception("ID Dokumen tidak ditemukan dalam hasil pencarian sistem eksternal.");
            }

            // 3. "get dokumen, dapat id, ditambah token" (Wajib bawa Header Bearer Token JWT)
            $detailReq = \Illuminate\Http\Request::create("/api/mock-external/documents/{$documentId}/detail", 'GET');
            $detailReq->headers->set('Authorization', 'Bearer ' . $jwtToken);
            $detailRes = $mockController->getDocumentDetail($detailReq, $documentId);
            $detailData = json_decode($detailRes->getContent(), true);

            if ($detailRes->getStatusCode() !== 200) {
                throw new \Exception($detailData['message'] ?? 'Gagal mengambil file dan detail dokumen dari sistem eksternal.', $detailRes->getStatusCode());
            }

            return $detailData['data'];
        }

        // Jika memanggil server eksternal sungguhan (Real API melalui Network HTTP)
        // 2. Lookup dokumen berdasarkan keyword (Harus menyertakan Header Bearer Token)
        $lookupUrl = rtrim($baseUrl, '/') . '/documents/lookup';
        $lookupResponse = Http::timeout(10)
            ->withToken($jwtToken)
            ->get($lookupUrl, [
                'keyword' => $keyword
            ]);

        if (!$lookupResponse->successful()) {
            if ($lookupResponse->status() === 401) {
                Cache::forget('ext_jwt_token_' . md5($baseUrl . config('services.external_api.key')));
            }

            $errorMessage = $lookupResponse->json('message') ?? "Dokumen dengan kata kunci '{$keyword}' tidak ditemukan di sistem eksternal.";
            throw new \Exception($errorMessage, $lookupResponse->status());
        }

        $lookupData = $lookupResponse->json('data');
        $documentId = $lookupData['document_id'] ?? null;

        if (!$documentId) {
            throw new \Exception("ID Dokumen tidak ditemukan dalam hasil pencarian sistem eksternal.");
        }

        // 3. "get dokumen, dapat id, ditambah token"
        $detailUrl = rtrim($baseUrl, '/') . "/documents/{$documentId}/detail";
        $detailResponse = Http::timeout(10)
            ->withToken($jwtToken)
            ->get($detailUrl);

        if (!$detailResponse->successful()) {
            throw new \Exception('Gagal mengambil file dan detail dokumen dari sistem eksternal: ' . ($detailResponse->json('message') ?? 'Error'));
        }

        return $detailResponse->json('data');
    }

    private function isLocalMock(string $baseUrl): bool
    {
        return str_contains($baseUrl, 'mock-external') || str_contains($baseUrl, '127.0.0.1') || str_contains($baseUrl, 'localhost');
    }
}
