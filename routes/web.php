<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MapsController;
use App\Http\Controllers\TableHmiController;

// Route::get('/', function () {
//     return Inertia::render('welcome');
// })->name('home');
//

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    Route::get('alarm', function () {
        return Inertia::render('alarm');
    })->name('alarm');
    Route::get('table-monitor', function () {
        return Inertia::render('table-monitor');
    })->name('table-monitor');
    Route::get('single-line', function () {
        return Inertia::render('single-line');
    })->name('single-line');
    Route::get('/test-mssql', function () {
        try {
            $results = DB::connection('sqlsrv_main')
                ->table('ALARMS')
                ->limit(10)
                ->get();
            return response()->json($results);
        } catch (\Exception $e) {
            return 'Failed: ' . $e->getMessage();
        }
    });
    Route::get('/api/table-hmi', [TableHmiController::class, 'index']);

    // Routes untuk mendapatkan daftar DCC yang tersedia
    Route::get('/maps/dcc', [MapsController::class, 'getAvailableDcc']);

    // Routes untuk keypoints berdasarkan DCC (API pertama)
    Route::get('/maps/keypoints/selatan', [MapsController::class, 'keypointsSelatan']);
    Route::get('/maps/keypoints/utara', [MapsController::class, 'keypointsUtara']);
    Route::get('/maps/keypoints/tenggara', [MapsController::class, 'keypointsTenggara']);

    // Routes untuk summary berdasarkan DCC (API kedua)
    Route::get('/maps/summary/selatan', [MapsController::class, 'summarySelatan']);
    Route::get('/maps/summary/utara', [MapsController::class, 'summaryUtara']);
    Route::get('/maps/summary/tenggara', [MapsController::class, 'summaryTenggara']);

    // Routes dinamis (opsional, jika ingin lebih fleksibel)
    Route::get('/maps/keypoints/{dcc}', [MapsController::class, 'getKeypointsByDcc']);
    Route::get('/maps/summary/{dcc}', [MapsController::class, 'getSummaryByDcc']);
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/master.php';
