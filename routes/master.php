<?php

use App\Http\Controllers\Master\FeederController;
use App\Http\Controllers\Master\GarduIndukController;
use App\Http\Controllers\Master\MapsDataController;
use App\Http\Controllers\Master\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('master', 'master/manage-users');
    Route::prefix('master')->name('master.')->group(function () {
        Route::apiResource('manage-users', UserController::class)->middleware(['role:admin']);
        Route::apiResource('maps', MapsDataController::class, [
            'except' => ['show'],
            'parameters' => ['maps' => 'maps_data']
        ]);
        Route::apiResource('gardu-induk', GarduIndukController::class);
        Route::apiResource('feeder', FeederController::class, [
            'except' => ['show']
        ]);

        Route::get('feeder/keypoint-data', [FeederController::class, 'getKeypoints'])->name('feeder.keypoint-data');
        Route::get('feeder/statuspoint-data', [FeederController::class, 'getStatusPoints'])->name('feeder.statuspoint-data');
        Route::get('maps/keypoint-data', [MapsDataController::class, 'getKeypoints'])->name('maps.keypoint-data');
    });
});
