<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlarmsPointSkada extends Model
{
    protected $connection = 'sqlsrv_main';

    protected $table = 'ALARMS';

    protected $guarded = [];

    public $timestamps = false;
    /**
     * Relasi ke StationPointSkada berdasarkan STATIONPID -> PKEY
     */
    public function stationPoint()
    {
        return $this->belongsTo(StationPointSkada::class, 'STATIONPID', 'PKEY');
    }
}
