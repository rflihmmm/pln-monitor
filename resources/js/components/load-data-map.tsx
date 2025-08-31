import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gauge, Zap, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RegionData {
    name: string;
    power: string;
    current: string;
    source: string; // Added source property
}

interface TotalData {
    power: string;
    current: string;
    source: string; // Added source property
}

interface SystemData {
    name: string;
    regions: RegionData[];
    total: TotalData[]; // Changed to array of TotalData
}

interface ApiResponse {
    success: boolean;
    data: SystemData[];
    grandTotal: TotalData[]; // Changed to array of TotalData
    message?: string;
    error?: string;
}

export default function LoadData() {
    const [systemsData, setSystemsData] = useState<SystemData[]>([]);
    const [selectedSystem, setSelectedSystem] = useState<string>('');
    const [selectedSource, setSelectedSource] = useState<string>('by LBS'); // New state for tab selection
    const [grandTotal, setGrandTotal] = useState<TotalData[]>([]); // Updated to array
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
                    setGrandTotal(result.grandTotal || []); // Set grandTotal as array

                    // Set default selected system to first system if none selected
                    if (result.data.length > 0 && !selectedSystem) {
                        setSelectedSystem(result.data[0].name);
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

    // Filter regions and total based on selectedSource
    const filteredRegions = currentSystem?.regions.filter(region => region.source === selectedSource) || [];
    const filteredTotal = currentSystem?.total.find(total => total.source === selectedSource);
    const filteredGrandTotal = grandTotal.find(total => total.source === selectedSource);


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
                <Tabs value={selectedSource} onValueChange={setSelectedSource} className="mt-4">
                    <TabsList>
                        <TabsTrigger value="by LBS">by LBS</TabsTrigger>
                        <TabsTrigger value="by Feeder">by Feeder</TabsTrigger>
                    </TabsList>
                    <TabsContent value="by LBS">
                        {/* Content for by LBS tab */}
                    </TabsContent>
                    <TabsContent value="by Feeder">
                        {/* Content for by Feeder tab */}
                    </TabsContent>
                </Tabs>
            </CardHeader>
            <CardContent>
                {currentSystem && (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Region</TableHead>
                                    <TableHead className="text-right">Power</TableHead>
                                    <TableHead className="text-right">Current</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegions.map((region) => (
                                    <TableRow key={region.name}>
                                        <TableCell>{region.name}</TableCell>
                                        <TableCell className="text-right font-medium">{region.power}</TableCell>
                                        <TableCell className="text-right">{region.current}</TableCell>
                                    </TableRow>
                                ))}
                                {filteredTotal && (
                                    <TableRow className="bg-muted/50">
                                        <TableCell className="font-bold">
                                            Total {currentSystem.name.split(' ').pop()}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{filteredTotal.power}</TableCell>
                                        <TableCell className="text-right font-bold">{filteredTotal.current}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <div className="bg-muted mt-4 rounded-lg border p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="text-primary h-5 w-5" />
                                    <span className="font-bold">Total SulSelBar</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold">{filteredGrandTotal?.power || '0.00 MW'}</span>
                                    <Gauge className="text-primary h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                                Total Current: {filteredGrandTotal?.current || '0.00 A'}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
