<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Feeder;
use App\Models\GarduInduk;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FeederController extends Controller
{
    public function index()
    {
        $feeders = Feeder::with('garduInduk')->get();
        $garduInduks = GarduInduk::all();

        return Inertia::render('master/feeder', [
            'feederList' => $feeders,
            'garduIndukList' => $garduInduks
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'gardu_induk_id' => 'required|exists:gardu_induks,id',
        ]);

        Feeder::create($validated);

        return redirect()->route('feeder.index');
    }

    public function update(Request $request, Feeder $feeder)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'gardu_induk_id' => 'required|exists:gardu_induks,id',
        ]);

        $feeder->update($validated);

        return redirect()->route('feeder.index');
    }

    public function destroy(Feeder $feeder)
    {
        $feeder->delete();
        return redirect()->route('feeder.index');
    }
}
