<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.google.client_id' => 'test-google-client',
        'services.google.client_secret' => 'test-google-secret',
    ]);
});

function fakeGoogleIdentity(array $overrides = []): void
{
    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'test-access-token',
            'token_type' => 'Bearer',
        ], 200),
        'https://www.googleapis.com/oauth2/v3/userinfo' => Http::response(array_merge([
            'sub' => 'google-user-123',
            'email' => 'grower@example.com',
            'email_verified' => true,
            'name' => 'Google Grower',
        ], $overrides), 200),
    ]);
}

test('google OAuth redirects to Google with a state value', function () {
    $response = $this->get(route('auth.google.redirect'));

    $response->assertRedirect();
    expect(parse_url($response->headers->get('Location'), PHP_URL_HOST))
        ->toBe('accounts.google.com');
    expect(session('google_oauth_state'))->toBeString()->toHaveLength(40);
});

test('Google OAuth callback registers a verified user and authenticates them', function () {
    fakeGoogleIdentity();

    $response = $this->withSession(['google_oauth_state' => 'valid-state'])
        ->get(route('auth.google.callback', [
            'state' => 'valid-state',
            'code' => 'google-auth-code',
        ]));

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticated();

    $this->assertDatabaseHas('users', [
        'name' => 'Google Grower',
        'email' => 'grower@example.com',
        'google_id' => 'google-user-123',
    ]);

    expect(User::query()->where('email', 'grower@example.com')->first()->email_verified_at)
        ->not->toBeNull();
});

test('Google OAuth links an existing account with the same verified email', function () {
    $user = User::factory()->create([
        'email' => 'grower@example.com',
        'google_id' => null,
    ]);
    fakeGoogleIdentity();

    $response = $this->withSession(['google_oauth_state' => 'valid-state'])
        ->get(route('auth.google.callback', [
            'state' => 'valid-state',
            'code' => 'google-auth-code',
        ]));

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($user);
    expect($user->refresh()->google_id)->toBe('google-user-123');
});

test('Google OAuth rejects a mismatched state', function () {
    $response = $this->withSession(['google_oauth_state' => 'expected-state'])
        ->get(route('auth.google.callback', [
            'state' => 'different-state',
            'code' => 'google-auth-code',
        ]));

    $response->assertForbidden();
    $this->assertGuest();
});

test('Google OAuth rejects an unverified email', function () {
    fakeGoogleIdentity(['email_verified' => false]);

    $response = $this->withSession(['google_oauth_state' => 'valid-state'])
        ->get(route('auth.google.callback', [
            'state' => 'valid-state',
            'code' => 'google-auth-code',
        ]));

    $response->assertRedirect(route('login'));
    $this->assertGuest();
    $this->assertDatabaseMissing('users', ['email' => 'grower@example.com']);
});

test('Google OAuth preserves two-factor authentication for existing users', function () {
    $user = User::factory()->withTwoFactor()->create([
        'email' => 'grower@example.com',
    ]);
    fakeGoogleIdentity();

    $response = $this->withSession(['google_oauth_state' => 'valid-state'])
        ->get(route('auth.google.callback', [
            'state' => 'valid-state',
            'code' => 'google-auth-code',
        ]));

    $response->assertRedirect(route('two-factor.login'));
    $this->assertGuest();
    expect(session('login.id'))->toBe($user->id);
});
