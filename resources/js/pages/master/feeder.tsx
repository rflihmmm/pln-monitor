import { Head } from '@inertiajs/react';

import { type BreadcrumbItem } from '@/types';

import TableFeeder from '@/components/master/table-feeder';
import AppLayout from '@/layouts/app-layout';

// Define interfaces for the data
interface GarduInduk {
  id: number;
  name: string;
}

interface Feeder {
  id: number;
  name: string;
  description: string | null;
  gardu_induk_id: number;
  created_at: string;
  gardu_induk?: GarduInduk;
}

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

      <TableFeeder feederList={feederList} garduIndukList={garduIndukList} keypointsList={sampleKeypoints}
        statusPointsList={sampleStatusPoints} />
    </AppLayout>
  );
}
