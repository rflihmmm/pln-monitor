<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KeypointExt extends Model
{
    protected $table = 'keypoint_ext';

    protected $primaryKey = 'keypoint_id';

    public $incrementing = false;

    protected $keyType = 'int';

    protected $fillable = [
        'keypoint_id',
        'coordinate',
        'alamat',
        'parent_stationpoints',
    ];
    public $timestamps = false;
}
