<?php

namespace App\Services;

class AmsJwtService
{
    /**
     * Generate short-lived signed JWT A for calling Fastify Integration Service.
     * Boundary 1: AMS -> Fastify (HS256)
     */
    public static function generateToken(?array $scopes = null, int $ttl = 900): string
    {
        $secret = config('services.fastify.jwt_secret', env('FASTIFY_JWT_SECRET', 'ams-fastify-secret-key-super-secure-token-a'));
        $issuer = config('services.fastify.jwt_issuer', env('FASTIFY_JWT_ISSUER', 'ams'));
        $audience = config('services.fastify.jwt_audience', env('FASTIFY_JWT_AUDIENCE', 'integration-service'));

        $defaultScopes = [
            'integration:purchase-order:read',
            'integration:purchase-request:read',
        ];

        $now = time();
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256',
        ];

        $payload = [
            'iss' => $issuer,
            'aud' => $audience,
            'sub' => 'ams-service',
            'scope' => $scopes ?? $defaultScopes,
            'iat' => $now,
            'exp' => $now + $ttl,
        ];

        $b64Header = self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES));
        $b64Payload = self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES));

        $signature = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", $secret, true);
        $b64Signature = self::base64UrlEncode($signature);

        return "{$b64Header}.{$b64Payload}.{$b64Signature}";
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
