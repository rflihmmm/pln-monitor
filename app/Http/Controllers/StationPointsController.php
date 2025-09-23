<?php

namespace App\Http\Controllers;

use App\Models\Feeder;
use App\Models\GarduInduk;
use App\Models\KeypointExt;
use Illuminate\Http\Request;
use App\Models\FeederKeypoint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\Organization;
use App\Models\OrganizationKeypoint;

class StationPointsController extends Controller
{
    private const CACHE_TTL = 300; // 5 minutes
    private const BATCH_SIZE = 100; // Process in batches

    /**
     * Get all station points data (accessible by anyone)
     */
    public function getAllStationPoints()
    {
        return Cache::remember('station_points_all_data', self::CACHE_TTL, function () {
            $garduIndukIds = GarduInduk::whereNotNull('keypoint_id')->pluck('keypoint_id');
            $keypointExtIds = KeypointExt::pluck('keypoint_id');
            $allKeypointIds = $garduIndukIds->concat($keypointExtIds)->unique()->filter();

            return $this->buildStationPointsResponse($allKeypointIds);
        });
    }

    /**
     * Get single station point data by code (accessible by anyone)
     */
    public function getStationPointByCode($code)
    {
        try {
            $cacheKey = "station_point_single_{$code}";

            return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($code) {
                // Check if the code exists in our local keypoint data
                $garduIndukExists = GarduInduk::where('keypoint_id', $code)->exists();
                $keypointExtExists = KeypointExt::where('keypoint_id', $code)->exists();

                if (!$garduIndukExists && !$keypointExtExists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Station point not found',
                        'data' => null
                    ], 404);
                }

                $keypointIds = collect([$code]);
                $response = $this->buildStationPointsResponse($keypointIds);

                // Extract the single item from the response
                $responseData = $response->getData(true);

                if (empty($responseData['data'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Station point data not available',
                        'data' => null
                    ], 404);
                }

                return response()->json([
                    'success' => true,
                    'data' => $responseData['data'][0], // Return single item instead of array
                    'message' => 'Station point found successfully'
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Error fetching station point by code: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching station point data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Build station points response data
     */
    private function buildStationPointsResponse(\Illuminate\Support\Collection $keypointIds)
    {
        if ($keypointIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => [], 'count' => 0]);
        }

        try {
            // Pre-load all required data with optimized queries
            $preloadedData = $this->preloadAllRequiredData($keypointIds);

            $stationPointsData = [];
            $incrementalId = 1;

            // Process in batches to avoid memory issues
            $keypointBatches = $keypointIds->chunk(self::BATCH_SIZE);

            foreach ($keypointBatches as $batch) {
                $batchData = $this->processBatch($batch, $preloadedData, $incrementalId);
                $stationPointsData = array_merge($stationPointsData, $batchData['data']);
                $incrementalId = $batchData['next_id'];
            }

            return response()->json([
                'success' => true,
                'data' => $stationPointsData,
                'count' => count($stationPointsData)
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing station points data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error processing station points data',
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

        // 3. Get analog points for non-GI keypoints in batches
        $analogPointsNonGi = $keypointIds->isNotEmpty()
            ? $this->fetchAnalogPointsInBatches(
                $keypointIds,
                'STATIONPID',
                ['IR', 'IS', 'IT', 'KV-AB', 'KV-BC', 'KV-AC']
            )->groupBy('STATIONPID')
            : collect();

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

            $analogPointsForGis = $allFeederStatusIds->isNotEmpty()
                ? $this->fetchAnalogPointsInBatches(
                    $allFeederStatusIds,
                    'PKEY'
                )->keyBy('PKEY')
                : collect();
        }

        // 5. Get feeder data for non-GI keypoints
        $nonGiKeypointIds = $allKeypointData->where('source', 'keypoint_ext')->pluck('keypoint_id');

        $feederKeypointsNonGi = collect();
        $feedersNonGi = collect();
        $analogPointsForNonGiFeeders = collect();

        if ($nonGiKeypointIds->isNotEmpty()) {
            $feederKeypointsNonGi = FeederKeypoint::whereIn('keypoint_id', $nonGiKeypointIds)
                ->get(['keypoint_id', 'feeder_id'])
                ->groupBy('keypoint_id');

            $feederIdsNonGi = $feederKeypointsNonGi->flatten()->pluck('feeder_id')->unique();

            if ($feederIdsNonGi->isNotEmpty()) {
                $feedersNonGi = Feeder::whereIn('id', $feederIdsNonGi)
                    ->with(['statusPoints:id,feeder_id,status_id,type'])
                    ->get(['id', 'name'])
                    ->keyBy('id');

                $allFeederStatusIdsNonGi = collect();
                foreach ($feedersNonGi as $feeder) {
                    $allFeederStatusIdsNonGi = $allFeederStatusIdsNonGi->concat($feeder->statusPoints->pluck('status_id'));
                }
                $allFeederStatusIdsNonGi = $allFeederStatusIdsNonGi->unique()->filter();

                $analogPointsForNonGiFeeders = $allFeederStatusIdsNonGi->isNotEmpty()
                    ? $this->fetchAnalogPointsInBatches(
                        $allFeederStatusIdsNonGi,
                        'PKEY'
                    )->keyBy('PKEY')
                    : collect();
            }
        }

        return [
            'keypoint_data' => $allKeypointData,
            'station_points' => $stationPoints,
            'status_points' => $statusPoints,
            'analog_points_non_gi' => $analogPointsNonGi,
            'gardu_induks' => $garduInduks,
            'analog_points_for_gis' => $analogPointsForGis,
            'feeder_keypoints_non_gi' => $feederKeypointsNonGi,
            'feeders_non_gi' => $feedersNonGi,
            'analog_points_for_non_gi_feeders' => $analogPointsForNonGiFeeders,
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
            $type = $this->extractTypeFromName($name, $keypointId);
            $coordinate = $this->parseCoordinate($keypointData->coordinate ?? null);

            if (!$coordinate) {
                continue;
            }

            $parent = ($type !== 'GI' && isset($keypointData->parent_stationpoints))
                ? $keypointData->parent_stationpoints : null;

            // Resolve organization string (ULP | UP3 | DCC) for this keypoint
            $organizationString = $this->getOrganizationStringForKeypoint($keypointId);

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
            } else {
                // For non-GI keypoints, check if they are related to any feeders via FeederKeypoint
                $feederData = $this->getFeederDataForNonGiKeypointOptimized(
                    $keypointId,
                    $preloadedData['feeder_keypoints_non_gi'],
                    $preloadedData['feeders_non_gi'],
                    $preloadedData['analog_points_for_non_gi_feeders']
                );
            }

            $data[] = [
                'id' => $incrementalId++,
                'code' => $keypointId,
                'name' => $name,
                'type' => $type,
                'coordinate' => $coordinate,
                'parent' => $parent,
                'organization' => $organizationString,
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
                        $pointNameUpper = strtoupper($point->NAME);
                        if (is_numeric($point->VALUE) && isset($values[$pointNameUpper])) {
                            $values[$pointNameUpper][] = floatval($point->VALUE);

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
     * Optimized feeder data retrieval for non-GI keypoints
     */
    private function getFeederDataForNonGiKeypointOptimized($keypointId, $feederKeypointsNonGi, $feedersNonGi, $analogPointsForNonGiFeeders)
    {
        try {
            if (!$keypointId || !$feederKeypointsNonGi->has($keypointId)) {
                return null;
            }

            $relatedFeederKeypoints = $feederKeypointsNonGi->get($keypointId);
            $feederData = [];

            foreach ($relatedFeederKeypoints as $feederKeypoint) {
                $feeder = $feedersNonGi->get($feederKeypoint->feeder_id);

                if (!$feeder || $feeder->statusPoints->isEmpty()) {
                    continue;
                }

                $feederLoadIs = 0;
                $feederLoadMw = 0;

                foreach ($feeder->statusPoints as $statusPoint) {
                    $analogPoint = $analogPointsForNonGiFeeders->get($statusPoint->status_id);
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
            Log::error('Error getting feeder data for non-GI keypoint ' . $keypointId . ': ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Extract type from name (ambil kata sebelum tanda -)
     * Also, explicitly check if the keypoint is a Gardu Induk.
     */
    private function extractTypeFromName($name, $keypointId = null)
    {
        if (empty($name)) {
            return 'UNKNOWN';
        }

        // Check if it's a Gardu Induk based on keypoint_id
        if ($keypointId && GarduInduk::where('keypoint_id', $keypointId)->exists()) {
            return 'GI';
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
     * Helper to fetch ANALOGPOINTS in batches
     */
    private function fetchAnalogPointsInBatches(\Illuminate\Support\Collection $ids, string $idColumn, array $names = [])
    {
        $allAnalogPoints = collect();
        $idBatches = $ids->chunk(self::BATCH_SIZE);

        foreach ($idBatches as $batch) {
            $query = DB::connection('sqlsrv_main')
                ->table('ANALOGPOINTS')
                ->whereIn($idColumn, $batch)
                ->select('PKEY', 'STATIONPID', 'NAME', 'VALUE', 'UPDATETIME');

            if (!empty($names)) {
                $upperNames = array_map('strtoupper', $names);
                $placeholders = implode(',', array_fill(0, count($upperNames), '?'));
                $query->whereRaw("UPPER(NAME) IN ({$placeholders})", $upperNames);
            }

            $allAnalogPoints = $allAnalogPoints->concat($query->get());
        }

        return $allAnalogPoints;
    }

    /**
     * Return organization string for a keypoint in format "ULP | UP3 | DCC".
     * If multiple organizations map to the keypoint, join them with `; `.
     */
    private function getOrganizationStringForKeypoint($keypointId)
    {
        try {
            $orgIds = OrganizationKeypoint::where('keypoint_id', $keypointId)
                ->pluck('organization_id')
                ->unique()
                ->filter()
                ->values()
                ->all();

            if (empty($orgIds)) {
                return null;
            }

            $strings = [];

            foreach ($orgIds as $orgId) {
                $org = Organization::find($orgId);
                if (!$org) continue;

                // Walk up to find ULP (3), UP3 (2), DCC (1)
                $current = $org;
                $ulpName = null;
                $up3Name = null;
                $dccName = null;

                while ($current) {
                    if ($current->level == 3) {
                        $ulpName = $current->name;
                    } elseif ($current->level == 2) {
                        $up3Name = $current->name;
                    } elseif ($current->level == 1) {
                        $dccName = $current->name;
                    }
                    $current = $current->parent;
                }

                $parts = [];
                if ($ulpName) $parts[] = $ulpName;
                if ($up3Name) $parts[] = $up3Name;
                if ($dccName) $parts[] = $dccName;

                $strings[] = implode(' | ', $parts);
            }

            return implode('; ', $strings);
        } catch (\Exception $e) {
            Log::error('Error resolving organization for keypoint ' . $keypointId . ': ' . $e->getMessage());
            return null;
        }
    }
}
