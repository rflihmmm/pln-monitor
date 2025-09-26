<?php

namespace App\Http\Controllers;

use App\Models\Feeder;
use App\Models\GarduInduk;
use App\Models\Organization;
use Illuminate\Http\Request;
use App\Models\FeederKeypoint;
use App\Models\AnalogPointSkada;
use App\Models\StatusPointSkada;
use App\Models\FeederStatusPoint;
use App\Models\StationPointSkada;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\OrganizationKeypoint;

class DashboardController extends Controller
{
    public function getMapData()
    {
        try {
            $mapData = $this->processMapData(GarduInduk::query());
            return response()->json([
                'success' => true,
                'data' => $mapData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching map data',
                'error' => $e->getMessage()
            ], 500);
        }
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
     * Get statuses from StatusPointSkada for multiple keypoints.
     */
    private function getGarduIndukStatuses(array $keypointIds)
    {
        if (empty($keypointIds)) {
            return [];
        }

        try {
            $statuses = StatusPointSkada::join('STATIONPOINTS', 'STATUSPOINTS.STATIONPID', '=', 'STATIONPOINTS.PKEY')
                ->whereIn('STATIONPOINTS.PKEY', $keypointIds)
                ->where('STATUSPOINTS.NAME', 'RTU-STAT')
                ->select('STATIONPOINTS.PKEY', 'STATUSPOINTS.VALUE')
                ->get()
                ->keyBy('PKEY');

            $results = [];
            foreach ($keypointIds as $keypointId) {
                $statusPoint = $statuses->get($keypointId);
                // Default to inactive. Active if VALUE is 0.
                $results[$keypointId] = ($statusPoint && $statusPoint->VALUE == 0) ? 'active' : 'inactive';
            }
            return $results;
        } catch (\Exception $e) {
            // On error, return all as inactive
            return array_fill_keys($keypointIds, 'inactive');
        }
    }

    /**
     * Calculate load IS and MW for a collection of gardu induks.
     */
    private function calculateLoads($garduInduks)
    {
        $results = [];
        if ($garduInduks->isEmpty()) {
            return [];
        }

        foreach ($garduInduks as $garduInduk) {
            $load_is = 0;
            $load_mw = 0;

            // The 'feeders' relationship must be eager-loaded before calling this function.
            $feederIds = $garduInduk->feeders->pluck('id')->all();

            if (!empty($feederIds)) {
                // Get status points for the feeders of this specific Gardu Induk.
                $feederStatusPoints = FeederStatusPoint::whereIn('feeder_id', $feederIds)
                    ->whereIn('type', ['AMP', 'MW'])
                    ->get();

                if (!$feederStatusPoints->isEmpty()) {
                    $statusIds = $feederStatusPoints->pluck('status_id')->unique()->all();

                    // Get analog values for these status points.
                    $analogValues = AnalogPointSkada::whereIn('PKEY', $statusIds)
                        ->pluck('VALUE', 'PKEY');

                    // Sum the values for this Gardu Induk.
                    foreach ($feederStatusPoints as $statusPoint) {
                        $value = floatval($analogValues->get($statusPoint->status_id) ?? 0);
                        if ($statusPoint->type === 'AMP') {
                            $load_is += $value;
                        } elseif ($statusPoint->type === 'MW') {
                            $load_mw += $value;
                        }
                    }
                }
            }

            $results[$garduInduk->id] = [
                'load_is' => round($load_is, 2),
                'load_mw' => round($load_mw, 2),
            ];
        }

        return $results;
    }

    /**
     * Get map data with optional filtering
     */
    public function getMapDataFiltered(Request $request)
    {
        try {
            $filter = $request->query('filter', 'ALL'); // GI, GH, or ALL
            $status = $request->query('status'); // active, inactive, or null for all

            $garduInduksQuery = GarduInduk::query();

            // Apply name filtering if needed (e.g., GI- or GH- prefix)
            if ($filter !== 'ALL') {
                $garduInduksQuery->where('name', 'LIKE', $filter . '-%');
            }

            $mapData = $this->processMapData($garduInduksQuery, $status);

            return response()->json([
                'success' => true,
                'data' => $mapData,
                'count' => count($mapData)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching filtered map data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function processMapData($garduInduksQuery, $statusFilter = null)
    {
        // a. Get the initial collection of GarduInduk objects with their feeders
        $garduInduks = $garduInduksQuery->with('feeders')->get();

        if ($garduInduks->isEmpty()) {
            return [];
        }

        // b. Collect all unique keypoint IDs
        $keypointIds = $garduInduks->pluck('keypoint_id')->filter()->unique()->all();

        // c. Bulk fetch keypoint names (from StationPointSkada) and statuses
        $keypointNames = [];
        if (!empty($keypointIds)) {
            $keypointNames = StationPointSkada::whereIn('PKEY', $keypointIds)
                ->pluck('NAME', 'PKEY');
        }
        $garduStatuses = $this->getGarduIndukStatuses($keypointIds);

        // d. & e. Bulk calculate all loads
        $allLoadData = $this->calculateLoads($garduInduks);

        $mapData = [];

        // f. & g. Loop through the collection and build the map data from pre-fetched values
        foreach ($garduInduks as $garduInduk) {
            // Skip records without coordinates
            if (empty($garduInduk->coordinate)) {
                continue;
            }

            // Get status from the pre-fetched map
            $status = $garduStatuses[$garduInduk->keypoint_id] ?? 'inactive';

            // Apply status filtering (if provided)
            if ($statusFilter && $status !== $statusFilter) {
                continue;
            }

            // Parse coordinate
            $coordinate = $this->parseCoordinate($garduInduk->coordinate);
            if (!$coordinate) {
                continue;
            }

            // Get data from pre-fetched maps
            $keypointName = $keypointNames[$garduInduk->keypoint_id] ?? null;
            $loadData = $allLoadData[$garduInduk->id] ?? ['load_is' => 0, 'load_mw' => 0];

            $mapData[] = [
                'id' => $garduInduk->id,
                'name' => $garduInduk->name,
                'keypointName' => $keypointName,
                'coordinate' => $coordinate,
                'status' => $status,
                'data' => [
                    'load-is' => $loadData['load_is'],
                    'load-mw' => $loadData['load_mw'],
                    'lastUpdate' => now()->toISOString(),
                ]
            ];
        }

        return $mapData;
    }

    public function getSystemLoadData()
    {
        try {
            // Get all organization IDs for the entire system
            $allOrganizationIds = Organization::pluck('id')->all();

            // Get calculated loads for LBS and Feeders
            $allLoads = $this->calculateAllSystemLoads($allOrganizationIds);

            // Get the organizational structure for aggregation
            $orgStructure = DB::connection('pgsql')
                ->table('organization as dcc')
                ->join('organization as up3', 'up3.parent_id', '=', 'dcc.id')
                ->join('organization as ulp', 'ulp.parent_id', '=', 'up3.id')
                ->join('organization_keypoint as okp', 'okp.organization_id', '=', 'ulp.id')
                ->where('dcc.level', 1)
                ->where('up3.level', 2)
                ->where('ulp.level', 3)
                ->select('dcc.name as dcc_name', 'up3.id as up3_id', 'up3.name as up3_name', 'okp.keypoint_id')
                ->get();

            // Aggregate and format the data
            $result = $this->aggregateAndFormatLoadData($orgStructure, $allLoads['lbs'], $allLoads['feeder']);

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'grandTotal' => $result['grandTotal']
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching system load data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching system load data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getMapDataByUser(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user || !$user->unit) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated or no unit assigned',
                ], 401);
            }

            $userOrganization = Organization::find($user->unit);
            if (!$userOrganization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            $organizationIds = $this->getAuthorizedOrganizationIds($userOrganization);
            if (empty($organizationIds)) {
                return response()->json(['success' => true, 'data' => []]);
            }

            $authorizedKeypointIds = OrganizationKeypoint::whereIn('organization_id', $organizationIds)
                ->pluck('keypoint_id')->unique()->filter()->values()->all();

            if (empty($authorizedKeypointIds)) {
                return response()->json(['success' => true, 'data' => []]);
            }

            // Get the IDs of the authorized Gardu Induks
            $authorizedGarduIndukIds = DB::table('gardu_induks as gi')
                ->join('feeders as f', 'f.gardu_induk_id', '=', 'gi.id')
                ->join('feeder_keypoints as fk', 'fk.feeder_id', '=', 'f.id')
                ->whereIn('fk.keypoint_id', $authorizedKeypointIds)
                ->whereNotNull('gi.coordinate')
                ->distinct()
                ->pluck('gi.id');

            if ($authorizedGarduIndukIds->isEmpty()) {
                return response()->json(['success' => true, 'data' => []]);
            }

            // Create the query builder for the authorized Gardu Induks
            $garduInduksQuery = GarduInduk::whereIn('id', $authorizedGarduIndukIds);

            // Use the optimized helper method to get the map data
            $mapData = $this->processMapData($garduInduksQuery);

            return response()->json([
                'success' => true,
                'data' => $mapData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching map data for user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getSystemLoadDataByUser(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user || !$user->unit) {
                return response()->json(['success' => false, 'message' => 'User not authenticated or no unit assigned'], 401);
            }

            $userOrganization = Organization::find($user->unit);
            if (!$userOrganization) {
                return response()->json(['success' => false, 'message' => 'Organization not found'], 404);
            }

            // Get all organization IDs the user is authorized to see
            $authorizedOrganizationIds = $this->getAuthorizedOrganizationIds($userOrganization);
            if (empty($authorizedOrganizationIds)) {
                return response()->json(['success' => true, 'data' => [], 'grandTotal' => []]);
            }

            // Get calculated loads for the authorized organizations
            $allLoads = $this->calculateAllSystemLoads($authorizedOrganizationIds);

            // Get the organizational structure filtered for the authorized entities
            $orgStructure = DB::connection('pgsql')
                ->table('organization as dcc')
                ->join('organization as up3', 'up3.parent_id', '=', 'dcc.id')
                ->join('organization as ulp', 'ulp.parent_id', '=', 'up3.id')
                ->join('organization_keypoint as okp', 'okp.organization_id', '=', 'ulp.id')
                ->whereIn('okp.organization_id', $authorizedOrganizationIds)
                ->select('dcc.name as dcc_name', 'up3.id as up3_id', 'up3.name as up3_name', 'okp.keypoint_id')
                ->get();

            // Aggregate and format the data
            $result = $this->aggregateAndFormatLoadData($orgStructure, $allLoads['lbs'], $allLoads['feeder']);

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'grandTotal' => $result['grandTotal']
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching system load data by user: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching system load data for user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Build organization structure dengan keypoints dan load calculation
     */
    private function buildOrganizationStructureWithKeypoints($organizationIds, $processedValues)
    {
        // Ambil semua organization data yang terlibat
        $organizations = Organization::whereIn('id', $organizationIds)
            ->select('id', 'name', 'level', 'parent_id')
            ->get()
            ->keyBy('id');

        // Ambil data organization_keypoint untuk authorized organizations
        $orgKeypoints = OrganizationKeypoint::whereIn('organization_id', $organizationIds)
            ->select('organization_id', 'keypoint_id')
            ->get();

        $structure = [];

        // Group keypoints by organization_id dan hitung load
        $orgLoads = [];
        foreach ($orgKeypoints as $orgKeypoint) {
            $orgId = $orgKeypoint->organization_id;
            $keypointId = $orgKeypoint->keypoint_id;

            if (!isset($orgLoads[$orgId])) {
                $orgLoads[$orgId] = ['power' => 0, 'current' => 0];
            }

            // Tambahkan load dari keypoint ini
            if (isset($processedValues[$keypointId])) {
                $orgLoads[$orgId]['power'] += $processedValues[$keypointId]['power'];
                $orgLoads[$orgId]['current'] += $processedValues[$keypointId]['current'];
            }
        }

        // Build structure berdasarkan hierarchy
        $dccGroups = [];

        foreach ($organizations as $org) {
            $orgLoad = $orgLoads[$org->id] ?? ['power' => 0, 'current' => 0];

            if ($org->level == 3) { // ULP
                $up3 = $organizations->get($org->parent_id);
                if ($up3) {
                    $dcc = $organizations->get($up3->parent_id);
                    if ($dcc) {
                        $dccName = $dcc->name;
                        $up3Id = $up3->id;
                        $up3Name = $up3->name;

                        // Initialize structure
                        if (!isset($dccGroups[$dccName])) {
                            $dccGroups[$dccName] = [
                                'name' => $dccName,
                                'up3s' => []
                            ];
                        }

                        if (!isset($dccGroups[$dccName]['up3s'][$up3Id])) {
                            $dccGroups[$dccName]['up3s'][$up3Id] = [
                                'name' => $up3Name,
                                'total_power' => 0,
                                'total_current' => 0
                            ];
                        }

                        // Tambahkan load ULP ke UP3
                        $dccGroups[$dccName]['up3s'][$up3Id]['total_power'] += $orgLoad['power'];
                        $dccGroups[$dccName]['up3s'][$up3Id]['total_current'] += $orgLoad['current'];
                    }
                }
            } elseif ($org->level == 2) { // UP3
                $dcc = $organizations->get($org->parent_id);
                if ($dcc) {
                    $dccName = $dcc->name;
                    $up3Id = $org->id;
                    $up3Name = $org->name;

                    // Initialize structure
                    if (!isset($dccGroups[$dccName])) {
                        $dccGroups[$dccName] = [
                            'name' => $dccName,
                            'up3s' => []
                        ];
                    }

                    if (!isset($dccGroups[$dccName]['up3s'][$up3Id])) {
                        $dccGroups[$dccName]['up3s'][$up3Id] = [
                            'name' => $up3Name,
                            'total_power' => 0,
                            'total_current' => 0
                        ];
                    }

                    // Tambahkan load UP3 langsung
                    $dccGroups[$dccName]['up3s'][$up3Id]['total_power'] += $orgLoad['power'];
                    $dccGroups[$dccName]['up3s'][$up3Id]['total_current'] += $orgLoad['current'];
                }
            } elseif ($org->level == 1) { // DCC
                $dccName = $org->name;

                // Initialize structure
                if (!isset($dccGroups[$dccName])) {
                    $dccGroups[$dccName] = [
                        'name' => $dccName,
                        'up3s' => []
                    ];
                }

                // Untuk DCC, load akan ditambahkan melalui UP3 dan ULP di bawahnya
                // Jadi tidak perlu tambah load langsung di sini
            }
        }

        return array_values($dccGroups);
    }

    /**
     * Mendapatkan semua ID organisasi dari user saat ini hingga ke root (DCC)
     */
    private function getOrganizationAncestorsAndSelf($organizationId)
    {
        $ids = [];
        $currentOrg = Organization::find($organizationId);

        while ($currentOrg) {
            $ids[] = $currentOrg->id;
            $currentOrg = $currentOrg->parent; // Assuming 'parent' relationship is defined in Organization model
        }

        return array_reverse($ids); // Return from DCC down to current
    }

    /**
     * Mendapatkan organization IDs yang authorized berdasarkan hierarchy
     */
    private function getAuthorizedOrganizationIds($userOrganization)
    {
        $organizationIds = [];

        switch ($userOrganization->level) {
            case 1: // DCC - dapat akses semua UP3 dan ULP dibawahnya
                // Dapatkan semua UP3 yang parent_id = DCC ID
                $up3Ids = Organization::where('parent_id', $userOrganization->id)
                    ->where('level', 2)
                    ->pluck('id')
                    ->toArray();

                // Dapatkan semua ULP yang parent_id ada di UP3 IDs
                $ulpIds = [];
                if (!empty($up3Ids)) {
                    $ulpIds = Organization::whereIn('parent_id', $up3Ids)
                        ->where('level', 3)
                        ->pluck('id')
                        ->toArray();
                }

                $organizationIds = array_merge([$userOrganization->id], $up3Ids, $ulpIds);
                break;

            case 2: // UP3 - dapat akses semua ULP dibawahnya
                // Dapatkan semua ULP yang parent_id = UP3 ID
                $ulpIds = Organization::where('parent_id', $userOrganization->id)
                    ->where('level', 3)
                    ->pluck('id')
                    ->toArray();

                $organizationIds = array_merge([$userOrganization->id], $ulpIds);
                break;

            case 3: // ULP - hanya dapat akses keypoint milik ULP tersebut
                $organizationIds = [$userOrganization->id];
                break;

            default:
                $organizationIds = [];
        }

        return $organizationIds;
    }

    public function getMapDataBasedOnRole(Request $request)
    {
        $user = $request->user();
        // atau bisa juga: $user = Auth::user();

        if ($user && $user->unit === null) {
            return $this->getMapData();
        } else {
            return $this->getMapDataByUser($request);
        }
    }

    public function getSystemLoadDataBasedOnRole(Request $request)
    {
        $user = $request->user();
        // atau bisa juga: $user = Auth::user();

        if ($user && $user->unit === null) {
            return $this->getSystemLoadData();
        } else {
            return $this->getSystemLoadDataByUser($request);
        }
    }

    private function calculateAllSystemLoads($organizationIds)
    {
        if (empty($organizationIds)) {
            return [
                'lbs' => [],
                'feeder' => [],
            ];
        }

        // --- LBS Load Calculation ---

        // 1. Get authorized keypoint IDs for LBS from organization_keypoint
        $lbsKeypointIds = OrganizationKeypoint::whereIn('organization_id', $organizationIds)
            ->pluck('keypoint_id')
            ->unique()
            ->filter()
            ->all();

        $processedLbsValues = [];
        if (!empty($lbsKeypointIds)) {
            // 2. Get analog data for LBS keypoints
            $analogLbsData = DB::connection('sqlsrv_main')
                ->table('ANALOGPOINTS as ap')
                ->join('STATIONPOINTS as sp', 'ap.STATIONPID', '=', 'sp.PKEY')
                ->whereIn('ap.STATIONPID', $lbsKeypointIds)
                ->whereIn('ap.NAME', ['IR', 'IS', 'IT', 'KV-AB', 'KV-BC', 'KV-AC'])
                ->where('sp.NAME', 'LIKE', 'LBS-%')
                ->select('ap.STATIONPID', 'ap.NAME', 'ap.VALUE')
                ->get();

            // 3. Create analog value map
            $analogLbsValueMap = [];
            foreach ($analogLbsData as $point) {
                $keypointId = $point->STATIONPID;
                $paramName = $point->NAME;
                $value = (float)$point->VALUE;

                if (!isset($analogLbsValueMap[$keypointId])) {
                    $analogLbsValueMap[$keypointId] = [
                        'current' => ['IR' => 0, 'IS' => 0, 'IT' => 0],
                        'voltage' => ['KV-AB' => 0, 'KV-BC' => 0, 'KV-AC' => 0]
                    ];
                }

                if (in_array($paramName, ['IR', 'IS', 'IT'])) {
                    $analogLbsValueMap[$keypointId]['current'][$paramName] = $value;
                } elseif (in_array($paramName, ['KV-AB', 'KV-BC', 'KV-AC'])) {
                    $analogLbsValueMap[$keypointId]['voltage'][$paramName] = $value;
                }
            }

            // 4. Calculate power and current for each LBS keypoint
            foreach ($analogLbsValueMap as $keypointId => $data) {
                $currentValues = array_values($data['current']);
                $currentCount = count(array_filter($currentValues, function ($val) {
                    return $val > 0;
                }));
                $loadIs = $currentCount > 0 ? array_sum($currentValues) / $currentCount : 0;

                $voltageValues = array_values($data['voltage']);
                $voltageCount = count(array_filter($voltageValues, function ($val) {
                    return $val > 0;
                }));
                $avgVoltage = $voltageCount > 0 ? array_sum($voltageValues) / $voltageCount : 0;

                $loadMw = ($avgVoltage * $loadIs) / 1000;

                $processedLbsValues[$keypointId] = [
                    'power' => $loadMw,
                    'current' => $loadIs
                ];
            }
        }

        // --- Feeder Load Calculation ---
        $processedFeederValues = [];
        $authorizedKeypointIds = $lbsKeypointIds; // Use the same keypoints from LBS

        if (!empty($authorizedKeypointIds)) {
            // 1. Get Feeder -> Keypoint mappings
            $feederKeypoints = FeederKeypoint::whereIn('keypoint_id', $authorizedKeypointIds)->get(['feeder_id', 'keypoint_id']);
            $feederIds = $feederKeypoints->pluck('feeder_id')->unique()->all();

            if (!empty($feederIds)) {
                // 2. Get status points for these feeders
                $feederStatusPoints = FeederStatusPoint::whereIn('feeder_id', $feederIds)
                    ->whereIn('type', ['AMP', 'MW'])
                    ->get();

                $statusIds = $feederStatusPoints->pluck('status_id')->unique()->all();

                if (!empty($statusIds)) {
                    // 3. Fetch all analog values for these status points
                    $analogValues = AnalogPointSkada::whereIn('PKEY', $statusIds)
                        ->pluck('VALUE', 'PKEY');

                    // 4. Calculate total load per feeder_id
                    $feederLoads = [];
                    foreach ($feederStatusPoints as $statusPoint) {
                        $feederId = $statusPoint->feeder_id;
                        if (!isset($feederLoads[$feederId])) {
                            $feederLoads[$feederId] = ['power' => 0, 'current' => 0];
                        }

                        $value = floatval($analogValues->get($statusPoint->status_id) ?? 0);
                        if ($statusPoint->type === 'AMP') {
                            $feederLoads[$feederId]['current'] += $value;
                        } elseif ($statusPoint->type === 'MW') {
                            $feederLoads[$feederId]['power'] += $value;
                        }
                    }

                    // 5. Distribute feeder loads to keypoints to avoid double counting
                    // Count how many authorized keypoints each feeder is linked to
                    $feederKeypointCounts = $feederKeypoints->groupBy('feeder_id')->map(function ($item) {
                        return $item->count();
                    });

                    // Distribute the load of each feeder among its keypoints
                    foreach ($feederKeypoints as $fkp) {
                        $keypointId = $fkp->keypoint_id;
                        $feederId = $fkp->feeder_id;
                        $count = $feederKeypointCounts[$feederId] ?? 1;
                        $load = $feederLoads[$feederId] ?? ['power' => 0, 'current' => 0];

                        if (!isset($processedFeederValues[$keypointId])) {
                            $processedFeederValues[$keypointId] = ['power' => 0, 'current' => 0];
                        }

                        $processedFeederValues[$keypointId]['power'] += $load['power'] / $count;
                        $processedFeederValues[$keypointId]['current'] += $load['current'] / $count;
                    }
                }
            }
        }

        return [
            'lbs' => $processedLbsValues,
            'feeder' => $processedFeederValues,
        ];
    }

    private function calculatePowerBasedOnDCC($dccName, $current, $originalPower)
{
    $dccNameUpper = strtoupper(trim($dccName));
    
    // Cek apakah DCC UTARA atau SELATAN
    if (strpos($dccNameUpper, 'UTARA') !== false) {
        // Formula: current * 20.7 * 1.732 * 0.9 / 1000
        return $current * 20.7 * 1.732 * 0.9 / 1000;
    } elseif (strpos($dccNameUpper, 'SELATAN') !== false) {
        // Formula: current * 20.4 * 1.732 * 0.9 / 1000
        return $current * 20.4 * 1.732 * 0.9 / 1000;
    } else {
        // Untuk DCC lainnya, gunakan power original
        return $originalPower;
    }
}

/**
 * Modifikasi method aggregateAndFormatLoadData
 */
private function aggregateAndFormatLoadData($orgStructure, $lbsLoads, $feederLoads)
{
    // Aggregate data by UP3
    $aggregatedData = [];
    foreach ($orgStructure as $orgLink) {
        $dccName = $orgLink->dcc_name;
        $up3Id = $orgLink->up3_id;
        $keypointId = $orgLink->keypoint_id;

        if (!isset($aggregatedData[$dccName])) {
            $aggregatedData[$dccName] = ['up3s' => []];
        }
        if (!isset($aggregatedData[$dccName]['up3s'][$up3Id])) {
            $aggregatedData[$dccName]['up3s'][$up3Id] = [
                'name' => $orgLink->up3_name,
                'lbs_power' => 0,
                'lbs_current' => 0,
                'feeder_power' => 0,
                'feeder_current' => 0,
            ];
        }

        $lbsValues = $lbsLoads[$keypointId] ?? ['power' => 0, 'current' => 0];
        $aggregatedData[$dccName]['up3s'][$up3Id]['lbs_power'] += $lbsValues['power'];
        $aggregatedData[$dccName]['up3s'][$up3Id]['lbs_current'] += $lbsValues['current'];

        $feederValues = $feederLoads[$keypointId] ?? ['power' => 0, 'current' => 0];
        $aggregatedData[$dccName]['up3s'][$up3Id]['feeder_power'] += $feederValues['power'];
        $aggregatedData[$dccName]['up3s'][$up3Id]['feeder_current'] += $feederValues['current'];
    }

    // Format the final response
    $systemLoadData = [];
    $grandTotalPower = 0;
    $grandTotalCurrent = 0;

    foreach ($aggregatedData as $dccName => $dccData) {
        $regions = [];
        $dccTotalPower = 0;
        $dccTotalCurrent = 0;

        foreach ($dccData['up3s'] as $up3) {
            // Hitung power berdasarkan DCC name
            $calculatedPower = $this->calculatePowerBasedOnDCC(
                $dccName, 
                $up3['feeder_current'], 
                $up3['feeder_power']
            );

            // Add Feeder data for the region
            $regions[] = [
                'name' => $up3['name'],
                'power' => number_format($calculatedPower, 2) . ' MW',
                'current' => number_format($up3['feeder_current'], 2) . ' A',
            ];

            $dccTotalPower += $calculatedPower;
            $dccTotalCurrent += $up3['feeder_current'];
        }

        $systemLoadData[] = [
            'name' => 'Beban Sistem ' . $dccName,
            'regions' => $regions,
            'total' => [
                [
                    'power' => number_format($dccTotalPower, 2) . ' MW',
                    'current' => number_format($dccTotalCurrent, 2) . ' A',
                ]
            ]
        ];

        $grandTotalPower += $dccTotalPower;
        $grandTotalCurrent += $dccTotalCurrent;
    }

    $grandTotal = [
        [
            'power' => number_format($grandTotalPower, 2) . ' MW',
            'current' => number_format($grandTotalCurrent, 2) . ' A',
        ]
    ];

    return [
        'data' => $systemLoadData,
        'grandTotal' => $grandTotal
    ];
}
}
