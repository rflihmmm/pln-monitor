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
            // Ambil semua data gardu induk dengan relasi yang dibutuhkan
            $garduInduks = GarduInduk::with(['feeders.statusPoints'])->get();

            $mapData = [];

            foreach ($garduInduks as $garduInduk) {
                // Skip jika coordinate kosong
                if (empty($garduInduk->coordinate)) {
                    continue;
                }

                // 1. ID dan Name
                $id = $garduInduk->id;
                $name = $garduInduk->name;

                // 2. Keypoint Name
                $keypointName = null;
                if ($garduInduk->keypoint_id) {
                    $stationPoint = StationPointSkada::where('PKEY', $garduInduk->keypoint_id)->first();
                    $keypointName = $stationPoint ? $stationPoint->NAME : null;
                }

                // 3. Coordinate - convert string to array
                $coordinate = $this->parseCoordinate($garduInduk->coordinate);
                if (!$coordinate) {
                    continue; // Skip jika coordinate tidak valid
                }

                // 4. Status dari StatusPointSkada
                $status = $this->getGarduIndukStatus($garduInduk->keypoint_id);

                // 5. Load IS dan Load MW
                $loadData = $this->calculateLoad($garduInduk);

                $mapData[] = [
                    'id' => $id,
                    'name' => $name,
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
     * Get status from StatusPointSkada
     */
    private function getGarduIndukStatus($keypointId)
    {
        if (!$keypointId) {
            return 'inactive';
        }

        try {
            // Cari status point dengan NAME = RTU-STAT yang terhubung ke station point
            $statusPoint = StatusPointSkada::join('STATIONPOINTS', 'STATUSPOINTS.STATIONPID', '=', 'STATIONPOINTS.PKEY')
                ->where('STATIONPOINTS.PKEY', $keypointId)
                ->where('STATUSPOINTS.NAME', 'RTU-STAT')
                ->select('STATUSPOINTS.VALUE')
                ->first();

            if (!$statusPoint) {
                return 'inactive';
            }

            // Jika VALUE = 0 maka active, jika VALUE = 1 maka inactive
            return $statusPoint->VALUE == 0 ? 'active' : 'inactive';
        } catch (\Exception $e) {
            return 'inactive';
        }
    }

    /**
     * Calculate load IS and MW for a gardu induk
     */
    private function calculateLoad(GarduInduk $garduInduk)
    {
        $loadIs = 0;
        $loadMw = 0;

        try {
            // Ambil semua feeder yang terkait dengan gardu induk ini
            $feeders = $garduInduk->feeders;

            foreach ($feeders as $feeder) {
                // Ambil status points untuk AMP (load-is)
                $ampStatusPoints = FeederStatusPoint::where('feeder_id', $feeder->id)
                    ->where('type', 'AMP')
                    ->get();

                foreach ($ampStatusPoints as $statusPoint) {
                    $analogPoint = AnalogPointSkada::where('PKEY', $statusPoint->status_id)->first();
                    if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                        $loadIs += floatval($analogPoint->VALUE);
                    }
                }

                // Ambil status points untuk MW (load-mw)
                $mwStatusPoints = FeederStatusPoint::where('feeder_id', $feeder->id)
                    ->where('type', 'MW')
                    ->get();

                foreach ($mwStatusPoints as $statusPoint) {
                    $analogPoint = AnalogPointSkada::where('PKEY', $statusPoint->status_id)->first();
                    if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                        $loadMw += floatval($analogPoint->VALUE);
                    }
                }
            }
        } catch (\Exception $e) {
            // Log error if needed
            Log::error('Error calculating load for gardu induk ' . $garduInduk->id . ': ' . $e->getMessage());
        }

        return [
            'load_is' => round($loadIs, 2),
            'load_mw' => round($loadMw, 2)
        ];
    }

    /**
     * Get map data with optional filtering
     */
    public function getMapDataFiltered(Request $request)
    {
        try {
            $filter = $request->query('filter', 'ALL'); // GI, GH, or ALL
            $status = $request->query('status'); // active, inactive, or null for all

            $garduInduks = GarduInduk::with(['feeders.statusPoints']);

            // Apply name filtering if needed (e.g., GI- or GH- prefix)
            if ($filter !== 'ALL') {
                $garduInduks->where('name', 'LIKE', $filter . '-%');
            }

            $garduInduks = $garduInduks->get();

            $mapData = [];

            foreach ($garduInduks as $garduInduk) {
                if (empty($garduInduk->coordinate)) {
                    continue;
                }

                $id = $garduInduk->id;
                $name = $garduInduk->name;

                $keypointName = null;
                if ($garduInduk->keypoint_id) {
                    $stationPoint = StationPointSkada::where('PKEY', $garduInduk->keypoint_id)->first();
                    $keypointName = $stationPoint ? $stationPoint->NAME : null;
                }

                $coordinate = $this->parseCoordinate($garduInduk->coordinate);
                if (!$coordinate) {
                    continue;
                }

                $garduStatus = $this->getGarduIndukStatus($garduInduk->keypoint_id);

                // Apply status filtering
                if ($status && $garduStatus !== $status) {
                    continue;
                }

                $loadData = $this->calculateLoad($garduInduk);

                $mapData[] = [
                    'id' => $id,
                    'name' => $name,
                    'keypointName' => $keypointName,
                    'coordinate' => $coordinate,
                    'status' => $garduStatus,
                    'data' => [
                        'load-is' => $loadData['load_is'],
                        'load-mw' => $loadData['load_mw'],
                        'lastUpdate' => now()->toISOString(),
                    ]
                ];
            }

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

            $userOrganizationId = $user->unit;

            // 1. Cek apakah organization ID ada di table organization
            $userOrganization = Organization::find($userOrganizationId);
            if (!$userOrganization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            // 2. Dapatkan semua descendant organization IDs berdasarkan level hierarchy
            $organizationIds = $this->getAuthorizedOrganizationIds($userOrganization);

            if (empty($organizationIds)) {
                return response()->json(['success' => true, 'data' => []]);
            }

            // 3. Dapatkan keypoint_ids yang authorized berdasarkan organization_keypoint
            $authorizedKeypointIds = OrganizationKeypoint::whereIn('organization_id', $organizationIds)
                ->pluck('keypoint_id')
                ->unique()
                ->filter()
                ->values()
                ->toArray();

            if (empty($authorizedKeypointIds)) {
                return response()->json(['success' => true, 'data' => []]);
            }

            // 4. Query untuk mendapatkan gardu induk yang memiliki keypoint authorized
            // melalui relasi feeder -> feeder_keypoints -> organization_keypoint
            $garduInduksWithAuthorizedKeypoints = DB::table('gardu_induks as gi')
                ->join('feeders as f', 'f.gardu_induk_id', '=', 'gi.id')
                ->join('feeder_keypoints as fk', 'fk.feeder_id', '=', 'f.id')
                ->whereIn('fk.keypoint_id', $authorizedKeypointIds)
                ->whereNotNull('gi.coordinate') // Hanya yang memiliki coordinate
                ->select('gi.id', 'gi.name', 'gi.coordinate', 'gi.keypoint_id')
                ->distinct()
                ->get();

            if ($garduInduksWithAuthorizedKeypoints->isEmpty()) {
                return response()->json(['success' => true, 'data' => []]);
            }

            $mapData = [];

            foreach ($garduInduksWithAuthorizedKeypoints as $garduInduk) {
                // Parse coordinate
                $coordinate = $this->parseCoordinate($garduInduk->coordinate);
                if (!$coordinate) {
                    continue;
                }

                // Get keypoint name untuk gardu induk
                $keypointName = null;
                if ($garduInduk->keypoint_id) {
                    $stationPoint = StationPointSkada::where('PKEY', $garduInduk->keypoint_id)->first();
                    $keypointName = $stationPoint ? $stationPoint->NAME : null;
                }

                // Get status gardu induk
                $status = $this->getGarduIndukStatus($garduInduk->keypoint_id);

                // Calculate load untuk gardu induk ini berdasarkan authorized keypoints saja
                $loadData = $this->calculateLoadForAuthorizedKeypoints($garduInduk->id, $authorizedKeypointIds);

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

    /**
     * Calculate load untuk gardu induk berdasarkan authorized keypoints saja
     */
    private function calculateLoadForAuthorizedKeypoints($garduIndukId, $authorizedKeypointIds)
    {
        $loadIs = 0;
        $loadMw = 0;

        try {
            // Hanya ambil feeders yang memiliki keypoints yang authorized
            $feedersWithAuthorizedKeypoints = DB::table('feeders as f')
                ->join('feeder_keypoints as fk', 'fk.feeder_id', '=', 'f.id')
                ->where('f.gardu_induk_id', $garduIndukId)
                ->whereIn('fk.keypoint_id', $authorizedKeypointIds)
                ->select('f.id as feeder_id')
                ->distinct()
                ->pluck('feeder_id')
                ->toArray();

            if (empty($feedersWithAuthorizedKeypoints)) {
                return ['load_is' => 0, 'load_mw' => 0];
            }

            // Ambil status points untuk AMP (load-is) dari feeders yang authorized
            $ampStatusPoints = FeederStatusPoint::whereIn('feeder_id', $feedersWithAuthorizedKeypoints)
                ->where('type', 'AMP')
                ->get();

            foreach ($ampStatusPoints as $statusPoint) {
                $analogPoint = AnalogPointSkada::where('PKEY', $statusPoint->status_id)->first();
                if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                    $loadIs += floatval($analogPoint->VALUE);
                }
            }

            // Ambil status points untuk MW (load-mw) dari feeders yang authorized
            $mwStatusPoints = FeederStatusPoint::whereIn('feeder_id', $feedersWithAuthorizedKeypoints)
                ->where('type', 'MW')
                ->get();

            foreach ($mwStatusPoints as $statusPoint) {
                $analogPoint = AnalogPointSkada::where('PKEY', $statusPoint->status_id)->first();
                if ($analogPoint && is_numeric($analogPoint->VALUE)) {
                    $loadMw += floatval($analogPoint->VALUE);
                }
            }
        } catch (\Exception $e) {
            Log::error('Error calculating load for authorized keypoints in gardu induk ' . $garduIndukId . ': ' . $e->getMessage());
        }

        return [
            'load_is' => round($loadIs, 2),
            'load_mw' => round($loadMw, 2)
        ];
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
