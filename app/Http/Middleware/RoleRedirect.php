<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleRedirect
{
    /**
     * Handle an incoming request.
     * Redirect users to appropriate dashboard based on their role
     */
    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $user = Auth::user();

            // Get user's primary role - assuming you have a relationship or method to get user role
            // This is a simplified version - you may need to adjust based on your user-role structure

            // Check if user has userAuths relationship to determine role
            if ($user->userAuths && $user->userAuths->count() > 0) {
                $primaryRole = $user->userAuths->first()->role;

                if ($primaryRole) {
                    $roleName = strtolower($primaryRole->role_name);

                    // Redirect based on role
                    switch ($roleName) {
                        case 'super admin':
                            return redirect()->route('super-admin.dashboard');
                        case 'admin':
                            return redirect()->route('admin.dashboard');
                        case 'user':
                            return redirect()->route('user.dashboard');
                        default:
                            // If role doesn't match, redirect to user dashboard as fallback
                            return redirect()->route('user.dashboard');
                    }
                }
            }

            // If no role found, redirect to user dashboard as fallback
            return redirect()->route('user.dashboard');
        }

        return $next($request);
    }
}
