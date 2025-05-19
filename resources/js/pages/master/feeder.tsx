import { Head } from '@inertiajs/react';

import { type BreadcrumbItem, GarduInduk, Feeder } from '@/types';

import TableFeeder from '@/components/master/table-feeder';
import AppLayout from '@/layouts/app-layout';

interface FeederPageProps {
  feederList: Feeder[];
  garduIndukList: GarduInduk[];
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Feeder',
    href: 'master/feeder',
  },
];

const sampleKeypoints = [
  { id: 1, name: "Keypoint A" },
  { id: 2, name: "Keypoint B" },
  { id: 3, name: "Keypoint C" },
  { id: 4, name: "Keypoint D" },
]

const sampleStatusPoints = [
  { id: 1, name: "Active" },
  { id: 2, name: "Inactive" },
  { id: 3, name: "Maintenance" },
  { id: 4, name: "Fault" },
]

export default function FeederPage({ feederList, garduIndukList }: FeederPageProps) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Feeder" />
      <div className='px-5 py-5'>
        <h1 className="text-2xl font-bold">Feeder Management Dashboard</h1>
        <h3>Add, remove, or edit Feeders Data</h3>        
        <TableFeeder feederList={feederList} garduIndukList={garduIndukList} keypointsList={sampleKeypoints}
        statusPointsList={sampleStatusPoints} />

      </div>
    </AppLayout>
  );
}
