<?php

namespace App\Http\Middleware;

use App\Services\ContextService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CheckUserRole
{
    public function __construct(
        protected ContextService $contextService
    ) {}

    /**
     * Handle an incoming request.
     * Check if user can access the requested dashboard based on their CURRENT CONTEXT role
     */
    public function handle(Request $request, Closure $next, string $requiredRole)
    {
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();

        // Get current context from ContextService
        $context = $this->contextService->getContext();

        if ($context && $context->role) {
            $userRoleName = strtolower($context->role->role_name);
            $requiredRoleLower = strtolower($requiredRole);

            // Debug logging
            Log::info('CheckUserRole Debug', [
                'user_email' => $user->email,
                'current_context_id' => $context->id,
                'user_role' => $userRoleName,
                'required_role' => $requiredRoleLower,
                'route_name' => $request->route()->getName(),
                'url' => $request->url()
            ]);

            // If current context's role matches required role, allow access
            if ($userRoleName === $requiredRoleLower) {
                return $next($request);
            }

            // Super Admin can access all dashboards
            if ($this->contextService->isSuperAdmin()) {
                return $next($request);
            }

            // User is trying to access wrong dashboard for their current context
            // Redirect to appropriate dashboard based on current context's role
            return $this->redirectToCorrectDashboard($userRoleName);
        }

        // If no context found, try to get any role from userAuths
        if ($user->userAuths && $user->userAuths->count() > 0) {
            $firstAuth = $user->userAuths->first();

            if ($firstAuth && $firstAuth->role) {
                $userRoleName = strtolower($firstAuth->role->role_name);
                $requiredRoleLower = strtolower($requiredRole);

                if ($userRoleName === $requiredRoleLower) {
                    return $next($request);
                }

                return $this->redirectToCorrectDashboard($userRoleName);
            }
        }

        // If no role found, redirect to user dashboard
        if ($request->route()->getName() !== 'user.dashboard') {
            return redirect()->route('user.dashboard');
        }

        return abort(403, 'No role assigned to user.');
    }

    /**
     * Redirect user to the correct dashboard based on their role.
     */
    private function redirectToCorrectDashboard(string $roleName)
    {
        switch ($roleName) {
            case 'super admin':
                return redirect()->route('super-admin.dashboard');
            case 'admin':
                return redirect()->route('admin.dashboard');
            case 'user':
            default:
                return redirect()->route('user.dashboard');
        }
    }
}
