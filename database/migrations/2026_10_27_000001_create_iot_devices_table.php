<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iot_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('mac_address', 17);
            $table->string('name');
            $table->string('status')->default('offline');
            $table->timestamp('last_seen_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'mac_address']);
            $table->index(['status', 'last_seen_at']);
        });
        Schema::create('sensor_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iot_device_id')->constrained('iot_devices')->cascadeOnDelete();
            $table->decimal('temperature', 7, 2)->nullable();
            $table->decimal('humidity', 7, 2)->nullable();
            $table->unsignedInteger('light_raw')->nullable();
            $table->timestamp('recorded_at')->useCurrent();
            $table->index(['iot_device_id', 'recorded_at']);
        });
        Schema::create('iot_thresholds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iot_device_id')->constrained('iot_devices')->cascadeOnDelete();
            $table->decimal('temperature_min', 7, 2)->default(24);
            $table->decimal('temperature_max', 7, 2)->default(30);
            $table->decimal('humidity_min', 7, 2)->default(80);
            $table->decimal('humidity_max', 7, 2)->default(90);
            $table->unsignedInteger('light_min')->default(200);
            $table->unsignedInteger('light_max')->default(700);
            $table->boolean('automatic_mode')->default(true);
            $table->timestamps();
            $table->unique('iot_device_id');
        });
        Schema::create('actuator_commands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iot_device_id')->constrained('iot_devices')->cascadeOnDelete();
            $table->string('actuator', 32);
            $table->boolean('enabled');
            $table->string('source')->default('manual');
            $table->string('status')->default('queued');
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
            $table->index(['iot_device_id', 'status', 'created_at']);
        });
        Schema::create('dashboard_widgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('iot_device_id')->nullable()->constrained('iot_devices')->nullOnDelete();
            $table->string('page')->default('monitoring');
            $table->string('type');
            $table->string('title');
            $table->string('sensor_key')->nullable();
            $table->decimal('min_value', 12, 2)->nullable();
            $table->decimal('max_value', 12, 2)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'page', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_widgets');
        Schema::dropIfExists('actuator_commands');
        Schema::dropIfExists('iot_thresholds');
        Schema::dropIfExists('sensor_readings');
        Schema::dropIfExists('iot_devices');
    }
};
