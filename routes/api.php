<?php

use App\Http\Controllers\Api\CultivationController;
use App\Http\Controllers\Api\IotDeviceController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->group(function (): void {
    Route::get('/devices', [IotDeviceController::class, 'index']);
    Route::get('/devices/{device}/readings', [IotDeviceController::class, 'readings']);
    Route::post('/devices', [IotDeviceController::class, 'store']);
    Route::post('/control-rules', [IotDeviceController::class, 'rules']);
    Route::post('/control-mode', [IotDeviceController::class, 'mode']);
    Route::post('/actuator-commands', [IotDeviceController::class, 'command']);
    Route::get('/actuator-status', [IotDeviceController::class, 'actuatorStatus']);

    Route::get('/cultivation/batches', [CultivationController::class, 'batches']);
    Route::post('/cultivation/batches', [CultivationController::class, 'storeBatch']);
    Route::patch('/cultivation/batches/{batch}', [CultivationController::class, 'updateBatch']);
    Route::delete('/cultivation/batches/{batch}', [CultivationController::class, 'deleteBatch']);
    Route::get('/cultivation/harvests', [CultivationController::class, 'harvests']);
    Route::post('/cultivation/batches/{batch}/harvests', [CultivationController::class, 'storeHarvest']);
    Route::patch('/cultivation/harvests/{harvest}', [CultivationController::class, 'updateHarvest']);
    Route::delete('/cultivation/harvests/{harvest}', [CultivationController::class, 'deleteHarvest']);
    Route::get('/cultivation/alerts', [CultivationController::class, 'alerts']);
    Route::get('/cultivation/expenses', [CultivationController::class, 'expenses']);
    Route::post('/cultivation/expenses', [CultivationController::class, 'storeExpense']);
    Route::patch('/cultivation/expenses/{expense}', [CultivationController::class, 'updateExpense']);
    Route::delete('/cultivation/expenses/{expense}', [CultivationController::class, 'deleteExpense']);
    Route::get('/reports', [ReportController::class, 'index']);
});

Route::get('/device/commands', [IotDeviceController::class, 'pollCommands'])->middleware('throttle:120,1');
Route::post('/device/commands/{command}/ack', [IotDeviceController::class, 'acknowledgeCommand'])->middleware('throttle:120,1');
Route::post('/telemetry', [IotDeviceController::class, 'telemetry'])->middleware('throttle:120,1');
