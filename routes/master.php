<?php

use Inertia\Inertia;
use App\Models\Organization;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Master\UserController;
use App\Http\Controllers\Master\FeederController;
use App\Http\Controllers\Master\GarduIndukController;
use App\Http\Controllers\Master\KeypointExtController;
use App\Http\Controllers\Master\OrganizationController;
use App\Http\Controllers\Master\OrganizationGridController;

Route::middleware('auth')->group(function () {
    Route::redirect('master', 'master/manage-users');
    Route::prefix('master')->name('master.')->group(function () {
        Route::apiResource('manage-users', UserController::class)->middleware(['role:admin']);

        Route::apiResource('organization', OrganizationController::class, [
            'except' => ['show']
        ]);

        Route::apiResource('mapping', OrganizationGridController::class, [
            'except' => ['show'],
        ]);

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

        Route::get('mapping/dcc', [OrganizationGridController::class, 'getDccData'])->name('mapping.dcc');
        Route::get('mapping/up3', [OrganizationGridController::class, 'getUp3Data'])->name('mapping.up3');
        Route::get('mapping/ulp', [OrganizationGridController::class, 'getUlpData'])->name('mapping.ulp');
    });
});
