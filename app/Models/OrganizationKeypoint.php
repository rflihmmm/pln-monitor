<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationKeypoint extends Model
{
    protected $table = 'organization_keypoint';
    public $timestamps = false;
    protected $fillable = [
        'keypoint_id',
        'organization_id',
    ];

    /**
     * Get the organization that owns the keypoint.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
