<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BrandingController extends Controller
{
    public function edit(): Response
    {
        $settings = AppSetting::query()->first();

        return Inertia::render('settings/branding', [
            'brandingSettings' => [
                'appName' => $settings->app_name ?? config('app.name', 'Supathings'),
                'logoUrl' => $settings?->logo_path ? Storage::disk('public')->url($settings->logo_path) : null,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'app_name' => ['required', 'string', 'max:60'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $settings = AppSetting::query()->first();
        $logoPath = $settings?->logo_path;

        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('branding', 'public');
        }

        AppSetting::query()->updateOrCreate(
            ['id' => 1],
            [
                'app_name' => trim($validated['app_name']),
                'logo_path' => $logoPath,
                'updated_by' => $request->user()->id,
            ],
        );

        if ($settings?->logo_path && $logoPath !== $settings->logo_path) {
            Storage::disk('public')->delete($settings->logo_path);
        }

        return back()->with('success', 'Identitas aplikasi berhasil diperbarui.');
    }

    public function removeLogo(Request $request): RedirectResponse
    {
        $settings = AppSetting::query()->first();

        if (! $settings) {
            throw ValidationException::withMessages([
                'logo' => 'Belum ada logo yang dapat dihapus.',
            ]);
        }

        if ($settings->logo_path) {
            Storage::disk('public')->delete($settings->logo_path);
            $settings->update(['logo_path' => null, 'updated_by' => $request->user()->id]);
        }

        return back()->with('success', 'Logo aplikasi berhasil dihapus.');
    }
}
