<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::query()
            ->select(['id', 'name', 'email', 'role', 'is_active', 'created_at', 'email_verified_at'])
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request): void {
                $search = '%'.$request->string('search')->trim().'%';
                $query->where(function ($nested) use ($search): void {
                    $nested->where('name', 'like', $search)->orWhere('email', 'like', $search);
                });
            })
            ->when(in_array($request->query('role'), ['admin', 'user'], true), fn ($query) => $query->where('role', $request->query('role')))
            ->when(in_array($request->query('status'), ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $request->query('status') === 'active'))
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/users', [
            'users' => $users,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'role' => $request->query('role', ''),
                'status' => $request->query('status', ''),
            ],
            'activeAdminCount' => User::query()->where('role', 'admin')->where('is_active', true)->count(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'in:admin,user'],
            'is_active' => ['required', 'boolean'],
        ]);

        $actor = $request->user();
        $newRole = $validated['role'];
        $newActive = (bool) $validated['is_active'];

        if ($actor->is($user) && (! $newActive || $newRole !== 'admin')) {
            throw ValidationException::withMessages([
                'user' => 'Anda tidak dapat menonaktifkan akun sendiri atau menghapus role admin sendiri.',
            ]);
        }

        DB::transaction(function () use ($actor, $user, $newRole, $newActive, $request): void {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $removingAdmin = $lockedUser->role === 'admin' && ($newRole !== 'admin' || ! $newActive);

            if ($removingAdmin) {
                $activeAdmins = User::query()->where('role', 'admin')->where('is_active', true)->lockForUpdate()->count();
                if ($activeAdmins <= 1) {
                    throw ValidationException::withMessages([
                        'user' => 'Minimal harus ada satu admin aktif di sistem.',
                    ]);
                }
            }

            $lockedUser->forceFill([
                'role' => $newRole,
                'is_active' => $newActive,
                'disabled_at' => $newActive ? null : ($lockedUser->disabled_at ?? now()),
            ])->save();

            AdminAuditLog::query()->create([
                'actor_id' => $actor->id,
                'target_user_id' => $lockedUser->id,
                'action' => 'user.access_updated',
                'metadata' => [
                    'role_before' => $user->role,
                    'role_after' => $newRole,
                    'active_before' => $user->is_active,
                    'active_after' => $newActive,
                ],
                'ip_address' => $request->ip(),
            ]);
        });

        return back()->with('success', 'Akses pengguna berhasil diperbarui.');
    }
}
