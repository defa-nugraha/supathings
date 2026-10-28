<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class GoogleOAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        $clientId = config('services.google.client_id');

        if (! $clientId || ! config('services.google.client_secret')) {
            return redirect()->route('login')->withErrors([
                'google' => 'Login Google belum dikonfigurasi. Silakan gunakan email dan kata sandi.',
            ]);
        }

        $state = Str::random(40);
        $request->session()->put('google_oauth_state', $state);

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => route('auth.google.callback'),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'prompt' => 'select_account',
        ]);

        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.$query);
    }

    public function callback(Request $request): RedirectResponse
    {
        $expectedState = $request->session()->pull('google_oauth_state');
        $receivedState = $request->query('state');

        if (! is_string($expectedState) || ! is_string($receivedState) || ! hash_equals($expectedState, $receivedState)) {
            abort(Response::HTTP_FORBIDDEN, 'Permintaan login Google tidak valid atau sudah kedaluwarsa.');
        }

        if ($request->filled('error') || ! $request->filled('code')) {
            return redirect()->route('login')->withErrors([
                'google' => 'Login Google dibatalkan atau tidak dapat diselesaikan.',
            ]);
        }

        try {
            $tokenResponse = Http::asForm()
                ->timeout(10)
                ->post('https://oauth2.googleapis.com/token', [
                    'client_id' => config('services.google.client_id'),
                    'client_secret' => config('services.google.client_secret'),
                    'code' => $request->string('code')->toString(),
                    'grant_type' => 'authorization_code',
                    'redirect_uri' => route('auth.google.callback'),
                ])
                ->throw()
                ->json();

            if (! is_array($tokenResponse) || ! is_string($tokenResponse['access_token'] ?? null)) {
                return redirect()->route('login')->withErrors([
                    'google' => 'Google tidak mengembalikan token akses yang valid.',
                ]);
            }

            $googleUser = Http::withToken($tokenResponse['access_token'])
                ->acceptJson()
                ->timeout(10)
                ->get('https://www.googleapis.com/oauth2/v3/userinfo')
                ->throw()
                ->json();

            if (! is_array($googleUser)) {
                return redirect()->route('login')->withErrors([
                    'google' => 'Respons identitas dari Google tidak valid.',
                ]);
            }
        } catch (Throwable $exception) {
            Log::warning('Google OAuth callback failed.', [
                'exception' => $exception::class,
            ]);

            return redirect()->route('login')->withErrors([
                'google' => 'Tidak dapat memverifikasi akun Google. Silakan coba kembali.',
            ]);
        }

        $googleId = $googleUser['sub'] ?? null;
        $email = isset($googleUser['email']) ? Str::lower(trim((string) $googleUser['email'])) : null;
        $emailVerified = filter_var($googleUser['email_verified'] ?? false, FILTER_VALIDATE_BOOL);
        $name = trim((string) ($googleUser['name'] ?? ''));

        if (! is_string($googleId) || $googleId === '' || ! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL) || ! $emailVerified) {
            return redirect()->route('login')->withErrors([
                'google' => 'Google tidak memberikan identitas email terverifikasi yang valid.',
            ]);
        }

        $user = User::query()->where('google_id', $googleId)->first();

        if (! $user) {
            $user = User::query()->where('email', $email)->first();
        }

        if ($user && $user->google_id && ! hash_equals((string) $user->google_id, $googleId)) {
            return redirect()->route('login')->withErrors([
                'google' => 'Email ini sudah terhubung ke akun Google lain. Hubungi administrator jika membutuhkan bantuan.',
            ]);
        }

        if (! $user) {
            $user = User::query()->create([
                'name' => $name !== '' ? $name : Str::before($email, '@'),
                'email' => $email,
                'email_verified_at' => now(),
                'password' => Str::random(64),
                'google_id' => $googleId,
            ]);
        } else {
            $user->forceFill([
                'google_id' => $googleId,
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();
        }

        if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
            $request->session()->regenerate();
            $request->session()->put([
                'login.id' => $user->getKey(),
                'login.remember' => false,
            ]);

            return redirect()->route('two-factor.login');
        }

        Auth::login($user, remember: false);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }
}
