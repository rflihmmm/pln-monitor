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

        // 2. Ekstrak semua keypoint_id untuk kueri berikutnya
        $keypointIds = $keypointExtData->pluck('keypoint_id')->filter()->unique()->toArray();

        // 3. Adopsi fungsi Anda: Query STATIONPOINTS dari MSSQL
        $stationPoints = [];
        if (!empty($keypointIds)) {
            $stationPointsData = DB::connection('sqlsrv_main')
                ->table('dbo.STATIONPOINTS') // Disarankan menggunakan schema 'dbo.'
                ->whereIn('PKEY', $keypointIds)
                ->select('PKEY', 'NAME')
                ->get();

            // Ubah menjadi array asosiatif untuk pencarian yang lebih mudah
            foreach ($stationPointsData as $sp) {
                $stationPoints[$sp->PKEY] = $sp->NAME;
            }
        }

        // 4. Gabungkan data nama ke dalam koleksi keypointExtData
        $data = $keypointExtData->map(function ($item) use ($stationPoints) {
            // Tambahkan properti 'name' ke setiap objek keypoint
            // Gunakan null coalescing (??) untuk menangani ID yang tidak ditemukan
            $item->name = $stationPoints[$item->keypoint_id] ?? null;
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
