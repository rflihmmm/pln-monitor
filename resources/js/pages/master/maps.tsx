import { Head } from '@inertiajs/react';

import { type BreadcrumbItem, MapsData, Keypoint } from '@/types';
import Organization from '@/components/master/organization';
import TableMaps from '@/components/master/table-maps';
import AppLayout from '@/layouts/app-layout';

interface MapsPageProps {
  mapsDataList: MapsData[];
  keypointsList: Keypoint[];
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Maps',
    href: 'master/maps',
  },
];

export default function MapsPage() {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Maps" />
      <div className='px-5 py-5 space-y-4'>
        <div>
          <h1 className="text-2xl font-bold">Maps Management Dashboard</h1>
          <h3>Add, remove, or edit Maps Data</h3>
        </div>
        <Organization />
      </div>
    </AppLayout>
  );
}