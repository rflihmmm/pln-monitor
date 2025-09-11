import LoadData from '@/components/load-data-map';
import MapComponent from '@/components/map-component';
import MapFilter from '@/components/map-filter';
import StatusIndicator from '@/components/status-indicator';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const [mapFilter, setMapFilter] = useState<'GI' | 'GH' | 'ALL'>('ALL');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card className="overflow-hidden">
                            <CardContent className="px-4 md:px-6">
                                <div className="h-[80vh] overflow-hidden rounded-md border">
                                    <MapComponent filter={mapFilter} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <LoadData />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
