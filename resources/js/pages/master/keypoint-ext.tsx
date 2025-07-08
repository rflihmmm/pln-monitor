import { Head } from '@inertiajs/react';

import { type BreadcrumbItem } from '@/types';

import TableKeypointExt from '@/components/master/table-keypoint-ext';
import AppLayout from '@/layouts/app-layout';

interface KeypointExt {
    keypoint_id: number;
    coordinate?: string;
    alamat?: string;
    parent_stationpoints?: number;
    name?: string;
    parent_name?: string;
    created_at?: string;
    updated_at?: string;
}

interface KeypointExtPageProps {
    keypointExtList: KeypointExt[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Keypoint Extensions',
        href: 'master/keypoint-ext',
    },
];

export default function KeypointExt({ keypointExtList }: KeypointExtPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Keypoint Extensions" />
            <div className='px-5 py-5'>
                <h1 className="text-2xl font-bold">Keypoint Extensions Management Dashboard</h1>
                <h3>Add, remove, or edit Keypoint Extensions Data</h3>
                <TableKeypointExt keypointExtList={keypointExtList} />
            </div>
        </AppLayout>
    );
}