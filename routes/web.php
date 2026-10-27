<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('monitoring', 'monitoring')->name('monitoring');
    Route::inertia('devices', 'devices')->name('devices');
    Route::inertia('cultivation', 'cultivation')->name('cultivation');
});

require __DIR__.'/settings.php';
