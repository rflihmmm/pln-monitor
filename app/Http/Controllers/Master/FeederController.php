<?php

namespace App\Http\Controllers\Master;

use Inertia\Inertia;
use App\Models\Feeder;
use App\Models\GarduInduk;
use Illuminate\Http\Request;
use App\Models\FeederKeypoint;
use App\Models\StatusPointSkada;
use App\Models\FeederStatusPoint;
use App\Models\StationPointSkada;
use App\Models\AnalogPointSkada;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;

class FeederController extends Controller
{
    public function index()
    {
        // Eager loading dan pagination
        $feeders = Feeder::with(['garduInduk', 'keypoints', 'statusPoints'])
            ->select(['id', 'name', 'keyword_analogs', 'description', 'gardu_induk_id', 'created_at', 'updated_at'])
            ->paginate(25); // Ubah 25 sesuai kebutuhan

        // Transform data agar frontend tetap kompatibel
        $feeders->getCollection()->transform(function ($feeder) {
            return [
                'id' => $feeder->id,
                'name' => $feeder->name,
                'keyword_analogs' => $feeder->keyword_analogs,
                'description' => $feeder->description,
                'gardu_induk_id' => $feeder->gardu_induk_id,
                'created_at' => $feeder->created_at,
                'updated_at' => $feeder->updated_at,
                'gardu_induk' => $feeder->garduInduk,
                'keypoints' => $feeder->keypoints->map(function ($keypoint) {
                    return [
                        'keypoint_id' => $keypoint->keypoint_id,
                        'name' => $keypoint->name,
                    ];
                }),
                'status_points' => $feeder->statusPoints->map(function ($statusPoint) {
                    return [
                        'type' => $statusPoint->type,
                        'status_id' => $statusPoint->status_id,
                        'name' => $statusPoint->name,
                    ];
                }),
            ];
        });

        $garduInduks = GarduInduk::select(['id', 'name'])->get();
        $keypoints = FeederKeypoint::select(['id', 'feeder_id', 'keypoint_id', 'name'])->get();
        $statuspoints = FeederStatusPoint::select(['id', 'feeder_id', 'type', 'status_id', 'name'])->get();

        return Inertia::render('master/feeder', [
            'feederList' => $feeders,
            'garduIndukList' => $garduInduks,
            'keypointsList' => $keypoints,
            'statusPointsList' => $statuspoints
        ]);
    }

    public function getKeypoints(Request $request)
    {
        $filter = $request->query('filter', null);

        try {
            if (!$filter || strlen($filter) < 3) {
                return response()->json([]);
            }

            $keypoints = StationPointSkada::select("PKEY", "NAME")
                ->where('NAME', 'LIKE', '%' . $filter . '%')
                ->get()
                ->map(function ($query) {
                    return [
                        'id' => $query->PKEY,
                        'name' => $query->NAME
                    ];
                });

            return response()->json($keypoints);
        } catch (\Throwable $th) {
            return response()->json([
                'message' => 'Error fetching keypoints',
                'error' => $th->getMessage()
            ], 500);
        }
    }

    public function getStatusPoints(Request $request)
    {
        $filter = $request->query('filter', null);
        try {
            if (!$filter || strlen($filter) < 3) {
                return response()->json([]);
            }

            // Query dengan filter pada kolom NAME sendiri dan relasi stationPoint
            $statuspoints = StatusPointSkada::select("PKEY", "NAME", "STATIONPID")
                ->with(['stationPoint:PKEY,NAME'])
                ->where(function ($query) use ($filter) {
                    $query->where('NAME', 'LIKE', '%' . $filter . '%')
                        ->orWhereHas('stationPoint', function ($q) use ($filter) {
                            $q->where('NAME', 'LIKE', '%' . $filter . '%');
                        });
                })
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->PKEY,
                        'name' => $item->NAME,
                        'stationname' => $item->stationPoint ? $item->stationPoint->NAME : null
                    ];
                });

            return response()->json($statuspoints);
        } catch (\Throwable $th) {
            return response()->json([
                'message' => 'Error fetching status points',
                'error' => $th->getMessage()
            ], 500);
        }
    }

    public function getAnalogPoints(Request $request)
    {
        $filter = $request->query('filter', null);
        try {
            if (!$filter || strlen($filter) < 3) {
                return response()->json([]);
            }

            // Query dengan filter pada kolom NAME sendiri dan relasi stationPoint
            $analogpoints = AnalogPointSkada::select("PKEY", "NAME", "STATIONPID")
                ->with(['stationPoint:PKEY,NAME'])
                ->where(function ($query) use ($filter) {
                    $query->where('NAME', 'LIKE', '%' . $filter . '%')
                        ->orWhereHas('stationPoint', function ($q) use ($filter) {
                            $q->where('NAME', 'LIKE', '%' . $filter . '%');
                        });
                })
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->PKEY,
                        'name' => $item->NAME,
                        'stationname' => $item->stationPoint ? $item->stationPoint->NAME : null
                    ];
                });

            return response()->json($analogpoints);
        } catch (\Throwable $th) {
            return response()->json([
                'message' => 'Error fetching analog points',
                'error' => $th->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        // Validasi untuk format data baru
        $request->validate([
            'name' => 'required|string|max:255',
            'keyword_analogs' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'gardu_induk_id' => 'required|exists:gardu_induks,id',
            'keypoints' => 'array',
            'keypoints.*.keypoint_id' => 'required',
            'keypoints.*.name' => 'required|string',
            'status_points' => 'array',
            'status_points.*.type' => 'required|string|in:PMT,AMP,MW',
            'status_points.*.status_id' => 'required|integer',
            'status_points.*.name' => 'required|string',
        ]);

        DB::beginTransaction();
        try {
            // Buat Feeder baru
            $feeder = Feeder::create([
                'name' => $request->name,
                'keyword_analogs' => $request->keyword_analogs,
                'description' => $request->description,
                'gardu_induk_id' => $request->gardu_induk_id,
            ]);

            // Simpan keypoints ke tabel relasi
            if (!empty($request->keypoints)) {
                foreach ($request->keypoints as $keypoint) {
                    FeederKeypoint::create([
                        'feeder_id' => $feeder->id,
                        'keypoint_id' => $keypoint['keypoint_id'],
                        'name' => $keypoint['name'],
                    ]);
                }
            }

            // Simpan status points ke tabel relasi
            if (!empty($request->status_points)) {
                foreach ($request->status_points as $statusPoint) {
                    if ($statusPoint['status_id'] !== 0) { // Hanya simpan jika bukan "None"
                        FeederStatusPoint::create([
                            'type' => $statusPoint['type'],
                            'status_id' => $statusPoint['status_id'],
                            'feeder_id' => $feeder->id,
                            'name' => $statusPoint['name'],
                        ]);
                    }
                }
            }
            DB::commit();
            return redirect()->route('master.feeder.index')->with('success', 'Berhasil menambah Feeder.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating feeder: ' . $e->getMessage());
            return redirect()->route('master.feeder.index')->with('error', 'Gagal menambah Feeder: ' . $e->getMessage());
        }
    }

    public function update(Request $request, Feeder $feeder)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'keyword_analogs' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'gardu_induk_id' => 'required|exists:gardu_induks,id',
            'keypoints' => 'array',
            'keypoints.*.keypoint_id' => 'required',
            'keypoints.*.name' => 'required|string',
            'status_points' => 'array',
            'status_points.*.type' => 'required|string|in:PMT,AMP,MW',
            'status_points.*.status_id' => 'required|integer',
            'status_points.*.name' => 'required|string',
        ]);

        try {
            // Update feeder basic info
            $feeder->update([
                'name' => $request->name,
                'keyword_analogs' => $request->keyword_analogs,
                'description' => $request->description,
                'gardu_induk_id' => $request->gardu_induk_id,
            ]);

            // Delete existing keypoints and status points
            $feeder->keypoints()->delete();
            $feeder->statusPoints()->delete();

            // Re-create keypoints
            if (!empty($request->keypoints)) {
                foreach ($request->keypoints as $keypoint) {
                    FeederKeypoint::create([
                        'feeder_id' => $feeder->id,
                        'keypoint_id' => $keypoint['keypoint_id'],
                        'name' => $keypoint['name'],
                    ]);
                }
            }

            // Re-create status points
            if (!empty($request->status_points)) {
                foreach ($request->status_points as $statusPoint) {
                    if ($statusPoint['status_id'] > 0) {
                        FeederStatusPoint::create([
                            'type' => $statusPoint['type'],
                            'status_id' => $statusPoint['status_id'],
                            'feeder_id' => $feeder->id,
                            'name' => $statusPoint['name'],
                        ]);
                    }
                }
            }

            return redirect()->route('master.feeder.index')->with('success', 'Berhasil melakukan update Feeder.');
        } catch (\Exception $e) {
            Log::error('Error updating feeder: ' . $e->getMessage());
            return redirect()->route('master.feeder.index')->with('error', 'Gagal update Feeder: ' . $e->getMessage());
        }
    }

    public function destroy(Feeder $feeder)
    {
        try {
            // Delete related keypoints and status points first
            $feeder->keypoints()->delete();
            $feeder->statusPoints()->delete();

            // Delete the feeder
            $feeder->delete();

            return redirect()->route('master.feeder.index')->with('success', 'Berhasil menghapus Feeder.');
        } catch (\Exception $e) {
            Log::error('Error deleting feeder: ' . $e->getMessage());
            return redirect()->route('master.feeder.index')->with('error', 'Gagal menghapus Feeder: ' . $e->getMessage());
        }
    }
}
