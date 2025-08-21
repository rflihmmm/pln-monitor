<?php

namespace App\Http\Controllers;

use App\Models\KeypointExt;
use App\Models\OrganizationKeypoint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class AlarmController extends Controller
{
    public function getKeypoints(Request $request)
    {
        $user = $request->user();

        // If user is not logged in or has roles other than 'unit', return all keypoints
        if ($user && $user->unit !== null) {
            // Fetch all keypoint IDs if the user does not have a specific unit assigned
            return response()->json(
                \App\Models\KeypointExt::pluck('keypoint_id')->toArray()
            );
        }

        $cacheKey = 'user_keypoints_' . $user->id;
        $keypoints = Cache::remember($cacheKey, now()->addMinutes(60), function () use ($user) {
            // Get the organization ID (unit) from the user
            $organizationId = $user->unit;

            if (!$organizationId) {
                return [];
            }

            // Get keypoint_ids associated with the user's organization
            $keypointIds = OrganizationKeypoint::where('organization_id', $organizationId)
                ->pluck('keypoint_id')
                ->toArray();

            return $keypointIds;
        });

        return response()->json($keypoints);
    }
}
