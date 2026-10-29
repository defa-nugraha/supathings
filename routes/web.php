<?php

use App\Http\Controllers\Admin\DeviceManagementController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Models\ActuatorCommand;
use App\Models\CultivationBatch;
use App\Models\HarvestRecord;
use App\Models\IotDevice;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');

Route::middleware(['auth', 'account.active', 'verified'])->group(function (): void {
    Route::get('dashboard', function () {
        return auth()->user()->isAdmin()
            ? redirect()->route('admin.dashboard')
            : Inertia::render('dashboard');
    })->name('dashboard');

    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function (): void {
        Route::get('dashboard', function () {
            return Inertia::render('admin/dashboard', [
                'stats' => [
                    'users' => User::query()->count(),
                    'activeUsers' => User::query()->where('is_active', true)->count(),
                    'devices' => IotDevice::query()->count(),
                    'onlineDevices' => IotDevice::query()->where('status', 'online')->count(),
                    'batches' => CultivationBatch::query()->count(),
                    'harvests' => HarvestRecord::query()->count(),
                    'pendingCommands' => ActuatorCommand::query()->where('status', 'pending')->count(),
                ],
            ]);
        })->name('dashboard');

        Route::get('users', [UserManagementController::class, 'index'])->name('users.index');
        Route::patch('users/{user}', [UserManagementController::class, 'update'])->whereNumber('user')->name('users.update');
        Route::get('devices', [DeviceManagementController::class, 'index'])->name('devices.index');
        Route::patch('devices/{device}', [DeviceManagementController::class, 'update'])->whereNumber('device')->name('devices.update');
    });

    Route::inertia('monitoring', 'monitoring')->name('monitoring');
    Route::inertia('devices', 'devices')->name('devices');
    Route::inertia('cultivation', 'cultivation')->name('cultivation');
    Route::inertia('cultivation/history', 'cultivation-history')->name('cultivation.history');
    Route::inertia('cultivation/journal', 'cultivation-journal')->name('cultivation.journal');
    Route::inertia('cultivation/expenses', 'cultivation-expenses')->name('cultivation.expenses');
    Route::inertia('reports', 'reports')->name('reports');
});

require __DIR__.'/settings.php';
