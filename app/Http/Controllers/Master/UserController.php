<?php

namespace App\Http\Controllers\Master;

use App\Models\User;
use Inertia\Inertia;
use App\Models\Organization;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use App\Http\Controllers\Controller;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('roles')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->roles->first() ? $user->roles->first()->name : 'user',
                'unit' => $user->organization ? $user->organization->name : null,
                'unit_id' => $user->unit,
                'createdAt' => $user->created_at->toISOString(),
            ];
        });

        return Inertia::render('master/manage-users', [
            'users' => $users
        ]);
    }

    public function create()
    {
        $roles = Role::all()->pluck('name');
        return Inertia::render('master/manage-users', [
            'roles' => $roles
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|exists:roles,name',
            'unit' => 'nullable|integer|exists:organization,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'unit' => $validated['unit'] ?? null,
        ]);

        $user->assignRole($validated['role']);

        return redirect()->route('master.manage-users.index')->with('success', 'Berhasil menambah User.');
    }

    public function update(Request $request, User $manage_user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $manage_user->id,
            'role' => 'sometimes|string|exists:roles,name',
            'unit' => 'nullable|integer|exists:organization,id',
        ]);

        $manage_user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'unit' => $validated['unit'] ?? null,
        ]);

        if (isset($validated['role'])) {
            $manage_user->syncRoles([$validated['role']]);
        }

        return redirect()->route('master.manage-users.index')->with('success', 'Berhasil melakukan update User.');
    }

    public function destroy(User $manage_user)
    {
        $manage_user->delete();
        return redirect()->route('master.manage-users.index')->with('success', 'Berhasil menghapus User.');
    }

    public function getOrganizations()
    {
        $organizations = Organization::select('id', 'name', 'level', 'parent_id', 'address')
            ->with('parent:id,name')
            ->orderBy('level')
            ->orderBy('name')
            ->get()
            ->map(function ($org) {
                return [
                    'id' => $org->id,
                    'name' => $org->name,
                    'level' => $org->level,
                    'level_name' => $org->getLevelNameAttribute(),
                    'parent_id' => $org->parent_id,
                    'parent_name' => $org->parent ? $org->parent->name : null,
                    'address' => $org->address,
                    'display_name' => $org->name . ' (' . $org->getLevelNameAttribute() . ')',
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $organizations
        ]);
    }
}
