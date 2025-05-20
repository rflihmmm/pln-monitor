<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeederKeypoint extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'status_id',
        'feeder_id',
        'name',
    ];

    /**
     * Get the feeder that owns this status point.
     */
    public function feeder()
    {
        return $this->belongsTo(Feeder::class);
    }
}
