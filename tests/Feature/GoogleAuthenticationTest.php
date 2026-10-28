<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.google.client_id' => 'google-client-id',
        'services.google.client_secret' => 'google-client-secret',
        'services.google.redirect' => 'http://localhost/auth/google/callback',
    ]);
});

it('redirects users to Google for authentication', function () {
    $response = $this->get(route('auth.google.redirect'));

    $response->assertRedirect();

    expect($response->headers->get('Location'))
        ->toStartWith('https://accounts.google.com/o/oauth2/v2/auth?')
        ->toContain('client_id=google-client-id');
});

it('creates and signs in a user with a verified Google account', function () {
    Http::fake([
        'oauth2.googleapis.com/token' => Http::response([
            'access_token' => 'google-access-token',
            'token_type' => 'Bearer',
        ]),
        'openidconnect.googleapis.com/v1/userinfo' => Http::response([
            'sub' => 'google-user-123',
            'email' => 'new.user@example.com',
            'email_verified' => true,
            'name' => 'New Google User',
        ]),
    ]);

    $response = $this
        ->withSession(['google_oauth_state' => 'valid-state'])
        ->get(route('auth.google.callback', [
            'state' => 'valid-state',
            'code' => 'authorization-code',
        ]));

    $response->assertRedirect('/dashboard');

    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'name' => 'New Google User',
        'email' => 'new.user@example.com',
    ]);

    expect(User::query()->where('email', 'new.user@example.com')->first()?->email_verified_at)
        ->not->toBeNull();
});

it('rejects Google callbacks with an invalid state', function () {
    $response = $this
        ->withSession(['google_oauth_state' => 'expected-state'])
        ->get(route('auth.google.callback', [
            'state' => 'attacker-state',
            'code' => 'authorization-code',
        ]));

    $response->assertStatus(419);
    $this->assertGuest();
});

it('does not expose the removed passkey discovery endpoint', function () {
    $this->get('/.well-known/passkey-endpoints')->assertNotFound();
});
