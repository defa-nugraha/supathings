<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cultivation_batches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('iot_device_id')->nullable()->constrained('iot_devices')->nullOnDelete();
            $table->string('name', 100);
            $table->string('strain', 100)->nullable();
            $table->date('inoculated_at');
            $table->unsignedInteger('baglog_count');
            $table->string('phase', 40)->default('incubation');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'phase']);
            $table->index(['user_id', 'inoculated_at']);
        });

        Schema::create('harvest_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cultivation_batch_id')->constrained('cultivation_batches')->cascadeOnDelete();
            $table->date('harvested_at');
            $table->unsignedTinyInteger('flush_number')->default(1);
            $table->decimal('weight_kg', 8, 3);
            $table->string('quality', 40)->nullable();
            $table->decimal('sale_price_per_kg', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'harvested_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('harvest_records');
        Schema::dropIfExists('cultivation_batches');
    }
};
