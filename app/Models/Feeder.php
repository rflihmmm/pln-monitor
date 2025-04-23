<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feeder extends Model
{
    protected $fillable = [
        'name',
        'description',
        'gardu_induk_id',
    ];
}
