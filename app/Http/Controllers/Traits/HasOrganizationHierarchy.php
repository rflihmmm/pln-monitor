<?php

namespace App\Http\Controllers\Traits;

use App\Models\Organization;

trait HasOrganizationHierarchy
{
    protected function getOrganizationDescendants($organizationId)
    {
        $descendants = [];
        $organizations = Organization::where('parent_id', $organizationId)->get();

        foreach ($organizations as $organization) {
            $descendants[] = $organization->id;
            $descendants = array_merge($descendants, $this->getOrganizationDescendants($organization->id));
        }

        return $descendants;
    }
}
