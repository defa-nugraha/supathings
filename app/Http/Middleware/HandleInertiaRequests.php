<?php

namespace App\Http\Middleware;

use App\Models\AppSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $settings = AppSetting::query()->first();

        return [
            ...parent::share($request),
            'name' => $settings->app_name ?? config('app.name', 'Supathings'),
            'branding' => [
                'name' => $settings->app_name ?? config('app.name', 'Supathings'),
                'logoUrl' => $settings?->logo_path ? Storage::disk('public')->url($settings->logo_path) : null,
            ],
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'email_verified_at' => $request->user()->email_verified_at,
                    'role' => $request->user()->role,
                    'is_active' => $request->user()->is_active,
                    'created_at' => $request->user()->created_at,
                    'updated_at' => $request->user()->updated_at,
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
