import AlarmLog from '@/components/alarm-log';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Alarm',
        href: '/alarm',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid grid-cols-1">
                    <div className="space-y-6">
                        <AlarmLog />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
