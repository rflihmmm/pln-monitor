<?php

use App\Http\Controllers\Master\FeederController;
use App\Http\Controllers\Master\GarduIndukController;
use App\Http\Controllers\Master\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('master', 'master/manage-users');
    Route::prefix('master')->group(function () {
        Route::apiResource('manage-users', UserController::class)->middleware(['role:admin']);
        Route::apiResource('gardu-induk', GarduIndukController::class);
        Route::apiResource('feeder', FeederController::class);
    });
});
