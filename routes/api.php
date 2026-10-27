<?php

use App\Http\Controllers\Api\IotDeviceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->group(function (): void {
    Route::get('/devices', [IotDeviceController::class, 'index']);
    Route::post('/devices', [IotDeviceController::class, 'store']);
    Route::post('/control-rules', [IotDeviceController::class, 'rules']);
    Route::post('/actuator-commands', [IotDeviceController::class, 'command']);
});

Route::post('/telemetry', [IotDeviceController::class, 'telemetry'])->middleware('throttle:120,1');
