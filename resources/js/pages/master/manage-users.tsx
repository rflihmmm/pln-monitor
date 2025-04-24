import { Head } from '@inertiajs/react';

import { type BreadcrumbItem } from '@/types';

import TableUsers from '@/components/table-users';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Users',
        href: 'master/manage-users',
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

            <TableUsers users={users} />
        </AppLayout>
    );
}
