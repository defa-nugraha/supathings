<?php

use App\Http\Controllers\IoT\DeviceController;
use App\Http\Controllers\IoT\SensorReadingController;
use App\Http\Controllers\IoT\ThresholdController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');
Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('monitoring', 'monitoring')->name('monitoring');
    Route::inertia('devices', 'devices')->name('devices.index');
    Route::inertia('settings/account', 'settings/profile')->name('account.settings');
    Route::prefix('api/iot')->name('iot.')->group(function () {
        Route::get('devices', [DeviceController::class, 'index'])->name('devices.index');
        Route::post('devices', [DeviceController::class, 'store'])->name('devices.store');
        Route::delete('devices/{device}', [DeviceController::class, 'destroy'])->name('devices.destroy');
        Route::get('devices/{device}/readings', [SensorReadingController::class, 'index'])->name('readings.index');
        Route::get('devices/{device}/thresholds', [ThresholdController::class, 'show'])->name('thresholds.show');
        Route::put('devices/{device}/thresholds', [ThresholdController::class, 'update'])->name('thresholds.update');
    });
});
require __DIR__.'/settings.php';
