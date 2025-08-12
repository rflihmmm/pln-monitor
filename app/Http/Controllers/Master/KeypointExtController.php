<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\KeypointExt;

class KeypointExtController extends Controller
{
    // Tampilkan semua data keypoint_ext
    public function index()
    {
        // 1. Ambil semua data dari tabel keypoint_ext
        $keypointExtData = KeypointExt::all();

        // 2. Ekstrak semua keypoint_id dan parent_stationpoints untuk kueri berikutnya
        $keypointIds = $keypointExtData->pluck('keypoint_id')->filter()->unique()->toArray();
        $parentIds = $keypointExtData->pluck('parent_stationpoints')->filter()->unique()->toArray();

        // 3. Query STATIONPOINTS dari MSSQL untuk keypoint_id
        $stationPoints = [];
        if (!empty($keypointIds)) {
            $stationPointsData = DB::connection('sqlsrv_main')
                ->table('dbo.STATIONPOINTS')
                ->whereIn('PKEY', $keypointIds)
                ->select('PKEY', 'NAME')
                ->get();
            foreach ($stationPointsData as $sp) {
                $stationPoints[$sp->PKEY] = $sp->NAME;
            }
        }

        // 4. Query STATIONPOINTS dari MSSQL untuk parent_stationpoints
        $parentNames = [];
        if (!empty($parentIds)) {
            $parentPointsData = DB::connection('sqlsrv_main')
                ->table('dbo.STATIONPOINTS')
                ->whereIn('PKEY', $parentIds)
                ->select('PKEY', 'NAME')
                ->get();
            foreach ($parentPointsData as $pp) {
                $parentNames[$pp->PKEY] = $pp->NAME;
            }
        }

        // 5. Gabungkan data nama ke dalam koleksi keypointExtData
        $data = $keypointExtData->map(function ($item) use ($stationPoints, $parentNames) {
            $item->name = $stationPoints[$item->keypoint_id] ?? null;
            $item->parent_name = $parentNames[$item->parent_stationpoints] ?? null;
            return $item;
        });

        return inertia('master/keypoint-ext', [
            'keypointExtList' => $data,
            'success' => session('success')
        ]);
    }

    // Simpan data baru ke keypoint_ext
    public function store(Request $request)
    {
        $validated = $request->validate([
            'keypoint_id' => 'required|integer',
            'coordinate' => 'nullable|string',
            'alamat' => 'nullable|string',
            'parent_stationpoints' => 'nullable|integer',
        ]);
        KeypointExt::create($validated);
        return redirect()->back()->with('success', 'Data berhasil ditambahkan');
    }

    // Update data keypoint_ext
    public function update(Request $request, $keypoint_id)
    {
        $validated = $request->validate([
            'keypoint_id' => 'required|integer',
            'coordinate' => 'nullable|string',
            'alamat' => 'nullable|string',
            'parent_stationpoints' => 'nullable|integer',
        ]);
        $affected = KeypointExt::where('keypoint_id', $keypoint_id)->update($validated);
        return redirect()->back()->with('success', $affected ? 'Data berhasil diupdate' : 'Tidak ada perubahan');
    }

    // Hapus data keypoint_ext
    public function destroy($keypoint_id)
    {
        $deleted = KeypointExt::where('keypoint_id', $keypoint_id)->delete();
        return redirect()->back()->with('success', $deleted ? 'Data berhasil dihapus' : 'Data tidak ditemukan');
    }
}
