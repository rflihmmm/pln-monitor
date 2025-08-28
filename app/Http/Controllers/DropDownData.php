<?php

namespace App\Http\Controllers;

use App\Models\Feeder;
use App\Models\FeederKeypoint;
use App\Models\Organization;
use App\Models\OrganizationKeypoint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DropDownData extends Controller
{
    /**
     * Get all descendant organization IDs for a given organization (iterative approach)
     * This handles the hierarchy: Keypoint<ULP<UP3<DCC
     */
    private function getAllDescendantOrganizations($organizationId)
    {
        $descendantIds = collect();
        $queue = collect([$organizationId]);
        $processed = collect();

        while ($queue->isNotEmpty()) {
            $currentOrgId = $queue->shift();

            if ($processed->contains($currentOrgId)) {
                continue;
            }

            $descendantIds->push($currentOrgId);
            $processed->push($currentOrgId);

            $children = Organization::where('parent_id', $currentOrgId)->pluck('id');

            foreach ($children as $childId) {
                if (!$processed->contains($childId)) {
                    $queue->push($childId);
                }
            }
        }

        return $descendantIds->unique()->values();
    }

    public function getFeeders(Request $request)
    {
        $user = Auth::user();
        $search = $request->get('filter');

        $query = Feeder::query();

        if ($user && $user->unit !== null) {
            $organizationId = $user->unit;
            $allOrganizationIds = $this->getAllDescendantOrganizations($organizationId);

            $keypointIds = collect();
            $allOrganizationIds->chunk(1000)->each(function ($chunkedOrgIds) use (&$keypointIds) {
                OrganizationKeypoint::whereIn('organization_id', $chunkedOrgIds)
                    ->pluck('keypoint_id')
                    ->each(function ($id) use (&$keypointIds) {
                        $keypointIds->push($id);
                    });
            });
            $keypointIds = $keypointIds->unique()->toArray();

            $feederIdsWithKeypoints = collect();
            collect($keypointIds)->chunk(1000)->each(function ($chunkedKeypointIds) use (&$feederIdsWithKeypoints) {
                FeederKeypoint::whereIn('keypoint_id', $chunkedKeypointIds)
                    ->pluck('feeder_id')
                    ->each(function ($id) use (&$feederIdsWithKeypoints) {
                        $feederIdsWithKeypoints->push($id);
                    });
            });
            $feederIdsWithKeypoints = $feederIdsWithKeypoints->unique()->toArray();

            $query->whereIn('id', $feederIdsWithKeypoints);
        }

        if ($search) {
            $query->where('name', 'LIKE', '%' . $search . '%');
        }

        return response()->json(
            $query->select('id', 'name')->get()
        );
    }

    public function getKeypointNames(Request $request)
    {
        $user = Auth::user();
        $search = $request->get('filter');
        $feederId = $request->get('feeder_id');

        $query = FeederKeypoint::query();

        if ($user && $user->unit !== null) {
            $organizationId = $user->unit;
            $allOrganizationIds = $this->getAllDescendantOrganizations($organizationId);

            $keypointIds = collect();
            $allOrganizationIds->chunk(1000)->each(function ($chunkedOrgIds) use (&$keypointIds) {
                OrganizationKeypoint::whereIn('organization_id', $chunkedOrgIds)
                    ->pluck('keypoint_id')
                    ->each(function ($id) use (&$keypointIds) {
                        $keypointIds->push($id);
                    });
            });
            $keypointIds = $keypointIds->unique()->toArray();

            $query->whereIn('keypoint_id', $keypointIds);
        }

        if ($feederId) {
            $query->where('feeder_id', $feederId);
        }

        if ($search) {
            $query->where('name', 'LIKE', '%' . $search . '%');
        }

        return response()->json(
            $query->select('keypoint_id as id', 'name', 'feeder_id as feeder')->get()
        );
    }
}
