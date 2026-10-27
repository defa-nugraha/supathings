<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('monitoring', 'monitoring')->name('monitoring');
    Route::inertia('devices', 'devices')->name('devices');
    Route::inertia('cultivation', 'cultivation')->name('cultivation');
    Route::inertia('cultivation/history', 'cultivation-history')->name('cultivation.history');
    Route::inertia('cultivation/journal', 'cultivation-journal')->name('cultivation.journal');
});

require __DIR__.'/settings.php';
