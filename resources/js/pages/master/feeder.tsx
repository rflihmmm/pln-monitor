import { Head } from '@inertiajs/react';

import { type BreadcrumbItem, GarduInduk, Feeder, Keypoint, StatusPoint } from '@/types';

import TableFeeder from '@/components/master/table-feeder';
import AppLayout from '@/layouts/app-layout';

interface FeederPageProps {
  feederList: Feeder[];
  garduIndukList: GarduInduk[];
  keypointsList: Keypoint[];
  statusPointsList: StatusPoint[];
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Feeder',
    href: 'master/feeder',
  },
];

export default function FeederPage({ feederList, garduIndukList, keypointsList, statusPointsList }: FeederPageProps) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Feeder" />
      <div className='px-5 py-5'>
        <h1 className="text-2xl font-bold">Feeder Management Dashboard</h1>
        <h3>Add, remove, or edit Feeders Data</h3>        
        <TableFeeder feederList={feederList} garduIndukList={garduIndukList} keypointsList={keypointsList}
        statusPointsList={statusPointsList} />

      </div>
    </AppLayout>
  );
}
