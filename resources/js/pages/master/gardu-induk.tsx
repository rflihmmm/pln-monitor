import { Head } from '@inertiajs/react';

import { type BreadcrumbItem } from '@/types';

import TableGarduInduk from '@/components/table-gardu-induk';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gardu Induk',
        href: 'master/gardu-induk',
    },
];

export default function GarduInduk() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Users" />

            <TableGarduInduk />
        </AppLayout>
    );
}
