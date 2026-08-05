<?php

namespace App\Services;

use App\Models\User;
use App\Models\UsersAuth;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class ContextService
{
    private const SESSION_KEY = 'current_context_id';

    /**
     * Set the current context for the user.
     */
    public function setContext(int $userAuthId): bool
    {
        $user = Auth::user();

        if (!$user) {
            return false;
        }

        // Verify user has access to this context
        $userAuth = UsersAuth::where('id', $userAuthId)
            ->where('user_id', $user->id)
            ->first();

        if (!$userAuth) {
            return false;
        }

        // Store in session
        Session::put(self::SESSION_KEY, $userAuthId);

        // Update last used context in database
        $user->update(['last_context_id' => $userAuthId]);

        return true;
    }

    /**
     * Get the current context.
     */
    public function getContext(): ?UsersAuth
    {
        $user = Auth::user();

        if (!$user) {
            return null;
        }

        // Super Admin bypass - return first context or null
        if ($this->isSuperAdmin()) {
            return $this->getSessionContext() ?? $user->userAuths->first();
        }

        // Try to get from session first
        $contextId = Session::get(self::SESSION_KEY);

        if ($contextId) {
            $context = UsersAuth::where('id', $contextId)
                ->where('user_id', $user->id)
                ->with(['company', 'aplikasi', 'jabatan', 'role'])
                ->first();

            if ($context) {
                return $context;
            }
        }

        // Fallback to last used context from database
        if ($user->last_context_id) {
            $context = UsersAuth::where('id', $user->last_context_id)
                ->where('user_id', $user->id)
                ->with(['company', 'aplikasi', 'jabatan', 'role'])
                ->first();

            if ($context) {
                Session::put(self::SESSION_KEY, $context->id);
                return $context;
            }
        }

        // Final fallback: first available context
        $firstContext = $user->userAuths()
            ->with(['company', 'aplikasi', 'jabatan', 'role'])
            ->first();

        if ($firstContext) {
            Session::put(self::SESSION_KEY, $firstContext->id);
            $user->update(['last_context_id' => $firstContext->id]);
        }

        return $firstContext;
    }

    /**
     * Get context from session only (no fallback).
     */
    private function getSessionContext(): ?UsersAuth
    {
        $contextId = Session::get(self::SESSION_KEY);

        if (!$contextId) {
            return null;
        }

        return UsersAuth::with(['company', 'aplikasi', 'jabatan', 'role'])
            ->find($contextId);
    }

    /**
     * Get all available contexts for the current user.
     */
    public function getAvailableContexts(): Collection
    {
        $user = Auth::user();

        if (!$user) {
            return collect();
        }

        return $user->userAuths()
            ->with(['company', 'aplikasi', 'jabatan', 'role'])
            ->get();
    }

    /**
     * Clear the current context.
     */
    public function clearContext(): void
    {
        Session::forget(self::SESSION_KEY);
    }

    /**
     * Check if current user is Super Admin.
     * Super Admin has access to ALL contexts.
     */
    public function isSuperAdmin(): bool
    {
        $user = Auth::user();

        if (!$user) {
            return false;
        }

        // Check if any of user's roles is Super Admin
        return $user->userAuths()
            ->whereHas('role', function ($query) {
                $query->whereRaw('LOWER(role_name) = ?', ['super admin']);
            })
            ->exists();
    }

    /**
     * Get the current company ID from context.
     */
    public function getCurrentCompanyId(): ?int
    {
        $context = $this->getContext();
        return $context?->company_id;
    }

    /**
     * Get the current aplikasi ID from context.
     */
    public function getCurrentAplikasiId(): ?int
    {
        $context = $this->getContext();
        return $context?->aplikasi_id;
    }

    /**
     * Get the current jabatan ID from context.
     */
    public function getCurrentJabatanId(): ?int
    {
        $context = $this->getContext();
        return $context?->jabatan_id;
    }

    /**
     * Get current role name.
     */
    public function getCurrentRoleName(): ?string
    {
        $context = $this->getContext();
        return $context?->role?->role_name;
    }

    /**
     * Check if current user is Admin in current context.
     */
    public function isAdmin(): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $context = $this->getContext();

        if (!$context || !$context->role) {
            return false;
        }

        return strtolower($context->role->role_name) === 'admin';
    }

    /**
     * Check if user has access to a specific company.
     */
    public function hasAccessToCompany(int $companyId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $user = Auth::user();

        if (!$user) {
            return false;
        }

        return $user->userAuths()
            ->where('company_id', $companyId)
            ->exists();
    }

    /**
     * Check if user has access to a specific aplikasi.
     */
    public function hasAccessToAplikasi(int $aplikasiId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $user = Auth::user();

        if (!$user) {
            return false;
        }

        return $user->userAuths()
            ->where('aplikasi_id', $aplikasiId)
            ->exists();
    }
}
