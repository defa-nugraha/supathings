<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('actuator_schedules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('iot_device_id')->constrained('iot_devices')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actuator');
            $table->string('state');
            $table->time('time');
            $table->json('days');
            $table->boolean('enabled')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamps();
            $table->index(['iot_device_id', 'enabled', 'time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actuator_schedules');
    }
};
