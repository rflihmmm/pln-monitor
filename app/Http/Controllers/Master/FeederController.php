<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Feeder;
use App\Models\GarduInduk;
use App\Models\StationPointSkada;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FeederController extends Controller
{
    public function index()
    {
        $feeders = Feeder::with('garduInduk')->get();
        $garduInduks = GarduInduk::all();

        // $filter_keypoint = request()->query('filter_keypoint', null);
        
        // $keypoints = StationPointSkada::select("PKEY", "NAME")->get()->map(function($query){
        //     return [
        //         'id' => $query->PKEY,
        //         'name' => $query->NAME
        //     ];
        // });

        return Inertia::render('master/feeder', [
            'feederList' => $feeders,
            'garduIndukList' => $garduInduks
        ]);
    }

    public function getKeypoints(Request $request)
    {
        $filter = $request->query('filter', null);

        $keypoints = StationPointSkada::select("PKEY", "NAME")->where('NAME', 'ILIKE', '%' . $filter . '%')->get()->map(function($query){
            return [
                'id' => $query->PKEY,
                'name' => $query->NAME
            ];
        });

        return response()->json($keypoints);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'gardu_induk_id' => 'required|exists:gardu_induks,id',
        ]);

        Feeder::create($validated);

        return redirect()->route('master.feeder.index')->with('success', 'Berhasil menambah Feeder.');
    }

    public function update(Request $request, Feeder $feeder)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'gardu_induk_id' => 'required|exists:gardu_induks,id',
        ]);

        $feeder->update($validated);

        return redirect()->route('master.feeder.index')->with('success', 'Berhasil melakukan update Feeder.');
    }

    public function destroy(Feeder $feeder)
    {
        $feeder->delete();
        return redirect()->route('master.feeder.index')->with('success', 'Berhasil menghapus Feeder.');
    }
}
