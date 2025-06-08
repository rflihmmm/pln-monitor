<?php

namespace App\Http\Controllers\Master;

use Inertia\Inertia;
use App\Models\MapsData;
use Illuminate\Http\Request;
use App\Models\FeederKeypoint;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Log;

class MapsDataController extends Controller
{
    public function index()
    {
        $mapsData = MapsData::all();

        $keypoints = FeederKeypoint::orderBy('name')->get();

        return Inertia::render('master/maps', [
            'mapsDataList' => $mapsData,
            'keypointsList' => $keypoints,
            'filters' => request()->only(['search', 'up3', 'dcc'])
        ]);
    }

    public function store(Request $request)
    {
        try {
            $validate = $request->validate([
                'no' => 'nullable|string|max:255',
                'keypoint_id' => 'required|integer|exists:feeder_keypoints,keypoint_id',
                'ulp' => 'nullable|string|max:255',
                'up3' => 'nullable|string|max:255',
                'dcc' => 'nullable|string|max:255',
                'lokasi' => 'nullable|string|max:500'
            ]);

            MapsData::create($validate);

            return redirect()->route('master.maps.index')
                ->with('success', 'Data berhasil ditambahkan');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Gagal menambahkan data: ' . $e->getMessage())
                ->withInput();
        }
    }

    public function update(Request $request, MapsData $mapsData)
    {
        try {
            // Debug logging
            Log::info('Update method called', [
                'request_data' => $request->all(),
                'maps_data_id' => $mapsData->id,
                'maps_data' => $mapsData->toArray()
            ]);

            // Pastikan model ditemukan
            if (!$mapsData->exists) {
                Log::error('MapsData not found for update');
                return redirect()->back()
                    ->with('error', 'Data tidak ditemukan');
            }

            $validate = $request->validate([
                'no' => 'nullable|string|max:255',
                'keypoint_id' => 'required|integer|exists:feeder_keypoints,keypoint_id',
                'ulp' => 'nullable|string|max:255',
                'up3' => 'nullable|string|max:255',
                'dcc' => 'nullable|string|max:255',
                'lokasi' => 'nullable|string|max:500'
            ]);

            $mapsData->update($validate);

            Log::info('Data updated successfully', ['id' => $mapsData->id]);

            return redirect()->route('master.maps.index')
                ->with('success', 'Data berhasil diperbarui');
        } catch (\Exception $e) {
            Log::error('Update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()
                ->with('error', 'Gagal memperbarui data: ' . $e->getMessage())
                ->withInput();
        }
    }

    public function destroy(MapsData $mapsData)
    {
        try {
            // Debug logging
            Log::info('Delete method called', [
                'maps_data_id' => $mapsData->id,
                'maps_data' => $mapsData->toArray()
            ]);

            // Pastikan model ditemukan
            if (!$mapsData->exists) {
                Log::error('MapsData not found for delete');
                return redirect()->back()
                    ->with('error', 'Data tidak ditemukan');
            }

            $mapsData->delete();
            
            Log::info('Data deleted successfully', ['id' => $mapsData->id]);
            
            return redirect()->route('master.maps.index')
                ->with('success', 'Data berhasil dihapus');
        } catch (\Exception $e) {
            Log::error('Delete failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()
                ->with('error', 'Gagal menghapus data: ' . $e->getMessage());
        }
    }

    public function getKeypoints(Request $request)
    {
        try {
            $search = $request->get('filter', '');

            $query = FeederKeypoint::query();

            if (!empty($search)) {
                $query->where('name', 'ILIKE', '%' . $search . '%');
            }

            $keypoints = $query->orderBy('name')
                ->limit(50) // Batasi hasil untuk performa
                ->get()
                ->map(function ($keypoint) {
                    return [
                        'id' => $keypoint->keypoint_id,
                        'name' => $keypoint->name,
                        'stationname' => $keypoint->name // Sesuaikan dengan struktur yang dibutuhkan
                    ];
                });

            return response()->json($keypoints);
        } catch (\Exception $e) {
            return response()->json([], 500);
        }
    }
}