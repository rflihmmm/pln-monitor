import { Head } from '@inertiajs/react';

import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Feeder',
        href: 'master/feeder',
    },
];

export default function GarduInduk() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Feeder" />

            <TableGarduInduk />
        </AppLayout>
    );
}
