<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iot_devices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('mac_address', 17)->unique();
            $table->string('name');
            $table->string('status')->default('offline');
            $table->string('control_mode')->default('manual');
            $table->timestamp('last_seen_at')->nullable()->index();
            $table->string('device_token_hash', 64)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status']);
        });

        Schema::create('sensor_readings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('iot_device_id')->constrained('iot_devices')->cascadeOnDelete();
            $table->decimal('temperature', 6, 2)->nullable();
            $table->decimal('humidity', 6, 2)->nullable();
            $table->unsignedSmallInteger('light_raw')->nullable();
            $table->decimal('light_percent', 6, 2)->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('measured_at')->index();
            $table->timestamps();
            $table->index(['iot_device_id', 'measured_at']);
        });

        Schema::create('control_rules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('iot_device_id')->constrained('iot_devices')->cascadeOnDelete();
            $table->string('parameter');
            $table->decimal('minimum', 10, 2)->nullable();
            $table->decimal('maximum', 10, 2)->nullable();
            $table->boolean('enabled')->default(true);
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->unique(['iot_device_id', 'parameter']);
        });

        Schema::create('actuator_commands', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('iot_device_id')->constrained('iot_devices')->cascadeOnDelete();
            $table->string('actuator');
            $table->string('state');
            $table->string('mode')->default('manual');
            $table->string('status')->default('pending')->index();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('acknowledged_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['iot_device_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actuator_commands');
        Schema::dropIfExists('control_rules');
        Schema::dropIfExists('sensor_readings');
        Schema::dropIfExists('iot_devices');
    }
};
