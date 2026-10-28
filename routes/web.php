<?php

use App\Http\Controllers\Auth\GoogleOAuthController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware('guest')->group(function () {
    Route::get('auth/google', [GoogleOAuthController::class, 'redirect'])->name('auth.google.redirect');
    Route::get('auth/google/callback', [GoogleOAuthController::class, 'callback'])->name('auth.google.callback');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('monitoring', 'monitoring')->name('monitoring');
    Route::inertia('devices', 'devices')->name('devices');
    Route::inertia('cultivation', 'cultivation')->name('cultivation');
    Route::inertia('cultivation/history', 'cultivation-history')->name('cultivation.history');
    Route::inertia('cultivation/journal', 'cultivation-journal')->name('cultivation.journal');
    Route::inertia('cultivation/expenses', 'cultivation-expenses')->name('cultivation.expenses');
    Route::inertia('reports', 'reports')->name('reports');
});

require __DIR__.'/settings.php';
