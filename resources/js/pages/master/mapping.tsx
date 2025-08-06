import { Head } from '@inertiajs/react';

import { type BreadcrumbItem, Mapping, Keypoint } from '@/types';
import TableMapping from '@/components/master/table-mapping';
import AppLayout from '@/layouts/app-layout';

interface TableMappingProps {
  mappingList: Mapping[];
  keypointsList: Keypoint[];
  datas: any[];
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Maps',
    href: 'master/maps',
  },
];

export default function MapsPage({
  mappingList,
  keypointsList,
  datas
}: TableMappingProps) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Maps" />
      <div className='px-5 py-5 space-y-4'>
        <div>
          <h1 className="text-2xl font-bold">Mapping Management Dashboard</h1>
          <h3>Add, remove, or edit Maps Data</h3>
        </div>
        <TableMapping datas={datas} keypointsList={keypointsList} mappingList={mappingList} />
      </div>
    </AppLayout>
  );
}