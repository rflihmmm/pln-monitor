<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnalogPointSkada extends Model
{
    protected $connection = 'sqlsrv_main';

    protected $table = 'ANALOGPOINTS';

    protected $guarded = [];
}
