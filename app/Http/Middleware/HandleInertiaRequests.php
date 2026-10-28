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
            'name' => $settings?->app_name ?? config('app.name', 'Supathings'),
            'branding' => [
                'name' => $settings?->app_name ?? config('app.name', 'Supathings'),
                'logoUrl' => $settings?->logo_path ? Storage::disk('public')->url($settings->logo_path) : null,
            ],
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
