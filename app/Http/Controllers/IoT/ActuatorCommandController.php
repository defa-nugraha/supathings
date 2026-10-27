<?php
namespace App\Http\Controllers\IoT;
use App\Http\Controllers\Controller;
use App\Models\IotDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class ActuatorCommandController extends Controller {
 public function store(Request $request,IotDevice $device):JsonResponse {
  abort_unless($device->user_id===$request->user()->id,404);
  $v=$request->validate(['actuator'=>['required','in:pump_mist,pump_water,blower'],'enabled'=>['required','boolean']]);
  if($device->status!=='online') return response()->json(['message'=>'Device sedang offline; perintah tidak dikirim.'],409);
  $command=$device->commands()->create([...$v,'source'=>'manual','status'=>'queued']);
  return response()->json(['data'=>$command],202);
 }
}