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
use Illuminate\Support\Facades\Cache;
use App\Models\OrganizationKeypoint;
use App\Http\Controllers\Traits\HasOrganizationHierarchy;

class SingleLineController extends Controller
{
    use HasOrganizationHierarchy;

    private const CACHE_TTL = 300; // 5 minutes
    private const BATCH_SIZE = 100; // Process in batches

    public function getSingleLineData()
    {
        return Cache::remember('single_line_all_data', self::CACHE_TTL, function () {
            $garduIndukIds = GarduInduk::whereNotNull('keypoint_id')->pluck('keypoint_id');
            $keypointExtIds = KeypointExt::pluck('keypoint_id');
            $allKeypointIds = $garduIndukIds->concat($keypointExtIds)->unique()->filter();

            return $this->buildAndRespondWithSingleLineDataOptimized($allKeypointIds);
        });
    }

    public function getSingleLineDataByUser(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->unit) {
            return response()->json(['success' => true, 'data' => [], 'count' => 0]);
        }

        $cacheKey = "single_line_user_{$user->id}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($user) {
            try {
                $userOrganizationId = $user->unit;
                $userOrganization = Organization::find($userOrganizationId);

                if (!$userOrganization) {
                    return response()->json(['success' => true, 'data' => [], 'count' => 0]);
                }

                // Get organization descendants more efficiently
                $organizationIds = $this->getOrganizationDescendantsOptimized($userOrganizationId);
                $organizationIds[] = $userOrganizationId;

                $allowedKeypointIds = OrganizationKeypoint::whereIn('organization_id', $organizationIds)
                    ->pluck('keypoint_id')
                    ->unique()
                    ->filter()
                    ->values();

                return $this->buildAndRespondWithSingleLineDataOptimized($allowedKeypointIds);
            } catch (\Exception $e) {
                Log::error('Error fetching single line data by user: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Error fetching single line data for user',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
    }

    public function getSingleLineDataFiltered(Request $request)
    {
        try {
            $typeFilter = $request->query('type');
            $statusFilter = $request->query('status');

            $cacheKey = "single_line_filtered_" . md5(serialize([$typeFilter, $statusFilter]));

            return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($typeFilter, $statusFilter) {
                // Get base keypoint IDs more efficiently
                $allLocalKeypointIds = $this->getAllKeypointIdsOptimized();

                if ($allLocalKeypointIds->isEmpty()) {
                    return response()->json(['success' => true, 'data' => [], 'count' => 0]);
                }

                $filteredKeypointIds = $this->applyFiltersOptimized($allLocalKeypointIds, $typeFilter, $statusFilter);
                return $this->buildAndRespondWithSingleLineDataOptimized($filteredKeypointIds);
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching filtered single line data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getSingleLineDataBasedOnRole(Request $request)
    {
        $user = $request->user();

        if ($user && $user->unit === null) {
            return $this->getSingleLineData();
        } else {
            return $this->getSingleLineDataByUser($request);
        }
    }

    /**
     * Optimized method to get all keypoint IDs
     */
    private function getAllKeypointIdsOptimized()
    {
        return Cache::remember('all_keypoint_ids', self::CACHE_TTL, function () {
            $garduIndukIds = GarduInduk::whereNotNull('keypoint_id')->pluck('keypoint_id');
            $keypointExtIds = KeypointExt::pluck('keypoint_id');
            return $garduIndukIds->concat($keypointExtIds)->unique()->filter();
        });
    }

    /**
     * Optimized filter application
     */
    private function applyFiltersOptimized($keypointIds, $typeFilter = null, $statusFilter = null)
    {
        $query = StationPointSkada::query()
            ->whereIn('PKEY', $keypointIds)
            ->select('PKEY');

        if ($typeFilter) {
            $query->where('NAME', 'LIKE', strtoupper($typeFilter) . '-%');
        }

        if ($statusFilter) {
            $operator = (strtolower($statusFilter) === 'active') ? '=' : '!=';
            $query->whereExists(function ($subQuery) use ($operator) {
                $subQuery->select(DB::raw(1))
                    ->from('STATUSPOINTS')
                    ->whereRaw('STATUSPOINTS.STATIONPID = STATIONPOINTS.PKEY')
                    ->where('STATUSPOINTS.NAME', 'RTU-STAT')
                    ->where('STATUSPOINTS.VALUE', $operator, 0);
            });
        }

        return $query->pluck('PKEY');
    }

    /**
     * Optimized organization descendants retrieval
     */
    private function getOrganizationDescendantsOptimized($organizationId)
    {
        return Cache::remember("org_descendants_{$organizationId}", self::CACHE_TTL, function () use ($organizationId) {
            return $this->getOrganizationDescendants($organizationId);
        });
    }

    /**
     * Main optimized data building method
     */
    private function buildAndRespondWithSingleLineDataOptimized(\Illuminate\Support\Collection $keypointIds)
    {
        if ($keypointIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => [], 'count' => 0]);
        }

        try {
            // Pre-load all required data with optimized queries
            $preloadedData = $this->preloadAllRequiredData($keypointIds);

            $singleLineData = [];
            $incrementalId = 1;

            // Process in batches to avoid memory issues
            $keypointBatches = $keypointIds->chunk(self::BATCH_SIZE);

            foreach ($keypointBatches as $batch) {
                $batchData = $this->processBatch($batch, $preloadedData, $incrementalId);
                $singleLineData = array_merge($singleLineData, $batchData['data']);
                $incrementalId = $batchData['next_id'];
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
     * Preload all required data with optimized queries
     */
    private function preloadAllRequiredData(\Illuminate\Support\Collection $keypointIds)
    {
        // 1. Get local keypoint data with single query
        $garduIndukKeypoints = GarduInduk::whereIn('keypoint_id', $keypointIds)
            ->select('keypoint_id', 'coordinate')
            ->get()
            ->map(function ($item) {
                $item->source = 'gardu_induk';
                $item->parent_stationpoints = null;
                return $item;
            });

        $keypointExtKeypoints = KeypointExt::whereIn('keypoint_id', $keypointIds)
            ->select('keypoint_id', 'coordinate', 'parent_stationpoints')
            ->get()
            ->map(function ($item) {
                $item->source = 'keypoint_ext';
                return $item;
            });

        $allKeypointData = $garduIndukKeypoints->concat($keypointExtKeypoints)->keyBy('keypoint_id');

        // 2. Batch fetch external data with optimized queries
        $stationPoints = DB::connection('sqlsrv_main')
            ->table('STATIONPOINTS')
            ->whereIn('PKEY', $keypointIds)
            ->select('PKEY', 'NAME')
            ->get()
            ->keyBy('PKEY');

        $statusPoints = DB::connection('sqlsrv_main')
            ->table('STATUSPOINTS')
            ->join('STATIONPOINTS', 'STATUSPOINTS.STATIONPID', '=', 'STATIONPOINTS.PKEY')
            ->whereIn('STATIONPOINTS.PKEY', $keypointIds)
            ->where('STATUSPOINTS.NAME', 'RTU-STAT')
            ->select('STATIONPOINTS.PKEY as keypoint_id', 'STATUSPOINTS.VALUE')
            ->get()
            ->keyBy('keypoint_id');

        // 3. Get analog points for non-GI keypoints
        $analogPointsNonGi = DB::connection('sqlsrv_main')
            ->table('ANALOGPOINTS')
            ->whereIn('STATIONPID', $keypointIds)
            ->whereIn('NAME', ['IR', 'IS', 'IT', 'KV-AB', 'KV-BC', 'KV-AC'])
            ->select('STATIONPID', 'NAME', 'VALUE', 'UPDATETIME')
            ->get()
            ->groupBy('STATIONPID');

        // 4. Get GI-specific data with optimized eager loading
        $giKeypointIds = $allKeypointData->where('source', 'gardu_induk')->pluck('keypoint_id');

        $garduInduks = collect();
        $analogPointsForGis = collect();

        if ($giKeypointIds->isNotEmpty()) {
            $garduInduks = GarduInduk::whereIn('keypoint_id', $giKeypointIds)
                ->with(['feeders' => function ($query) {
                    $query->with('statusPoints:id,feeder_id,status_id,type');
                }])
                ->get(['id', 'keypoint_id'])
                ->keyBy('keypoint_id');

            // Get all feeder status IDs in one query
            $allFeederStatusIds = collect();
            foreach ($garduInduks as $garduInduk) {
                foreach ($garduInduk->feeders as $feeder) {
                    $allFeederStatusIds = $allFeederStatusIds->concat($feeder->statusPoints->pluck('status_id'));
                }
            }

            $allFeederStatusIds = $allFeederStatusIds->unique()->filter();

            if ($allFeederStatusIds->isNotEmpty()) {
                $analogPointsForGis = DB::connection('sqlsrv_main')
                    ->table('ANALOGPOINTS')
                    ->whereIn('PKEY', $allFeederStatusIds)
                    ->select('PKEY', 'VALUE', 'UPDATETIME')
                    ->get()
                    ->keyBy('PKEY');
            }
        }

        return [
            'keypoint_data' => $allKeypointData,
            'station_points' => $stationPoints,
            'status_points' => $statusPoints,
            'analog_points_non_gi' => $analogPointsNonGi,
            'gardu_induks' => $garduInduks,
            'analog_points_for_gis' => $analogPointsForGis,
        ];
    }

    /**
     * Process a batch of keypoints
     */
    private function processBatch($keypointBatch, $preloadedData, $startId)
    {
        $data = [];
        $incrementalId = $startId;

        foreach ($keypointBatch as $keypointId) {
            $keypointData = $preloadedData['keypoint_data']->get($keypointId);
            $stationPoint = $preloadedData['station_points']->get($keypointId);

            if (!$stationPoint || !$keypointData) {
                continue;
            }

            $name = $stationPoint->NAME;
            $type = $this->extractTypeFromName($name);
            $coordinate = $this->parseCoordinate($keypointData->coordinate ?? null);

            if (!$coordinate) {
                continue;
            }

            $parent = ($type !== 'GI' && isset($keypointData->parent_stationpoints))
                ? $keypointData->parent_stationpoints : null;

            $status = $this->getKeypointStatusOptimized($keypointId, $preloadedData['status_points']);
            $loadData = $this->calculateKeypointLoadOptimized(
                $keypointId,
                $type,
                $preloadedData['gardu_induks'],
                $preloadedData['analog_points_for_gis'],
                $preloadedData['analog_points_non_gi']
            );

            $feederData = null;
            if ($type === 'GI') {
                $feederData = $this->getFeederDataOptimized(
                    $keypointId,
                    $preloadedData['gardu_induks'],
                    $preloadedData['analog_points_for_gis']
                );
            }

            $data[] = [
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

        return ['data' => $data, 'next_id' => $incrementalId];
    }

    /**
     * Optimized status retrieval
     */
    private function getKeypointStatusOptimized($keypointId, $statusPoints)
    {
        if (!$keypointId || !$statusPoints->has($keypointId)) {
            return 'inactive';
        }

        $statusPoint = $statusPoints->get($keypointId);
        return $statusPoint->VALUE == 0 ? 'active' : 'inactive';
    }

    /**
     * Optimized load calculation
     */
    private function calculateKeypointLoadOptimized($keypointId, $type, $garduInduks, $analogPointsForGis, $analogPointsNonGi)
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
                    $values = [
                        'IR' => [],
                        'IS' => [],
                        'IT' => [],
                        'KV-AB' => [],
                        'KV-BC' => [],
                        'KV-AC' => []
                    ];

                    foreach ($analogPoints as $point) {
                        if (is_numeric($point->VALUE) && isset($values[$point->NAME])) {
                            $values[$point->NAME][] = floatval($point->VALUE);

                            if (!$lastUpdate || $point->UPDATETIME > $lastUpdate) {
                                $lastUpdate = $point->UPDATETIME;
                            }
                        }
                    }

                    // Calculate load-is (average of IR, IS, IT)
                    $allIsValues = array_merge($values['IR'], $values['IS'], $values['IT']);
                    if (!empty($allIsValues)) {
                        $loadIs = array_sum($allIsValues) / count($allIsValues);
                    }

                    // Calculate load-mw
                    $allKvValues = array_merge($values['KV-AB'], $values['KV-BC'], $values['KV-AC']);
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
            'last_update' => $lastUpdate ?: now()->toISOString()
        ];
    }

    /**
     * Optimized feeder data retrieval
     */
    private function getFeederDataOptimized($keypointId, $garduInduks, $analogPointsForGis)
    {
        try {
            $garduInduk = $garduInduks->get($keypointId);

            if (!$garduInduk || $garduInduk->feeders->isEmpty()) {
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
}
