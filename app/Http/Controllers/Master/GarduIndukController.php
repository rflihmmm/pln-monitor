<?php

namespace App\Http\Controllers\Master;

use Inertia\Inertia;
use App\Models\GarduInduk;
use Illuminate\Http\Request;
use App\Models\StationPointSkada;
use App\Http\Controllers\Controller;

class GarduIndukController extends Controller
{
    public function index()
    {
        $garduInduks = GarduInduk::all();

        // Ambil semua keypoint_id unik dari GarduInduk
        $keypointIds = $garduInduks->pluck('keypoint_id')->filter()->unique()->toArray();
        $keypointNames = [];
        if (!empty($keypointIds)) {
            $keypoints = StationPointSkada::whereIn('PKEY', $keypointIds)->pluck('NAME', 'PKEY');
            $keypointNames = $keypoints->toArray();
        }

        // Tambahkan properti keypoint_name ke setiap GarduInduk
        $garduInduks = $garduInduks->map(function ($gi) use ($keypointNames) {
            $gi->keypoint_name = $gi->keypoint_id && isset($keypointNames[$gi->keypoint_id])
                ? $keypointNames[$gi->keypoint_id]
                : null;
            return $gi;
        });

        return Inertia::render('master/gardu-induk', [
            'garduIndukList' => $garduInduks
        ]);
    }

    public function getKeypoints(Request $request)
    {
        $filter = $request->query('filter', null);
        $keyword = "GI-";

        try {
            if (!$filter || strlen($filter) < 3) {
                return response()->json([]);
            }

            $keypoints = StationPointSkada::select("PKEY", "NAME")
                ->where('NAME', 'LIKE', '%' . $keyword . '%' . $filter . '%')
                ->get()
                ->map(function ($query) {
                    return [
                        'id' => $query->PKEY,
                        'name' => $query->NAME
                    ];
                });

            return response()->json($keypoints);
        } catch (\Throwable $th) {
            return response()->json([
                'message' => 'Error fetching keypoints',
                'error' => $th->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'keypoint_id' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        GarduInduk::create($validated);

        return redirect()->route('master.gardu-induk.index')->with('success', 'Berhasil menambah Gardu Induk.');
    }

    public function update(Request $request, GarduInduk $garduInduk)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'keypoint_id' => 'nullable|integer',
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
