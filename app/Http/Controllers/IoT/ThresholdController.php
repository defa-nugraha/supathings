<?php
namespace App\Http\Controllers\IoT;
use App\Http\Controllers\Controller;
use App\Models\IotDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class ThresholdController extends Controller {
 public function show(Request $request,IotDevice $device):JsonResponse{abort_unless($device->user_id===$request->user()->id,404);return response()->json(['data'=>$device->thresholds()->firstOrCreate(['iot_device_id'=>$device->id])->fresh()]);}
 public function update(Request $request,IotDevice $device):JsonResponse {
  abort_unless($device->user_id===$request->user()->id,404);
  $v=$request->validate(['temperature_min'=>['required','numeric','between:-20,80'],'temperature_max'=>['required','numeric','between:-20,80','gt:temperature_min'],'humidity_min'=>['required','numeric','between:0,100'],'humidity_max'=>['required','numeric','between:0,100','gt:humidity_min'],'light_min'=>['required','integer','min:0','max:100000'],'light_max'=>['required','integer','min:1','max:100000','gt:light_min'],'automatic_mode'=>['required','boolean']]);
  return response()->json(['data'=>$device->thresholds()->updateOrCreate(['iot_device_id'=>$device->id],$v)]);
 }
}