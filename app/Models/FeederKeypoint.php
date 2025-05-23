<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeederKeypoint extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'keypoint_id',
        'feeder_id',
        'name',
    ];

    /**
     * Get the feeder that owns this keypoint.
     */
    public function feeder()
    {
        return $this->belongsTo(Feeder::class);
    }
}
