import GoTest from '@/components/go_test';
import TableHMI from '@/components/app-table-hmi';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Table Monitor',
        href: '/table-monitor',
    },
];

export default function TableMonitor() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Table Monitor" />
            <GoTest />
            <TableHMI />
        </AppLayout>
    );
}
