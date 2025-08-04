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
            // Query untuk mendapatkan data dari OrganizationKeypoint (hanya level 3/ULP)
            $organizationKeypoints = DB::table('organization_keypoint as ok')
                ->join('organization as org', 'ok.organization_id', '=', 'org.id')
                ->where('org.level', 3) // Hanya ambil yang level 3 (ULP)
                ->leftJoin('feeder_keypoints as fk', 'ok.keypoint_id', '=', 'fk.keypoint_id')
                ->leftJoin('feeders as f', 'fk.feeder_id', '=', 'f.id')
                ->leftJoin('gardu_induks as gi', 'f.gardu_induk_id', '=', 'gi.id')
                ->leftJoin('keypoint_ext as ke', 'ok.keypoint_id', '=', 'ke.keypoint_id')
                ->select([
                    'ok.id',
                    'ok.keypoint_id',
                    'ok.organization_id',
                    'org.name as ulp_name',
                    'org.parent_id as up3_id',
                    'gi.name as gardu_induk',
                    'f.name as feeder',
                    'ke.coordinate',
                    'ke.parent_stationpoints'
                ])
                ->get();

            // Get keypoint IDs untuk query STATIONPOINTS
            $keypointIds = $organizationKeypoints->pluck('keypoint_id')->unique()->toArray();

            // Query STATIONPOINTS dari MSSQL database
            $stationPoints = [];
            if (!empty($keypointIds)) {
                $stationPointsData = DB::connection('sqlsrv_main')
                    ->table('STATIONPOINTS')
                    ->whereIn('PKEY', $keypointIds)
                    ->select('PKEY', 'NAME')
                    ->get();

                // Convert to associative array for easier lookup
                foreach ($stationPointsData as $sp) {
                    $stationPoints[$sp->PKEY] = $sp->NAME;
                }
            }

            // Get unique UP3 IDs untuk query hierarchy
            $up3Ids = $organizationKeypoints->pluck('up3_id')->unique()->filter()->toArray();

            // Query untuk mendapatkan data UP3 dan DCC
            $hierarchyData = [];
            if (!empty($up3Ids)) {
                $up3Data = DB::table('organization')
                    ->whereIn('id', $up3Ids)
                    ->where('level', 2)
                    ->select('id', 'name', 'parent_id')
                    ->get();

                foreach ($up3Data as $up3) {
                    $hierarchyData[$up3->id] = [
                        'up3_name' => $up3->name,
                        'dcc_id' => $up3->parent_id
                    ];
                }

                // Get DCC data
                $dccIds = $up3Data->pluck('parent_id')->unique()->filter()->toArray();
                if (!empty($dccIds)) {
                    $dccData = DB::table('organization')
                        ->whereIn('id', $dccIds)
                        ->where('level', 1)
                        ->select('id', 'name')
                        ->get();

                    foreach ($dccData as $dcc) {
                        // Update hierarchy data dengan DCC name
                        foreach ($hierarchyData as $up3Id => &$hierarchy) {
                            if ($hierarchy['dcc_id'] == $dcc->id) {
                                $hierarchy['dcc_name'] = $dcc->name;
                            }
                        }
                    }
                }
            }

            // Ambil semua parent_stationpoints yang ada
            $allParentStationpoints = $organizationKeypoints->pluck('parent_stationpoints')->filter()->unique()->toArray();
            $parentStationNames = [];
            if (!empty($allParentStationpoints)) {
                // Query ke STATIONPOINTS untuk mapping parent_stationpoints ke NAME
                $parentStationsData = DB::connection('sqlsrv_main')
                    ->table('STATIONPOINTS')
                    ->whereIn('PKEY', $allParentStationpoints)
                    ->select('PKEY', 'NAME')
                    ->get();
                foreach ($parentStationsData as $ps) {
                    $parentStationNames[$ps->PKEY] = $ps->NAME;
                }
            }

            $result = [];
            $id = 0;

            foreach ($organizationKeypoints as $item) {
                // Build hierarchy dari OrganizationKeypoint
                $dcc = '';
                $up3 = '';
                $ulp = $item->ulp_name;

                // Get UP3 dan DCC dari hierarchy data
                if (isset($hierarchyData[$item->up3_id])) {
                    $up3 = $hierarchyData[$item->up3_id]['up3_name'];
                    $dcc = $hierarchyData[$item->up3_id]['dcc_name'] ?? '';
                }

                // Get keypoint name dari STATIONPOINTS
                $keypoint = $stationPoints[$item->keypoint_id] ?? '';

                // Get parent keypoint name
                $parent = '';
                if (!empty($item->parent_stationpoints) && isset($parentStationNames[$item->parent_stationpoints])) {
                    $parent = $parentStationNames[$item->parent_stationpoints];
                }

                $result[] = [
                    'id' => $item->id ?? $id++,
                    'dcc' => $dcc,
                    'up3' => $up3,
                    'ulp' => $ulp,
                    'gardu_induk' => $item->gardu_induk ?? '',
                    'feeder' => $item->feeder ?? '',
                    'keypoint' => $keypoint,
                    'coordinate' => $item->coordinate ?? '',
                    'parent_keypoint' => $parent
                ];
            }

            return inertia('master/mapping', [
                'datas' => $result,
                'success' => session('success')
            ]);
        } catch (\Exception $e) {
            return inertia('master/mapping', [
                'datas' => [],
                'error' => 'Failed to fetch data',
                'message' => $e->getMessage()
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
