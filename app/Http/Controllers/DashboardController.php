<?php

namespace App\Http\Controllers;

use App\Models\Feeder;
use App\Models\GarduInduk;
use App\Models\Organization;
use Illuminate\Http\Request;
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
            return $results;
        }

        // Initialize results with 0
        foreach ($garduInduks as $garduInduk) {
            $results[$garduInduk->id] = ['load_is' => 0, 'load_mw' => 0];
        }

        $feederIds = $garduInduks->pluck('feeders')->flatten()->pluck('id')->unique()->all();

        if (empty($feederIds)) {
            return $results;
        }

        // Fetch all status points for all feeders at once
        $feederStatusPoints = FeederStatusPoint::whereIn('feeder_id', $feederIds)
            ->whereIn('type', ['AMP', 'MW'])
            ->get();

        $statusIds = $feederStatusPoints->pluck('status_id')->unique()->all();

        if (empty($statusIds)) {
            return $results;
        }

        // Fetch all analog values at once
        $analogValues = AnalogPointSkada::whereIn('PKEY', $statusIds)
            ->select('PKEY', 'VALUE')
            ->get()
            ->pluck('VALUE', 'PKEY');

        // Map feeder IDs to their Gardu Induk ID
        $feederToGarduMap = [];
        foreach ($garduInduks as $garduInduk) {
            foreach ($garduInduk->feeders as $feeder) {
                $feederToGarduMap[$feeder->id] = $garduInduk->id;
            }
        }

        // Calculate loads in memory
        foreach ($feederStatusPoints as $statusPoint) {
            $value = floatval($analogValues->get($statusPoint->status_id) ?? 0);
            $garduIndukId = $feederToGarduMap[$statusPoint->feeder_id] ?? null;

            if ($garduIndukId) {
                if ($statusPoint->type === 'AMP') {
                    $results[$garduIndukId]['load_is'] += $value;
                } elseif ($statusPoint->type === 'MW') {
                    $results[$garduIndukId]['load_mw'] += $value;
                }
            }
        }

        // Round the final values
        foreach ($results as $garduIndukId => $loads) {
            $results[$garduIndukId]['load_is'] = round($loads['load_is'], 2);
            $results[$garduIndukId]['load_mw'] = round($loads['load_mw'], 2);
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
            // STEP 1: Get the organizational hierarchy and all associated keypoint IDs from PostgreSQL.
            $orgStructureWithKeypoints = DB::connection('pgsql')
                ->table('organization as dcc')
                ->join('organization as up3', 'up3.parent_id', '=', 'dcc.id')
                ->join('organization as ulp', 'ulp.parent_id', '=', 'up3.id')
                ->join('organization_keypoint as okp', 'okp.organization_id', '=', 'ulp.id')
                ->where('dcc.level', 1)
                ->where('up3.level', 2)
                ->where('ulp.level', 3)
                ->select(
                    'dcc.id as dcc_id',
                    'dcc.name as dcc_name',
                    'up3.id as up3_id',
                    'up3.name as up3_name',
                    'okp.keypoint_id'
                )
                ->get();

            if ($orgStructureWithKeypoints->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'grandTotal' => ['power' => '0.00 MW', 'current' => '0.00 A']
                ]);
            }

            $keypointIds = $orgStructureWithKeypoints->pluck('keypoint_id')->unique()->filter()->all();

            // STEP 2: Get analog data for load calculation from SQL Server
            // Get IR, IS, IT for current calculation and KV-AB, KV-BC, KV-AC for voltage calculation
            $analogData = DB::connection('sqlsrv_main')
                ->table('ANALOGPOINTS as ap')
                ->join('STATIONPOINTS as sp', 'ap.STATIONPID', '=', 'sp.PKEY')
                ->whereIn('ap.STATIONPID', $keypointIds)
                ->whereIn('ap.NAME', ['IR', 'IS', 'IT', 'KV-AB', 'KV-BC', 'KV-AC'])
                ->where('sp.NAME', 'LIKE', 'LBS-%') // Filter by keypoint name
                ->select('ap.STATIONPID', 'ap.NAME', 'ap.VALUE')
                ->get();

            // Create analog value map grouped by keypoint and parameter name
            $analogValueMap = [];
            foreach ($analogData as $point) {
                $keypointId = $point->STATIONPID;
                $paramName = $point->NAME;
                $value = (float)$point->VALUE;

                if (!isset($analogValueMap[$keypointId])) {
                    $analogValueMap[$keypointId] = [
                        'current' => ['IR' => 0, 'IS' => 0, 'IT' => 0],
                        'voltage' => ['KV-AB' => 0, 'KV-BC' => 0, 'KV-AC' => 0]
                    ];
                }

                if (in_array($paramName, ['IR', 'IS', 'IT'])) {
                    $analogValueMap[$keypointId]['current'][$paramName] = $value;
                } elseif (in_array($paramName, ['KV-AB', 'KV-BC', 'KV-AC'])) {
                    $analogValueMap[$keypointId]['voltage'][$paramName] = $value;
                }
            }

            // STEP 3: Calculate load-is and load-mw for each keypoint
            $processedValues = [];
            foreach ($analogValueMap as $keypointId => $data) {
                // Calculate load-is: average of IR, IS, IT
                $currentValues = array_values($data['current']);
                $currentCount = count(array_filter($currentValues, function ($val) {
                    return $val > 0;
                }));
                $loadIs = $currentCount > 0 ? array_sum($currentValues) / $currentCount : 0;

                // Calculate load-mw: average of KV-AB, KV-BC, KV-AC multiplied by load-is
                $voltageValues = array_values($data['voltage']);
                $voltageCount = count(array_filter($voltageValues, function ($val) {
                    return $val > 0;
                }));
                $avgVoltage = $voltageCount > 0 ? array_sum($voltageValues) / $voltageCount : 0;

                // Convert to MW: (voltage_kV * current_A) / 1000 = MW
                $loadMw = ($avgVoltage * $loadIs) / 1000;

                $processedValues[$keypointId] = [
                    'power' => $loadMw,
                    'current' => $loadIs
                ];
            }

            // STEP 4: Process and aggregate the data
            $aggregatedData = [];
            foreach ($orgStructureWithKeypoints as $orgLink) {
                $values = $processedValues[$orgLink->keypoint_id] ?? ['power' => 0, 'current' => 0];
                $dccName = $orgLink->dcc_name;
                $up3Id = $orgLink->up3_id;

                if (!isset($aggregatedData[$dccName])) {
                    $aggregatedData[$dccName] = [];
                }
                if (!isset($aggregatedData[$dccName][$up3Id])) {
                    $aggregatedData[$dccName][$up3Id] = [
                        'name' => $orgLink->up3_name,
                        'power' => 0,
                        'current' => 0
                    ];
                }

                $aggregatedData[$dccName][$up3Id]['power'] += $values['power'];
                $aggregatedData[$dccName][$up3Id]['current'] += $values['current'];
            }

            // STEP 5: Format the final response
            $systemLoadData = [];
            $grandTotalPower = 0;
            $grandTotalCurrent = 0;

            foreach ($aggregatedData as $dccName => $up3s) {
                $regions = [];
                $dccTotalPower = 0;
                $dccTotalCurrent = 0;

                foreach ($up3s as $up3) {
                    $regions[] = [
                        'name' => $up3['name'],
                        'power' => number_format($up3['power'], 2) . ' MW',
                        'current' => number_format($up3['current'], 2) . ' A'
                    ];
                    $dccTotalPower += $up3['power'];
                    $dccTotalCurrent += $up3['current'];
                }

                $systemLoadData[] = [
                    'name' => 'Beban Sistem ' . $dccName,
                    'regions' => $regions,
                    'total' => [
                        'power' => number_format($dccTotalPower, 2) . ' MW',
                        'current' => number_format($dccTotalCurrent, 2) . ' A'
                    ]
                ];

                $grandTotalPower += $dccTotalPower;
                $grandTotalCurrent += $dccTotalCurrent;
            }

            return response()->json([
                'success' => true,
                'data' => $systemLoadData,
                'grandTotal' => [
                    'power' => number_format($grandTotalPower, 2) . ' MW',
                    'current' => number_format($grandTotalCurrent, 2) . ' A'
                ]
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
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated or no unit assigned'
                ], 401);
            }

            $userOrganizationId = $user->unit;

            // 1. Cek apakah organization ID ada di table organization
            $userOrganization = Organization::find($userOrganizationId);
            if (!$userOrganization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            // 2. Dapatkan semua ID organisasi yang relevan
            $ancestorIds = $this->getOrganizationAncestorsAndSelf($userOrganizationId);
            $authorizedDescendantIds = $this->getAuthorizedOrganizationIds($userOrganization);
            $organizationIds = array_unique(array_merge($ancestorIds, $authorizedDescendantIds));

            if (empty($organizationIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'grandTotal' => ['power' => '0.00 MW', 'current' => '0.00 A']
                ]);
            }

            // 3. Dapatkan keypoint_ids yang authorized berdasarkan organization_keypoint
            $authorizedKeypointIds = OrganizationKeypoint::whereIn('organization_id', $organizationIds)
                ->pluck('keypoint_id')
                ->unique()
                ->filter()
                ->values()
                ->toArray();

            if (empty($authorizedKeypointIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'grandTotal' => ['power' => '0.00 MW', 'current' => '0.00 A']
                ]);
            }

            // 4. Get analog data for load calculation from SQL Server
            $analogData = DB::connection('sqlsrv_main')
                ->table('ANALOGPOINTS as ap')
                ->join('STATIONPOINTS as sp', 'ap.STATIONPID', '=', 'sp.PKEY')
                ->whereIn('ap.STATIONPID', $authorizedKeypointIds)
                ->whereIn('ap.NAME', ['IR', 'IS', 'IT', 'KV-AB', 'KV-BC', 'KV-AC'])
                ->where('sp.NAME', 'LIKE', 'LBS-%') // Filter by keypoint name
                ->select('ap.STATIONPID', 'ap.NAME', 'ap.VALUE')
                ->get();

            // 5. Create analog value map grouped by keypoint and parameter name
            $analogValueMap = [];
            foreach ($analogData as $point) {
                $keypointId = $point->STATIONPID;
                $paramName = $point->NAME;
                $value = (float)$point->VALUE;

                if (!isset($analogValueMap[$keypointId])) {
                    $analogValueMap[$keypointId] = [
                        'current' => ['IR' => 0, 'IS' => 0, 'IT' => 0],
                        'voltage' => ['KV-AB' => 0, 'KV-BC' => 0, 'KV-AC' => 0]
                    ];
                }

                if (in_array($paramName, ['IR', 'IS', 'IT'])) {
                    $analogValueMap[$keypointId]['current'][$paramName] = $value;
                } elseif (in_array($paramName, ['KV-AB', 'KV-BC', 'KV-AC'])) {
                    $analogValueMap[$keypointId]['voltage'][$paramName] = $value;
                }
            }

            // 6. Calculate load-is and load-mw for each keypoint
            $processedValues = [];
            foreach ($analogValueMap as $keypointId => $data) {
                // Calculate load-is: average of IR, IS, IT
                $currentValues = array_values($data['current']);
                $currentCount = count(array_filter($currentValues, function ($val) {
                    return $val > 0;
                }));
                $loadIs = $currentCount > 0 ? array_sum($currentValues) / $currentCount : 0;

                // Calculate load-mw: average of KV-AB, KV-BC, KV-AC multiplied by load-is
                $voltageValues = array_values($data['voltage']);
                $voltageCount = count(array_filter($voltageValues, function ($val) {
                    return $val > 0;
                }));
                $avgVoltage = $voltageCount > 0 ? array_sum($voltageValues) / $voltageCount : 0;

                // Convert to MW: (voltage_kV * current_A) / 1000 = MW
                $loadMw = ($avgVoltage * $loadIs) / 1000;

                $processedValues[$keypointId] = [
                    'power' => $loadMw,
                    'current' => $loadIs
                ];
            }

            // 7. Dapatkan organization structure dengan keypoints
            $organizationStructure = $this->buildOrganizationStructureWithKeypoints($organizationIds, $processedValues);

            // 8. Aggregate data berdasarkan hierarchy
            $systemLoadData = [];
            $grandTotalPower = 0;
            $grandTotalCurrent = 0;

            foreach ($organizationStructure as $dccData) {
                $regions = [];
                $dccTotalPower = 0;
                $dccTotalCurrent = 0;

                foreach ($dccData['up3s'] as $up3Data) {
                    $regions[] = [
                        'name' => $up3Data['name'],
                        'power' => number_format($up3Data['total_power'], 2) . ' MW',
                        'current' => number_format($up3Data['total_current'], 2) . ' A'
                    ];
                    $dccTotalPower += $up3Data['total_power'];
                    $dccTotalCurrent += $up3Data['total_current'];
                }

                $systemLoadData[] = [
                    'name' => 'Beban Sistem ' . $dccData['name'],
                    'regions' => $regions,
                    'total' => [
                        'power' => number_format($dccTotalPower, 2) . ' MW',
                        'current' => number_format($dccTotalCurrent, 2) . ' A'
                    ]
                ];

                $grandTotalPower += $dccTotalPower;
                $grandTotalCurrent += $dccTotalCurrent;
            }

            return response()->json([
                'success' => true,
                'data' => $systemLoadData,
                'grandTotal' => [
                    'power' => number_format($grandTotalPower, 2) . ' MW',
                    'current' => number_format($grandTotalCurrent, 2) . ' A'
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching system load data by user: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching system load data',
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
}
