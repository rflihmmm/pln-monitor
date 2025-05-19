import { Head } from '@inertiajs/react';

import { type BreadcrumbItem } from '@/types';

import TableGarduInduk from '@/components/master/table-gardu-induk';
import AppLayout from '@/layouts/app-layout';

// Define interfaces for the data
interface GarduInduk {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

interface GarduIndukPageProps {
  garduIndukList: GarduInduk[];
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Gardu Induk',
    href: 'master/gardu-induk',
  },
];

export default function GarduIndukPage({ garduIndukList }: GarduIndukPageProps) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Gardu Induk" />

      <div className='px-5 py-5'>
        <h1 className="text-2xl font-bold">Gardu Induk Management Dashboard</h1>
        <h3>Add, remove, or edit Gardu Induk Data</h3>
      <TableGarduInduk garduIndukList={garduIndukList} />
      </div>
    </AppLayout>
  );
}
