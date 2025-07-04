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
                    'ke.coordinate'
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

                // Ambil data pertama sebagai base
                $baseData = $keypointData->first();
                $garduInduk = $baseData->gardu_induk ?? '';
                $feeder = $baseData->feeder ?? '';
                $keypoint = $stationPoints[$keypointId] ?? '';
                $coordinate = $baseData->coordinate ?? '';

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
                    'coordinate' => $coordinate
                ];
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch data',
                'message' => $e->getMessage()
            ], 500);
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

    /**
     * Alternative method using Eloquent relationships (updated)
     */
    public function indexWithEloquent(Request $request)
    {
        try {
            // Get all keypoints with their relationships
            $organizationKeypoints = OrganizationKeypoint::with([
                'organization' => function ($query) {
                    $query->with(['parent.parent']);
                }
            ])->get();

            // Group by keypoint_id to handle multiple organizations per keypoint
            $groupedKeypoints = $organizationKeypoints->groupBy('keypoint_id');

            $result = [];
            $id = 0;

            foreach ($groupedKeypoints as $keypointId => $orgKeypoints) {
                // Get keypoint name from STATIONPOINTS
                $stationPoint = StationPointSkada::where('PKEY', $keypointId)->first();

                // Get feeder information
                $feederKeypoint = FeederKeypoint::where('keypoint_id', $keypointId)->first();
                $feeder = null;
                $garduInduk = null;

                if ($feederKeypoint) {
                    $feeder = Feeder::find($feederKeypoint->feeder_id);
                    if ($feeder) {
                        $garduInduk = GarduInduk::find($feeder->gardu_induk_id);
                    }
                }

                // Get coordinate from keypoint_ext
                $coordinate = DB::table('keypoint_ext')
                    ->where('keypoint_id', $keypointId)
                    ->value('coordinate') ?? '';

                // Initialize organization levels
                $dcc = '';
                $up3 = '';
                $ulp = '';

                // Process all organizations for this keypoint to build complete hierarchy
                foreach ($orgKeypoints as $orgKeypoint) {
                    $organization = $orgKeypoint->organization;
                    $this->processOrganizationHierarchyEloquent($organization, $dcc, $up3, $ulp);
                }

                $result[] = [
                    'id' => $id++,
                    'dcc' => $dcc,
                    'up3' => $up3,
                    'ulp' => $ulp,
                    'gardu_induk' => $garduInduk ? $garduInduk->name : '',
                    'feeder' => $feeder ? $feeder->name : '',
                    'keypoint' => $stationPoint ? $stationPoint->NAME : '',
                    'coordinate' => $coordinate
                ];
            }

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process organization hierarchy using Eloquent models
     */
    private function processOrganizationHierarchyEloquent($organization, &$dcc, &$up3, &$ulp)
    {
        if (!$organization) {
            return;
        }

        // Set current level
        switch ($organization->level) {
            case 1:
                if (empty($dcc)) $dcc = $organization->name;
                break;
            case 2:
                if (empty($up3)) $up3 = $organization->name;
                break;
            case 3:
                if (empty($ulp)) $ulp = $organization->name;
                break;
        }

        // Process parent hierarchy
        if ($organization->parent) {
            $this->processOrganizationHierarchyEloquent($organization->parent, $dcc, $up3, $ulp);
        }
    }
}
