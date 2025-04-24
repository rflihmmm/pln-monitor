import { Head } from '@inertiajs/react';

import { type BreadcrumbItem } from '@/types';

import TableFeeder from '@/components/table-feeder';
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

export default function FeederPage({ feederList, garduIndukList }: FeederPageProps) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Feeder" />

      <TableFeeder feederList={feederList} garduIndukList={garduIndukList} />
    </AppLayout>
  );
}
