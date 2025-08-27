<?php

namespace App\Http\Controllers;

use App\Models\Feeder;
use App\Models\GarduInduk;
use App\Models\KeypointExt;
use App\Models\Organization;
use Illuminate\Http\Request;
use App\Models\AnalogPointSkada;
use App\Models\StatusPointSkada;
use App\Models\FeederStatusPoint;
use App\Models\StationPointSkada;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\OrganizationKeypoint;
use App\Http\Controllers\Traits\HasOrganizationHierarchy;

class SingleLineController extends Controller
{
    use HasOrganizationHierarchy;

    public function getSingleLineData()
    {
        $garduIndukIds = GarduInduk::whereNotNull('keypoint_id')->pluck('keypoint_id');
        $keypointExtIds = KeypointExt::pluck('keypoint_id');
        $allKeypointIds = $garduIndukIds->concat($keypointExtIds)->unique()->filter();

        return $this->buildAndRespondWithSingleLineData($allKeypointIds);
    }

    /**
     * Extract type from name (ambil kata sebelum tanda -)
     */
    private function extractTypeFromName($name)
    {
        if (empty($name)) {
            return 'UNKNOWN';
        }

        $parts = explode('-', $name);
        return strtoupper(trim($parts[0]));
    }

    /**
     * Parse coordinate string to array
     */
    private function parseCoordinate($coordinateString)
    {
        if (empty($coordinateString)) {
            return null;
        }

        // Remove spaces and split by comma
        $coords = explode(',', str_replace(' ', '', $coordinateString));

        if (count($coords) !== 2) {
            return null;
        }

        $lat = floatval(trim($coords[0]));
        $lng = floatval(trim($coords[1]));

        // Validate coordinate values
        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            return null;
        }

        return [$lat, $lng];
    }

    /**
     * Get status from StatusPointSkada
     */
    private function getKeypointStatus($keypointId, $statusPoints)
    {
        if (!$keypointId || !$statusPoints->has($keypointId)) {
            return 'inactive';
        }

        $statusPoint = $statusPoints->get($keypointId);

        return $statusPoint->VALUE == 0 ? 'active' : 'inactive';
    }

    /**
     * Calculate load for keypoint based on type
     */
    private function calculateKeypointLoad($keypointId, $type, $garduInduks, $analogPointsForGis, $analogPointsNonGi)
    {
        $loadIs = 0;
        $loadMw = 0;
        $lastUpdate = null;

        try {
            if ($type === 'GI') {
                $garduInduk = $garduInduks->get($keypointId);

                if ($garduInduk) {
                    foreach ($garduInduk->feeders as $feeder) {
                        foreach ($feeder->statusPoints as $statusPoint) {
                            $analogPoint = $analogPointsForGis->get($statusPoint->status_id);
                            if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                                if ($statusPoint->type === 'AMP') {
                                    $loadIs += floatval($analogPoint->VALUE);
                                } elseif ($statusPoint->type === 'MW') {
                                    $loadMw += floatval($analogPoint->VALUE);
                                }

                                if (!$lastUpdate || $analogPoint->UPDATETIME > $lastUpdate) {
                                    $lastUpdate = $analogPoint->UPDATETIME;
                                }
                            }
                        }
                    }
                }
            } else {
                $analogPoints = $analogPointsNonGi->get($keypointId);

                if ($analogPoints) {
                    $irValues = [];
                    $isValues = [];
                    $itValues = [];
                    $kvAbValues = [];
                    $kvBcValues = [];
                    $kvAcValues = [];

                    foreach ($analogPoints as $point) {
                        if (is_numeric($point->VALUE)) {
                            switch ($point->NAME) {
                                case 'IR':
                                    $irValues[] = floatval($point->VALUE);
                                    break;
                                case 'IS':
                                    $isValues[] = floatval($point->VALUE);
                                    break;
                                case 'IT':
                                    $itValues[] = floatval($point->VALUE);
                                    break;
                                case 'KV-AB':
                                    $kvAbValues[] = floatval($point->VALUE);
                                    break;
                                case 'KV-BC':
                                    $kvBcValues[] = floatval($point->VALUE);
                                    break;
                                case 'KV-AC':
                                    $kvAcValues[] = floatval($point->VALUE);
                                    break;
                            }
                            if (!$lastUpdate || $point->UPDATETIME > $lastUpdate) {
                                $lastUpdate = $point->UPDATETIME;
                            }
                        }
                    }

                    // Calculate load-is (average of IR, IS, IT)
                    $allIsValues = array_merge($irValues, $isValues, $itValues);
                    if (!empty($allIsValues)) {
                        $loadIs = array_sum($allIsValues) / count($allIsValues);
                    }

                    // Calculate load-mw (average of kv-AB, kv-BC, kv-AC multiplied by load-is)
                    $allKvValues = array_merge($kvAbValues, $kvBcValues, $kvAcValues);
                    if (!empty($allKvValues) && $loadIs > 0) {
                        $avgKv = array_sum($allKvValues) / count($allKvValues);
                        $loadMw = $avgKv * $loadIs;
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Error calculating load for keypoint ' . $keypointId . ': ' . $e->getMessage());
        }

        return [
            'load_is' => round($loadIs, 2),
            'load_mw' => round($loadMw, 2),
            'last_update' => $lastUpdate ? $lastUpdate : now()->toISOString()
        ];
    }

    /**
     * Get feeder data for GI type
     */
    private function getFeederData($keypointId, $garduInduks, $analogPointsForGis)
    {
        try {
            $garduInduk = $garduInduks->get($keypointId);

            if (!$garduInduk) {
                return null;
            }

            $feederData = [];

            foreach ($garduInduk->feeders as $feeder) {
                $feederLoadIs = 0;
                $feederLoadMw = 0;

                foreach ($feeder->statusPoints as $statusPoint) {
                    $analogPoint = $analogPointsForGis->get($statusPoint->status_id);
                    if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                        if ($statusPoint->type === 'AMP') {
                            $feederLoadIs += floatval($analogPoint->VALUE);
                        } elseif ($statusPoint->type === 'MW') {
                            $feederLoadMw += floatval($analogPoint->VALUE);
                        }
                    }
                }

                $feederData[] = [
                    'id' => $feeder->id,
                    'name' => $feeder->name,
                    'load-is' => round($feederLoadIs, 2) . ' A',
                    'load-mw' => round($feederLoadMw, 2) . ' MW',
                ];
            }

            return empty($feederData) ? null : $feederData;
        } catch (\Exception $e) {
            Log::error('Error getting feeder data for keypoint ' . $keypointId . ': ' . $e->getMessage());
            return null;
        }
    }

    private function buildAndRespondWithSingleLineData(\Illuminate\Support\Collection $keypointIds)
    {
        if ($keypointIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => [], 'count' => 0]);
        }

        try {
            $singleLineData = [];
            $incrementalId = 1;

            // 1. Get data from local DB for the given IDs
            $garduIndukKeypoints = GarduInduk::whereIn('keypoint_id', $keypointIds)
                ->get(['keypoint_id', 'coordinate'])
                ->map(function ($item) {
                    $item->source = 'gardu_induk';
                    $item->parent_stationpoints = null;
                    return $item;
                });

            $keypointExtKeypoints = KeypointExt::whereIn('keypoint_id', $keypointIds)
                ->get(['keypoint_id', 'coordinate', 'parent_stationpoints'])
                ->map(function ($item) {
                    $item->source = 'keypoint_ext';
                    return $item;
                });

            $allKeypointData = $garduIndukKeypoints->concat($keypointExtKeypoints)->keyBy('keypoint_id');
            $allKeypointIds = $allKeypointData->pluck('keypoint_id')->unique()->filter()->values();

            // 2. Batch fetch all required data from external DB
            $stationPoints = StationPointSkada::whereIn('PKEY', $allKeypointIds)->get()->keyBy('PKEY');

            $statusPoints = StatusPointSkada::join('STATIONPOINTS', 'STATUSPOINTS.STATIONPID', '=', 'STATIONPOINTS.PKEY')
                ->whereIn('STATIONPOINTS.PKEY', $allKeypointIds)
                ->where('STATUSPOINTS.NAME', 'RTU-STAT')
                ->select('STATIONPOINTS.PKEY as keypoint_id', 'STATUSPOINTS.VALUE')
                ->get()
                ->keyBy('keypoint_id');

            $analogPointsNonGi = AnalogPointSkada::whereIn('STATIONPID', $allKeypointIds)
                ->whereIn('NAME', ['IR', 'IS', 'IT', 'KV-AB', 'KV-BC', 'KV-AC'])
                ->get()
                ->groupBy('STATIONPID');

            // 3. Batch fetch data for GI-type keypoints
            $giKeypointIds = $allKeypointData->where('source', 'gardu_induk')->pluck('keypoint_id');
            $garduInduks = GarduInduk::whereIn('keypoint_id', $giKeypointIds)
                ->with('feeders.statusPoints') // Eager load feeders and their status points
                ->get()
                ->keyBy('keypoint_id');

            $allFeederStatusIds = $garduInduks->pluck('feeders')->flatten()->pluck('statusPoints')->flatten()->pluck('status_id')->unique()->filter();

            $analogPointsForGis = collect();
            if ($allFeederStatusIds->isNotEmpty()) {
                $analogPointsForGis = AnalogPointSkada::whereIn('PKEY', $allFeederStatusIds)
                    ->get()
                    ->keyBy('PKEY');
            }

            // 4. Process each keypoint with pre-fetched data
            foreach ($allKeypointData as $keypointId => $keypointData) {
                $stationPoint = $stationPoints->get($keypointId);

                if (!$stationPoint) {
                    continue;
                }

                $name = $stationPoint->NAME;
                $type = $this->extractTypeFromName($name);
                $coordinate = $this->parseCoordinate($keypointData->coordinate ?? null);

                if (!$coordinate) {
                    continue;
                }

                $parent = ($type !== 'GI' && isset($keypointData->parent_stationpoints)) ? $keypointData->parent_stationpoints : null;

                $status = $this->getKeypointStatus($keypointId, $statusPoints);
                $loadData = $this->calculateKeypointLoad($keypointId, $type, $garduInduks, $analogPointsForGis, $analogPointsNonGi);
                $feederData = null;
                if ($type === 'GI') {
                    $feederData = $this->getFeederData($keypointId, $garduInduks, $analogPointsForGis);
                }

                $singleLineData[] = [
                    'id' => $incrementalId++,
                    'code' => $keypointId,
                    'name' => $name,
                    'type' => $type,
                    'coordinate' => $coordinate,
                    'parent' => $parent,
                    'status' => $status,
                    'data' => [
                        'load-mw' => $loadData['load_mw'] . ' MW',
                        'load-is' => $loadData['load_is'] . ' A',
                        'lastUpdate' => $loadData['last_update'],
                    ],
                    'feeder' => $feederData
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $singleLineData,
                'count' => count($singleLineData)
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing single line data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error processing single line data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get filtered single line data
     */
    public function getSingleLineDataFiltered(Request $request)
    {
        try {
            $typeFilter = $request->query('type');
            $statusFilter = $request->query('status');

            $garduIndukIds = GarduInduk::whereNotNull('keypoint_id')->pluck('keypoint_id');
            $keypointExtIds = KeypointExt::pluck('keypoint_id');
            $allLocalKeypointIds = $garduIndukIds->concat($keypointExtIds)->unique()->filter();

            if ($allLocalKeypointIds->isEmpty()) {
                return response()->json(['success' => true, 'data' => [], 'count' => 0]);
            }

            $stationQuery = StationPointSkada::query()->whereIn('PKEY', $allLocalKeypointIds);

            if ($typeFilter) {
                $stationQuery->where('NAME', 'LIKE', strtoupper($typeFilter) . '-%');
            }

            if ($statusFilter) {
                $operator = (strtolower($statusFilter) === 'active') ? '=' : '!=';

                $stationQuery->whereIn('PKEY', function ($query) use ($operator) {
                    $query->select('STATIONPID')
                        ->from((new StatusPointSkada)->getTable())
                        ->where('NAME', 'RTU-STAT')
                        ->where('VALUE', $operator, 0);
                });
            }

            $filteredKeypointIds = $stationQuery->pluck('PKEY');

            return $this->buildAndRespondWithSingleLineData($filteredKeypointIds);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching filtered single line data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function getSingleLineDataByUser(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user || !$user->unit) {
                return response()->json(['success' => true, 'data' => [], 'count' => 0]);
            }

            $userOrganizationId = $user->unit;

            // Get user's organization info to determine level
            $userOrganization = Organization::find($userOrganizationId);
            if (!$userOrganization) {
                return response()->json(['success' => true, 'data' => [], 'count' => 0]);
            }

            // Get organization descendants based on hierarchy
            $organizationIds = $this->getOrganizationDescendants($userOrganizationId);
            $organizationIds[] = $userOrganizationId;

            // Get all keypoints that are related to user's organization hierarchy
            $allowedKeypointIds = OrganizationKeypoint::whereIn('organization_id', $organizationIds)
                ->pluck('keypoint_id')
                ->unique()
                ->filter()
                ->values();

            return $this->buildAndRespondWithSingleLineData($allowedKeypointIds);
        } catch (\Exception $e) {
            Log::error('Error fetching single line data by user: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching single line data for user',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function getSingleLineDataBasedOnRole(Request $request)
    {
        $user = $request->user();
        // atau bisa juga: $user = Auth::user();

        if ($user && $user->unit === null) {
            return $this->getSingleLineData();
        } else {
            return $this->getSingleLineDataByUser($request);
        }
    }
}
