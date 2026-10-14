<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyMicroserviceToken
{
    /**
     * Handle incoming request from microservice-lookup.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $authHeader = $request->header('Authorization', '');
        $token = '';

        if (str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
        }

        $secret = config('services.lookup.jwt_secret', env('LOOKUP_JWT_SECRET', env('FASTIFY_JWT_SECRET', 'ams-microservice-lookup-secret-key-jwt-auth')));

        // Allow direct secret token or valid HMAC SHA256 JWT
        if (!empty($token)) {
            if ($token === $secret) {
                return $next($request);
            }

            // Verify JWT
            $parts = explode('.', $token);
            if (count($parts) === 3) {
                [$b64Header, $b64Payload, $b64Signature] = $parts;
                $expectedSignature = rtrim(strtr(base64_encode(hash_hmac('sha256', "{$b64Header}.{$b64Payload}", $secret, true)), '+/', '-_'), '=');

                if (hash_equals($expectedSignature, $b64Signature)) {
                    $payload = json_decode(base64_decode(strtr($b64Payload, '-_', '+/')), true);
                    if ($payload && (!isset($payload['exp']) || $payload['exp'] >= time())) {
                        $request->attributes->set('jwt_payload', $payload);
                        return $next($request);
                    }
                }
            }
        }

        // Check if internal dev environment or local loopback
        if (app()->environment('local', 'testing') && ($request->ip() === '127.0.0.1' || $request->ip() === '::1') && $request->hasHeader('x-internal-sync')) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'UNAUTHORIZED_MICROSERVICE',
                'message' => 'Invalid or missing Authorization Bearer token from microservice-lookup',
            ],
        ], 401);
    }
}
