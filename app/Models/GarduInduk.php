<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GarduInduk extends Model
{
    protected $fillable = [
        'name',
        'description',
        'gardu_induk_id',
    ];

    public function garduInduk()
    {
        return $this->belongsTo(GarduInduk::class);
    }
}
