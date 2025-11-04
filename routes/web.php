<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AiChatBot;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MapsController;
use App\Http\Controllers\AlarmController;
use App\Http\Controllers\TableHmiController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\SingleLineController;
use App\Http\Controllers\StationPointsController;
use App\Http\Controllers\SystemLoadController;
use App\Http\Controllers\Master\UserController;

// Route::get('/', function () {
//     return Inertia::render('welcome');
// })->name('home');
//

Route::redirect('/', '/login')->name('home');

// Public routes for StationPoints API (accessible by anyone without authentication)
Route::prefix('get')->group(function () {
    Route::get('/stationpoints', [StationPointsController::class, 'getAllStationPoints'])->name('api.stationpoints.all');
    Route::get('/stationpoints/{code}', [StationPointsController::class, 'getStationPointByCode'])->name('api.stationpoints.single');

    // Public routes for System Load Data
    // Route::get('/load', [SystemLoadController::class, 'getSystemLoadData']);
    // Route::get('/load/{id}', [SystemLoadController::class, 'getSystemLoadById']);
    // Route::get('/load/all', [SystemLoadController::class, 'getAllSystemLoads']);

    Route::get('/load', [SystemLoadController::class, 'getLoad']);
    Route::get('/load/all', [SystemLoadController::class, 'getAll']);
    Route::get('/load/{id}', [SystemLoadController::class, 'getById']);
});

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

    Route::get('/chat-bot', [AiChatBot::class, 'show'])->name('chat-bot');

    Route::get('/api/table-hmi', [TableHmiController::class, 'getHmiDataBasedOnRole']);

    // Routes untuk maps
    Route::get('/api/mapdata', [DashboardController::class, 'getMapDataBasedOnRole']);
    Route::get('/api/system-load-data', [DashboardController::class, 'getSystemLoadDataBasedOnRole']);

    // Routes untuk mendapatkan data single line
    Route::get('/api/single-line', [SingleLineController::class, 'getSingleLineDataBasedOnRole']);

    // Routes for alarm functionality
    Route::get('/api/user-keypoints', [AlarmController::class, 'getKeypoints'])->name('api.user-keypoints');
    Route::get('/api/search-alarms', [AlarmController::class, 'searchAlarms'])->name('api.search-alarms');
    Route::get('/api/filtered-keypoints', [AlarmController::class, 'getFilteredKeypoints'])->name('api.filtered-keypoints');

    // API Dropdown Data
    Route::get('/api/dropdown/feeders', [\App\Http\Controllers\DropDownData::class, 'getFeeders'])->name('api.dropdown.feeders');
    Route::get('/api/dropdown/keypoints', [\App\Http\Controllers\DropDownData::class, 'getKeypointNames'])->name('api.dropdown.keypoints');

    //Route::get('/api/organizations', [UserController::class, 'getOrganizations'])->name('api.organizations');
});

Route::get('/generate-token', [\App\Http\Controllers\JwtController::class, 'generateToken']);

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/master.php';
