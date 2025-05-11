<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Feeder;
use App\Models\FeederKeypoint;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FeederKeypointController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $keypoints = FeederKeypoint::with('feeder')->get();
        $feeders = Feeder::all();

        return Inertia::render('master/feeder-keypoints', [
            'keypointsList' => $keypoints,
            'feederList' => $feeders
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'feeder_id' => 'required|exists:feeders,id',
            'keypoint_id' => 'required|integer',
        ]);

        FeederKeypoint::create($validated);

        return redirect()->route('feeder-keypoints.index')->with('success', 'Berhasil menambah Keypoint.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, FeederKeypoint $feederKeypoint)
    {
        $validated = $request->validate([
            'feeder_id' => 'required|exists:feeders,id',
            'keypoint_id' => 'required|integer',
        ]);

        $feederKeypoint->update($validated);

        return redirect()->route('feeder-keypoints.index')->with('success', 'Berhasil melakukan update Keypoint.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FeederKeypoint $feederKeypoint)
    {
        $feederKeypoint->delete();
        return redirect()->route('feeder-keypoints.index')->with('success', 'Berhasil menghapus Keypoint.');
    }
}
