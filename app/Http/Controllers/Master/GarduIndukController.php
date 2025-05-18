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

        return redirect()->route('master.gardu-induk.index')->with('success', 'Berhasil menambah Gardu Induk.');
    }

    public function update(Request $request, GarduInduk $garduInduk)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $garduInduk->update($validated);

        return redirect()->route('master.gardu-induk.index')->with('success', 'Berhasil melakukan update Gardu Induk.');
    }

    public function destroy(GarduInduk $garduInduk)
    {
        $garduInduk->delete();
        return redirect()->route('master.gardu-induk.index')->with('success', 'Berhasil menghapus Gardu Induk.');
    }
}
