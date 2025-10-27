<?php

namespace App\Http\Controllers;

use App\Models\KeypointExt;
use App\Models\Organization;
use App\Models\OrganizationKeypoint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AlarmController extends Controller
{
    /**
     * Get all descendant organization IDs for a given organization
     * This handles the hierarchy: Keypoint<ULP<UP3<DCC
     */
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

    public function getKeypoints(Request $request)
    {
        $user = $request->user();

        // If user is not logged in or has no unit assigned, return all keypoints
        if (!$user || $user->unit === null) {
            return response()->json(
                KeypointExt::pluck('keypoint_id')->toArray()
            );
        }

        $cacheKey = 'user_keypoints_' . $user->id . '_' . $user->unit;
        $keypoints = Cache::remember($cacheKey, now()->addMinutes(60), function () use ($user) {
            // Get the organization ID (unit) from the user
            $organizationId = $user->unit;

            if (!$organizationId) {
                return [];
            }

            // Get all descendant organizations (including the user's organization)
            $allOrganizationIds = $this->getAllDescendantOrganizations($organizationId);

            // Get keypoint_ids associated with all descendant organizations
            // This will include keypoints from DCC, UP3, and ULP levels if they exist in OrganizationKeypoint
            $keypointIds = OrganizationKeypoint::whereIn('organization_id', $allOrganizationIds)
                ->pluck('keypoint_id')
                ->toArray();

            return $keypointIds;
        });

        return response()->json($keypoints);
    }

    public function searchAlarms(Request $request)
    {
        $user = $request->user();
        $search = $request->get('search');
        $limit = $request->get('limit', 30);
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        try {
            // First, let's discover the available columns
            $connection = DB::connection('sqlsrv_main');

            // Get a sample row to understand the structure
            $sampleAlarm = $connection->table('ALARMS')->first();

            if (!$sampleAlarm) {
                return response()->json([
                    'success' => false,
                    'message' => 'No alarms data found'
                ]);
            }

            // Convert to array to get column names
            $availableColumns = array_keys((array) $sampleAlarm);

            // Find primary key - try common variations
            $primaryKeyOptions = ['PKEY', 'ID', 'ALARM_ID', 'PK', 'ALARMID'];
            $primaryKey = null;

            foreach ($primaryKeyOptions as $option) {
                if (in_array($option, $availableColumns)) {
                    $primaryKey = $option;
                    break;
                }
            }

            // If still no primary key found, use TIME + STATIONPID combination for uniqueness
            if (!$primaryKey) {
                $primaryKey = 'TIME'; // We'll use TIME for ordering
            }

            // Build the base query
            $query = $connection->table('ALARMS as a')
                ->leftJoin('STATIONPOINTS as sp', 'a.STATIONPID', '=', 'sp.PKEY');

            // Select columns - be careful with column names
            if (in_array('PKEY', $availableColumns)) {
                $query->select('a.PKEY', 'a.TEXT', 'a.TIME', 'a.PRIORITY', 'a.STATIONPID', 'sp.NAME as station_name');
            } else {
                // If no PKEY, create a unique identifier using ROW_NUMBER()
                $query->select(
                    DB::raw('ROW_NUMBER() OVER (ORDER BY a.TIME DESC, a.STATIONPID) as id'),
                    'a.TEXT',
                    'a.TIME',
                    'a.PRIORITY',
                    'a.STATIONPID',
                    'sp.NAME as station_name'
                );
            }

            // Apply user unit filter if not admin
            if ($user && $user->unit !== null) {
                $organizationId = $user->unit;

                // Get all descendant organizations
                $allOrganizationIds = $this->getAllDescendantOrganizations($organizationId);

                $keypointIds = OrganizationKeypoint::whereIn('organization_id', $allOrganizationIds)
                    ->pluck('keypoint_id')
                    ->toArray();

                if (!empty($keypointIds)) {
                    $query->whereIn('a.STATIONPID', $keypointIds);
                }
            }

            // Apply date range filter if provided
            if ($startDate && $endDate) {
                $query->whereBetween('a.TIME', [$startDate, $endDate]);
            } elseif ($startDate) {
                $query->where('a.TIME', '>=', $startDate);
            } elseif ($endDate) {
                $query->where('a.TIME', '<=', $endDate);
            }

            // Apply search filter if provided
            if ($search && trim($search)) {
                $query->where(function ($q) use ($search) {
                    // Search by STATIONPID if search is numeric
                    if (is_numeric($search)) {
                        $q->where('a.STATIONPID', '=', $search);
                    }

                    // Always search by station name and alarm text
                    $q->orWhere('sp.NAME', 'LIKE', '%' . trim($search) . '%')
                        ->orWhere('a.TEXT', 'LIKE', '%' . trim($search) . '%');
                });
            }

            // Order and limit
            $query->orderBy('a.TIME', 'desc')->limit($limit);

            $results = $query->get();

            // Transform results
            $alarms = $results->map(function ($alarm) use ($primaryKey) {
                $alarmArray = (array) $alarm;

                return [
                    'id' => $alarmArray['PKEY'] ?? $alarmArray['id'] ?? uniqid(), // Use PKEY, generated id, or unique id
                    'TEXT' => $alarmArray['TEXT'] ?? '',
                    'TIME' => $alarmArray['TIME'] ?? '',
                    'PRIORITY' => $alarmArray['PRIORITY'] ?? 0,
                    'STATIONPID' => $alarmArray['STATIONPID'] ?? 0,
                    'station_name' => $alarmArray['station_name'] ?? null
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $alarms,
                'total' => $alarms->count(),
                'available_columns' => $availableColumns,
                'primary_key_used' => $primaryKey,
                'date_filter_applied' => !empty($startDate) || !empty($endDate)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to search alarms: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    public function getFilteredKeypoints(Request $request)
    {
        $user = $request->user();

        try {
            // If user is admin (no specific unit), return all keypoints
            if ($user->hasRole('admin')) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'is_admin' => true
                ]);
            }
            if ($user->unit === null) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'is_admin' => false
                ]);
            }

            // For users with specific unit, get filtered keypoints
            $cacheKey = 'user_keypoints_' . $user->id . '_' . $user->unit;
            $keypoints = Cache::remember($cacheKey, now()->addMinutes(60), function () use ($user) {
                $organizationId = $user->unit;

                if (!$organizationId) {
                    return [];
                }

                // Get all descendant organizations
                $allOrganizationIds = $this->getAllDescendantOrganizations($organizationId);

                // Get keypoint_ids associated with all descendant organizations
                // This will include keypoints from DCC, UP3, and ULP levels if they exist in OrganizationKeypoint
                return OrganizationKeypoint::whereIn('organization_id', $allOrganizationIds)
                    ->pluck('keypoint_id')
                    ->toArray();
            });

            return response()->json([
                'success' => true,
                'data' => $keypoints,
                'is_admin' => false
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get keypoints: ' . $e->getMessage()
            ], 500);
        }
    }
}
