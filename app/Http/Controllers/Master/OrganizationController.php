<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrganizationController extends Controller
{
    public function index()
    {
        $organizations = Organization::with('parent')->get();

        return Inertia::render('master/organization', [
            'organizationList' => $organizations
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'level' => 'required|integer|in:1,2,3',
            'parent_id' => 'nullable|integer|exists:organizations,id',
            'address' => 'nullable|string',
            'coordinate' => 'nullable|string',
        ]);

        Organization::create($validated);

        return redirect()->route('master.organization.index')->with('success', 'Berhasil menambah Organization.');
    }

    public function update(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'level' => 'required|integer|in:1,2,3',
            'parent_id' => 'nullable|integer|exists:organizations,id',
            'address' => 'nullable|string',
            'coordinate' => 'nullable|string',
        ]);

        $organization->update($validated);

        return redirect()->route('master.organization.index')->with('success', 'Berhasil melakukan update Organization.');
    }

    public function destroy(Organization $organization)
    {
        $organization->delete();
        return redirect()->route('master.organization.index')->with('success', 'Berhasil menghapus Organization.');
    }
}
