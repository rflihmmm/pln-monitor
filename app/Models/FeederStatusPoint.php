<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeederStatusPoint extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'feeder_id',
        'keypoint_id',
    ];

    /**
     * Get the feeder that owns this keypoint.
     */
    public function feeder()
    {
        return $this->belongsTo(Feeder::class);
    }
}
