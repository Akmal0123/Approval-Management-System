<?php

namespace App\Http\Middleware;

use App\Services\ContextService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $contextService = app(ContextService::class);
        $currentContext = null;
        $availableContexts = collect();

        try {
            if ($request->user()) {
                $currentContext = $contextService->getContext();
                $availableContexts = $contextService->getAvailableContexts();
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('HandleInertiaRequests context error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }

        // Debug logging
        \Illuminate\Support\Facades\Log::info('HandleInertiaRequests context debug', [
            'user_id' => $request->user()?->id,
            'user_email' => $request->user()?->email,
            'currentContext_id' => $currentContext?->id,
            'availableContexts_count' => $availableContexts->count(),
            'availableContexts_ids' => $availableContexts->pluck('id')->toArray(),
        ]);

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? $request->user()->load([
                    'userAuths.role',
                    'userAuths.jabatan',
                    'userAuths.company',
                    'userAuths.aplikasi',
                    'profile'
                ]) : null,
            ],
            'context' => [
                'current' => $currentContext ? [
                    'id' => $currentContext->id,
                    'company' => $currentContext->company ? [
                        'id' => $currentContext->company->id,
                        'name' => $currentContext->company->name,
                    ] : null,
                    'aplikasi' => $currentContext->aplikasi ? [
                        'id' => $currentContext->aplikasi->id,
                        'name' => $currentContext->aplikasi->name,
                    ] : null,
                    'jabatan' => $currentContext->jabatan ? [
                        'id' => $currentContext->jabatan->id,
                        'name' => $currentContext->jabatan->name,
                    ] : null,
                    'role' => $currentContext->role ? [
                        'id' => $currentContext->role->id,
                        'name' => $currentContext->role->role_name,
                    ] : null,
                ] : null,
                'available' => $availableContexts->map(function ($ctx) {
                    return [
                        'id' => $ctx->id,
                        'company' => $ctx->company ? [
                            'id' => $ctx->company->id,
                            'name' => $ctx->company->name,
                        ] : null,
                        'aplikasi' => $ctx->aplikasi ? [
                            'id' => $ctx->aplikasi->id,
                            'name' => $ctx->aplikasi->name,
                        ] : null,
                        'jabatan' => $ctx->jabatan ? [
                            'id' => $ctx->jabatan->id,
                            'name' => $ctx->jabatan->name,
                        ] : null,
                        'role' => $ctx->role ? [
                            'id' => $ctx->role->id,
                            'name' => $ctx->role->role_name,
                        ] : null,
                    ];
                })->values()->toArray(),
                'is_super_admin' => $request->user() ? $contextService->isSuperAdmin() : false,
            ],
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
            ],
        ]);
    }
}
