<?php

/**
 * RoleAuthorizationTest.php
 *
 * Feature tests for role-based access control in AMS:
 * - Dashboard redirects based on role
 * - Super Admin can access Super Admin dashboard
 * - Admin can access Admin dashboard
 * - User can access User dashboard
 * - Role-based access restriction (wrong role redirects)
 * - Waiting room for users without role
 * - Context switching
 *
 * Covers requirements: REQ-ROLE-001 through REQ-ROLE-008
 */

use App\Models\Aplikasi;
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\User;
use App\Models\UserRole;
use App\Models\UsersAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// =============================================================================
// HELPER
// =============================================================================

function makeUserWithRole(string $roleName): array
{
    $role     = UserRole::create(['role_name' => $roleName]);
    $company  = Company::create(['name' => 'Company ' . $roleName]);
    $jabatan  = Jabatan::create(['name' => 'Jabatan ' . $roleName]);
    $aplikasi = Aplikasi::create(['name' => 'App ' . $roleName, 'company_id' => $company->id]);

    $user = User::factory()->create();
    $auth = UsersAuth::create([
        'user_id'     => $user->id,
        'role_id'     => $role->id,
        'company_id'  => $company->id,
        'jabatan_id'  => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);
    $user->update(['last_context_id' => $auth->id]);
    $user->refresh();

    return compact('user', 'role', 'company', 'jabatan', 'aplikasi', 'auth');
}

// =============================================================================
// GUEST PROTECTION TESTS
// =============================================================================

test('guests are redirected to the login page from dashboard', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('guests cannot access super admin dashboard', function () {
    $this->get('/super-admin/dashboard')->assertRedirect('/login');
});

test('guests cannot access admin dashboard', function () {
    $this->get('/admin/dashboard')->assertRedirect('/login');
});

test('guests cannot access user dashboard', function () {
    $this->get('/user/dashboard')->assertRedirect('/login');
});

// =============================================================================
// SUPER ADMIN DASHBOARD ACCESS
// =============================================================================

test('super admin can access super admin dashboard', function () {
    $ctx = makeUserWithRole('Super Admin');

    $response = $this->actingAs($ctx['user'])->get('/super-admin/dashboard');

    $response->assertStatus(200);
});

test('super admin is redirected to super admin dashboard from /dashboard', function () {
    $ctx = makeUserWithRole('Super Admin');

    $response = $this->actingAs($ctx['user'])->get('/dashboard');

    $response->assertRedirect('/super-admin/dashboard');
});

test('super admin can access role management page', function () {
    $ctx = makeUserWithRole('Super Admin');

    $response = $this->actingAs($ctx['user'])->get('/super-admin/role-management');

    $response->assertStatus(200);
});

test('super admin can access user management page', function () {
    $ctx = makeUserWithRole('Super Admin');

    $response = $this->actingAs($ctx['user'])->get('/super-admin/user-management');

    $response->assertStatus(200);
});

test('super admin can access company management page', function () {
    $ctx = makeUserWithRole('Super Admin');

    $response = $this->actingAs($ctx['user'])->get('/super-admin/company-management');

    $response->assertStatus(200);
});

test('super admin can access jabatan management page', function () {
    $ctx = makeUserWithRole('Super Admin');

    $response = $this->actingAs($ctx['user'])->get('/super-admin/jabatan-management');

    $response->assertStatus(200);
});

test('super admin can access aplikasi management page', function () {
    $ctx = makeUserWithRole('Super Admin');

    $response = $this->actingAs($ctx['user'])->get('/super-admin/aplikasi-management');

    $response->assertStatus(200);
});

// =============================================================================
// ADMIN DASHBOARD ACCESS
// =============================================================================

test('admin can access admin dashboard', function () {
    $ctx = makeUserWithRole('Admin');

    $response = $this->actingAs($ctx['user'])->get('/admin/dashboard');

    $response->assertStatus(200);
});

test('admin is redirected to admin dashboard from /dashboard', function () {
    $ctx = makeUserWithRole('Admin');

    $response = $this->actingAs($ctx['user'])->get('/dashboard');

    $response->assertRedirect('/admin/dashboard');
});

test('admin can access document list page', function () {
    $ctx = makeUserWithRole('Admin');

    $response = $this->actingAs($ctx['user'])->get('/admin/dokumen');

    $response->assertStatus(200);
});

// =============================================================================
// USER DASHBOARD ACCESS
// =============================================================================

test('user can access user dashboard', function () {
    $ctx = makeUserWithRole('User');

    $response = $this->actingAs($ctx['user'])->get('/user/dashboard');

    $response->assertStatus(200);
});

test('user is redirected to user dashboard from /dashboard', function () {
    $ctx = makeUserWithRole('User');

    $response = $this->actingAs($ctx['user'])->get('/dashboard');

    $response->assertRedirect('/user/dashboard');
});

// =============================================================================
// CROSS-ROLE ACCESS RESTRICTION TESTS
// =============================================================================

test('regular user cannot access super admin dashboard', function () {
    $ctx = makeUserWithRole('User');

    $response = $this->actingAs($ctx['user'])->get('/super-admin/dashboard');

    // Should redirect to the user's correct dashboard
    $response->assertRedirect();
    $this->assertNotEquals('/super-admin/dashboard', $response->headers->get('Location'));
});

test('regular user cannot access admin dashboard', function () {
    $ctx = makeUserWithRole('User');

    $response = $this->actingAs($ctx['user'])->get('/admin/dashboard');

    $response->assertRedirect();
    $this->assertNotEquals('/admin/dashboard', $response->headers->get('Location'));
});

test('admin cannot access super admin dashboard', function () {
    $ctx = makeUserWithRole('Admin');

    $response = $this->actingAs($ctx['user'])->get('/super-admin/dashboard');

    $response->assertRedirect();
    $this->assertNotEquals('/super-admin/dashboard', $response->headers->get('Location'));
});

// =============================================================================
// AUTHENTICATED USER WITHOUT ROLE (WAITING ROOM)
// =============================================================================

test('authenticated user without role assignment is redirected to waiting room', function () {
    // User with no UsersAuth entry
    $user = User::factory()->create(['last_context_id' => null]);

    $response = $this->actingAs($user)->get('/super-admin/dashboard');

    $response->assertRedirect('/waiting-room');
});

test('waiting room page can be rendered by authenticated user', function () {
    $user = User::factory()->create(['last_context_id' => null]);

    $response = $this->actingAs($user)->get('/waiting-room');

    $response->assertStatus(200);
});

// =============================================================================
// CONTEXT MANAGEMENT TESTS
// =============================================================================

test('authenticated user can get their contexts', function () {
    $ctx = makeUserWithRole('User');

    $response = $this->actingAs($ctx['user'])->get('/contexts');

    $response->assertStatus(200);
});

test('authenticated user can switch context', function () {
    $ctx = makeUserWithRole('User');

    $response = $this->actingAs($ctx['user'])->post('/contexts/switch', [
        'context_id' => $ctx['auth']->id,
    ]);

    $response->assertStatus(200);
});
