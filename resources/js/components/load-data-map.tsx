import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gauge, Zap, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface RegionData {
    name: string;
    power: string;
    current: string;
}

const getBackgroundColorClass = (systemName: string) => {
    switch (systemName) {
        case 'Beban Sistem DCC SELATAN':
            return 'bg-[#BEA42E]';
        case 'Beban Sistem DCC TENGGARA':
            return 'bg-[#7BD4CC]';
        case 'Beban Sistem DCC UTARA':
            return 'bg-[#7B895B]';
        case 'Beban Sistem DCC ALL':
            return 'bg-[#AAD3DF]'; // A distinct color for DCC ALL
        default:
            return 'bg-sky-300'; // Default color if no match
    }
};

interface SystemData {
    name: string;
    regions: RegionData[];
    total: {
        power: string;
        current: string;
    }[]; // Changed to array
}

interface ApiResponse {
    success: boolean;
    data: SystemData[];
    grandTotal: {
        power: string;
        current: string;
    }[]; // Changed to array
    message?: string;
    error?: string;
}

export default function LoadData() {
    const [systemsData, setSystemsData] = useState<SystemData[]>([]);
    const [selectedSystem, setSelectedSystem] = useState<string>('');
    const [grandTotal, setGrandTotal] = useState<{ power: string; current: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch data from API
    useEffect(() => {
        const fetchSystemLoadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch('/api/system-load-data');
                const result: ApiResponse = await response.json();

                if (result.success && result.data) {
                    setSystemsData(result.data);
                    setGrandTotal(result.grandTotal || []);

                    // Create "Beban Sistem DCC ALL" entry
                    const dccAllTotalRegions: RegionData[] = result.data.map(system => ({
                        name: system.name,
                        power: system.total[0]?.power || 'N/A',
                        current: system.total[0]?.current || 'N/A',
                    }));

                    const dccAllSystem: SystemData = {
                        name: 'Beban Sistem DCC ALL',
                        regions: dccAllTotalRegions,
                        total: result.grandTotal || [],
                    };

                    const updatedSystemsData = [dccAllSystem, ...result.data];
                    setSystemsData(updatedSystemsData);

                    // Set default selected system to "Beban Sistem DCC ALL" if none selected
                    if (!selectedSystem) {
                        setSelectedSystem('Beban Sistem DCC ALL');
                    }
                } else {
                    setError(result.message || 'Failed to fetch system load data');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
                console.error('Error fetching system load data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSystemLoadData();

        // Set up auto-refresh every 300 seconds
        const interval = setInterval(fetchSystemLoadData, 300000);

        return () => clearInterval(interval);
    }, [selectedSystem]);

    const currentSystem = systemsData.find((system) => system.name === selectedSystem) || systemsData[0];

    // Helper function to format numbers for Indonesian locale (swaps '.' and ',')
    const formatNumberID = (numStr: string): string => {
        if (!numStr) return numStr;

        // Check if the number already uses Indonesian format (e.g., 10.545,23)
        // This is a simple heuristic, assuming numbers with ',' as decimal separator are already formatted.
        if (numStr.includes(',')) {
            // If it has a comma, assume it's already in Indonesian format or needs to be converted from US to ID
            // Example: 10,545.23 (US) -> 10.545,23 (ID)
            return numStr.replace(/\./g, '#').replace(/,/g, '.').replace(/#/g, ',');
        } else if (numStr.includes('.')) {
            // If it has a dot, assume it's in US format (e.g., 10,545.23) and convert to ID
            // Example: 10545.23 (US) -> 10.545,23 (ID)
            const parts = numStr.split('.');
            const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // Add thousands separator
            const decimalPart = parts.length > 1 ? `,${parts[1]}` : '';
            return `${integerPart}${decimalPart}`;
        }
        return numStr;
    };

    // Helper function to determine if a cell should be rendered
    const shouldRenderCell = (data: RegionData[], rowIndex: number, field: keyof RegionData): boolean => {
        return rowIndex === 0 || data[rowIndex][field] !== data[rowIndex - 1][field];
    };

    // Reusable helper: split a value like "26,67 MW" into formatted number and unit
    const splitNumberAndUnit = (value: string): { number: string; unit: string } => {
        if (!value || value === 'N/A') return { number: 'N/A', unit: '' };
        const parts = value.split(' ');
        const numRaw = parts[0] || 'N/A';
        const num = numRaw === 'N/A' ? 'N/A' : formatNumberID(numRaw);
        const unit = parts.slice(1).join(' ') || '';
        return { number: num, unit };
    };

    if (loading) {
        return (
            <Card>
                <CardHeader className="space-y-0 pb-2">
                    <div className="flex items-center justify-center h-12">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading system data...</span>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="space-y-0 pb-2">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Alert>
                </CardHeader>
            </Card>
        );
    }

    if (!systemsData.length) {
        return (
            <Card>
                <CardHeader className="space-y-0 pb-2">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No system data available
                        </AlertDescription>
                    </Alert>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="space-y-0 pb-2">
                <div className="flex items-center justify-between">
                    <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                        <SelectTrigger className="w-full max-w-sm">
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
                </div>
            </CardHeader>
            <CardContent>
                {currentSystem && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <tbody>
                                    {currentSystem.regions.map((region, rowIndex) => (
                                        <>
                                            <tr key={`${region.name}-power`} className="bg-gray-100 border-4 border-white rounded-[50%]">
                                                {shouldRenderCell(currentSystem.regions, rowIndex, 'name') && (
                                                    <td id="up3"
                                                        className={cn(
                                                            "p-2 text-center align-middle font-bold min-w-[150px] whitespace-normal border-3 border-white rounded-xl text-white",
                                                            getBackgroundColorClass(currentSystem.name)
                                                        )}
                                                        rowSpan={2}
                                                    >
                                                        {region.name}
                                                    </td>
                                                )}
                                                <td className="p-2 text-right align-middle font-bold text-xl min-w-[100px]">{formatNumberID(region.power.split(' ')[0])}</td>
                                                <td className="p-2 text-right align-middle text-sm min-w-[50px] text-red-500 font-bold">{region.power.split(' ')[1]}</td>
                                            </tr>
                                            <tr key={`${region.name}-current`} className="bg-gray-100 border-4 border-white rounded-2xl">
                                                <td className="p-2 text-right align-middle font-bold text-xl min-w-[100px]">{formatNumberID(region.current.split(' ')[0])}</td>
                                                <td className="p-2 text-right align-middle text-sm min-w-[50px] text-red-500 font-bold">{region.current.split(' ')[1]}</td>
                                            </tr>
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {selectedSystem !== 'Beban Sistem DCC ALL' && (
                            <div className="bg-muted mt-4 rounded-lg border p-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-[180px]">
                                        <Zap className="text-primary h-5 w-5" />
                                        <span className="font-bold text-xl">
                                            {currentSystem.name === 'Beban Sistem DCC ALL' ? 'Total DCC ALL' : `Total ${currentSystem.name.split(' ').pop()}`}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 min-w-[130px]">
                                        <table className="w-full text-right min-w-[130px]">
                                            <tbody>
                                                <tr>
                                                    {(() => {
                                                        const val = currentSystem.total.length > 0 ? currentSystem.total[0].power : 'N/A';
                                                        const { number: num, unit } = splitNumberAndUnit(val);
                                                        return (
                                                            <>
                                                                <td className="p-1 text-xl font-bold align-middle">{num}</td>
                                                                <td className="p-1 text-sm text-red-500 font-bold align-middle">{unit}</td>
                                                            </>
                                                        );
                                                    })()}
                                                </tr>
                                                <tr>
                                                    {(() => {
                                                        const val = currentSystem.total.length > 0 ? currentSystem.total[0].current : 'N/A';
                                                        const { number: num, unit } = splitNumberAndUnit(val);
                                                        return (
                                                            <>
                                                                <td className="p-1 text-xl font-bold align-middle">{num}</td>
                                                                <td className="p-1 text-sm text-red-500 font-bold align-middle">{unit}</td>
                                                            </>
                                                        );
                                                    })()}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-muted mt-4 rounded-lg border p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-[180px]">
                                    <Zap className="text-primary h-5 w-5" />
                                    <span className="font-bold text-xl">Total SULSELRABAR</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 min-w-[130px]">
                                    <table className="w-full text-right min-w-[130px]">
                                        <tbody>
                                            <tr>
                                                {(() => {
                                                    const val = grandTotal.length > 0 ? grandTotal[0].power : 'N/A';
                                                    const { number: num, unit } = splitNumberAndUnit(val);
                                                    return (
                                                        <>
                                                            <td className="p-1 text-xl font-bold align-middle">{num}</td>
                                                            <td className="p-1 text-sm text-red-500 font-bold align-middle">{unit}</td>
                                                        </>
                                                    );
                                                })()}
                                            </tr>
                                            <tr>
                                                {(() => {
                                                    const val = grandTotal.length > 0 ? grandTotal[0].current : 'N/A';
                                                    const { number: num, unit } = splitNumberAndUnit(val);
                                                    return (
                                                        <>
                                                            <td className="p-1 text-xl font-bold align-middle">{num}</td>
                                                            <td className="p-1 text-sm text-red-500 font-bold align-middle">{unit}</td>
                                                        </>
                                                    );
                                                })()}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
