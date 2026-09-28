<?php

namespace App\Services;

class AmsJwtService
{
    /**
     * Generate short-lived signed JWT for calling microservice-lookup.
     * Boundary: AMS -> microservice-lookup (HS256)
     */
    public static function generateToken(?array $scopes = null, int $ttl = 900, ?string $userIdentifier = null): string
    {
        $secret = config('services.lookup.jwt_secret', config('services.fastify.jwt_secret', env('LOOKUP_JWT_SECRET', env('FASTIFY_JWT_SECRET', 'ams-microservice-lookup-secret-key-jwt-auth'))));
        $issuer = config('services.lookup.jwt_issuer', config('services.fastify.jwt_issuer', env('LOOKUP_JWT_ISSUER', env('FASTIFY_JWT_ISSUER', 'ams'))));
        $audience = config('services.lookup.jwt_audience', config('services.fastify.jwt_audience', env('LOOKUP_JWT_AUDIENCE', env('FASTIFY_JWT_AUDIENCE', 'microservice-lookup'))));

        $defaultScopes = [
            'lookup:read',
            'integration:purchase-order:read',
            'integration:purchase-request:read',
        ];

        $now = time();
        $user = auth()->user();
        $sub = $userIdentifier ?? ($user ? ($user->email ?? (string)$user->id) : 'ams-user');

        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256',
        ];

        $payload = [
            'iss' => $issuer,
            'aud' => $audience,
            'sub' => $sub,
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name ?? null,
                'email' => $user->email ?? null,
            ] : null,
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
