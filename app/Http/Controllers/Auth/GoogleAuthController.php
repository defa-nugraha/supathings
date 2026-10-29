<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        $clientId = config('services.google.client_id');

        abort_if(blank($clientId), 503, 'Google authentication is not configured.');

        $state = Str::random(40);
        $request->session()->put('google_oauth_state', $state);

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => config('services.google.redirect'),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'prompt' => 'select_account',
        ]);

        return redirect('https://accounts.google.com/o/oauth2/v2/auth?'.$query);
    }

    public function callback(Request $request): RedirectResponse
    {
        $expectedState = $request->session()->pull('google_oauth_state');
        abort_unless(
            is_string($expectedState)
                && is_string($request->query('state'))
                && hash_equals($expectedState, $request->query('state')),
            419,
            'Invalid Google authentication state.',
        );

        if ($request->filled('error') || ! $request->filled('code')) {
            return redirect()->route('login')->withErrors([
                'email' => 'Google sign-in was cancelled or could not be completed.',
            ]);
        }

        $tokenResponse = Http::asForm()->acceptJson()->post('https://oauth2.googleapis.com/token', [
            'code' => $request->string('code')->toString(),
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'redirect_uri' => config('services.google.redirect'),
            'grant_type' => 'authorization_code',
        ]);

        if (! $tokenResponse->successful() || ! is_string($tokenResponse->json('access_token'))) {
            return redirect()->route('login')->withErrors([
                'email' => 'Google could not verify your account. Please try again.',
            ]);
        }

        $profileResponse = Http::withToken($tokenResponse->json('access_token'))
            ->acceptJson()
            ->get('https://openidconnect.googleapis.com/v1/userinfo');

        $profile = $profileResponse->json();

        if (
            ! $profileResponse->successful()
            || ! is_array($profile)
            || ! filter_var($profile['email'] ?? null, FILTER_VALIDATE_EMAIL)
            || ($profile['email_verified'] ?? false) !== true
            || blank($profile['sub'] ?? null)
        ) {
            return redirect()->route('login')->withErrors([
                'email' => 'Google did not return a verified email address.',
            ]);
        }

        $user = User::query()->firstOrCreate(
            ['email' => Str::lower($profile['email'])],
            [
                'name' => filled($profile['name'] ?? null) ? $profile['name'] : Str::before($profile['email'], '@'),
                'password' => Str::random(64),
                'email_verified_at' => now(),
            ],
        );

        if (! $user->isActive()) {
            return redirect()->route('login')->withErrors([
                'email' => 'Akun Anda dinonaktifkan. Hubungi administrator.',
            ]);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->intended($user->isAdmin() ? route('admin.dashboard') : config('fortify.home', '/dashboard'));
    }
}
