<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class IotThreshold extends Model {
 protected $fillable=['iot_device_id','temperature_min','temperature_max','humidity_min','humidity_max','light_min','light_max','automatic_mode'];
 protected function casts():array{return ['automatic_mode'=>'boolean','temperature_min'=>'float','temperature_max'=>'float','humidity_min'=>'float','humidity_max'=>'float'];}
 public function device():BelongsTo{return $this->belongsTo(IotDevice::class,'iot_device_id');}
}