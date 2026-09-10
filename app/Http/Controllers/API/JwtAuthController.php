<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Tymon\JWTAuth\Facades\JWTAuth;

/**
 * Controller untuk JWT authentication yang digunakan oleh ekosistem eksternal
 * (aplikasi lain di perusahaan, mobile app, dll.).
 *
 * Endpoint Sanctum (/api/login) tidak diubah dan tetap digunakan oleh web SPA.
 */
class JwtAuthController extends Controller
{
    /**
     * Login dan dapatkan JWT token untuk integrasi eksternal.
     *
     * POST /api/auth/jwt/login
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        try {
            if (! $token = JWTAuth::attempt($credentials)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid credentials. Please check your email and password.',
                ], 401);
            }
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Could not create token. Please try again later.',
            ], 500);
        }

        return $this->respondWithToken($token);
    }

    /**
     * Logout dan invalidate token saat ini.
     *
     * POST /api/auth/jwt/logout
     */
    public function logout(): JsonResponse
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to invalidate token.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Successfully logged out.',
        ]);
    }

    /**
     * Refresh JWT token yang hampir expired.
     *
     * POST /api/auth/jwt/refresh
     */
    public function refresh(): JsonResponse
    {
        try {
            $newToken = JWTAuth::refresh(JWTAuth::getToken());
        } catch (TokenExpiredException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token has expired and cannot be refreshed. Please login again.',
            ], 401);
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Could not refresh token.',
            ], 500);
        }

        return $this->respondWithToken($newToken);
    }

    /**
     * Ambil data user dari JWT token (tanpa query DB tambahan untuk role/company).
     *
     * GET /api/auth/jwt/me
     */
    public function me(): JsonResponse
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();
        } catch (TokenExpiredException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token has expired.',
            ], 401);
        } catch (TokenInvalidException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token is invalid.',
            ], 401);
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token not found.',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'user'    => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'role'       => $user->getJWTCustomClaims()['role'],
                'company_id' => $user->getJWTCustomClaims()['company_id'],
                'company'    => $user->getJWTCustomClaims()['company'],
                'context_id' => $user->getJWTCustomClaims()['context_id'],
            ],
        ]);
    }

    /**
     * Helper: format response token JWT dengan metadata TTL.
     */
    protected function respondWithToken(string $token): JsonResponse
    {
        $user = JWTAuth::setToken($token)->toUser();

        return response()->json([
            'success'      => true,
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => config('jwt.ttl') * 60, // dalam detik
            'user'         => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'role'       => $user->getJWTCustomClaims()['role'],
                'company_id' => $user->getJWTCustomClaims()['company_id'],
                'company'    => $user->getJWTCustomClaims()['company'],
            ],
        ]);
    }
}
