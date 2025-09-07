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
        ])->middleware(['role:admin']);

        Route::apiResource('mapping', OrganizationGridController::class, [
            'except' => ['show'],
        ])->middleware(['role:admin']);

        Route::apiResource('gardu-induk', GarduIndukController::class, [
            'except' => ['show']
        ])->middleware(['role:admin']);
        Route::apiResource('feeder', FeederController::class, [
            'except' => ['show']
        ])->middleware(['role:admin']);

        Route::apiResource('keypoint-ext', KeypointExtController::class, [
            'except' => ['show']
        ])->middleware(['role:admin']);

        Route::get('gardu-induk/keypoint-data', [GarduIndukController::class, 'getKeypoints'])->name('gardu-induk.keypoint-data')->middleware(['role:admin']);

        Route::get('feeder/keypoint-data', [FeederController::class, 'getKeypoints'])->name('feeder.keypoint-data')->middleware(['role:admin']);
        Route::get('feeder/statuspoint-data', [FeederController::class, 'getStatusPoints'])->name('feeder.statuspoint-data')->middleware(['role:admin']);
        Route::get('feeder/analogpoint-data', [FeederController::class, 'getAnalogPoints'])->name('feeder.analogpoint-data')->middleware(['role:admin']);

        Route::get('mapping/ulp', [OrganizationGridController::class, 'getUlpData'])->name('mapping.ulp')->middleware(['role:admin']);

        Route::get('api/organizations', [UserController::class, 'getOrganizations'])->name('master.api.organizations')->middleware(['role:admin']);
    });
});
