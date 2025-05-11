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

    public function garduInduk()
    {
        return $this->belongsTo(GarduInduk::class);
    }

    /**
     * Get the status points for this feeder.
     */
    public function statusPoints()
    {
        return $this->hasMany(FeederStatusPoint::class);
    }

    /**
     * Get the keypoints for this feeder.
     */
    public function keypoints()
    {
        return $this->hasMany(FeederKeypoint::class);
    }
}
