import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from 'react-leaflet';

// Define marker types based on API response
interface SubstationMarker {
    id: number;
    name: string;
    keypointName: string;
    coordinate: [number, number];
    status: 'active' | 'inactive';
    data: {
        'load-is': number;
        'load-mw': number;
        lastUpdate: string;
    };
}

interface MapComponentProps {
    filter: 'GI' | 'GH' | 'ALL';
}

export default function MapComponent({ filter }: MapComponentProps) {
    const mapRef = useRef<L.Map | null>(null);
    const [markers, setMarkers] = useState<SubstationMarker[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Custom marker icons
    const activeIcon = new L.Icon({
        iconUrl:
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzEwYjk4MSIvPjwvc3ZnPg==',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    });

    const inactiveIcon = new L.Icon({
        iconUrl:
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2VmNDQ0NCIvPjwvc3ZnPg==',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    });

    // Fetch data from API
    const fetchMapData = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (filter !== 'ALL') {
                params.append('filter', filter);
            }

            const response = await fetch(`/api/mapdata?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setMarkers(result.data);
            } else {
                setError(result.message || 'Failed to fetch data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching map data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch data on component mount and when filter changes
    useEffect(() => {
        fetchMapData();
    }, [filter]);

    // Auto-refresh data every 300 seconds
    useEffect(() => {
        const interval = setInterval(fetchMapData, 300000);
        return () => clearInterval(interval);
    }, [filter]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading map data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Error: {error}</p>
                    <button
                        onClick={fetchMapData}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <MapContainer
            center={[-1.980379, 120.512788]} // Center on Makassar, Sulawesi
            zoom={7}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            zoomControl={false}
            whenCreated={(map) => {
                mapRef.current = map;
            }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="bottomright" />

            {markers.map((marker) => (
                <Marker
                    key={marker.id}
                    position={marker.coordinate}
                    icon={marker.status === 'active' ? activeIcon : inactiveIcon}
                >
                    <Popup>
                        <Card className="border-0 shadow-none">
                            <div className="p-1">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-base font-bold">{marker.name}</h3>
                                    <Badge
                                        variant={marker.status === 'active' ? 'default' : 'destructive'}
                                        className="ml-2"
                                    >
                                        {marker.status.charAt(0).toUpperCase() + marker.status.slice(1)}
                                    </Badge>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">ID:</span>
                                        <span className="font-medium">{marker.id}</span>
                                    </div>
                                    {marker.keypointName && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Keypoint:</span>
                                            <span className="font-medium">{marker.keypointName}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Load IS:</span>
                                        <span className="font-medium">{marker.data['load-is']} A</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Load MW:</span>
                                        <span className="font-medium">{marker.data['load-mw']} MW</span>
                                    </div>
                                    <div className="text-muted-foreground mt-2 text-xs">
                                        Last update: {new Date(marker.data.lastUpdate).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Popup>
                </Marker>
            ))}

            {/* Display count of markers */}
            <div className="absolute top-4 left-4 z-[1000] bg-white px-3 py-2 rounded-md shadow-md">
                <p className="text-sm font-medium">
                    {markers.length} {filter === 'ALL' ? 'Total' : filter} Substations
                </p>
            </div>
        </MapContainer>
    );
}