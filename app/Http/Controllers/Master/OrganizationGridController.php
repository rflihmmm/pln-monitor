<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationKeypoint;
use App\Models\FeederKeypoint;
use App\Models\Feeder;
use App\Models\GarduInduk;
use App\Models\StationPointSkada;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrganizationGridController extends Controller
{
    public function index(Request $request)
    {
        try {
            // 1. Refactored main query with hierarchy joins
            $organizationData = DB::table('organization_keypoint as ok')
                ->join('organization as ulp', 'ok.organization_id', '=', 'ulp.id')
                ->where('ulp.level', 3) // ULP is level 3
                ->leftJoin('organization as up3', 'ulp.parent_id', '=', 'up3.id') // Join for UP3
                ->leftJoin('organization as dcc', 'up3.parent_id', '=', 'dcc.id') // Join for DCC
                ->leftJoin('feeder_keypoints as fk', 'ok.keypoint_id', '=', 'fk.keypoint_id')
                ->leftJoin('feeders as f', 'fk.feeder_id', '=', 'f.id')
                ->leftJoin('gardu_induks as gi', 'f.gardu_induk_id', '=', 'gi.id')
                ->leftJoin('keypoint_ext as ke', 'ok.keypoint_id', '=', 'ke.keypoint_id')
                ->select([
                    'ok.id',
                    'ok.keypoint_id',
                    'dcc.name as dcc',
                    'up3.name as up3',
                    'ulp.name as ulp',
                    'gi.name as gardu_induk',
                    'f.name as feeder',
                    'ke.coordinate',
                    'ke.parent_stationpoints'
                ])
                ->get();

            // 2. Consolidate cross-database queries
            $keypointIds = $organizationData->pluck('keypoint_id')->filter();
            $parentKeypointIds = $organizationData->pluck('parent_stationpoints')->filter();
            $allRequiredIds = $keypointIds->merge($parentKeypointIds)->unique()->toArray();

            $keypointNames = [];
            if (!empty($allRequiredIds)) {
                $stationPointsData = DB::connection('sqlsrv_main')
                    ->table('STATIONPOINTS')
                    ->whereIn('PKEY', $allRequiredIds)
                    ->select('PKEY', 'NAME')
                    ->get();

                // Create a lookup map for keypoint names
                foreach ($stationPointsData as $sp) {
                    $keypointNames[$sp->PKEY] = $sp->NAME;
                }
            }

            // Query for the dropdown list (remains separate)
            $allKeypoints = DB::connection('sqlsrv_main')
                ->table('STATIONPOINTS')
                ->select('PKEY as id', 'NAME as name')
                ->orderBy('NAME', 'asc')
                ->get();

            // 3. Simplify data processing
            $result = $organizationData->map(function ($item) use ($keypointNames) {
                return [
                    'id' => $item->id,
                    'dcc' => $item->dcc ?? '',
                    'up3' => $item->up3 ?? '',
                    'ulp' => $item->ulp ?? '',
                    'gardu_induk' => $item->gardu_induk ?? '',
                    'feeder' => $item->feeder ?? '',
                    'keypoint' => $keypointNames[$item->keypoint_id] ?? '',
                    'coordinate' => $item->coordinate ?? '',
                    'parent_keypoint' => $keypointNames[$item->parent_stationpoints] ?? ''
                ];
            });

            return inertia('master/mapping', [
                'datas' => $result,
                'keypointsList' => $allKeypoints,
                'success' => session('success')
            ]);
        } catch (\Exception $e) {
            // It's good practice to log the actual error for debugging
            \Illuminate\Support\Facades\Log::error('Failed to fetch organization grid data: ' . $e->getMessage());
            return inertia('master/mapping', [
                'datas' => [],
                'keypointsList' => [],
                'error' => 'Gagal mengambil data. Silakan coba lagi.', // User-friendly message
                'message' => config('app.debug') ? $e->getMessage() : '' // Show detailed error only in debug mode
            ]);
        }
    }


    public function store(Request $request)
    {
        // Validasi input - hanya memerlukan ULP ID dan keypoints
        $validated = $request->validate([
            'ulp' => 'required|string',
            'keypoints' => 'required|array',
            'keypoints.*' => 'required|integer',
        ]);

        // Pastikan ULP ID yang dipilih benar-benar ULP (level 3)
        $ulp = Organization::where('name', $validated['ulp'])
            ->where('level', 3)
            ->firstOrFail();

        // Simpan relasi keypoint dengan ULP saja
        foreach ($validated['keypoints'] as $keypointId) {
            OrganizationKeypoint::firstOrCreate([
                'organization_id' => $ulp->id,
                'keypoint_id' => $keypointId,
            ]);

            // Simpan koordinat jika ada
            if (!empty($validated['coordinate'])) {
                DB::table('keypoint_ext')->updateOrInsert(
                    ['keypoint_id' => $keypointId],
                    ['coordinate' => $validated['coordinate']]
                );
            }
        }

        return redirect()->back()->with('success', 'Data berhasil disimpan');
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'ulp' => 'required|string',       // <-- [FIX] Ubah dari 'ulp_id' menjadi 'ulp'
            'keypoint' => 'required|integer',
        ]);

        // Pastikan ULP ID yang dipilih benar-benar ULP (level 3)
        $ulp = Organization::where('name', $validated['ulp'])
            ->where('level', 3)
            ->firstOrFail();

        // Temukan organization_keypoint berdasarkan id
        $orgKeypoint = OrganizationKeypoint::findOrFail($id);

        // Update relasi keypoint dengan ULP
        $orgKeypoint->organization_id = $ulp->id;
        $orgKeypoint->keypoint_id = $validated['keypoint'];
        $orgKeypoint->save();


        return redirect()->back()->with('success', 'Data berhasil diupdate');
    }

    public function destroy($id)
    {
        $orgKeypoint = OrganizationKeypoint::findOrFail($id);
        $orgKeypoint->delete();
        return redirect()->back()->with('success', 'Data berhasil dihapus');
    }


    public function getUlpData(Request $request)
    {
        try {
            $ulps = DB::table('organization')
                ->where('level', 3)
                ->select('id', 'name')
                ->get();

            return response()->json($ulps);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch ULP data',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
