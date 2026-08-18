<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class StorageTokenService
{
    /**
     * Normalize storage path by replacing slashes and stripping leading slashes or 'storage/'.
     */
    public static function normalizePath(string $path): string
    {
        $clean = ltrim(str_replace('\\', '/', $path), '/');
        $clean = preg_replace('#^storage/#i', '', $clean);
        return ltrim($clean, '/');
    }

    /**
     * Generate a secure storage access token for a given file path and user ID.
     *
     * @param string $path The relative path inside storage/app/public
     * @param int|string|null $userId User ID (defaults to currently authenticated user ID)
     * @param int $ttlMinutes Time to live in minutes (default 1440 = 24 hours)
     * @return string Signed token
     */
    public static function generateToken(string $path, $userId = null, int $ttlMinutes = 1440): string
    {
        $normalizedPath = self::normalizePath($path);
        $resolvedUserId = $userId ?? Auth::id();
        $expiresAt = time() + ($ttlMinutes * 60);

        $payloadData = [
            'p' => $normalizedPath,
            'u' => $resolvedUserId ? (int)$resolvedUserId : 0,
            'e' => $expiresAt,
            'n' => Str::random(8),
        ];

        $jsonPayload = json_encode($payloadData);
        $base64Payload = rtrim(strtr(base64_encode($jsonPayload), '+/', '-_'), '=');

        $appKey = config('app.key') ?: 'fallback-secret-key';
        $signature = hash_hmac('sha256', $base64Payload, $appKey);

        return $base64Payload . '.' . $signature;
    }

    /**
     * Generate full relative or absolute storage URL with token included.
     *
     * @param string $path
     * @param int|string|null $userId
     * @param int $ttlMinutes
     * @return string
     */
    public static function generateUrl(string $path, $userId = null, int $ttlMinutes = 1440): string
    {
        $normalizedPath = self::normalizePath($path);
        $token = self::generateToken($normalizedPath, $userId, $ttlMinutes);

        return '/storage/' . $normalizedPath . '?token=' . urlencode($token);
    }

    /**
     * Validate token against a storage path and current accessing user.
     *
     * @param string $path
     * @param string|null $token
     * @param int|string|null $currentUserId
     * @param bool $isSuperAdmin Super admin override
     * @return bool
     */
    public static function validateToken(string $path, ?string $token, $currentUserId = null, bool $isSuperAdmin = false): bool
    {
        if (empty($token)) {
            return false;
        }

        $token = urldecode($token);

        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return false;
        }

        [$base64Payload, $providedSignature] = $parts;

        $appKey = config('app.key') ?: 'fallback-secret-key';
        $signature = hash_hmac('sha256', $base64Payload, $appKey);

        if (!hash_equals($signature, $providedSignature)) {
            return false;
        }

        // Decode base64 payload
        $base64 = strtr($base64Payload, '-_', '+/');
        $remainder = strlen($base64) % 4;
        if ($remainder) {
            $base64 .= str_repeat('=', 4 - $remainder);
        }
        $jsonPayload = base64_decode($base64);

        if (!$jsonPayload) {
            return false;
        }

        $data = json_decode($jsonPayload, true);
        if (!is_array($data) || !isset($data['p'], $data['u'], $data['e'])) {
            return false;
        }

        // 1. Expiration check
        if (time() > (int)$data['e']) {
            return false;
        }

        // 2. Path check
        $normalizedPath = self::normalizePath($path);
        if (self::normalizePath($data['p']) !== $normalizedPath) {
            return false;
        }

        // 3. Super admin can access any valid token
        if ($isSuperAdmin) {
            return true;
        }

        // 4. User check (if a different user is logged in than the token owner, reject)
        $tokenUserId = (int)$data['u'];
        $resolvedCurrentUserId = $currentUserId ? (int)$currentUserId : (Auth::id() ? (int)Auth::id() : null);

        if ($tokenUserId > 0 && $resolvedCurrentUserId !== null && $tokenUserId !== $resolvedCurrentUserId) {
            return false;
        }

        return true;
    }
}
