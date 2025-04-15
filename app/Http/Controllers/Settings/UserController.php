<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        return Inertia::render('settings/manage-users');
    }

    public function create()
    {
        return Inertia::render('settings/manage-users');
    }

    public function store()
    {

    }

}
