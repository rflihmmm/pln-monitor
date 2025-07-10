<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    use HasFactory;

    protected $table = 'organization';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'level',
        'parent_id',
        'address',
        'coordinate'
    ];

    public function parent()
    {
        return $this->belongsTo(Organization::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Organization::class, 'parent_id');
    }

    public function getLevelNameAttribute()
    {
        $levels = [
            1 => 'DCC',
            2 => 'UP3',
            3 => 'ULP'
        ];

        return $levels[$this->level] ?? 'Unknown';
    }
}
