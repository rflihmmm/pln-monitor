import { Head } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

import TableUsers from '@/components/table-users';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Users',
        href: '/settings/manage-users',
    },
];

export default function Appearance() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Users" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Manage Users" description="Add or Delete user" />

                    <TableUsers />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
