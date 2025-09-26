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

class SystemLoadController extends Controller
{
    // This method will be the entry point for get/load and get/load/all
    public function getLoad(Request $request)
    {
        return $this->getAll();
    }

    public function getAll()
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
                ->select('dcc.id as dcc_id', 'dcc.name as dcc_name', 'up3.id as up3_id', 'up3.name as up3_name', 'okp.keypoint_id')
                ->get();

            // Aggregate and format the data
            $result = $this->aggregateAndFormatAllLoadData($orgStructure, $allLoads['lbs'], $allLoads['feeder']);

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'grandTotal' => $result['grandTotal']
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching all system load data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching all system load data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getById($id)
    {
        try {
            // Find the specific DCC organization
            $dcc = Organization::where('id', $id)->where('level', 1)->firstOrFail();

            // Get all organization IDs for the entire system to calculate grand total
            $allOrganizationIds = Organization::pluck('id')->all();
            $allLoads = $this->calculateAllSystemLoads($allOrganizationIds);

            // Get the full organizational structure
            $orgStructure = DB::connection('pgsql')
                ->table('organization as dcc')
                ->join('organization as up3', 'up3.parent_id', '=', 'dcc.id')
                ->join('organization as ulp', 'ulp.parent_id', '=', 'up3.id')
                ->join('organization_keypoint as okp', 'okp.organization_id', '=', 'ulp.id')
                ->where('dcc.level', 1)
                ->where('up3.level', 2)
                ->where('ulp.level', 3)
                ->select('dcc.id as dcc_id', 'dcc.name as dcc_name', 'up3.id as up3_id', 'up3.name as up3_name', 'okp.keypoint_id')
                ->get();

            // Calculate the grand total for the whole system
            $grandTotal = $this->calculateGrandTotal($orgStructure, $allLoads['feeder']);

            // Filter the structure for the requested DCC
            $dccOrgStructure = $orgStructure->where('dcc_id', $id);

            // Aggregate and format the data for the specific DCC
            $result = $this->aggregateAndFormatLoadDataById($dcc, $dccOrgStructure, $allLoads['feeder']);

            return response()->json([
                'success' => true,
                'data' => $result,
                'grandTotal' => $grandTotal
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'DCC not found',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching system load data by ID: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching system load data by ID',
                'error' => $e->getMessage()
            ], 500);
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
            // Formula: current * 20.7 * 1.732 * 0.9 / 1000
            return $current * 20.4 * 1.732 * 0.9 / 1000;
        } else {
            // Untuk DCC lainnya, gunakan power original
            return $originalPower;
        }
    }

    private function aggregateAndFormatLoadDataById($dcc, $orgStructure, $feederLoads)
    {
        $aggregatedData = [];
        foreach ($orgStructure as $orgLink) {
            $up3Id = $orgLink->up3_id;
            $keypointId = $orgLink->keypoint_id;

            if (!isset($aggregatedData[$up3Id])) {
                $aggregatedData[$up3Id] = [
                    'name' => $orgLink->up3_name,
                    'feeder_power' => 0,
                    'feeder_current' => 0,
                ];
            }

            $feederValues = $feederLoads[$keypointId] ?? ['power' => 0, 'current' => 0];
            $aggregatedData[$up3Id]['feeder_power'] += $feederValues['power'];
            $aggregatedData[$up3Id]['feeder_current'] += $feederValues['current'];
        }

        $regions = [];
        $dccTotalPower = 0;
        $dccTotalCurrent = 0;

        foreach ($aggregatedData as $up3) {
            $calculatedPower = $this->calculatePowerBasedOnDCC(
                $dcc->name,
                $up3['feeder_current'],
                $up3['feeder_power']
            );

            $regions[] = [
                'name' => 'UP3 ' . $up3['name'],
                'power' => number_format($calculatedPower, 2) . ' MW',
                'current' => number_format($up3['feeder_current'], 2) . ' A',
            ];

            $dccTotalPower += $calculatedPower;
            $dccTotalCurrent += $up3['feeder_current'];
        }

        return [
            [
                'id' => $dcc->id,
                'name' => 'Beban Sistem ' . $dcc->name,
                'regions' => $regions,
                'total' => [
                    [
                        'power' => number_format($dccTotalPower, 2) . ' MW',
                        'current' => number_format($dccTotalCurrent, 2) . ' A',
                    ]
                ]
            ]
        ];
    }

    private function calculateGrandTotal($orgStructure, $feederLoads)
    {
        $grandTotalPower = 0;
        $grandTotalCurrent = 0;
        
        $dccTotals = [];

        // Aggregate loads per DCC first
        foreach ($orgStructure as $orgLink) {
            $dccId = $orgLink->dcc_id;
            $dccName = $orgLink->dcc_name;
            $keypointId = $orgLink->keypoint_id;

            if (!isset($dccTotals[$dccId])) {
                $dccTotals[$dccId] = [
                    'name' => $dccName,
                    'total_power' => 0,
                    'total_current' => 0,
                ];
            }

            $feederValues = $feederLoads[$keypointId] ?? ['power' => 0, 'current' => 0];
            
            $calculatedPower = $this->calculatePowerBasedOnDCC(
                $dccName,
                $feederValues['current'],
                $feederValues['power']
            );

            $dccTotals[$dccId]['total_power'] += $calculatedPower;
            $dccTotals[$dccId]['total_current'] += $feederValues['current'];
        }

        // Sum up the totals from each DCC
        foreach ($dccTotals as $dcc) {
            $grandTotalPower += $dcc['total_power'];
            $grandTotalCurrent += $dcc['total_current'];
        }

        return [
            [
                'power' => number_format($grandTotalPower, 2) . ' MW',
                'current' => number_format($grandTotalCurrent, 2) . ' A',
            ]
        ];
    }

    private function aggregateAndFormatAllLoadData($orgStructure, $lbsLoads, $feederLoads)
    {
        $aggregatedData = [];
        foreach ($orgStructure as $orgLink) {
            $dccId = $orgLink->dcc_id;
            $dccName = $orgLink->dcc_name;
            $up3Id = $orgLink->up3_id;
            $keypointId = $orgLink->keypoint_id;

            if (!isset($aggregatedData[$dccId])) {
                $aggregatedData[$dccId] = [
                    'name' => $dccName,
                    'up3s' => []
                ];
            }
            if (!isset($aggregatedData[$dccId]['up3s'][$up3Id])) {
                $aggregatedData[$dccId]['up3s'][$up3Id] = [
                    'name' => $orgLink->up3_name,
                    'feeder_power' => 0,
                    'feeder_current' => 0,
                ];
            }

            $feederValues = $feederLoads[$keypointId] ?? ['power' => 0, 'current' => 0];
            $aggregatedData[$dccId]['up3s'][$up3Id]['feeder_power'] += $feederValues['power'];
            $aggregatedData[$dccId]['up3s'][$up3Id]['feeder_current'] += $feederValues['current'];
        }

        $dccDataList = [];
        $grandTotalPower = 0;
        $grandTotalCurrent = 0;

        foreach ($aggregatedData as $dccId => $dccDetails) {
            $dccTotalPower = 0;
            $dccTotalCurrent = 0;
            
            foreach ($dccDetails['up3s'] as $up3) {
                $calculatedPower = $this->calculatePowerBasedOnDCC(
                    $dccDetails['name'],
                    $up3['feeder_current'],
                    $up3['feeder_power']
                );
                $dccTotalPower += $calculatedPower;
                $dccTotalCurrent += $up3['feeder_current'];
            }

            $dccDataList[] = [
                'id' => $dccId,
                'name' => 'Beban Sistem ' . $dccDetails['name'],
                'power' => number_format($dccTotalPower, 2) . ' MW',
                'current' => number_format($dccTotalCurrent, 2) . ' A',
            ];

            $grandTotalPower += $dccTotalPower;
            $grandTotalCurrent += $dccTotalCurrent;
        }

        return [
            'data' => [
                [
                    'name' => 'Beban Sistem DCC ALL',
                    'dccData' => $dccDataList
                ]
            ],
            'grandTotal' => [
                [
                    'power' => number_format($grandTotalPower, 2) . ' MW',
                    'current' => number_format($grandTotalCurrent, 2) . ' A',
                ]
            ]
        ];
    }
}