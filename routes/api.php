<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;

Route::post('/auth/refresh', [AuthController::class, 'refresh'])->middleware('jwt.refresh');
