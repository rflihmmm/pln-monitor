<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Feeder;
use App\Models\FeederStatusPoint;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FeederStatusPointController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $statusPoints = FeederStatusPoint::with('feeder')->get();
        $feeders = Feeder::all();

        return Inertia::render('master/feeder-status-points', [
            'statusPointsList' => $statusPoints,
            'feederList' => $feeders
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:pmt,apm,mw',
            'status_id' => 'required|integer',
            'feeder_id' => 'required|exists:feeders,id',
        ]);

        FeederStatusPoint::create($validated);

        return redirect()->route('feeder-status-points.index')->with('success', 'Berhasil menambah Status Point.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, FeederStatusPoint $feederStatusPoint)
    {
        $validated = $request->validate([
            'type' => 'required|in:pmt,apm,mw',
            'status_id' => 'required|integer',
            'feeder_id' => 'required|exists:feeders,id',
        ]);

        $feederStatusPoint->update($validated);

        return redirect()->route('feeder-status-points.index')->with('success', 'Berhasil melakukan update Status Point.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FeederStatusPoint $feederStatusPoint)
    {
        $feederStatusPoint->delete();
        return redirect()->route('feeder-status-points.index')->with('success', 'Berhasil menghapus Status Point.');
    }
}
