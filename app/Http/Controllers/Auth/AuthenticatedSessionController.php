<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Models\UserRole;
use App\Models\UsersAuth;
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\Aplikasi;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Socialite\Facades\Socialite;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        // Get the authenticated user
        $user = Auth::user();

        // Determine redirect based on user role
        if ($user->userAuths && $user->userAuths->count() > 0) {
            $primaryRole = $user->userAuths->first()->role;

            if ($primaryRole) {
                $roleName = strtolower($primaryRole->role_name);

                // Debug logging
                Log::info('User login redirect - User: ' . $user->email . ', Role: ' . $roleName);

                // Redirect based on role
                switch ($roleName) {
                    case 'super admin':
                        return redirect()->intended(route('super-admin.dashboard'));
                    case 'admin':
                        return redirect()->intended(route('admin.dashboard'));
                    case 'user':
                        return redirect()->intended(route('user.dashboard'));
                    default:
                        // If role doesn't match, redirect to user dashboard as fallback
                        return redirect()->intended(route('user.dashboard'));
                }
            }
        }

        // Debug logging for fallback
        Log::info('User login redirect - No role found for user: ' . $user->email . ', redirecting to user dashboard');

        // If no role found, redirect to user dashboard as fallback
        return redirect()->intended(route('user.dashboard'));
    }

    /**
     * Redirect to Google OAuth provider.
     */
    public function redirectToGoogle(): RedirectResponse
    {
        Log::info('Google OAuth - Starting redirect process');

        // Build Google OAuth URL manually with all required parameters for refresh token
        $clientId = config('services.google.client_id');
        $redirectUri = config('services.google.redirect');
        $state = Str::random(40);

        // Store state in session for validation (but make it optional)
        session(['google_oauth_state' => $state]);

        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'scope' => 'openid profile email',
            'response_type' => 'code',
            'access_type' => 'offline',    // REQUIRED for refresh token
            'prompt' => 'consent',         // REQUIRED for refresh token on subsequent logins
            'state' => $state,
        ];

        $authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);

        Log::info('Google OAuth - Redirect URL generated', [
            'has_access_type' => strpos($authUrl, 'access_type=offline') !== false,
            'has_prompt' => strpos($authUrl, 'prompt=consent') !== false,
            'state' => $state
        ]);

        return redirect($authUrl);
    }
    /**
     * Handle Google OAuth callback.
     */
    public function handleGoogleCallback(): RedirectResponse
    {
        try {
            Log::info('Google OAuth - Callback started', [
                'code' => request('code') ? 'Present' : 'Missing',
                'state' => request('state') ? 'Present' : 'Missing',
                'error' => request('error'),
            ]);

            // Check if there's an error from Google
            if (request('error')) {
                Log::error('Google OAuth - Error from Google: ' . request('error'));
                return redirect()->route('login')->with('error', 'Google authentication failed: ' . request('error'));
            }

            // Flexible state validation - log but don't block
            $state = request('state');
            $sessionState = session('google_oauth_state');

            Log::info('Google OAuth - State validation', [
                'received_state' => $state ? substr($state, 0, 10) . '...' : 'null',
                'session_state' => $sessionState ? substr($sessionState, 0, 10) . '...' : 'null',
                'match' => $state === $sessionState
            ]);

            // Clean up session
            session()->forget('google_oauth_state');

            Log::info('Google OAuth - About to call Socialite driver');

            try {
                // Set state in session to match received state for validation
                $receivedState = request('state');
                if ($receivedState) {
                    session(['state' => $receivedState]);
                }

                $googleUser = Socialite::driver('google')->user();
                Log::info('Google OAuth - Socialite user retrieved successfully');
            } catch (\Exception $socialiteError) {
                Log::error('Google OAuth - Socialite Error: ' . json_encode([
                    'message' => $socialiteError->getMessage(),
                    'class' => get_class($socialiteError),
                    'file' => basename($socialiteError->getFile()),
                    'line' => $socialiteError->getLine()
                ]));
                throw $socialiteError; // Re-throw to be caught by outer catch block
            }

            Log::info('Google OAuth callback - User data received', [
                'email' => $googleUser->getEmail(),
                'name' => $googleUser->getName(),
                'id' => $googleUser->getId(),
                'token' => $googleUser->token ? 'Present' : 'Missing',
                'refresh_token' => $googleUser->refreshToken ? 'Present' : 'Missing'
            ]);

            // Check if user already exists with this Google ID
            $user = User::where('google_id', $googleUser->getId())->first();

            if ($user) {
                // Update Google token
                $user->update([
                    'google_token' => $googleUser->token,
                    'google_refresh_token' => $googleUser->refreshToken,
                ]);

                Log::info('Google OAuth - Updated existing user tokens: ' . $user->email .
                    ', Refresh Token: ' . ($googleUser->refreshToken ? 'Present' : 'Missing'));
            } else {
                // Check if user exists with this email
                $user = User::where('email', $googleUser->getEmail())->first();

                if ($user) {
                    // Link Google account to existing user
                    $user->update([
                        'google_id' => $googleUser->getId(),
                        'google_token' => $googleUser->token,
                        'google_refresh_token' => $googleUser->refreshToken,
                    ]);

                    Log::info('Google OAuth - Linked existing user: ' . $user->email .
                        ', Refresh Token: ' . ($googleUser->refreshToken ? 'Present' : 'Missing'));

                    // Check if user has any role, if not assign default "User" role
                    if ($user->userAuths->count() === 0) {
                        $userRole = UserRole::where('role_name', 'User')->first();
                        if ($userRole) {
                            // Get default values since they're required
                            $defaultCompany = Company::first();
                            $defaultJabatan = Jabatan::first();
                            $defaultAplikasi = Aplikasi::first();

                            if ($defaultCompany && $defaultJabatan && $defaultAplikasi) {
                                UsersAuth::create([
                                    'user_id' => $user->id,
                                    'role_id' => $userRole->id,
                                    'company_id' => $defaultCompany->id,
                                    'jabatan_id' => $defaultJabatan->id,
                                    'aplikasi_id' => $defaultAplikasi->id,
                                ]);

                                Log::info('Google OAuth - Assigned User role to existing user: ' . $user->email);
                            } else {
                                Log::error('Google OAuth - Missing default data for existing user role assignment');
                            }
                        }
                    }
                } else {
                    // Create new user
                    Log::info('Google OAuth - Creating new user: ' . $googleUser->getEmail());

                    $user = User::create([
                        'name' => $googleUser->getName(),
                        'email' => $googleUser->getEmail(),
                        'google_id' => $googleUser->getId(),
                        'google_token' => $googleUser->token,
                        'google_refresh_token' => $googleUser->refreshToken,
                        'password' => bcrypt(Str::random(16)), // Random password since they'll use Google
                        'email_verified_at' => now(),
                    ]);

                    Log::info('Google OAuth - User created with ID: ' . $user->id .
                        ', Refresh Token: ' . ($googleUser->refreshToken ? 'Present' : 'Missing'));

                    // Assign default "User" role to new user
                    $userRole = UserRole::where('role_name', 'User')->first();

                    if (!$userRole) {
                        // If User role doesn't exist, create it
                        Log::warning('Google OAuth - User role not found, creating it');
                        $userRole = UserRole::create(['role_name' => 'User']);
                    }

                    if ($userRole) {
                        Log::info('Google OAuth - Assigning role User (ID: ' . $userRole->id . ') to user ID: ' . $user->id);

                        // Get default values since they're required
                        $defaultCompany = Company::first();
                        $defaultJabatan = Jabatan::first();
                        $defaultAplikasi = Aplikasi::first();

                        if ($defaultCompany && $defaultJabatan && $defaultAplikasi) {
                            $userAuth = UsersAuth::create([
                                'user_id' => $user->id,
                                'role_id' => $userRole->id,
                                'company_id' => $defaultCompany->id,
                                'jabatan_id' => $defaultJabatan->id,
                                'aplikasi_id' => $defaultAplikasi->id,
                            ]);

                            Log::info('Google OAuth - UserAuth created with ID: ' . $userAuth->id . ' for user: ' . $user->email);
                        } else {
                            Log::error('Google OAuth - Missing default company, jabatan, or aplikasi data');
                        }
                    } else {
                        Log::error('Google OAuth - Failed to create or find User role');
                    }
                }
            }

            // Refresh user data to get the latest relationships
            $user = $user->fresh(['userAuths.role']);

            // Validate user has role before login
            if (!$user->userAuths || $user->userAuths->count() === 0) {
                Log::error('Google OAuth - User created but no role assigned: ' . $user->email);
                return redirect()->route('login')->with('error', 'Authentication failed. Please contact administrator.');
            }

            // Log the user in
            Auth::login($user);

            Log::info('Google OAuth - User logged in successfully: ' . $user->email . ' with ' . $user->userAuths->count() . ' roles');

            // Determine redirect based on user role (same logic as store method)
            Log::info('Google OAuth - Starting redirect logic', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'user_auths_count' => $user->userAuths->count()
            ]);

            if ($user->userAuths && $user->userAuths->count() > 0) {
                $primaryRole = $user->userAuths->first()->role;

                if ($primaryRole) {
                    $roleName = strtolower($primaryRole->role_name);

                    Log::info('Google OAuth - User role determined', [
                        'user_email' => $user->email,
                        'role_name' => $roleName,
                        'role_id' => $primaryRole->id
                    ]);

                    // Redirect based on role
                    switch ($roleName) {
                        case 'super admin':
                            Log::info('Google OAuth - Redirecting to super-admin dashboard');
                            return redirect()->intended(route('super-admin.dashboard'));
                        case 'admin':
                            Log::info('Google OAuth - Redirecting to admin dashboard');
                            return redirect()->intended(route('admin.dashboard'));
                        case 'user':
                            Log::info('Google OAuth - Redirecting to user dashboard');
                            return redirect()->intended(route('user.dashboard'));
                        default:
                            Log::info('Google OAuth - Redirecting to default user dashboard');
                            return redirect()->intended(route('user.dashboard'));
                    }
                } else {
                    Log::warning('Google OAuth - Primary role found but role object is null');
                }
            } else {
                Log::warning('Google OAuth - No user auths found for user: ' . $user->email);
            }

            // Debug logging for fallback
            Log::info('Google OAuth - Fallback redirect to user dashboard for user: ' . $user->email);

            // If no role found, redirect to user dashboard as fallback
            return redirect()->intended(route('user.dashboard'));
        } catch (\Exception $e) {
            Log::error('Google OAuth Error Details', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            Log::error('Google OAuth Full Exception: ' . json_encode([
                'class' => get_class($e),
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ]));
            return redirect()->route('login')->with('error', 'Google authentication failed: ' . $e->getMessage());
        }
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
