<?php

namespace App\Console\Commands;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Console\Command;

class PromoteUserToAdmin extends Command
{
    protected $signature = 'supathings:make-admin {email : Email address of an existing verified account}';

    protected $description = 'Promote an existing verified account to administrator from the server CLI';

    public function handle(): int
    {
        $user = User::query()->where('email', mb_strtolower(trim((string) $this->argument('email'))))->first();

        if (! $user) {
            $this->error('Pengguna tidak ditemukan. Buat akun dan verifikasi email terlebih dahulu.');

            return self::FAILURE;
        }

        if (! $user->hasVerifiedEmail()) {
            $this->error('Email pengguna harus terverifikasi sebelum dijadikan admin.');

            return self::FAILURE;
        }

        $previousRole = $user->role;
        $user->forceFill([
            'role' => 'admin',
            'is_active' => true,
            'disabled_at' => null,
        ])->save();

        AdminAuditLog::query()->create([
            'actor_id' => null,
            'target_user_id' => $user->id,
            'action' => 'user.admin_bootstrapped',
            'metadata' => [
                'role_before' => $previousRole,
                'role_after' => 'admin',
                'source' => 'console',
            ],
        ]);

        $this->info($user->email.' sekarang menjadi admin aktif.');

        return self::SUCCESS;
    }
}
