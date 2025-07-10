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
            // Query untuk mendapatkan data dari PostgreSQL (tanpa STATIONPOINTS)
            $data = DB::table('organization_keypoint as ok')
                ->join('organization as org', 'ok.organization_id', '=', 'org.id')
                ->leftJoin('feeder_keypoints as fk', 'ok.keypoint_id', '=', 'fk.keypoint_id')
                ->leftJoin('feeders as f', 'fk.feeder_id', '=', 'f.id')
                ->leftJoin('gardu_induks as gi', 'f.gardu_induk_id', '=', 'gi.id')
                ->leftJoin('keypoint_ext as ke', 'ok.keypoint_id', '=', 'ke.keypoint_id')
                ->select([
                    'ok.keypoint_id',
                    'ok.organization_id',
                    'org.name as org_name',
                    'org.level as org_level',
                    'org.parent_id',
                    'gi.name as gardu_induk',
                    'f.name as feeder',
                    'ke.coordinate',
                    'ke.parent_stationpoints'
                ])
                ->distinct()
                ->get();

            // Get keypoint IDs untuk query STATIONPOINTS
            $keypointIds = $data->pluck('keypoint_id')->unique()->toArray();

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

            // Group by keypoint_id untuk menghindari duplikasi
            $groupedData = $data->groupBy('keypoint_id');

            // Ambil semua parent_stationpoints yang ada
            $allParentStationpoints = $data->pluck('parent_stationpoints')->filter()->unique()->toArray();
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

            foreach ($groupedData as $keypointId => $keypointData) {
                $dcc = '';
                $up3 = '';
                $ulp = '';
                $coordinate = '';
                $garduInduk = '';
                $feeder = '';
                $keypoint = '';
                $parent = '';

                // Ambil data pertama sebagai base
                $baseData = $keypointData->first();
                $garduInduk = $baseData->gardu_induk ?? '';
                $feeder = $baseData->feeder ?? '';
                $keypoint = $stationPoints[$keypointId] ?? '';
                $coordinate = $baseData->coordinate ?? '';
                $parent = $baseData->parent_stationpoints ?? '';

                // Ubah parent menjadi STATIONPOINTS.NAME jika ada
                if (!empty($parent) && isset($parentStationNames[$parent])) {
                    $parent = $parentStationNames[$parent];
                }

                // Collect organization IDs untuk mencari hierarchy
                $organizationIds = $keypointData->pluck('organization_id')->unique()->toArray();

                // Get organization hierarchy
                $organizations = DB::table('organization')
                    ->whereIn('id', $organizationIds)
                    ->orWhereIn('id', function ($query) use ($organizationIds) {
                        $query->select('parent_id')
                            ->from('organization')
                            ->whereIn('id', $organizationIds)
                            ->whereNotNull('parent_id');
                    })
                    ->orWhereIn('id', function ($query) use ($organizationIds) {
                        $query->select('o2.parent_id')
                            ->from('organization as o1')
                            ->join('organization as o2', 'o1.parent_id', '=', 'o2.id')
                            ->whereIn('o1.id', $organizationIds)
                            ->whereNotNull('o2.parent_id');
                    })
                    ->get();

                // Build organization hierarchy
                foreach ($organizations as $org) {
                    switch ($org->level) {
                        case 1:
                            $dcc = $org->name;
                            break;
                        case 2:
                            $up3 = $org->name;
                            break;
                        case 3:
                            $ulp = $org->name;
                            break;
                    }
                }

                // If we don't have complete hierarchy, try to build it from relationships
                if (empty($dcc) || empty($up3) || empty($ulp)) {
                    foreach ($keypointData as $item) {
                        $this->buildOrganizationHierarchy($item->organization_id, $dcc, $up3, $ulp);
                        if (!empty($dcc) && !empty($up3) && !empty($ulp)) {
                            break;
                        }
                    }
                }

                $result[] = [
                    'id' => $id++,
                    'dcc' => $dcc,
                    'up3' => $up3,
                    'ulp' => $ulp,
                    'gardu_induk' => $garduInduk,
                    'feeder' => $feeder,
                    'keypoint' => $keypoint,
                    'coordinate' => $coordinate,
                    'parent' => $parent
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

    /**
     * Build organization hierarchy from a given organization ID
     */
    private function buildOrganizationHierarchy($organizationId, &$dcc, &$up3, &$ulp)
    {
        $organization = DB::table('organization')->where('id', $organizationId)->first();

        if (!$organization) {
            return;
        }

        // Set current level
        switch ($organization->level) {
            case 1:
                $dcc = $organization->name;
                break;
            case 2:
                $up3 = $organization->name;
                break;
            case 3:
                $ulp = $organization->name;
                break;
        }

        // Get parent if exists
        if ($organization->parent_id) {
            $parent = DB::table('organization')->where('id', $organization->parent_id)->first();
            if ($parent) {
                switch ($parent->level) {
                    case 1:
                        if (empty($dcc)) $dcc = $parent->name;
                        break;
                    case 2:
                        if (empty($up3)) $up3 = $parent->name;
                        break;
                }

                // Get grandparent if exists
                if ($parent->parent_id) {
                    $grandparent = DB::table('organization')->where('id', $parent->parent_id)->first();
                    if ($grandparent && $grandparent->level == 1 && empty($dcc)) {
                        $dcc = $grandparent->name;
                    }
                }
            }
        }
    }

    public function store(Request $request)
    {
        // Validasi diubah untuk menerima array of integers untuk keypoints
        $validated = $request->validate([
            'dcc' => 'nullable|string',
            'up3' => 'nullable|string',
            'ulp' => 'nullable|string',
            'keypoints' => 'required|array',          // Diubah dari 'keypoint' menjadi 'keypoints' dan tipe 'array'
            'keypoints.*' => 'required|integer',    // Memvalidasi setiap item dalam array
            'coordinate' => 'nullable|string',
        ]);

        // 1. DCC (level 1) - Logic tidak berubah
        $dcc = Organization::firstOrCreate([
            'name' => $validated['dcc'],
            'level' => 1,
        ]);

        // 2. UP3 (level 2, parent DCC) - Logic tidak berubah
        $up3 = Organization::firstOrCreate([
            'name' => $validated['up3'],
            'level' => 2,
            'parent_id' => $dcc->id,
        ]);

        // 3. ULP (level 3, parent UP3) - Logic tidak berubah
        $ulp = Organization::firstOrCreate([
            'name' => $validated['ulp'],
            'level' => 3,
            'parent_id' => $up3->id,
        ]);

        // 4. Looping untuk menyimpan setiap keypoint yang dipilih
        foreach ($validated['keypoints'] as $keypointId) {
            // Simpan relasi untuk DCC
            OrganizationKeypoint::firstOrCreate([
                'organization_id' => $dcc->id,
                'keypoint_id' => $keypointId,
            ]);
            // Simpan relasi untuk UP3
            OrganizationKeypoint::firstOrCreate([
                'organization_id' => $up3->id,
                'keypoint_id' => $keypointId,
            ]);
            // Simpan relasi untuk ULP
            OrganizationKeypoint::firstOrCreate([
                'organization_id' => $ulp->id,
                'keypoint_id' => $keypointId,
            ]);

            // 5. (Opsional) Simpan coordinate untuk setiap keypoint jika ada
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
            'dcc' => 'nullable|string',
            'up3' => 'nullable|string',
            'ulp' => 'nullable|string',
            'gardu_induk' => 'nullable|string',
            'feeder' => 'nullable|string',
            'keypoint' => 'required|integer',
            'coordinate' => 'nullable|string',
        ]);

        // Temukan organization_keypoint berdasarkan id
        $orgKeypoint = OrganizationKeypoint::findOrFail($id);

        // Update relasi organisasi jika ada perubahan
        $dcc = Organization::firstOrCreate([
            'name' => $validated['dcc'],
            'level' => 1,
        ]);
        $up3 = Organization::firstOrCreate([
            'name' => $validated['up3'],
            'level' => 2,
            'parent_id' => $dcc->id,
        ]);
        $ulp = Organization::firstOrCreate([
            'name' => $validated['ulp'],
            'level' => 3,
            'parent_id' => $up3->id,
        ]);

        $orgKeypoint->organization_id = $ulp->id;
        $orgKeypoint->keypoint_id = $validated['keypoint'];
        $orgKeypoint->save();

        // Update coordinate jika ada
        if (!empty($validated['coordinate'])) {
            DB::table('keypoint_ext')->updateOrInsert(
                ['keypoint_id' => $validated['keypoint']],
                ['coordinate' => $validated['coordinate']]
            );
        }

        return redirect()->back()->with('success', 'Data berhasil diupdate');
    }

    public function destroy($id)
    {
        $orgKeypoint = OrganizationKeypoint::findOrFail($id);
        $orgKeypoint->delete();
        return redirect()->back()->with('success', 'Data berhasil dihapus');
    }

    public function getDccData(Request $request)
    {
        try {
            $dccs = DB::table('organization')
                ->where('level', 1)
                ->select('id', 'name')
                ->get();

            return response()->json($dccs);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch DCC data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getUp3Data(Request $request)
    {
        try {
            $up3s = DB::table('organization')
                ->where('level', 2)
                ->select('id', 'name')
                ->get();

            return response()->json($up3s);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch UP3 data',
                'message' => $e->getMessage()
            ], 500);
        }
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


    // /**
    //  * Alternative method using Eloquent relationships (updated)
    //  */
    // public function indexWithEloquent(Request $request)
    // {
    //     try {
    //         // Get all keypoints with their relationships
    //         $organizationKeypoints = OrganizationKeypoint::with([
    //             'organization' => function ($query) {
    //                 $query->with(['parent.parent']);
    //             }
    //         ])->get();

    //         // Group by keypoint_id to handle multiple organizations per keypoint
    //         $groupedKeypoints = $organizationKeypoints->groupBy('keypoint_id');

    //         $result = [];
    //         $id = 0;

    //         foreach ($groupedKeypoints as $keypointId => $orgKeypoints) {
    //             // Get keypoint name from STATIONPOINTS
    //             $stationPoint = StationPointSkada::where('PKEY', $keypointId)->first();

    //             // Get feeder information
    //             $feederKeypoint = FeederKeypoint::where('keypoint_id', $keypointId)->first();
    //             $feeder = null;
    //             $garduInduk = null;

    //             if ($feederKeypoint) {
    //                 $feeder = Feeder::find($feederKeypoint->feeder_id);
    //                 if ($feeder) {
    //                     $garduInduk = GarduInduk::find($feeder->gardu_induk_id);
    //                 }
    //             }

    //             // Get coordinate from keypoint_ext
    //             $coordinate = DB::table('keypoint_ext')
    //                 ->where('keypoint_id', $keypointId)
    //                 ->value('coordinate') ?? '';

    //             // Initialize organization levels
    //             $dcc = '';
    //             $up3 = '';
    //             $ulp = '';

    //             // Process all organizations for this keypoint to build complete hierarchy
    //             foreach ($orgKeypoints as $orgKeypoint) {
    //                 $organization = $orgKeypoint->organization;
    //                 $this->processOrganizationHierarchyEloquent($organization, $dcc, $up3, $ulp);
    //             }

    //             $result[] = [
    //                 'id' => $id++,
    //                 'dcc' => $dcc,
    //                 'up3' => $up3,
    //                 'ulp' => $ulp,
    //                 'gardu_induk' => $garduInduk ? $garduInduk->name : '',
    //                 'feeder' => $feeder ? $feeder->name : '',
    //                 'keypoint' => $stationPoint ? $stationPoint->NAME : '',
    //                 'coordinate' => $coordinate
    //             ];
    //         }

    //         return response()->json($result);
    //     } catch (\Exception $e) {
    //         return response()->json([
    //             'error' => 'Failed to fetch data',
    //             'message' => $e->getMessage()
    //         ], 500);
    //     }
    // }

    // /**
    //  * Process organization hierarchy using Eloquent models
    //  */
    // private function processOrganizationHierarchyEloquent($organization, &$dcc, &$up3, &$ulp)
    // {
    //     if (!$organization) {
    //         return;
    //     }

    //     // Set current level
    //     switch ($organization->level) {
    //         case 1:
    //             if (empty($dcc)) $dcc = $organization->name;
    //             break;
    //         case 2:
    //             if (empty($up3)) $up3 = $organization->name;
    //             break;
    //         case 3:
    //             if (empty($ulp)) $ulp = $organization->name;
    //             break;
    //     }

    //     // Process parent hierarchy
    //     if ($organization->parent) {
    //         $this->processOrganizationHierarchyEloquent($organization->parent, $dcc, $up3, $ulp);
    //     }
    // }




}
