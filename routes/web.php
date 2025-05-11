<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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
            DB::connection('sqlsrv')->getPdo();
            return 'Connected to MSSQL!';
        } catch (\Exception $e) {
            return 'Failed: ' . $e->getMessage();
        }
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/master.php';
