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
use Illuminate\Support\Facades\DB;
use App\Models\OrganizationKeypoint;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\Traits\HasOrganizationHierarchy;

class TableHmiController extends Controller
{
    use HasOrganizationHierarchy;

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

        // 3. Ambil semua data SKADA dalam query paralel
        $statusPointSkadaData = [];
        $analogPointSkadaData = [];
        $statusKeypointData = [];
        $analogKeypointData = [];

        // Query untuk StatusPointSkada (hanya untuk PMT)
        if ($statusIds->isNotEmpty()) {
            $statusPointSkadaData = StatusPointSkada::select(['PKEY', 'TAGLEVEL', 'VALUE'])
                ->whereIn('PKEY', $statusIds->toArray())
                ->get()
                ->keyBy('PKEY');
        }

        // Query untuk AnalogPointSkada (untuk AMP dan MW berdasarkan status_id)
        if ($statusIds->isNotEmpty()) {
            $analogPointSkadaData = AnalogPointSkada::select(['PKEY', 'VALUE'])
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
            $feederStatusValues = $this->getFeederStatusValues($feederData, $statusPointSkadaData, $analogPointSkadaData);

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

    private function getFeederStatusValues($feederData, $statusPointSkadaData, $analogPointSkadaData)
    {
        $values = ['pmt1' => null, 'amp' => null, 'mw' => null];

        foreach ($feederData as $data) {
            if (!$data->status_id) {
                continue;
            }

            switch ($data->status_type) {
                case 'PMT':
                    // PMT tetap menggunakan StatusPointSkada
                    if (isset($statusPointSkadaData[$data->status_id])) {
                        $values['pmt1'] = $statusPointSkadaData[$data->status_id]->VALUE;
                    }
                    break;
                case 'AMP':
                    // AMP sekarang menggunakan AnalogPointSkada
                    if (isset($analogPointSkadaData[$data->status_id])) {
                        $values['amp'] = $analogPointSkadaData[$data->status_id]->VALUE;
                    }
                    break;
                case 'MW':
                    // MW sekarang menggunakan AnalogPointSkada
                    if (isset($analogPointSkadaData[$data->status_id])) {
                        $values['mw'] = $analogPointSkadaData[$data->status_id]->VALUE;
                    }
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
        ];
    }

    public function indexByUser(Request $request)
    {
        // We don't cache user-specific data as it might not be requested frequently
        // by the same user within a short period. Caching is more effective for global data.
        $data = $this->getHmiDataByUser($request);

        return response()->json($data);
    }

    private function getHmiDataByUser(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->unit) {
            return []; // Return empty data if user is not authenticated or has no unit
        }

        $userOrganizationId = $user->unit;

        // 1. Cek apakah organization ID ada di table organization
        $userOrganization = Organization::find($userOrganizationId);
        if (!$userOrganization) {
            return []; // Return empty if organization not found
        }

        // 2. Dapatkan semua descendant organization IDs (termasuk current organization)
        $organizationIds = $this->getOrganizationDescendants($userOrganizationId);
        $organizationIds[] = $userOrganizationId; // Include current organization

        // 3. Dapatkan keypoint_ids dari organization_keypoint berdasarkan organization hierarchy
        $authorizedKeypointIds = OrganizationKeypoint::whereIn('organization_id', $organizationIds)
            ->pluck('keypoint_id')
            ->unique()
            ->filter()
            ->values();

        if ($authorizedKeypointIds->isEmpty()) {
            return []; // No keypoints found for user's organization hierarchy
        }

        // 4. Dapatkan gardu_induk yang memiliki keypoint_id yang sama dengan authorized keypoints
        $authorizedGarduIndukIds = GarduInduk::whereIn('keypoint_id', $authorizedKeypointIds)
            ->pluck('id')
            ->unique()
            ->filter()
            ->values();

        if ($authorizedGarduIndukIds->isEmpty()) {
            return []; // No gardu induk found for authorized keypoints
        }

        // 5. Query utama dengan filter berdasarkan gardu_induk_id saja
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
            ->whereIn('f.gardu_induk_id', $authorizedGarduIndukIds) // Filter hanya berdasarkan authorized gardu induk
            ->get();

        if ($feedersData->isEmpty()) {
            return []; // No feeder data found for user's authorization
        }

        // 6. Kumpulkan semua ID yang diperlukan untuk SKADA data
        $statusIds = $feedersData->pluck('status_id')->filter()->unique()->values();
        $keypointIds = $feedersData->pluck('keypoint_id')->filter()->unique()->values();

        // 7. Ambil semua data SKADA dalam query paralel
        $statusPointSkadaData = [];
        $analogPointSkadaData = [];
        $statusKeypointData = [];
        $analogKeypointData = [];

        // Query untuk StatusPointSkada (hanya untuk PMT)
        if ($statusIds->isNotEmpty()) {
            $statusPointSkadaData = StatusPointSkada::select(['PKEY', 'TAGLEVEL', 'VALUE'])
                ->whereIn('PKEY', $statusIds->toArray())
                ->get()
                ->keyBy('PKEY');
        }

        // Query untuk AnalogPointSkada (untuk AMP dan MW berdasarkan status_id)
        if ($statusIds->isNotEmpty()) {
            $analogPointSkadaData = AnalogPointSkada::select(['PKEY', 'VALUE'])
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

        // 8. Group data by feeder untuk processing yang lebih efisien
        $groupedFeeders = $feedersData->groupBy('feeder_id');

        $result = [];
        $id = 1;

        foreach ($groupedFeeders as $feederId => $feederData) {
            $feederInfo = $feederData->first();

            // Cache nilai PMT1, AMP, MW per feeder
            $feederStatusValues = $this->getFeederStatusValues($feederData, $statusPointSkadaData, $analogPointSkadaData);

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

    public function getHmiDataBasedOnRole(Request $request)
    {
        $user = $request->user();
        // atau bisa juga: $user = Auth::user();

        if ($user && $user->unit === null) {
            return $this->index();
        } else {
            return $this->indexByUser($request);
        }
    }
}
