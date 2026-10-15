<?php

/**
 * PasswordUpdateTest.php
 *
 * Tests for password update functionality in AMS.
 *
 * NOTE: In AMS, the password update feature is consolidated into the unified
 * Profile page (resources/js/pages/profile.tsx) and processed via
 * PATCH /profile (route 'profile.update') handled by ProfileController@update
 * using ProfileUpdateRequest.
 *
 * The standalone Settings\PasswordController was an orphaned legacy template from
 * initial scaffolding and is not part of the active routing architecture.
 */

use App\Models\User;
use Illuminate\Support\Facades\Hash;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('password can be updated with correct current password', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/profile')
        ->patch('/profile', [
            'name'                  => $user->name,
            'email'                 => $user->email,
            'current_password'      => 'password',
            'password'              => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

test('correct password must be provided to update password', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/profile')
        ->patch('/profile', [
            'name'                  => $user->name,
            'email'                 => $user->email,
            'current_password'      => 'wrong-password',
            'password'              => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasErrors('current_password')
        ->assertRedirect('/profile');

    expect(Hash::check('new-password', $user->refresh()->password))->toBeFalse();
});

test('password confirmation must match to update password', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/profile')
        ->patch('/profile', [
            'name'                  => $user->name,
            'email'                 => $user->email,
            'current_password'      => 'password',
            'password'              => 'new-password',
            'password_confirmation' => 'different-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/profile');

    expect(Hash::check('new-password', $user->refresh()->password))->toBeFalse();
});

test('password must be at least 8 characters', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/profile')
        ->patch('/profile', [
            'name'                  => $user->name,
            'email'                 => $user->email,
            'current_password'      => 'password',
            'password'              => 'short',
            'password_confirmation' => 'short',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/profile');
});