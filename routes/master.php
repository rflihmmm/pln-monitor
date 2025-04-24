<?php

use App\Http\Controllers\Master\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('master', 'master/manage-users');
    Route::prefix('master')->group(function () {
        // Route::get('manage-users', )->name('manage-users')->middleware(['role:admin']);
        Route::apiResource('manage-users', UserController::class)->middleware(['role:admin']);
           });
     Route::get('master/gardu-induk', function () {
        return Inertia::render('master/gardu-induk');
    })->name('gardu-induk');

});
