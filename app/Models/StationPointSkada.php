<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StationPointSkada extends Model
{
    protected $connection = 'sqlsrv_main';

    protected $table = 'STATIONPOINTS';

    protected $guarded = [];
}
