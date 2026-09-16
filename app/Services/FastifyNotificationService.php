<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FastifyNotificationService
{
    /**
     * Dapatkan base URL dari Fastify Notification Service.
     */
    protected static function getBaseUrl(): string
    {
        return rtrim(config('services.fastify.url', 'http://localhost:5000'), '/');
    }

    /**
     * Kirim push notification ke user tertentu via Fastify WebSocket hub.
     *
     * @param int|string $userId ID user penerima
     * @param string $title Judul notifikasi
     * @param string $body Isi pesan notifikasi
     * @param string $url URL tujuan ketika notifikasi diklik
     * @param string $type Tipe notifikasi ('info', 'success', 'warning', 'error')
     * @param array $data Metadata tambahan (opsional)
     * @return bool status keberhasilan pengiriman ke Fastify
     */
    public static function sendToUser(
        int|string $userId,
        string $title,
        string $body,
        string $url = '/dokumen',
        string $type = 'info',
        array $data = []
    ): bool {
        try {
            $endpoint = self::getBaseUrl() . '/api/notifications/push';

            $response = Http::timeout(3)->post($endpoint, [
                'userId' => (string) $userId,
                'title' => $title,
                'body' => $body,
                'url' => $url,
                'type' => $type,
                'data' => $data,
                'timestamp' => now()->toIso8601String(),
            ]);

            if ($response->successful()) {
                $resData = $response->json();
                Log::info("⚡ [FastifyNotificationService] Push sent to user {$userId}", [
                    'title' => $title,
                    'deliveredSockets' => $resData['deliveredSockets'] ?? 0,
                    'isOnline' => $resData['isOnline'] ?? false,
                ]);
                return true;
            } else {
                Log::warning("⚠️ [FastifyNotificationService] Failed to push to user {$userId}: " . $response->body());
                return false;
            }
        } catch (\Throwable $e) {
            Log::warning("⚠️ [FastifyNotificationService] Exception pushing to Fastify: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Broadcast notifikasi ke seluruh user yang sedang terkoneksi di Fastify WebSocket.
     *
     * @param string $title
     * @param string $body
     * @param string $url
     * @param string $type
     * @param array $data
     * @return bool
     */
    public static function broadcast(
        string $title,
        string $body,
        string $url = '/',
        string $type = 'info',
        array $data = []
    ): bool {
        try {
            $endpoint = self::getBaseUrl() . '/api/notifications/broadcast';

            $response = Http::timeout(3)->post($endpoint, [
                'title' => $title,
                'body' => $body,
                'url' => $url,
                'type' => $type,
                'data' => $data,
                'timestamp' => now()->toIso8601String(),
            ]);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning("⚠️ [FastifyNotificationService] Exception broadcasting via Fastify: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Ambil statistik koneksi real-time Fastify Notification Service.
     */
    public static function getStats(): ?array
    {
        try {
            $endpoint = self::getBaseUrl() . '/api/notifications/stats';
            $response = Http::timeout(2)->get($endpoint);

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Throwable $e) {
            Log::warning("⚠️ [FastifyNotificationService] Failed to get stats: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Ambil riwayat notifikasi buffer seorang user dari Fastify.
     */
    public static function getUserHistory(int|string $userId): array
    {
        try {
            $endpoint = self::getBaseUrl() . '/api/notifications/history/' . $userId;
            $response = Http::timeout(2)->get($endpoint);

            if ($response->successful()) {
                return $response->json('history', []);
            }
        } catch (\Throwable $e) {
            Log::warning("⚠️ [FastifyNotificationService] Failed to get user history: " . $e->getMessage());
        }

        return [];
    }
}
