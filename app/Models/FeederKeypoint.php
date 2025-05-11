<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeederKeypoint extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'type',
        'status_id',
        'feeder_id',
    ];

    /**
     * Get the feeder that owns this status point.
     */
    public function feeder()
    {
        return $this->belongsTo(Feeder::class);
    }
}
