<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('iot_devices', function (Blueprint $table): void {
            $table->text('device_token_encrypted')->nullable()->after('device_token_hash');
        });
    }

    public function down(): void
    {
        Schema::table('iot_devices', function (Blueprint $table): void {
            $table->dropColumn('device_token_encrypted');
        });
    }
};
