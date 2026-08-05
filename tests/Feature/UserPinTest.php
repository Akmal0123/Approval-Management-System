<?php

use App\Models\User;
use App\Models\UserRole;
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\Aplikasi;
use App\Models\UsersAuth;

test('users can have duplicate PINs', function () {
    // Create test data
    $role = UserRole::factory()->create(['role_name' => 'User']);
    $company = Company::factory()->create();
    $jabatan = Jabatan::factory()->create();
    $aplikasi = Aplikasi::factory()->create();

    // Create first user with PIN
    $user1 = User::factory()->create([
        'name' => 'User One',
        'email' => 'user1@example.com',
        'pin' => '12345678',
    ]);

    UsersAuth::create([
        'user_id' => $user1->id,
        'role_id' => $role->id,
        'company_id' => $company->id,
        'jabatan_id' => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);

    // Create second user with same PIN
    $user2 = User::factory()->create([
        'name' => 'User Two',
        'email' => 'user2@example.com',
        'pin' => '12345678', // Same PIN as user1
    ]);

    UsersAuth::create([
        'user_id' => $user2->id,
        'role_id' => $role->id,
        'company_id' => $company->id,
        'jabatan_id' => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);

    // Both users should exist in database
    expect(User::where('pin', '12345678')->count())->toBe(2);
    expect($user1->pin)->toBe($user2->pin);
});

test('API allows creating users with duplicate PINs', function () {
    // Create test data
    $role = UserRole::factory()->create(['role_name' => 'User']);
    $company = Company::factory()->create();
    $jabatan = Jabatan::factory()->create();
    $aplikasi = Aplikasi::factory()->create();

    // Create super admin user for authentication
    $superAdmin = User::factory()->create();
    $superAdminRole = UserRole::factory()->create(['role_name' => 'Super Admin']);
    UsersAuth::create([
        'user_id' => $superAdmin->id,
        'role_id' => $superAdminRole->id,
        'company_id' => $company->id,
        'jabatan_id' => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);

    // Create first user via API
    $response1 = $this->actingAs($superAdmin)->postJson('/api/users', [
        'name' => 'API User One',
        'email' => 'apiuser1@example.com',
        'password' => 'password123',
        'pin' => '87654321',
        'address' => 'Test Address 1',
        'phone_number' => '081234567890',
        'user_auths' => [
            [
                'role_id' => $role->id,
                'company_id' => $company->id,
                'jabatan_id' => $jabatan->id,
                'aplikasi_id' => $aplikasi->id,
            ]
        ]
    ]);

    $response1->assertStatus(201);

    // Create second user with same PIN via API
    $response2 = $this->actingAs($superAdmin)->postJson('/api/users', [
        'name' => 'API User Two',
        'email' => 'apiuser2@example.com',
        'password' => 'password123',
        'pin' => '87654321', // Same PIN as first user
        'address' => 'Test Address 2',
        'phone_number' => '081234567891',
        'user_auths' => [
            [
                'role_id' => $role->id,
                'company_id' => $company->id,
                'jabatan_id' => $jabatan->id,
                'aplikasi_id' => $aplikasi->id,
            ]
        ]
    ]);

    $response2->assertStatus(201);

    // Verify both users were created with same PIN
    expect(User::where('pin', '87654321')->count())->toBe(2);
});
