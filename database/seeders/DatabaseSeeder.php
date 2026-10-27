<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $password = env('SUPATHINGS_ADMIN_PASSWORD');

        if (! $password && app()->environment(['local', 'testing'])) {
            $password = 'Supathings@123!';
        }

        if (! $password) {
            throw new RuntimeException(
                'Set SUPATHINGS_ADMIN_PASSWORD before running seeders outside local/testing.'
            );
        }

        User::updateOrCreate(
            ['email' => env('SUPATHINGS_ADMIN_EMAIL', 'admin@supathings.local')],
            [
                'name' => env('SUPATHINGS_ADMIN_NAME', 'Supathings Admin'),
                'password' => $password,
                'email_verified_at' => now(),
            ],
        );
    }
}
