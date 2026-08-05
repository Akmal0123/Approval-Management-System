<?php

namespace App\Http\Controllers;

use App\Services\ContextService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ContextController extends Controller
{
    public function __construct(
        protected ContextService $contextService
    ) {}

    /**
     * Get current context.
     */
    public function current(): JsonResponse
    {
        $context = $this->contextService->getContext();

        return response()->json([
            'context' => $context ? $this->formatContext($context) : null,
            'is_super_admin' => $this->contextService->isSuperAdmin(),
        ]);
    }

    /**
     * Get all available contexts for the user.
     */
    public function index(): JsonResponse
    {
        $contexts = $this->contextService->getAvailableContexts();
        $currentContext = $this->contextService->getContext();

        return response()->json([
            'contexts' => $contexts->map(fn($ctx) => $this->formatContext($ctx)),
            'current_context_id' => $currentContext?->id,
            'is_super_admin' => $this->contextService->isSuperAdmin(),
        ]);
    }

    /**
     * Switch to a different context.
     */
    public function switch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'context_id' => 'required|integer|exists:usersauth,id',
        ]);

        $success = $this->contextService->setContext($validated['context_id']);

        if (!$success) {
            return response()->json([
                'error' => 'Anda tidak memiliki akses ke context ini.',
            ], 403);
        }

        $context = $this->contextService->getContext();

        return response()->json([
            'success' => true,
            'message' => 'Context berhasil diubah.',
            'context' => $context ? $this->formatContext($context) : null,
        ]);
    }

    /**
     * Show context selection page (for users with multiple contexts).
     */
    public function select(): InertiaResponse
    {
        $contexts = $this->contextService->getAvailableContexts();

        return Inertia::render('context/select', [
            'contexts' => $contexts->map(fn($ctx) => $this->formatContext($ctx)),
        ]);
    }

    /**
     * Format context for API response.
     */
    private function formatContext($context): array
    {
        return [
            'id' => $context->id,
            'company' => $context->company ? [
                'id' => $context->company->id,
                'name' => $context->company->name,
            ] : null,
            'aplikasi' => $context->aplikasi ? [
                'id' => $context->aplikasi->id,
                'name' => $context->aplikasi->name,
            ] : null,
            'jabatan' => $context->jabatan ? [
                'id' => $context->jabatan->id,
                'name' => $context->jabatan->name,
            ] : null,
            'role' => $context->role ? [
                'id' => $context->role->id,
                'name' => $context->role->role_name,
            ] : null,
        ];
    }
}
