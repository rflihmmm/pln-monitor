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
            <main className="flex flex-col items-center justify-between px-4 pt-4">
                <div className="w-full max-w-7xl">

                    <div className="w-full h-[80vh] rounded-lg border bg-white p-2 shadow-sm overflow-hidden">
                        <SingleLineNetwork />
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
