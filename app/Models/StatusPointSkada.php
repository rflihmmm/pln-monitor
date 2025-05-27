<?php

namespace App\Models;

use App\Models\StationPointSkada;
use Illuminate\Database\Eloquent\Model;

class StatusPointSkada extends Model
{
    protected $connection = 'sqlsrv_main';

    protected $table = 'STATUSPOINTS';

    protected $guarded = [];

    public function stationPoint()
    {
        return $this->belongsTo(StationPointSkada::class, 'STATIONPID', 'PKEY');
    }
}
