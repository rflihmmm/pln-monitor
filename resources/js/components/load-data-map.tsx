import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gauge, Zap } from 'lucide-react';
import { useState } from 'react';

interface RegionData {
    name: string;
    power: string;
    current: string;
}

interface SystemData {
    name: string;
    regions: RegionData[];
    total: {
        power: string;
        current: string;
    };
}

const systemsData: SystemData[] = [
    {
        name: 'Beban Sistem Utara',
        regions: [
            { name: 'Bulukumba', power: '65.28 MW', current: '2094.03 A' },
            { name: 'Mamuju', power: '65/58 MW', current: '2103.63 A' },
            { name: 'Palopo', power: '70.34 MW', current: '2256.14 A' },
            { name: 'Pare-Pare', power: '82.76 MW', current: '2654.49 A' },
            { name: 'Pinrang', power: '42.56 MW', current: '1365.29 A' },
            { name: 'Watampone', power: '69.64 MW', current: '2233.69 A' },
        ],
        total: {
            power: '396.16 MW',
            current: '12702.94 A',
        },
    },
    {
        name: 'Beban Sistem Selatan',
        regions: [
            { name: 'Makassar', power: '120.45 MW', current: '3865.28 A' },
            { name: 'Gowa', power: '58.32 MW', current: '1870.65 A' },
            { name: 'Takalar', power: '42.18 MW', current: '1354.37 A' },
            { name: 'Jeneponto', power: '35.76 MW', current: '1148.24 A' },
            { name: 'Bantaeng', power: '28.94 MW', current: '929.18 A' },
        ],
        total: {
            power: '285.65 MW',
            current: '9167.72 A',
        },
    },
    {
        name: 'Beban Sistem Timur',
        regions: [
            { name: 'Kendari', power: '87.65 MW', current: '2812.36 A' },
            { name: 'Kolaka', power: '45.23 MW', current: '1452.18 A' },
            { name: 'Bau-Bau', power: '38.76 MW', current: '1244.32 A' },
            { name: 'Wakatobi', power: '22.45 MW', current: '720.84 A' },
            { name: 'Konawe', power: '31.82 MW', current: '1021.47 A' },
        ],
        total: {
            power: '225.91 MW',
            current: '7251.17 A',
        },
    },
];

export default function LoadData() {
    const [selectedSystem, setSelectedSystem] = useState('Beban Sistem Utara');

    const currentSystem = systemsData.find((system) => system.name === selectedSystem) || systemsData[0];

    return (
        <Card>
            <CardHeader className="space-y-0 pb-2">
                <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select system" />
                    </SelectTrigger>
                    <SelectContent>
                        {systemsData.map((system) => (
                            <SelectItem key={system.name} value={system.name}>
                                {system.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Region</TableHead>
                            <TableHead className="text-right">Power</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentSystem.regions.map((region) => (
                            <TableRow key={region.name}>
                                <TableCell>{region.name}</TableCell>
                                <TableCell className="text-right font-medium">{region.power}</TableCell>
                                <TableCell className="text-right">{region.current}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                            <TableCell className="font-bold">Total {currentSystem.name.split(' ').pop()}</TableCell>
                            <TableCell className="text-right font-bold">{currentSystem.total.power}</TableCell>
                            <TableCell className="text-right font-bold">{currentSystem.total.current}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <div className="bg-muted mt-4 rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="text-primary h-5 w-5" />
                            <span className="font-bold">Total SulSelBar</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">939.50 MW</span>
                            <Gauge className="text-primary h-5 w-5" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
