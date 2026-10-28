<?php

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('authenticated users can view application branding settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('branding.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/branding')
            ->where('brandingSettings.appName', config('app.name', 'Supathings'))
            ->where('branding.logoUrl', null));
});

test('authenticated users can update the application name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('branding.update'), [
            'app_name' => 'Jamur Pintar',
        ])
        ->assertRedirect();

    expect(AppSetting::query()->firstOrFail()->app_name)->toBe('Jamur Pintar');
});

test('authenticated users can upload a new application logo', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('branding.update'), [
            'app_name' => 'Supathings',
            'logo' => UploadedFile::fake()->image('logo.png'),
        ])
        ->assertRedirect();

    $settings = AppSetting::query()->firstOrFail();

    expect($settings->logo_path)->not->toBeNull();
    Storage::disk('public')->assertExists($settings->logo_path);
});

test('application name is required and limited to sixty characters', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('branding.edit'))
        ->post(route('branding.update'), [
            'app_name' => str_repeat('a', 61),
        ])
        ->assertSessionHasErrors('app_name');
});
