<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Master\UserController;
use App\Http\Controllers\Master\FeederController;
use App\Http\Controllers\Master\MapsDataController;
use App\Http\Controllers\Master\GarduIndukController;
use App\Http\Controllers\Master\KeypointExtController;
use App\Http\Controllers\Master\OrganizationGridController;

Route::middleware('auth')->group(function () {
    Route::redirect('master', 'master/manage-users');
    Route::prefix('master')->name('master.')->group(function () {
        Route::apiResource('manage-users', UserController::class)->middleware(['role:admin']);
        // Route::apiResource('maps', MapsDataController::class, [
        //     'except' => ['show'],
        //     'parameters' => ['maps' => 'maps_data']
        // ]);
        Route::get('maps', function () {
            return Inertia::render('master/maps');
        })->name('maps');

        Route::apiResource('gardu-induk', GarduIndukController::class);
        Route::apiResource('feeder', FeederController::class, [
            'except' => ['show']
        ]);

        Route::apiResource('keypoint-ext', KeypointExtController::class, [
            'except' => ['show']
        ]);

        Route::get('feeder/keypoint-data', [FeederController::class, 'getKeypoints'])->name('feeder.keypoint-data');
        Route::get('feeder/statuspoint-data', [FeederController::class, 'getStatusPoints'])->name('feeder.statuspoint-data');

        Route::get('organization-grid', [OrganizationGridController::class, 'index']);
        Route::post('organization-grid/post', [OrganizationGridController::class, 'store']);

        Route::get('organization-grid/dcc', [OrganizationGridController::class, 'getDccData']);
        Route::get('organization-grid/up3', [OrganizationGridController::class, 'getUp3Data']);
        Route::get('organization-grid/ulp', [OrganizationGridController::class, 'getUlpData']);
    });
});
