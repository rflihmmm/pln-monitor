import { Head } from '@inertiajs/react';

import { type BreadcrumbItem } from '@/types';

import TableUsers from '@/components/master/table-users';
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

            <div className='px-5 py-5'>
                <h1 className="text-2xl font-bold">User Management Dashboard</h1>
                <h3>Add, remove, or edit user profiles</h3>
            <TableUsers users={users} />
            </div>
        </AppLayout>
    );
}
