<?php

namespace App\Http\Controllers;

use App\Models\Feeder;
use App\Models\GarduInduk;
use Illuminate\Http\Request;
use App\Models\AnalogPointSkada;
use App\Models\StatusPointSkada;
use App\Models\FeederStatusPoint;
use App\Models\StationPointSkada;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
}
