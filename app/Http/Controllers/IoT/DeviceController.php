<?php
namespace App\Http\Controllers\IoT;
use App\Http\Controllers\Controller;
use App\Models\IotDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
class DeviceController extends Controller {
 public function index(Request $request):JsonResponse{return response()->json(['data'=>$request->user()->iotDevices()->with('thresholds')->latest()->get()]);}
 public function store(Request $request):JsonResponse {
  $v=$request->validate(['mac_address'=>['required','regex:/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/',Rule::unique('iot_devices','mac_address')->where('user_id',$request->user()->id)],'name'=>['required','string','max:100']]);
  $device=IotDevice::create([...$v,'mac_address'=>strtoupper($v['mac_address']),'user_id'=>$request->user()->id]);
  $device->thresholds()->create(['temperature_min'=>24,'temperature_max'=>30,'humidity_min'=>80,'humidity_max'=>90,'light_min'=>200,'light_max'=>700]);
  return response()->json(['data'=>$device->load('thresholds')],201);
 }
 public function destroy(Request $request,IotDevice $device):JsonResponse{abort_unless($device->user_id===$request->user()->id,404);$device->delete();return response()->json(['message'=>'Device dihapus.']);}
}