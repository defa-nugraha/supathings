<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('api_token_hash', 64)->nullable()->unique()->after('password');
            $table->text('api_token_encrypted')->nullable()->after('api_token_hash');
        });

        DB::table('users')
            ->select(['id'])
            ->whereNull('api_token_hash')
            ->orderBy('id')
            ->eachById(function (object $user): void {
                $token = Str::random(64);

                DB::table('users')
                    ->where('id', $user->id)
                    ->update([
                        'api_token_hash' => hash('sha256', $token),
                        'api_token_encrypted' => Crypt::encryptString($token),
                    ]);
            });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['api_token_hash']);
            $table->dropColumn(['api_token_hash', 'api_token_encrypted']);
        });
    }
};
