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

    /**
     * Mendapatkan nilai analog default (null)
     */
    private function getNullAnalogValues()
    {
        return [
            'ir' => null,
            'is' => null,
            'it' => null,
            'ifR' => null,
            'ifS' => null,
            'ifT' => null,
            'ifN' => null,
            'kvAB' => null,
            'kvBC' => null,
            'kvAC' => null,
        ];
    }

    /**
     * Mendapatkan nilai PMT1, AMP, MW per feeder
     */
    private function getFeederStatusValues($feederData, $statusPointSkadaData, $analogPointSkadaData)
    {
        $values = ['pmt1' => null, 'amp' => null, 'mw' => null];

        foreach ($feederData as $data) {
            if (!$data->status_id) {
                continue;
            }

            switch ($data->status_type) {
                case 'PMT':
                    if (isset($statusPointSkadaData[$data->status_id])) {
                        $values['pmt1'] = [
                            $statusPointSkadaData[$data->status_id]->VALUE,
                            $statusPointSkadaData[$data->status_id]->CONDCODEID,
                        ];
                    }
                    break;
                case 'AMP':
                    if (isset($analogPointSkadaData[$data->status_id])) {
                        $values['amp'] = [
                            $analogPointSkadaData[$data->status_id]->VALUE,
                            $analogPointSkadaData[$data->status_id]->CONDCODEID,
                        ];
                    }
                    break;
                case 'MW':
                    if (isset($analogPointSkadaData[$data->status_id])) {
                        $values['mw'] = [
                            $analogPointSkadaData[$data->status_id]->VALUE,
                            $analogPointSkadaData[$data->status_id]->CONDCODEID,
                        ];
                    }
                    break;
            }
        }

        return $values;
    }

    /**
     * Mendapatkan nilai PMT2 (CB, LR) untuk keypoint
     */
    private function getPmt2Values($keypointId, $statusKeypointData)
    {
        $keypointData = $statusKeypointData->get($keypointId, collect());

        return [
            'CB' => $keypointData->get('CB')?->first()?->VALUE,
            'LR' => $keypointData->get('LR')?->first()?->VALUE,
        ];
    }

    /**
     * Mendapatkan nilai analog (IR, IS, IT, dll.) untuk keypoint
     */
    private function getAnalogValues($keypointId, $analogKeypointData)
    {
        $keypointData = $analogKeypointData->get($keypointId, collect());

        $analogNames = ['IR', 'IS', 'IT', 'IF-R', 'IF-S', 'IF-T', 'IF-N', 'KV-AB', 'KV-BC', 'KV-AC'];
        $values = [];

        foreach ($analogNames as $name) {
            $key = lcfirst(str_replace('-', '', $name)); // Convert 'IF-R' to 'ifR'
            $value = $keypointData->get($name)?->first();
            $values[$key] = $value ? [$value->VALUE, $value->CONDCODEID] : null;
        }

        return $values;
    }

    /**
     * Mendapatkan organization IDs yang authorized berdasarkan hierarchy
     */
    private function getAuthorizedOrganizationIds($userOrganization)
    {
        $organizationIds = [];

        switch ($userOrganization->level) {
            case 1: // DCC - dapat akses semua ULP dibawahnya
                $up3Ids = Organization::where('parent_id', $userOrganization->id)
                    ->where('level', 2)
                    ->pluck('id')
                    ->toArray();

                $ulpIds = Organization::whereIn('parent_id', $up3Ids)
                    ->where('level', 3)
                    ->pluck('id')
                    ->toArray();

                $organizationIds = array_merge([$userOrganization->id], $up3Ids, $ulpIds);
                break;

            case 2: // UP3 - dapat akses semua ULP dibawahnya
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

    /**
     * Fungsi terpadu untuk mendapatkan data HMI berdasarkan user atau untuk admin.
     *
     * @param \App\Models\User|null $user Objek user yang sedang login, atau null jika admin.
     * @return array
     */
    private function getHmiDataUnified(?\App\Models\User $user = null)
    {
        $authorizedKeypointIds = null;

        if ($user && $user->unit) {
            $userOrganizationId = $user->unit;
            $userOrganization = Organization::find($userOrganizationId);

            if (!$userOrganization) {
                return [];
            }

            $organizationIds = $this->getAuthorizedOrganizationIds($userOrganization);

            if (empty($organizationIds)) {
                return [];
            }

            $authorizedKeypointIds = OrganizationKeypoint::whereIn('organization_id', $organizationIds)
                ->pluck('keypoint_id')
                ->unique()
                ->filter()
                ->values()
                ->toArray();

            if (empty($authorizedKeypointIds)) {
                return [];
            }
        }

        $query = DB::table('feeders as f')
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
            ->join('feeder_status_points as fsp', 'f.id', '=', 'fsp.feeder_id');

        if ($authorizedKeypointIds !== null) {
            $query->whereIn('fk.keypoint_id', $authorizedKeypointIds);
        }

        $feedersData = $query->get();

        if ($feedersData->isEmpty() && $authorizedKeypointIds !== null) {
            return [];
        }

        $statusIds = $feedersData->pluck('status_id')->filter()->unique()->values();
        $keypointIds = $feedersData->pluck('keypoint_id')->filter()->unique()->values();

        $statusPointSkadaData = [];
        $analogPointSkadaData = [];
        $statusKeypointData = [];
        $analogKeypointData = [];

        if ($statusIds->isNotEmpty()) {
            $statusPointSkadaData = StatusPointSkada::select(['PKEY', 'TAGLEVEL', 'VALUE', 'CONDCODEID'])
                ->whereIn('PKEY', $statusIds->toArray())
                ->get()
                ->keyBy('PKEY');

            $analogPointSkadaData = AnalogPointSkada::select(['PKEY', 'VALUE', 'CONDCODEID'])
                ->whereIn('PKEY', $statusIds->toArray())
                ->get()
                ->keyBy('PKEY');
        }

        if ($keypointIds->isNotEmpty()) {
            $statusNames = ['CB', 'LR', 'HOTLINE-TAG'];
            $statusKeypointData = StatusPointSkada::select(['STATIONPID', 'NAME', 'VALUE', 'CONDCODEID'])
                ->whereIn('STATIONPID', $keypointIds->toArray())
                ->whereIn('NAME', $statusNames)
                ->get()
                ->groupBy(['STATIONPID', 'NAME']);

            $analogNames = ['IR', 'IS', 'IT', 'IF-R', 'IF-S', 'IF-T', 'IF-N', 'KV-AB', 'KV-BC', 'KV-AC'];
            $analogKeypointData = AnalogPointSkada::select(['STATIONPID', 'NAME', 'VALUE', 'CONDCODEID'])
                ->whereIn('STATIONPID', $keypointIds->toArray())
                ->whereIn('NAME', $analogNames)
                ->get()
                ->groupBy(['STATIONPID', 'NAME']);
        }

        $groupedFeeders = $feedersData->groupBy('feeder_id');

        $result = [];
        $id = 1;

        foreach ($groupedFeeders as $feederId => $feederData) {
            $feederInfo = $feederData->first();
            $feederStatusValues = $this->getFeederStatusValues($feederData, $statusPointSkadaData, $analogPointSkadaData);
            $keypoints = $feederData->groupBy('keypoint_id');

            if ($keypoints->isEmpty()) {
                $keypoints->put(null, collect([(object)['keypoint_name' => null]]));
            }

            foreach ($keypoints as $keypointId => $keypointData) {
                if ($authorizedKeypointIds !== null && $keypointId !== null && !in_array($keypointId, $authorizedKeypointIds)) {
                    continue;
                }

                $keypointInfo = $keypointData->first();

                $rowData = [
                    'id' => (string) $id++,
                    'garduInduk' => $feederInfo->gardu_induk_name,
                    'feeder' => $feederInfo->feeder_name,
                    'pmt1' => $feederStatusValues['pmt1'],
                    'amp' => $feederStatusValues['amp'],
                    'mw' => $feederStatusValues['mw'],
                    'keypoint' => $keypointInfo->keypoint_name ?? null,
                    'pmt2' => $keypointId ? $this->getPmt2Values($keypointId, $statusKeypointData) : ['CB' => null, 'LR' => null],
                    'hotlineTag' => $keypointId ? $statusKeypointData->get($keypointId)?->get('HOTLINE-TAG')?->first()?->VALUE : null,
                ];

                $rowData = array_merge($rowData, $keypointId ? $this->getAnalogValues($keypointId, $analogKeypointData) : $this->getNullAnalogValues());

                $result[] = $rowData;
            }
        }

        return $result;
    }

    /**
     * Mendapatkan data HMI berdasarkan peran pengguna.
     * Jika user adalah admin (unit null), data akan di-cache.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getHmiDataBasedOnRole(Request $request)
    {
        $user = $request->user();

        if ($user && $user->unit === null) {
            // Admin user, cache data
            $data = Cache::remember('hmi_data_admin', 30, function () {
                return $this->getHmiDataUnified(null);
            });
        } else {
            // Regular user, no caching for user-specific data
            $data = $this->getHmiDataUnified($user);
        }

        return response()->json($data);
    }
}
