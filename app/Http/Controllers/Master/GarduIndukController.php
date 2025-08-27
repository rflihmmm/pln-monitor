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
        $search = request('search');
        $keypoint = request('keypoint');
        $perPage = request('per_page', 25);
        $query = GarduInduk::select(['id', 'name', 'coordinate', 'keypoint_id', 'description'])
            ->with(['keypoint:NAME,PKEY']);

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%$search%"])
                    ->orWhereRaw('LOWER(description) LIKE ?', ["%$search%"]);
            });
        }
        if ($keypoint && $keypoint !== 'all') {
            $query->where('keypoint_id', $keypoint);
        }

        $garduInduks = $query->paginate($perPage)->appends(request()->query());

        $garduInduks->getCollection()->transform(function ($gi) {
            $gi->keypoint_name = $gi->keypoint && $gi->keypoint->NAME ? $gi->keypoint->NAME : null;
            unset($gi->keypoint);
            return $gi;
        });

        return Inertia::render('master/gardu-induk', [
            'garduIndukList' => $garduInduks
        ]);
    }

    public function getKeypoints(Request $request)
    {
        $filter = $request->query('filter', null);
        //$keyword = "GI-";

        try {
            if (!$filter || strlen($filter) < 3) {
                return response()->json([]);
            }

            $keypoints = StationPointSkada::select("PKEY", "NAME")
                ->where('NAME', 'LIKE', '%' . $filter . '%')
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
            'coordinate' => 'nullable|string',
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
            'coordinate' => 'nullable|string',
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
