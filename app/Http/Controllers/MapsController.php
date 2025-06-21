<?php

namespace App\Http\Controllers;

use App\Models\MapsData;
use App\Models\FeederKeypoint;
use App\Models\GarduInduk;
use App\Models\AnalogPointSkada;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MapsController extends Controller
{
    /**
     * Get all keypoints data by DCC
     */
    public function getKeypointsByDcc(string $dcc): JsonResponse
    {
        try {
            // Validasi DCC parameter
            $allowedDcc = ['SELATAN', 'UTARA', 'TENGGARA'];
            if (!in_array(strtoupper($dcc), $allowedDcc)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid DCC parameter'
                ], 400);
            }

            // Query data dari PostgreSQL dengan join
            $keypointsData = DB::table('maps_data as md')
                ->join('feeder_keypoints as fk', 'md.keypoint_id', '=', 'fk.keypoint_id')
                ->join('feeders as f', 'fk.feeder_id', '=', 'f.id')
                ->join('gardu_induks as gi', 'f.gardu_induk_id', '=', 'gi.id')
                ->select(
                    'md.keypoint_id',
                    'md.dcc',
                    'md.lokasi',
                    'fk.name as keypoint_name',
                    'gi.name as gardu_induk_name'
                )
                ->where('md.dcc', strtoupper($dcc))
                ->get();

            if ($keypointsData->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'No data found for the specified DCC'
                ]);
            }

            // Ambil keypoint IDs untuk query ke MSSQL
            $keypointIds = $keypointsData->pluck('keypoint_id')->toArray();

            // Query data dari MSSQL (ANALOGPOINTS) berdasarkan NAME menggunakan STATIONPID
            $analogDataRaw = AnalogPointSkada::whereIn('STATIONPID', $keypointIds)
                ->whereIn('NAME', ['LOAD', 'CURRENT', 'VOLTAGE', 'ACKNOWLEDGE', 'OUTINPOLL'])
                ->select('STATIONPID', 'NAME', 'VALUE')
                ->get();

            // Reorganisasi data analog berdasarkan STATIONPID dan NAME
            $analogData = [];
            foreach ($analogDataRaw as $row) {
                $analogData[$row->STATIONPID][$row->NAME] = $row->VALUE;
            }

            // Gabungkan data dan format response
            $result = $keypointsData->map(function ($item) use ($analogData) {
                $analog = $analogData[$item->keypoint_id] ?? [];
                
                // Tentukan type berdasarkan nama keypoint
                $type = $this->determineKeypointType($item->keypoint_name);

                return [
                    'type' => $type,
                    'gardu_induk' => $item->gardu_induk_name,
                    'keypoint' => $item->keypoint_name,
                    'dcc' => $item->dcc,
                    'lokasi' => $item->lokasi,
                    'voltage' => isset($analog['VOLTAGE']) ? $analog['VOLTAGE'] . ' kV' : '0 kV',
                    'current' => isset($analog['CURRENT']) ? $analog['CURRENT'] . ' MVA' : '0 MVA',
                    'load' => isset($analog['LOAD']) ? $analog['LOAD'] . ' MW' : '0 MW',
                    'acknowledge' => isset($analog['ACKNOWLEDGE']) ? (int)$analog['ACKNOWLEDGE'] : 0,
                    'outinpoll' => isset($analog['OUTINPOLL']) ? (int)$analog['OUTINPOLL'] : 0,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $result,
                'total' => $result->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getKeypointsByDcc: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get summary data by DCC with totals per Gardu Induk
     */
    public function getSummaryByDcc(string $dcc): JsonResponse
    {
        try {
            // Validasi DCC parameter
            $allowedDcc = ['SELATAN', 'UTARA', 'TENGGARA'];
            if (!in_array(strtoupper($dcc), $allowedDcc)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid DCC parameter'
                ], 400);
            }

            // Query data dari PostgreSQL dengan join
            $keypointsData = DB::table('maps_data as md')
                ->join('feeder_keypoints as fk', 'md.keypoint_id', '=', 'fk.keypoint_id')
                ->join('feeders as f', 'fk.feeder_id', '=', 'f.id')
                ->join('gardu_induks as gi', 'f.gardu_induk_id', '=', 'gi.id')
                ->select(
                    'md.keypoint_id',
                    'md.dcc',
                    'gi.id as gardu_induk_id',
                    'gi.name as gardu_induk_name'
                )
                ->where('md.dcc', strtoupper($dcc))
                ->get();

            if ($keypointsData->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'dcc' => strtoupper($dcc),
                        'total_voltage' => '0 kV',
                        'total_current' => '0 MVA',
                        'total_load' => '0 MW',
                        'gardu_induk' => []
                    ]
                ]);
            }

            // Ambil keypoint IDs untuk query ke MSSQL
            $keypointIds = $keypointsData->pluck('keypoint_id')->toArray();

            // Query data dari MSSQL (ANALOGPOINTS) berdasarkan NAME menggunakan STATIONPID
            $analogDataRaw = AnalogPointSkada::whereIn('STATIONPID', $keypointIds)
                ->whereIn('NAME', ['LOAD', 'CURRENT', 'VOLTAGE'])
                ->select('STATIONPID', 'NAME', 'VALUE')
                ->get();

            // Reorganisasi data analog berdasarkan STATIONPID dan NAME
            $analogData = [];
            foreach ($analogDataRaw as $row) {
                $analogData[$row->STATIONPID][$row->NAME] = $row->VALUE;
            }

            // Group data by Gardu Induk dan hitung total
            $garduIndukSummary = [];
            $totalVoltage = 0;
            $totalCurrent = 0;
            $totalLoad = 0;

            foreach ($keypointsData->groupBy('gardu_induk_id') as $garduIndukId => $keypoints) {
                $garduIndukName = $keypoints->first()->gardu_induk_name;
                $garduVoltage = 0;
                $garduCurrent = 0;
                $garduLoad = 0;

                foreach ($keypoints as $keypoint) {
                    $analog = $analogData[$keypoint->keypoint_id] ?? [];
                    
                    $garduVoltage += floatval($analog['VOLTAGE'] ?? 0);
                    $garduCurrent += floatval($analog['CURRENT'] ?? 0);
                    $garduLoad += floatval($analog['LOAD'] ?? 0);
                }

                $garduIndukSummary[] = [
                    'name' => $garduIndukName,
                    'voltage' => number_format($garduVoltage, 2) . ' kV',
                    'current' => number_format($garduCurrent, 2) . ' MVA',
                    'load' => number_format($garduLoad, 2) . ' MW',
                ];

                $totalVoltage += $garduVoltage;
                $totalCurrent += $garduCurrent;
                $totalLoad += $garduLoad;
            }

            $result = [
                'dcc' => strtoupper($dcc),
                'total_voltage' => number_format($totalVoltage, 2) . ' kV',
                'total_current' => number_format($totalCurrent, 2) . ' MVA',
                'total_load' => number_format($totalLoad, 2) . ' MW',
                'gardu_induk' => $garduIndukSummary
            ];

            return response()->json([
                'success' => true,
                'data' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getSummaryByDcc: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get all available DCC values
     */
    public function getAvailableDcc(): JsonResponse
    {
        try {
            $dccList = MapsData::select('dcc')
                ->distinct()
                ->whereNotNull('dcc')
                ->orderBy('dcc')
                ->pluck('dcc');

            return response()->json([
                'success' => true,
                'data' => $dccList
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getAvailableDcc: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get keypoints data for specific DCC (Route: /api/maps/keypoints/{dcc})
     */
    public function keypointsSelatan(): JsonResponse
    {
        return $this->getKeypointsByDcc('SELATAN');
    }

    public function keypointsUtara(): JsonResponse
    {
        return $this->getKeypointsByDcc('UTARA');
    }

    public function keypointsTenggara(): JsonResponse
    {
        return $this->getKeypointsByDcc('TENGGARA');
    }

    /**
     * Get summary data for specific DCC (Route: /api/maps/summary/{dcc})
     */
    public function summarySelatan(): JsonResponse
    {
        return $this->getSummaryByDcc('SELATAN');
    }

    public function summaryUtara(): JsonResponse
    {
        return $this->getSummaryByDcc('UTARA');
    }

    public function summaryTenggara(): JsonResponse
    {
        return $this->getSummaryByDcc('TENGGARA');
    }

    /**
     * Determine keypoint type based on keypoint name
     */
    private function determineKeypointType(string $keypointName): string
    {
        $name = strtoupper($keypointName);
        
        // Pola umum untuk menentukan type
        if (strpos($name, 'GI-') === 0 || strpos($name, 'GI_') === 0) {
            return 'GI'; // Gardu Induk
        } elseif (strpos($name, 'GH-') === 0 || strpos($name, 'GH_') === 0) {
            return 'GH'; // Gardu Hubung
        } elseif (strpos($name, 'LBS-') === 0 || strpos($name, 'LBS_') === 0) {
            return 'LBS'; // Gardu Distribusi
        } else {
            // Default berdasarkan konteks atau pola lainnya
            return 'OTHER';
        }
    }
}