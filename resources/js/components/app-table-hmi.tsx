import type React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
// Using standard HTML table elements since shadcn table is not available
import { cn } from '@/lib/utils';
import { RefreshCw, Search, Circle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Define types for our data
interface KeypointData {
    id: string;
    garduInduk: string;
    feeder: string;
    pmt1: string | null;
    amp: string | null;
    mw: string | null;
    keypoint: string;
    pmt2: { CB: string | null; LR: string | null };
    hotlineTag: string | null;
    ir: number | null;
    is: number | null;
    it: number | null;
    ifR: number | null;
    ifS: number | null;
    ifT: number | null;
    ifN: number | null;
    kvAB: number | null;
    kvBC: number | null;
    kvAC: number | null;
}

export default function TableHMI() {
    const [data, setData] = useState<KeypointData[]>([]);
    const [filteredData, setFilteredData] = useState<KeypointData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Function to fetch data from API
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('/api/table-hmi', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const result = await response.json();
            setData(result);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
            setIsUpdating(false);
        }
    }, []);

    // Filter data based on search term
    useEffect(() => {
        const filtered = data.filter(
            (item) =>
                item.keypoint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.garduInduk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.feeder?.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setFilteredData(filtered);
    }, [searchTerm, data]);

    // Initial data load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    // Force a manual update
    const handleManualUpdate = () => {
        setIsUpdating(true);
        fetchData();
    };

    // Helper function to calculate rowspan for cells that should be merged
    const calculateRowSpan = (data: KeypointData[], rowIndex: number, field: keyof KeypointData): number | undefined => {
        if (rowIndex === 0 || data[rowIndex][field] !== data[rowIndex - 1][field]) {
            // Count how many consecutive rows have the same value
            let span = 1;
            while (rowIndex + span < data.length && data[rowIndex + span][field] === data[rowIndex][field]) {
                span++;
            }
            return span;
        }
        return undefined; // Return undefined for cells that should not be rendered
    };

    // Helper function to determine if a cell should be rendered
    const shouldRenderCell = (data: KeypointData[], rowIndex: number, field: keyof KeypointData): boolean => {
        return rowIndex === 0 || data[rowIndex][field] !== data[rowIndex - 1][field];
    };

    // Helper function to render PMT1 status
    const renderPmt1Status = (value: string | null) => {
        if (value === null) return null;

        return (
            <div className="flex items-center justify-center">
                <Circle
                    className={cn(
                        "h-4 w-4",
                        value === "1" ? "fill-red-500 text-green-500" : "text-green-500"
                    )}
                />
            </div>
        );
    };

    // Helper function to render PMT2 status
    const renderPmt2Status = (pmt2: { CB: string | null; LR: string | null }) => {
        return (
            <div className="flex items-center justify-center gap-2">
                {/* CB Status */}
                {pmt2.CB !== null && (
                    <Circle
                        className={cn(
                            "h-4 w-4",
                            pmt2.CB === "1" ? "fill-red-500 text-green-500" : "text-green-500"
                        )}
                    />
                )}
                {/* LR Status */}
                {pmt2.LR === "0" ? (
                    <span className="text-blue-600 font-medium">L</span>
                ) : (
                    <span className="text-blue-600 font-medium">R</span>
                )}

            </div>
        );
    };

    // Helper function to format numeric values
    const formatValue = (value: number | null | string, decimals: number = 2): string => {
        if (value === null) return '-';
        return Number(value).toFixed(decimals);
    };

    if (isLoading) {
        return (
            <div className="flex h-full flex-1 items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading HMI data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            {/* Search and Controls */}
            <Card className="bg-muted/20 border-b p-4">
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                            type="search"
                            placeholder="Search by keypoint, gardu induk, or feeder..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-muted-foreground text-sm">Last updated: {lastUpdated.toLocaleTimeString()}</div>
                        <Button variant="outline" size="sm" onClick={handleManualUpdate} disabled={isUpdating} className="flex items-center gap-2">
                            <RefreshCw className={cn('h-4 w-4', isUpdating && 'animate-spin')} />
                            Refresh
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table Container with horizontal scroll */}
            <Card className="bg-background overflow-x-auto">
                <CardContent className="min-w-max">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                {[
                                    'GARDU INDUK',
                                    'FEEDER',
                                    'PMT',
                                    'AMP',
                                    'MW',
                                    'KEYPOINT',
                                    'PMT',
                                    'HOTLINE TAG',
                                    'IR',
                                    'IS',
                                    'IT',
                                    'IF-R',
                                    'IF-S',
                                    'IF-T',
                                    'IF-N',
                                    'KV-AB',
                                    'KV BC',
                                    'KV AC',
                                ].map((header, index) => (
                                    <th key={index} className="bg-gray-100 border border-gray-300 p-2 text-center font-bold text-sm">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, rowIndex) => (
                                <tr key={row.id} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                    {/* GARDU INDUK - Merged cells */}
                                    {shouldRenderCell(filteredData, rowIndex, 'garduInduk') && (
                                        <td
                                            className="border border-gray-300 p-2 text-center align-middle font-medium"
                                            rowSpan={calculateRowSpan(filteredData, rowIndex, 'garduInduk')}
                                        >
                                            {row.garduInduk}
                                        </td>
                                    )}

                                    {/* FEEDER - Merged cells */}
                                    {shouldRenderCell(filteredData, rowIndex, 'feeder') && (
                                        <td
                                            className="border border-gray-300 p-2 text-center align-middle font-medium"
                                            rowSpan={calculateRowSpan(filteredData, rowIndex, 'feeder')}
                                        >
                                            {row.feeder}
                                        </td>
                                    )}

                                    {/* PMT1 - Merged cells per feeder */}
                                    {shouldRenderCell(filteredData, rowIndex, 'feeder') && (
                                        <td
                                            className="border border-gray-300 p-2 text-center align-middle"
                                            rowSpan={calculateRowSpan(filteredData, rowIndex, 'feeder')}
                                        >
                                            {renderPmt1Status(row.pmt1)}
                                        </td>
                                    )}

                                    {/* AMP - Merged cells per feeder */}
                                    {shouldRenderCell(filteredData, rowIndex, 'feeder') && (
                                        <td
                                            className="border border-gray-300 p-2 text-center align-middle"
                                            rowSpan={calculateRowSpan(filteredData, rowIndex, 'feeder')}
                                        >
                                            {formatValue(row.amp)}
                                        </td>
                                    )}

                                    {/* MW - Merged cells per feeder */}
                                    {shouldRenderCell(filteredData, rowIndex, 'feeder') && (
                                        <td
                                            className="border border-gray-300 p-2 text-center align-middle"
                                            rowSpan={calculateRowSpan(filteredData, rowIndex, 'feeder')}
                                        >
                                            {formatValue(row.mw)}
                                        </td>
                                    )}

                                    {/* KEYPOINT */}
                                    <td className="border border-gray-300 p-2 text-center align-middle font-medium">
                                        {row.keypoint}
                                    </td>

                                    {/* PMT2 */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {renderPmt2Status(row.pmt2)}
                                    </td>

                                    {/* HOTLINE TAG */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {row.hotlineTag === "0" && <Badge variant="destructive">ON</Badge>}
                                        {row.hotlineTag === "1" && (
                                            <Badge variant="outline" className="bg-green-100 text-green-800">
                                                OFF
                                            </Badge>
                                        )}
                                    </td>


                                    {/* IR */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.ir)}
                                    </td>

                                    {/* IS */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.is)}
                                    </td>

                                    {/* IT */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.it)}
                                    </td>

                                    {/* IF-R */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.ifR)}
                                    </td>

                                    {/* IF-S */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.ifS)}
                                    </td>

                                    {/* IF-T */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.ifT)}
                                    </td>

                                    {/* IF-N */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.ifN)}
                                    </td>

                                    {/* KV-AB */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.kvAB)}
                                    </td>

                                    {/* KV BC */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.kvBC)}
                                    </td>

                                    {/* KV AC */}
                                    <td className="border border-gray-300 p-2 text-center align-middle">
                                        {formatValue(row.kvAC)}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}