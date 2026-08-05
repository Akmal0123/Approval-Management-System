<?php

namespace App\Http\Middleware;

use App\Services\ContextService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureContext
{
    public function __construct(
        protected ContextService $contextService
    ) {}

    /**
     * Handle an incoming request.
     * Ensures user has a valid context set before proceeding.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip for guests
        if (!$request->user()) {
            return $next($request);
        }

        // Super Admin can always proceed
        if ($this->contextService->isSuperAdmin()) {
            return $next($request);
        }

        // Check if user has any contexts available
        $contexts = $this->contextService->getAvailableContexts();

        if ($contexts->isEmpty()) {
            // User has no contexts assigned - redirect to error or contact admin
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'No context available. Please contact administrator.',
                ], 403);
            }

            return redirect()->route('login')
                ->withErrors(['context' => 'Anda tidak memiliki akses ke aplikasi manapun. Silakan hubungi administrator.']);
        }

        // Ensure a context is set
        $currentContext = $this->contextService->getContext();

        if (!$currentContext) {
            // No context set and couldn't set default - force selection
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Please select a context first.',
                    'redirect' => route('context.select'),
                ], 403);
            }

            // For first-time login or when context is invalid
            if ($contexts->count() === 1) {
                // Auto-select if only one context
                $this->contextService->setContext($contexts->first()->id);
            } else {
                // Force user to select
                return redirect()->route('context.select');
            }
        }

        return $next($request);
    }
}
