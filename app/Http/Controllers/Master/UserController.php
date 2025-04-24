<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

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
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
        ]);

        $user->assignRole($validated['role']);

        return redirect()->route('manage-users.index');
    }

    public function update(Request $request, User $manage_user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $manage_user->id,
            'role' => 'sometimes|string|exists:roles,name',
        ]);

        $manage_user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        if (isset($validated['role'])) {
            $manage_user->syncRoles([$validated['role']]);
        }

        return redirect()->route('manage-users.index');
    }

    public function destroy(User $manage_user)
    {
        $manage_user->delete();
        return redirect()->route('manage-users.index');
    }
}
