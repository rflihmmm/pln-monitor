import { Head } from '@inertiajs/react';

import { type BreadcrumbItem } from '@/types';

import TableOrganization from '@/components/master/table-organization';
import AppLayout from '@/layouts/app-layout';

// Define interfaces for the data
interface Organization {
    id: number;
    name: string;
    level: number;
    parent_id: number | null;
    address: string | null;
    coordinate: string | null;
    created_at: string;
    parent?: Organization;
}

interface OrganizationPageProps {
    organizationList: Organization[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Organization',
        href: 'master/organization',
    },
];

export default function OrganizationPage({ organizationList }: OrganizationPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Organization" />

            <div className='px-5 py-5'>
                <h1 className="text-2xl font-bold">Organization Management Dashboard</h1>
                <h3>Add, remove, or edit Organization Data</h3>
                <TableOrganization organizationList={organizationList} />
            </div>
        </AppLayout>
    );
}