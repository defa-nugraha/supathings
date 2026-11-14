<?php

use App\Http\Controllers\Api\AiIntelligenceController;
use App\Http\Controllers\Api\CultivationController;
use App\Http\Controllers\Api\IotDeviceController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ActuatorScheduleController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'account.active', 'verified'])->group(function (): void {
    Route::get('/account/token', [IotDeviceController::class, 'showUserToken'])->middleware('throttle:10,1');
    Route::post('/account/token/rotate', [IotDeviceController::class, 'rotateUserToken'])->middleware('throttle:5,1');
    Route::get('/devices', [IotDeviceController::class, 'index']);
    Route::get('/devices/{device}/readings', [IotDeviceController::class, 'readings']);
    Route::get('/devices/{device}/token', [IotDeviceController::class, 'showToken'])->middleware('throttle:10,1');
    Route::post('/devices/{device}/token/rotate', [IotDeviceController::class, 'rotateToken'])->middleware('throttle:5,1');
    Route::post('/devices', [IotDeviceController::class, 'store']);
    Route::patch('/devices/{device}', [IotDeviceController::class, 'update']);
    Route::delete('/devices/{device}', [IotDeviceController::class, 'destroy']);
    Route::post('/control-rules', [IotDeviceController::class, 'rules']);
    Route::post('/control-mode', [IotDeviceController::class, 'mode']);
    Route::post('/actuator-commands', [IotDeviceController::class, 'command']);
    Route::get('/actuator-status', [IotDeviceController::class, 'actuatorStatus']);
    Route::get('/actuator-schedules', [ActuatorScheduleController::class, 'index']);
    Route::post('/actuator-schedules', [ActuatorScheduleController::class, 'store']);
    Route::patch('/actuator-schedules/{schedule}', [ActuatorScheduleController::class, 'update']);
    Route::delete('/actuator-schedules/{schedule}', [ActuatorScheduleController::class, 'destroy']);

    Route::get('/cultivation/batches', [CultivationController::class, 'batches']);
    Route::post('/cultivation/batches', [CultivationController::class, 'storeBatch']);
    Route::patch('/cultivation/batches/{batch}', [CultivationController::class, 'updateBatch']);
    Route::delete('/cultivation/batches/{batch}', [CultivationController::class, 'destroyBatch']);
    Route::get('/cultivation/harvests', [CultivationController::class, 'harvests']);
    Route::post('/cultivation/batches/{batch}/harvests', [CultivationController::class, 'storeHarvest']);
    Route::patch('/cultivation/harvests/{harvest}', [CultivationController::class, 'updateHarvest']);
    Route::delete('/cultivation/harvests/{harvest}', [CultivationController::class, 'destroyHarvest']);
    Route::get('/cultivation/alerts', [CultivationController::class, 'alerts']);
    Route::get('/cultivation/expenses', [CultivationController::class, 'expenses']);
    Route::post('/cultivation/expenses', [CultivationController::class, 'storeExpense']);
    Route::patch('/cultivation/expenses/{expense}', [CultivationController::class, 'updateExpense']);
    Route::delete('/cultivation/expenses/{expense}', [CultivationController::class, 'destroyExpense']);
    Route::get('/reports', [ReportController::class, 'index']);
    Route::get('/ai/analysis/latest', [AiIntelligenceController::class, 'latest'])->middleware('throttle:30,1');
    Route::post('/ai/analysis', [AiIntelligenceController::class, 'analyze'])->middleware('throttle:5,1');
    Route::post('/ai/chat', [AiIntelligenceController::class, 'chat'])->middleware('throttle:20,1');
});

Route::get('/device/commands', [IotDeviceController::class, 'pollCommands'])->middleware('throttle:120,1');
Route::post('/device/commands/{command}/ack', [IotDeviceController::class, 'acknowledgeCommand'])->middleware('throttle:120,1');
Route::post('/telemetry', [IotDeviceController::class, 'telemetry'])->middleware('throttle:120,1');
