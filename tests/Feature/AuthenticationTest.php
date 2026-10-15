<?php

/**
 * AuthenticationTest.php
 *
 * Feature tests for authentication flows in AMS:
 * - Login screen rendering
 * - Login with valid/invalid credentials
 * - Logout
 * - Registration
 * - Email verification
 * - Password confirmation
 * - Password reset flow
 *
 * Covers requirements: REQ-AUTH-001 through REQ-AUTH-010
 */

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

// =============================================================================
// LOGIN TESTS
// =============================================================================

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'email'    => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('user.dashboard'));
});

test('users cannot authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'email'    => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users cannot authenticate with non-existent email', function () {
    $this->post('/login', [
        'email'    => 'notexist@example.com',
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('login is rate limited after too many attempts', function () {
    $user = User::factory()->create();

    foreach (range(0, 4) as $_) {
        $this->post('/login', [
            'email'    => $user->email,
            'password' => 'wrong-password',
        ]);
    }

    $response = $this->post('/login', [
        'email'    => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

// =============================================================================
// LOGOUT TESTS
// =============================================================================

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect(route('login'));
});

test('guests cannot access protected routes', function () {
    $response = $this->get('/dashboard');

    $response->assertRedirect('/login');
});

// =============================================================================
// REGISTRATION TESTS
// =============================================================================

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    $response = $this->post('/register', [
        'name'                  => 'Test User',
        'email'                 => 'test@example.com',
        'password'              => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('waiting-room'));
});

test('registration requires a name', function () {
    $response = $this->post('/register', [
        'name'                  => '',
        'email'                 => 'test@example.com',
        'password'              => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('name');
    $this->assertGuest();
});

test('registration requires a valid email', function () {
    $response = $this->post('/register', [
        'name'                  => 'Test User',
        'email'                 => 'not-an-email',
        'password'              => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('registration requires matching passwords', function () {
    $response = $this->post('/register', [
        'name'                  => 'Test User',
        'email'                 => 'test@example.com',
        'password'              => 'password',
        'password_confirmation' => 'different-password',
    ]);

    $response->assertSessionHasErrors('password');
    $this->assertGuest();
});

test('registration requires unique email', function () {
    $existing = User::factory()->create(['email' => 'existing@example.com']);

    $response = $this->post('/register', [
        'name'                  => 'New User',
        'email'                 => 'existing@example.com',
        'password'              => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

// =============================================================================
// EMAIL VERIFICATION TESTS
// =============================================================================

test('email verification screen can be rendered', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->get('/verify-email');

    $response->assertStatus(200);
});

test('email verification notification can be resent', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->post('/email/verification-notification');

    $response->assertRedirect();
    $response->assertSessionHas('status', 'verification-link-sent');
});

test('unverified users are not redirected to verify if already verified', function () {
    $user = User::factory()->create(); // already verified

    // Verified users should not be forced to verify-email page
    $response = $this->actingAs($user)->get('/verify-email');

    // Should redirect away (302) as user is already verified
    $response->assertStatus(302);
});

// =============================================================================
// PASSWORD CONFIRMATION TESTS
// =============================================================================

test('confirm password screen can be rendered', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/confirm-password');

    $response->assertStatus(200);
});

test('password can be confirmed', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/confirm-password', [
        'password' => 'password',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();
});

test('password is not confirmed with invalid password', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/confirm-password', [
        'password' => 'wrong-password',
    ]);

    $response->assertSessionHasErrors();
});

// =============================================================================
// PASSWORD RESET TESTS
// =============================================================================

test('reset password link screen can be rendered', function () {
    $response = $this->get('/forgot-password');

    $response->assertStatus(200);
});

test('reset password link can be requested', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class);
});

test('reset password screen can be rendered', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) {
        $response = $this->get('/reset-password/' . $notification->token);

        $response->assertStatus(200);

        return true;
    });
});

test('password can be reset with valid token', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
        $response = $this->post('/reset-password', [
            'token'                 => $notification->token,
            'email'                 => $user->email,
            'password'              => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertSessionHasNoErrors();

        return true;
    });
});
