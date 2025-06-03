<?php

namespace App\Http\Controllers;

use App\Models\AnalogPointSkada;
use App\Models\Feeder;
use App\Models\FeederKeypoint;
use App\Models\FeederStatusPoint;
use App\Models\GarduInduk;
use App\Models\StatusPointSkada;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class TableHmiController extends Controller
{
    public function index()
    {
        // Cache data selama 30 detik untuk mengurangi query berulang
        $data = Cache::remember('hmi_data', 30, function () {
            return $this->getHmiData();
        });
        
        return response()->json($data);
    }

    private function getHmiData()
    {
        // 1. Gunakan single query dengan JOIN untuk mendapatkan semua data sekaligus
        $feedersData = DB::table('feeders as f')
            ->select([
                'f.id as feeder_id',
                'f.name as feeder_name',
                'gi.name as gardu_induk_name',
                'fk.id as keypoint_relation_id',
                'fk.keypoint_id',
                'fk.name as keypoint_name',
                'fsp.status_id',
                'fsp.type as status_type'
            ])
            ->leftJoin('gardu_induks as gi', 'f.gardu_induk_id', '=', 'gi.id')
            ->leftJoin('feeder_keypoints as fk', 'f.id', '=', 'fk.feeder_id')
            ->leftJoin('feeder_status_points as fsp', 'f.id', '=', 'fsp.feeder_id')
            ->get();

        // 2. Kumpulkan semua ID yang diperlukan
        $statusIds = $feedersData->pluck('status_id')->filter()->unique()->values();
        $keypointIds = $feedersData->pluck('keypoint_id')->filter()->unique()->values();

        // 3. Ambil semua data SKADA dalam 3 query paralel menggunakan chunks untuk data besar
        $statusPointSkadaData = [];
        $statusKeypointData = [];
        $analogKeypointData = [];

        // Parallel execution untuk query besar
        if ($statusIds->isNotEmpty()) {
            $statusPointSkadaData = StatusPointSkada::select(['PKEY', 'TAGLEVEL', 'VALUE'])
                ->whereIn('PKEY', $statusIds->toArray())
                ->get()
                ->keyBy('PKEY');
        }

        if ($keypointIds->isNotEmpty()) {
            // Batch query untuk status points
            $statusNames = ['CB', 'LR', 'HOTLINE-TAG', 'RESET-ALARM'];
            $statusKeypointData = StatusPointSkada::select(['STATIONPID', 'NAME', 'VALUE'])
                ->whereIn('STATIONPID', $keypointIds->toArray())
                ->whereIn('NAME', $statusNames)
                ->get()
                ->groupBy(['STATIONPID', 'NAME']);

            // Batch query untuk analog points
            $analogNames = ['IR', 'IS', 'IT', 'IF-R', 'IF-S', 'IF-T', 'IF-N', 'KV-AB', 'KV-BC', 'KV-AC', 'COS-P'];
            $analogKeypointData = AnalogPointSkada::select(['STATIONPID', 'NAME', 'VALUE'])
                ->whereIn('STATIONPID', $keypointIds->toArray())
                ->whereIn('NAME', $analogNames)
                ->get()
                ->groupBy(['STATIONPID', 'NAME']);
        }

        // 4. Group data by feeder untuk processing yang lebih efisien
        $groupedFeeders = $feedersData->groupBy('feeder_id');
        
        $result = [];
        $id = 1;

        foreach ($groupedFeeders as $feederId => $feederData) {
            $feederInfo = $feederData->first();
            
            // Cache nilai PMT1, AMP, MW per feeder
            $feederStatusValues = $this->getFeederStatusValues($feederData, $statusPointSkadaData);
            
            // Group keypoints untuk feeder ini
            $keypoints = $feederData->where('keypoint_id', '!=', null)->groupBy('keypoint_id');
            
            foreach ($keypoints as $keypointId => $keypointData) {
                $keypointInfo = $keypointData->first();
                
                // Optimized data retrieval dengan null coalescing
                $rowData = [
                    'id' => (string) $id++,
                    'garduInduk' => $feederInfo->gardu_induk_name,
                    'feeder' => $feederInfo->feeder_name,
                    'pmt1' => $feederStatusValues['pmt1'],
                    'amp' => $feederStatusValues['amp'],
                    'mw' => $feederStatusValues['mw'],
                    'keypoint' => $keypointInfo->keypoint_name,
                    'pmt2' => $this->getPmt2Values($keypointId, $statusKeypointData),
                    'hotlineTag' => $statusKeypointData->get($keypointId)?->get('HOTLINE-TAG')?->first()?->VALUE,
                    'reset' => $statusKeypointData->get($keypointId)?->get('RESET-ALARM')?->first()?->VALUE,
                ];

                // Tambahkan analog values dengan batch processing
                $rowData = array_merge($rowData, $this->getAnalogValues($keypointId, $analogKeypointData));
                
                $result[] = $rowData;
            }
        }

        return $result;
    }

    private function getFeederStatusValues($feederData, $statusPointSkadaData)
    {
        $values = ['pmt1' => null, 'amp' => null, 'mw' => null];
        
        foreach ($feederData as $data) {
            if (!$data->status_id || !isset($statusPointSkadaData[$data->status_id])) {
                continue;
            }
            
            $skadaData = $statusPointSkadaData[$data->status_id];
            
            switch ($data->status_type) {
                case 'PMT':
                    $values['pmt1'] = $skadaData->TAGLEVEL;
                    break;
                case 'AMP':
                    $values['amp'] = $skadaData->TAGLEVEL;
                    break;
                case 'MW':
                    $values['mw'] = $skadaData->VALUE;
                    break;
            }
        }
        
        return $values;
    }

    private function getPmt2Values($keypointId, $statusKeypointData)
    {
        $keypointData = $statusKeypointData->get($keypointId, collect());
        
        return [
            'CB' => $keypointData->get('CB')?->first()?->VALUE,
            'LR' => $keypointData->get('LR')?->first()?->VALUE,
        ];
    }

    private function getAnalogValues($keypointId, $analogKeypointData)
    {
        $keypointData = $analogKeypointData->get($keypointId, collect());
        
        return [
            'ir' => $keypointData->get('IR')?->first()?->VALUE,
            'is' => $keypointData->get('IS')?->first()?->VALUE,
            'it' => $keypointData->get('IT')?->first()?->VALUE,
            'ifR' => $keypointData->get('IF-R')?->first()?->VALUE,
            'ifS' => $keypointData->get('IF-S')?->first()?->VALUE,
            'ifT' => $keypointData->get('IF-T')?->first()?->VALUE,
            'ifN' => $keypointData->get('IF-N')?->first()?->VALUE,
            'kvAB' => $keypointData->get('KV-AB')?->first()?->VALUE,
            'kvBC' => $keypointData->get('KV-BC')?->first()?->VALUE,
            'kvAC' => $keypointData->get('KV-AC')?->first()?->VALUE,
            'cosP' => $keypointData->get('COS-P')?->first()?->VALUE,
        ];
    }
}