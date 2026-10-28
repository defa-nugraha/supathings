<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cultivation_expenses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cultivation_batch_id')->nullable()->constrained('cultivation_batches')->nullOnDelete();
            $table->date('incurred_at')->index();
            $table->string('category', 40);
            $table->string('description', 160);
            $table->decimal('amount', 14, 2);
            $table->timestamps();
            $table->index(['user_id', 'incurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cultivation_expenses');
    }
};
