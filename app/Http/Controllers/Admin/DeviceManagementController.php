<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\CultivationBatch;
use App\Models\IotDevice;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DeviceManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $devices = IotDevice::query()
            ->with('user:id,name,email')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search')->trim().'%';
                $query->where(function ($nested) use ($search): void {
                    $nested->where('name', 'like', $search)
                        ->orWhere('mac_address', 'like', $search)
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', $search)->orWhere('email', 'like', $search));
                });
            })
            ->orderByDesc('updated_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/devices', [
            'devices' => $devices,
            'users' => User::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'email']),
            'filters' => ['search' => $request->string('search')->toString()],
        ]);
    }

    public function update(Request $request, IotDevice $device): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $newOwner = User::query()->where('is_active', true)->find($validated['user_id']);
        if (! $newOwner) {
            throw ValidationException::withMessages(['user_id' => 'Pemilik baru harus merupakan akun aktif.']);
        }

        DB::transaction(function () use ($request, $device, $validated, $newOwner): void {
            $record = IotDevice::query()->lockForUpdate()->findOrFail($device->id);
            $oldOwnerId = $record->user_id;

            if ($oldOwnerId !== $newOwner->id) {
                CultivationBatch::query()->where('user_id', $oldOwnerId)->where('iot_device_id', $record->id)->update(['iot_device_id' => null]);
            }

            $record->forceFill([
                'name' => trim($validated['name']),
                'user_id' => $newOwner->id,
            ])->save();

            AdminAuditLog::query()->create([
                'actor_id' => $request->user()->id,
                'target_user_id' => $newOwner->id,
                'action' => 'device.updated',
                'metadata' => [
                    'device_id' => $record->id,
                    'mac_address' => $record->mac_address,
                    'previous_owner_id' => $oldOwnerId,
                    'new_owner_id' => $newOwner->id,
                    'name' => $record->name,
                ],
                'ip_address' => $request->ip(),
            ]);
        });

        return back()->with('success', 'Perangkat berhasil diperbarui. Relasi batch pemilik sebelumnya telah dilepas bila diperlukan.');
    }
}
