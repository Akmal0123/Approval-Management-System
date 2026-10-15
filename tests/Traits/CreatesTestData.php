<?php

namespace Tests\Traits;

use App\Models\Aplikasi;
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\User;
use App\Models\UserRole;
use App\Models\UsersAuth;

/**
 * Trait for creating common test data structures used across multiple test files.
 * Provides helper methods to quickly set up the nested auth context required
 * by the AMS (Approval Management System) application.
 */
trait CreatesTestData
{
    /**
     * Create a base context: Role + Company + Jabatan + Aplikasi.
     * Returns an array with the created models.
     */
    protected function createBaseContext(string $roleName = 'User'): array
    {
        $role    = UserRole::create(['role_name' => $roleName]);
        $company = Company::create(['name' => 'Test Company']);
        $jabatan = Jabatan::create(['name' => 'Test Jabatan']);
        $aplikasi = Aplikasi::create([
            'name'       => 'Test Aplikasi',
            'company_id' => $company->id,
        ]);

        return compact('role', 'company', 'jabatan', 'aplikasi');
    }

    /**
     * Create a user with a UsersAuth entry for the given context.
     * This is required for role-based middleware to work correctly.
     */
    protected function createUserWithContext(
        string $roleName = 'User',
        array  $userAttributes = []
    ): array {
        $context  = $this->createBaseContext($roleName);
        $user     = User::factory()->create($userAttributes);
        $auth     = UsersAuth::create([
            'user_id'     => $user->id,
            'role_id'     => $context['role']->id,
            'company_id'  => $context['company']->id,
            'jabatan_id'  => $context['jabatan']->id,
            'aplikasi_id' => $context['aplikasi']->id,
        ]);

        // Update user's last_context_id to simulate a logged-in context
        $user->update(['last_context_id' => $auth->id]);
        $user->refresh();

        return array_merge($context, ['user' => $user, 'auth' => $auth]);
    }

    /**
     * Create a Super Admin user with full context.
     */
    protected function createSuperAdmin(array $userAttributes = []): array
    {
        return $this->createUserWithContext('Super Admin', $userAttributes);
    }

    /**
     * Create an Admin user with full context.
     */
    protected function createAdmin(array $userAttributes = []): array
    {
        return $this->createUserWithContext('Admin', $userAttributes);
    }

    /**
     * Create a regular User with full context.
     */
    protected function createRegularUser(array $userAttributes = []): array
    {
        return $this->createUserWithContext('User', $userAttributes);
    }
}
