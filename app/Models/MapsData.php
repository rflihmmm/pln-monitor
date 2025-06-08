<?php

namespace App\Models;

use App\Models\FeederKeypoint;
use Illuminate\Database\Eloquent\Model;

class MapsData extends Model
{
   protected $table = 'maps_data';

    protected $fillable = [
        'no',
        'keypoint_id',
        'ulp',
        'up3',
        'dcc',
        'lokasi'
    ];
    
    /**
     * Relasi ke tabel feeder_keypoints
     */

    public function feederKeypoint()
    {
        return $this->belongsTo(FeederKeypoint::class, 'keypoint_id', 'keypoint_id');
    }
}
