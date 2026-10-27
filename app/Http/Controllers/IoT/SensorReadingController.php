<?php
namespace App\Http\Controllers\IoT;
use App\Http\Controllers\Controller;
use App\Models\IotDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class SensorReadingController extends Controller {
 public function index(Request $request,IotDevice $device):JsonResponse {
  abort_unless($device->user_id===$request->user()->id,404);
  $v=$request->validate(['limit'=>['sometimes','integer','min:1','max:500']]);
  return response()->json(['data'=>$device->readings()->latest('recorded_at')->limit($v['limit']??100)->get()]);
 }
}