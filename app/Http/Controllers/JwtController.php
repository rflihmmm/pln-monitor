<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

class JwtController extends Controller
{
    public function generateToken()
    {
        $user = User::first();
        if (!$user) {
            return response()->json(['error' => 'No user found'], 404);
        }

        $token = JWTAuth::fromUser($user);

        return response()->json(compact('token'));
    }
}
