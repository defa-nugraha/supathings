<?php

use App\Http\Controllers\Api\CultivationController;
use App\Http\Controllers\Api\IotDeviceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->group(function (): void {
    Route::get('/devices', [IotDeviceController::class, 'index']);
    Route::get('/devices/{device}/readings', [IotDeviceController::class, 'readings']);
    Route::post('/devices', [IotDeviceController::class, 'store']);
    Route::post('/control-rules', [IotDeviceController::class, 'rules']);
    Route::post('/control-mode', [IotDeviceController::class, 'mode']);
    Route::post('/actuator-commands', [IotDeviceController::class, 'command']);

    Route::get('/cultivation/batches', [CultivationController::class, 'batches']);
    Route::post('/cultivation/batches', [CultivationController::class, 'storeBatch']);
    Route::patch('/cultivation/batches/{batch}', [CultivationController::class, 'updateBatch']);
    Route::get('/cultivation/harvests', [CultivationController::class, 'harvests']);
    Route::post('/cultivation/batches/{batch}/harvests', [CultivationController::class, 'storeHarvest']);
    Route::get('/cultivation/alerts', [CultivationController::class, 'alerts']);
});

Route::post('/telemetry', [IotDeviceController::class, 'telemetry'])->middleware('throttle:120,1');
