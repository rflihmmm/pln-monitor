<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GarduInduk extends Model
{
    protected $fillable = [
        'name',
        'coordinate',
        'keypoint_id',
        'description',
    ];

    protected $appends = ['keypoint_name'];

    /**
     * Get the feeders for this gardu induk.
     */
    public function feeders()
    {
        return $this->hasMany(Feeder::class);
    }


    /**
     * Relasi ke keypoint (untuk eager loading di controller)
     */
    public function keypoint()
    {
        return $this->belongsTo(StationPointSkada::class, 'keypoint_id', 'PKEY');
    }

    /**
     * Get the keypoint name from the related StationPointSkada.
     *
     * @return string|null
     */
    public function getKeypointNameAttribute()
    {
        return optional($this->stationPointSkada)->NAME;
    }
}
