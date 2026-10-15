<?php

/**
 * UserManagementTest.php
 *
 * Feature tests for user management in AMS:
 * - User listing via API
 * - Create user (Super Admin)
 * - Update user
 * - Delete user
 * - User-by-jabatan lookup
 * - Duplicate PIN behavior (pins are not unique per system design)
 *
 * Covers requirements: REQ-USER-001 through REQ-USER-008
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
// HELPER: Build common test context
// =============================================================================

function buildUserContext(string $roleName = 'Super Admin'): array
{
    $role     = UserRole::create(['role_name' => $roleName]);
    $company  = Company::create(['name' => 'Test Corp']);
    $jabatan  = Jabatan::create(['name' => 'Manager']);
    $aplikasi = Aplikasi::create(['name' => 'TestApp', 'company_id' => $company->id]);

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

    return compact('role', 'company', 'jabatan', 'aplikasi', 'user', 'auth');
}

// =============================================================================
// USER LISTING TESTS
// =============================================================================

test('authenticated user can list users via API', function () {
    $ctx = buildUserContext('Super Admin');

    $response = $this->actingAs($ctx['user'])->getJson('/api/users');

    $response->assertStatus(200);
});

test('guest cannot access users API', function () {
    $response = $this->getJson('/api/users');

    $response->assertStatus(401);
});

// =============================================================================
// USER CREATION TESTS
// =============================================================================

test('super admin can create a new user via API', function () {
    $ctx     = buildUserContext('Super Admin');
    $userRole = UserRole::create(['role_name' => 'User']);

    $response = $this->actingAs($ctx['user'])->postJson('/api/users', [
        'name'         => 'New User Test',
        'email'        => 'newuser@example.com',
        'password'     => 'password123',
        'pin'          => '11112222',
        'address'      => 'Test Address',
        'phone_number' => '081234567890',
        'user_auths'   => [
            [
                'role_id'     => $userRole->id,
                'company_id'  => $ctx['company']->id,
                'jabatan_id'  => $ctx['jabatan']->id,
                'aplikasi_id' => $ctx['aplikasi']->id,
            ],
        ],
    ]);

    $response->assertStatus(201);
    $this->assertDatabaseHas('users', ['email' => 'newuser@example.com']);
});

test('user creation fails with missing required fields', function () {
    $ctx = buildUserContext('Super Admin');

    $response = $this->actingAs($ctx['user'])->postJson('/api/users', [
        'name' => '',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['name', 'email', 'password']);
});

test('user creation fails with duplicate email', function () {
    $ctx      = buildUserContext('Super Admin');
    $userRole = UserRole::create(['role_name' => 'User']);

    // Create first user
    User::factory()->create(['email' => 'duplicate@example.com']);

    $response = $this->actingAs($ctx['user'])->postJson('/api/users', [
        'name'         => 'Duplicate',
        'email'        => 'duplicate@example.com',
        'password'     => 'password123',
        'phone_number' => '081234567890',
        'user_auths'   => [
            [
                'role_id'     => $userRole->id,
                'company_id'  => $ctx['company']->id,
                'jabatan_id'  => $ctx['jabatan']->id,
                'aplikasi_id' => $ctx['aplikasi']->id,
            ],
        ],
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['email']);
});

// =============================================================================
// DUPLICATE PIN TESTS (System Design: PINs are not globally unique)
// =============================================================================

test('users can have duplicate PINs (system design allows this)', function () {
    $role     = UserRole::create(['role_name' => 'User']);
    $company  = Company::create(['name' => 'Test Company']);
    $jabatan  = Jabatan::create(['name' => 'Staff']);
    $aplikasi = Aplikasi::create(['name' => 'TestApp', 'company_id' => $company->id]);

    $user1 = User::factory()->create(['pin' => '12345678']);
    UsersAuth::create([
        'user_id'     => $user1->id,
        'role_id'     => $role->id,
        'company_id'  => $company->id,
        'jabatan_id'  => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);

    $user2 = User::factory()->create(['pin' => '12345678']); // Same PIN - allowed
    UsersAuth::create([
        'user_id'     => $user2->id,
        'role_id'     => $role->id,
        'company_id'  => $company->id,
        'jabatan_id'  => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);

    expect(User::where('pin', '12345678')->count())->toBe(2);
    expect($user1->pin)->toBe($user2->pin);
});

test('API allows creating users with duplicate PINs', function () {
    $role     = UserRole::create(['role_name' => 'User']);
    $company  = Company::create(['name' => 'Test Company']);
    $jabatan  = Jabatan::create(['name' => 'Staff']);
    $aplikasi = Aplikasi::create(['name' => 'TestApp', 'company_id' => $company->id]);

    $superAdmin     = User::factory()->create();
    $superAdminRole = UserRole::create(['role_name' => 'Super Admin']);
    $auth = UsersAuth::create([
        'user_id'     => $superAdmin->id,
        'role_id'     => $superAdminRole->id,
        'company_id'  => $company->id,
        'jabatan_id'  => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);
    $superAdmin->update(['last_context_id' => $auth->id]);
    $superAdmin->refresh();

    $payload = fn (string $email) => [
        'name'         => 'User ' . $email,
        'email'        => $email,
        'password'     => 'password123',
        'pin'          => '87654321',
        'address'      => 'Jl. Test',
        'phone_number' => '081234567890',
        'user_auths'   => [
            [
                'role_id'     => $role->id,
                'company_id'  => $company->id,
                'jabatan_id'  => $jabatan->id,
                'aplikasi_id' => $aplikasi->id,
            ],
        ],
    ];

    $r1 = $this->actingAs($superAdmin)->postJson('/api/users', $payload('pinuser1@example.com'));
    $r1->assertStatus(201);

    $r2 = $this->actingAs($superAdmin)->postJson('/api/users', $payload('pinuser2@example.com'));
    $r2->assertStatus(201);

    expect(User::where('pin', '87654321')->count())->toBe(2);
});

// =============================================================================
// USER UPDATE TESTS
// =============================================================================

test('user can be updated via API', function () {
    $ctx    = buildUserContext('Super Admin');
    $target = User::factory()->create();

    $response = $this->actingAs($ctx['user'])->putJson("/api/users/{$target->id}", [
        'name'       => 'Updated Name',
        'email'      => $target->email,
        'pin'        => '12345678',
        'user_auths' => [
            [
                'role_id'     => $ctx['role']->id,
                'company_id'  => $ctx['company']->id,
                'jabatan_id'  => $ctx['jabatan']->id,
                'aplikasi_id' => $ctx['aplikasi']->id,
            ]
        ],
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('users', ['id' => $target->id, 'name' => 'Updated Name']);
});

// =============================================================================
// USER BY JABATAN TESTS
// =============================================================================

test('authenticated user can get users by jabatan', function () {
    $ctx = buildUserContext('User');

    $response = $this->actingAs($ctx['user'])->getJson("/api/users-by-jabatan/{$ctx['jabatan']->id}");

    $response->assertStatus(200);
});
