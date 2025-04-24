<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\GarduInduk;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GarduIndukController extends Controller
{
    public function index()
    {
        $garduInduks = GarduInduk::all();

        return Inertia::render('master/gardu-induk', [
            'garduIndukList' => $garduInduks
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        GarduInduk::create($validated);

        return redirect()->route('gardu-induk.index');
    }

    public function update(Request $request, GarduInduk $garduInduk)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $garduInduk->update($validated);

        return redirect()->route('gardu-induk.index')->with('success', 'Gardu Induk updated successfully.');
    }

    public function destroy(GarduInduk $garduInduk)
    {
        $garduInduk->delete();
        return redirect()->route('gardu-induk.index');
    }
}
