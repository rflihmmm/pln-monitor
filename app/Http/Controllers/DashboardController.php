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
            // This query gathers the structure (DCC -> UP3 -> ULP) and links it to the keypoint IDs.
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

            // If no organizational structure is found, return an empty successful response.
            if ($orgStructureWithKeypoints->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'grandTotal' => ['power' => '0.00 MW', 'current' => '0.00 A']
                ]);
            }

            // Extract all unique keypoint IDs to be used in the next query.
            // The filter() method removes any potential null values.
            $keypointIds = $orgStructureWithKeypoints->pluck('keypoint_id')->unique()->filter()->all();

            // STEP 2: Get all relevant analog data from SQL Server in a single query.
            // We use the collected keypoint IDs to fetch only the necessary rows from ANALOGPOINTS.
            $analogData = DB::connection('sqlsrv_main')
                ->table('ANALOGPOINTS')
                ->whereIn('STATIONPID', $keypointIds)
                ->whereIn('NAME', ['IS', 'IR']) // 'IS' for Power, 'IR' for Current
                ->select('STATIONPID', 'NAME', 'VALUE')
                ->get();

            // Create a lookup map for faster processing in PHP.
            // Key: STATIONPID, Value: ['power' => X, 'current' => Y]
            $analogValueMap = [];
            foreach ($analogData as $point) {
                $key = $point->STATIONPID;
                if (!isset($analogValueMap[$key])) {
                    $analogValueMap[$key] = ['power' => 0, 'current' => 0];
                }
                if ($point->NAME === 'IS') {
                    $analogValueMap[$key]['power'] = (float)$point->VALUE;
                } elseif ($point->NAME === 'IR') {
                    $analogValueMap[$key]['current'] = (float)$point->VALUE;
                }
            }

            // STEP 3: Process and aggregate the data in PHP.
            // This is where we combine the results from the two queries.
            $aggregatedData = [];
            foreach ($orgStructureWithKeypoints as $orgLink) {
                // Find the corresponding analog values from our map.
                $values = $analogValueMap[$orgLink->keypoint_id] ?? ['power' => 0, 'current' => 0];

                // Use the UP3 ID as a key for easy aggregation.
                $dccName = $orgLink->dcc_name;
                $up3Id = $orgLink->up3_id;

                // Initialize structures if they don't exist.
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

                // Add the power and current values to the correct UP3 total.
                $aggregatedData[$dccName][$up3Id]['power'] += $values['power'];
                $aggregatedData[$dccName][$up3Id]['current'] += $values['current'];
            }

            // STEP 4: Format the aggregated data into the final JSON structure.
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
            Log::error('Error fetching system load data (Refactored): ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching system load data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
