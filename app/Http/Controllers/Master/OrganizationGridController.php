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
            // Query dengan join untuk mendapatkan semua data yang diperlukan
            $data = DB::table('organization_keypoint as ok')
                ->join('organization as org_dcc', function ($join) {
                    $join->on('ok.organization_id', '=', 'org_dcc.id')
                        ->where('org_dcc.level', '=', 1);
                })
                ->leftJoin('organization as org_up3', function ($join) {
                    $join->on('org_dcc.id', '=', 'org_up3.parent_id')
                        ->where('org_up3.level', '=', 2);
                })
                ->leftJoin('organization as org_ulp', function ($join) {
                    $join->on('org_up3.id', '=', 'org_ulp.parent_id')
                        ->where('org_ulp.level', '=', 3);
                })
                ->leftJoin('STATIONPOINTS as sp', 'ok.keypoint_id', '=', 'sp.PKEY')
                ->leftJoin('feeder_keypoints as fk', 'ok.keypoint_id', '=', 'fk.keypoint_id')
                ->leftJoin('feeders as f', 'fk.feeder_id', '=', 'f.id')
                ->leftJoin('gardu_induks as gi', 'f.gardu_induk_id', '=', 'gi.id')
                ->select([
                    'ok.keypoint_id',
                    'org_dcc.name as dcc',
                    'org_up3.name as up3',
                    'org_ulp.name as ulp',
                    'gi.name as gardu_induk',
                    'f.name as feeder',
                    'sp.NAME as keypoint',
                    //'org_dcc.coordinate'
                ])
                ->distinct()
                ->get();

            // Transform data ke format yang diminta
            $result = $data->map(function ($item, $index) {
                return [
                    'id' => $index,
                    'dcc' => $item->dcc ?? '',
                    'up3' => $item->up3 ?? '',
                    'ulp' => $item->ulp ?? '',
                    'gardu_induk' => $item->gardu_induk ?? '',
                    'feeder' => $item->feeder ?? '',
                    'keypoint' => $item->keypoint ?? '',
                    //'coordinate' => $item->coordinate ?? ''
                ];
            })->values();

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Alternative method using Eloquent relationships
     */
    public function indexWithEloquent(Request $request)
    {
        try {
            $organizationKeypoints = OrganizationKeypoint::with([
                'organization' => function ($query) {
                    $query->with(['parent.parent']);
                }
            ])->get();

            $result = [];
            $id = 0;

            foreach ($organizationKeypoints as $orgKeypoint) {
                // Get keypoint name from STATIONPOINTS
                $stationPoint = StationPointSkada::where('PKEY', $orgKeypoint->keypoint_id)->first();

                // Get feeder information
                $feederKeypoint = FeederKeypoint::where('keypoint_id', $orgKeypoint->keypoint_id)->first();
                $feeder = null;
                $garduInduk = null;

                if ($feederKeypoint) {
                    $feeder = Feeder::find($feederKeypoint->feeder_id);
                    if ($feeder) {
                        $garduInduk = GarduInduk::find($feeder->gardu_induk_id);
                    }
                }

                // Get organization hierarchy
                $organization = $orgKeypoint->organization;
                $dcc = '';
                $up3 = '';
                $ulp = '';

                // Determine organization levels
                if ($organization->level == 1) {
                    $dcc = $organization->name;
                } elseif ($organization->level == 2) {
                    $up3 = $organization->name;
                    if ($organization->parent && $organization->parent->level == 1) {
                        $dcc = $organization->parent->name;
                    }
                } elseif ($organization->level == 3) {
                    $ulp = $organization->name;
                    if ($organization->parent && $organization->parent->level == 2) {
                        $up3 = $organization->parent->name;
                        if ($organization->parent->parent && $organization->parent->parent->level == 1) {
                            $dcc = $organization->parent->parent->name;
                        }
                    }
                }

                $result[] = [
                    'id' => $id++,
                    'dcc' => $dcc,
                    'up3' => $up3,
                    'ulp' => $ulp,
                    'gardu_induk' => $garduInduk ? $garduInduk->name : '',
                    'feeder' => $feeder ? $feeder->name : '',
                    'keypoint' => $stationPoint ? $stationPoint->NAME : '',
                    'coordinate' => $organization->coordinate ?? ''
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
}
