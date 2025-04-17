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

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

interface ManageUserProps {
    users: User[];
}

export default function ManageUser({ users }: ManageUserProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Users" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Manage Users" description="Add or Delete user" />

                    <TableUsers users={users} />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
