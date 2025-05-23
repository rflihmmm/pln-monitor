<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeederStatusPoint extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'type',
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
