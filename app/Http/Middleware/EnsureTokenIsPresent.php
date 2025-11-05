<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Tymon\JWTAuth\Facades\JWTAuth;

class EnsureTokenIsPresent
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            // Generate a fresh access token and add it to the request attributes.
            $accessToken = JWTAuth::fromUser($user);
            $request->attributes->set('access_token', $accessToken);

            // If the refresh_token cookie is missing, generate one and attach it to the response.
            if (!$request->hasCookie('refresh_token')) {
                $refreshToken = JWTAuth::claims(['exp' => now()->addMinutes(config('jwt.refresh_ttl'))])->fromUser($user);
                $response = $next($request);
                return $response->withCookie(cookie('refresh_token', $refreshToken, config('jwt.refresh_ttl'), null, null, false, true));
            }
        }

        return $next($request);
    }
}
