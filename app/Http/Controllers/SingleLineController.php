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
        try {
            $singleLineData = [];
            $incrementalId = 1;

            // Ambil semua data dari gardu_induks dan keypoint_ext
            $garduInduks = GarduInduk::all();
            $keypointExts = KeypointExt::all();

            // Gabungkan semua keypoint_id
            $allKeypointIds = collect();

            // Dari gardu_induks
            foreach ($garduInduks as $gardu) {
                if ($gardu->keypoint_id) {
                    $allKeypointIds->push([
                        'keypoint_id' => $gardu->keypoint_id,
                        'coordinate' => $gardu->coordinate,
                        'source' => 'gardu_induk'
                    ]);
                }
            }

            // Dari keypoint_ext
            foreach ($keypointExts as $keypoint) {
                $allKeypointIds->push([
                    'keypoint_id' => $keypoint->keypoint_id,
                    'coordinate' => $keypoint->coordinate,
                    'parent_stationpoints' => $keypoint->parent_stationpoints,
                    'source' => 'keypoint_ext'
                ]);
            }

            // Proses setiap keypoint
            foreach ($allKeypointIds as $keypointData) {
                $keypointId = $keypointData['keypoint_id'];

                // Ambil data dari StationPointSkada
                $stationPoint = StationPointSkada::where('PKEY', $keypointId)->first();

                if (!$stationPoint) {
                    continue; // Skip jika tidak ada data di StationPointSkada
                }

                $name = $stationPoint->NAME;
                $type = $this->extractTypeFromName($name);
                $coordinate = $this->parseCoordinate($keypointData['coordinate'] ?? null);

                if (!$coordinate) {
                    continue; // Skip jika coordinate tidak valid
                }

                // Tentukan parent
                $parent = null;
                if ($type !== 'GI' && isset($keypointData['parent_stationpoints'])) {
                    $parent = $keypointData['parent_stationpoints'];
                }

                // Status
                $status = $this->getKeypointStatus($keypointId);

                // Load data
                $loadData = $this->calculateKeypointLoad($keypointId, $type);

                // Feeder data (hanya untuk type GI)
                $feederData = null;
                if ($type === 'GI') {
                    $feederData = $this->getFeederData($keypointId);
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
            return response()->json([
                'success' => false,
                'message' => 'Error fetching single line data',
                'error' => $e->getMessage()
            ], 500);
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

    /**
     * Get status from StatusPointSkada
     */
    private function getKeypointStatus($keypointId)
    {
        if (!$keypointId) {
            return 'inactive';
        }

        try {
            $statusPoint = StatusPointSkada::join('STATIONPOINTS', 'STATUSPOINTS.STATIONPID', '=', 'STATIONPOINTS.PKEY')
                ->where('STATIONPOINTS.PKEY', $keypointId)
                ->where('STATUSPOINTS.NAME', 'RTU-STAT')
                ->select('STATUSPOINTS.VALUE')
                ->first();

            if (!$statusPoint) {
                return 'inactive';
            }

            return $statusPoint->VALUE == 0 ? 'active' : 'inactive';
        } catch (\Exception $e) {
            return 'inactive';
        }
    }

    /**
     * Calculate load for keypoint based on type
     */
    private function calculateKeypointLoad($keypointId, $type)
    {
        $loadIs = 0;
        $loadMw = 0;
        $lastUpdate = null;

        try {
            if ($type === 'GI') {
                // Untuk type GI, ambil dari feeder seperti di DashboardController
                $garduInduk = GarduInduk::where('keypoint_id', $keypointId)->first();

                if ($garduInduk) {
                    $feeders = $garduInduk->feeders;

                    foreach ($feeders as $feeder) {
                        // Load IS (AMP)
                        $ampStatusPoints = FeederStatusPoint::where('feeder_id', $feeder->id)
                            ->where('type', 'AMP')
                            ->get();

                        foreach ($ampStatusPoints as $statusPoint) {
                            $analogPoint = AnalogPointSkada::where('PKEY', $statusPoint->status_id)->first();
                            if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                                $loadIs += floatval($analogPoint->VALUE);
                                if (!$lastUpdate || $analogPoint->UPDATETIME > $lastUpdate) {
                                    $lastUpdate = $analogPoint->UPDATETIME;
                                }
                            }
                        }

                        // Load MW
                        $mwStatusPoints = FeederStatusPoint::where('feeder_id', $feeder->id)
                            ->where('type', 'MW')
                            ->get();

                        foreach ($mwStatusPoints as $statusPoint) {
                            $analogPoint = AnalogPointSkada::where('PKEY', $statusPoint->status_id)->first();
                            if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                                $loadMw += floatval($analogPoint->VALUE);
                                if (!$lastUpdate || $analogPoint->UPDATETIME > $lastUpdate) {
                                    $lastUpdate = $analogPoint->UPDATETIME;
                                }
                            }
                        }
                    }
                }
            } else {
                // Untuk selain GI, ambil dari AnalogPointSkada
                $analogPoints = AnalogPointSkada::where('STATIONPID', $keypointId)
                    ->whereIn('NAME', ['IR', 'IS', 'IT', 'KV-AB', 'KV-BC', 'KV-AC'])
                    ->get();

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
    private function getFeederData($keypointId)
    {
        try {
            $garduInduk = GarduInduk::where('keypoint_id', $keypointId)->first();

            if (!$garduInduk) {
                return null;
            }

            $feeders = $garduInduk->feeders;
            $feederData = [];

            foreach ($feeders as $feeder) {
                $feederLoadIs = 0;
                $feederLoadMw = 0;

                // Load IS (AMP)
                $ampStatusPoints = FeederStatusPoint::where('feeder_id', $feeder->id)
                    ->where('type', 'AMP')
                    ->get();

                foreach ($ampStatusPoints as $statusPoint) {
                    $analogPoint = AnalogPointSkada::where('PKEY', $statusPoint->status_id)->first();
                    if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                        $feederLoadIs += floatval($analogPoint->VALUE);
                    }
                }

                // Load MW
                $mwStatusPoints = FeederStatusPoint::where('feeder_id', $feeder->id)
                    ->where('type', 'MW')
                    ->get();

                foreach ($mwStatusPoints as $statusPoint) {
                    $analogPoint = AnalogPointSkada::where('PKEY', $statusPoint->status_id)->first();
                    if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                        $feederLoadMw += floatval($analogPoint->VALUE);
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
     * Get filtered single line data
     */
    public function getSingleLineDataFiltered(Request $request)
    {
        try {
            $typeFilter = $request->query('type'); // GI, REC, LBS, etc.
            $statusFilter = $request->query('status'); // active, inactive

            // Get all data first
            $response = $this->getSingleLineData();
            $responseData = json_decode($response->getContent(), true);

            if (!$responseData['success']) {
                return $response;
            }

            $filteredData = $responseData['data'];

            // Apply type filter
            if ($typeFilter) {
                $filteredData = array_filter($filteredData, function ($item) use ($typeFilter) {
                    return strtoupper($item['type']) === strtoupper($typeFilter);
                });
            }

            // Apply status filter
            if ($statusFilter) {
                $filteredData = array_filter($filteredData, function ($item) use ($statusFilter) {
                    return $item['status'] === $statusFilter;
                });
            }

            // Re-index array
            $filteredData = array_values($filteredData);

            return response()->json([
                'success' => true,
                'data' => $filteredData,
                'count' => count($filteredData)
            ]);
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

            if ($allowedKeypointIds->isEmpty()) {
                return response()->json(['success' => true, 'data' => [], 'count' => 0]);
            }

            $singleLineData = [];
            $incrementalId = 1;

            // Get keypoint_ext data that are allowed for this user (non-GI keypoints)
            $keypointExts = KeypointExt::whereIn('keypoint_id', $allowedKeypointIds)->get();

            // Get GarduInduk that have feeders connected to allowed keypoints
            $garduInduksWithAllowedKeypoints = $this->getGarduIndukWithAllowedKeypoints($allowedKeypointIds);

            // Process keypoint_ext data (REC, LBS, GH, etc.)
            foreach ($keypointExts as $keypoint) {
                $keypointId = $keypoint->keypoint_id;

                // Get station point data
                $stationPoint = StationPointSkada::where('PKEY', $keypointId)->first();
                if (!$stationPoint) {
                    continue; // Skip if no data in StationPointSkada
                }

                $name = $stationPoint->NAME;
                $type = $this->extractTypeFromName($name);
                $coordinate = $this->parseCoordinate($keypoint->coordinate ?? null);

                if (!$coordinate) {
                    continue; // Skip if coordinate is invalid
                }

                // Determine parent
                $parent = null;
                if ($keypoint->parent_stationpoints) {
                    $parent = $keypoint->parent_stationpoints;
                }

                // Get status
                $status = $this->getKeypointStatus($keypointId);

                // Calculate load data
                $loadData = $this->calculateKeypointLoad($keypointId, $type);

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
                    'feeder' => null // Non-GI keypoints don't have feeder data
                ];
            }

            // Process GarduInduk data that have connections to allowed keypoints
            foreach ($garduInduksWithAllowedKeypoints as $gardu) {
                $keypointId = $gardu->keypoint_id;

                // Get station point data
                $stationPoint = StationPointSkada::where('PKEY', $keypointId)->first();
                if (!$stationPoint) {
                    continue;
                }

                $name = $stationPoint->NAME;
                $type = $this->extractTypeFromName($name);
                $coordinate = $this->parseCoordinate($gardu->coordinate ?? null);

                if (!$coordinate) {
                    continue; // Skip if coordinate is invalid
                }

                // GI doesn't have parent
                $parent = null;

                // Get status
                $status = $this->getKeypointStatus($keypointId);

                // Calculate load data
                $loadData = $this->calculateKeypointLoad($keypointId, $type);

                // Get feeder data for GI
                $feederData = $this->getFeederData($keypointId);

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
            Log::error('Error fetching single line data by user: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching single line data for user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get GarduInduk that have feeders connected to allowed keypoints
     */
    private function getGarduIndukWithAllowedKeypoints($allowedKeypointIds)
    {
        return GarduInduk::whereHas('feeders.keypoints', function ($query) use ($allowedKeypointIds) {
            $query->whereIn('keypoint_id', $allowedKeypointIds);
        })
            ->orWhereIn('keypoint_id', $allowedKeypointIds)
            ->get();
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
