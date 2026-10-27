<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    use HasFactory, Notifiable, TwoFactorAuthenticatable;
    protected $fillable = ['name', 'email', 'password'];
    protected $hidden = ['password', 'remember_token', 'two_factor_recovery_codes', 'two_factor_secret'];
    protected function casts(): array { return ['email_verified_at' => 'datetime', 'password' => 'hashed', 'two_factor_confirmed_at' => 'datetime']; }
    public function iotDevices(): HasMany { return $this->hasMany(IotDevice::class); }
}