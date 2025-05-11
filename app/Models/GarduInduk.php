<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GarduInduk extends Model
{
    protected $fillable = [
        'name',
        'description',
    ];

    /**
     * Get the feeders for this gardu induk.
     */
    public function feeders()
    {
        return $this->hasMany(Feeder::class);
    }
}
