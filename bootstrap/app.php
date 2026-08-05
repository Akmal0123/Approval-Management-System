<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);
        // Use custom CSRF verification middleware
        $middleware->validateCsrfTokens(except: [
            // Exempt these routes from CSRF verification
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'check.role' => \App\Http\Middleware\CheckUserRole::class,
        ]);

        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Handle CSRF token mismatch (419) for Inertia SPA
        $exceptions->respond(function (\Symfony\Component\HttpFoundation\Response $response, \Throwable $e, \Illuminate\Http\Request $request) {
            // Handle 419 Page Expired (CSRF token mismatch)
            if ($response->getStatusCode() === 419) {
                // For Inertia requests, return a proper Inertia response
                // Force a hard visit to login page to refresh CSRF token
                if ($request->header('X-Inertia')) {
                    return \Inertia\Inertia::location(route('login'));
                }

                // For API requests, return JSON
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'Session expired. Please refresh and try again.',
                        'error' => 'csrf_token_mismatch',
                    ], 419);
                }

                // For regular web requests, redirect back
                return redirect()
                    ->route('login')
                    ->withErrors(['email' => 'Session expired. Please login again.']);
            }

            return $response;
        });
    })->create();
