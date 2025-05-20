<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StatusPointSkada extends Model
{
    protected $connection = 'sqlsrv_main';

    protected $table = 'STATUSPOINTS';

    protected $guarded = [];
}
