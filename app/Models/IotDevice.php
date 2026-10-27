<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
class IotDevice extends Model {
 protected $fillable=['user_id','mac_address','name','status','last_seen_at','metadata'];
 protected function casts():array{return ['last_seen_at'=>'datetime','metadata'=>'array'];}
 public function user():BelongsTo{return $this->belongsTo(User::class);}
 public function readings():HasMany{return $this->hasMany(SensorReading::class);}
 public function thresholds():HasOne{return $this->hasOne(IotThreshold::class);}
 public function commands():HasMany{return $this->hasMany(ActuatorCommand::class);}
}