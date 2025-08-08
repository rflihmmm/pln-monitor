import { SingleLineNetwork } from '@/components/single-line-network';
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
            <main className="flex min-h-screen flex-col items-center justify-between p-4">
                <div className="w-full max-w-7xl">

                    <div className="w-full rounded-lg border bg-white p-2 shadow-sm">


                        <SingleLineNetwork />
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
