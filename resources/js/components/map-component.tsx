
import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Define marker types
interface SubstationMarker {
    id: string
    name: string
    type: "GI" | "GH"
    position: [number, number]
    status: "active" | "inactive"
    data?: {
        voltage: string
        load: string
        lastUpdate: string
    }
}

// Sample data for demonstration
const sampleMarkers: SubstationMarker[] = [
    {
        id: "gi1",
        name: "GI Panakkukang",
        type: "GI",
        position: [-5.1381, 119.4469],
        status: "active",
        data: {
            voltage: "150/20 kV",
            load: "65.28 MW",
            lastUpdate: "2025-03-21 15:45:31",
        },
    },
    {
        id: "gi2",
        name: "GI Tello",
        type: "GI",
        position: [-5.1481, 119.4769],
        status: "active",
        data: {
            voltage: "150/20 kV",
            load: "58.32 MW",
            lastUpdate: "2025-03-21 15:44:12",
        },
    },
    {
        id: "gi3",
        name: "GI Sungguminasa",
        type: "GI",
        position: [-5.2081, 119.4569],
        status: "inactive",
        data: {
            voltage: "150/20 kV",
            load: "0 MW",
            lastUpdate: "2025-03-21 15:30:45",
        },
    },
    {
        id: "gh1",
        name: "GH Daya",
        type: "GH",
        position: [-5.1181, 119.5269],
        status: "active",
        data: {
            voltage: "20 kV",
            load: "12.45 MW",
            lastUpdate: "2025-03-21 15:42:18",
        },
    },
    {
        id: "gh2",
        name: "GH Tamalanrea",
        type: "GH",
        position: [-5.1281, 119.4969],
        status: "active",
        data: {
            voltage: "20 kV",
            load: "10.78 MW",
            lastUpdate: "2025-03-21 15:43:22",
        },
    },
    {
        id: "gh3",
        name: "GH Antang",
        type: "GH",
        position: [-5.1681, 119.4869],
        status: "inactive",
        data: {
            voltage: "20 kV",
            load: "0 MW",
            lastUpdate: "2025-03-21 15:35:10",
        },
    },
]

// Generate more random markers for demonstration
for (let i = 0; i < 20; i++) {
    const type = Math.random() > 0.5 ? "GI" : "GH"
    const status = Math.random() > 0.2 ? "active" : "inactive"

    // Random position around Sulawesi
    const lat = -5.1381 + (Math.random() - 0.5) * 2
    const lng = 119.4469 + (Math.random() - 0.5) * 2

    sampleMarkers.push({
        id: `${type.toLowerCase()}${i + 4}`,
        name: `${type} Random ${i + 1}`,
        type,
        position: [lat, lng],
        status,
        data: {
            voltage: type === "GI" ? "150/20 kV" : "20 kV",
            load: status === "active" ? `${(Math.random() * 50).toFixed(2)} MW` : "0 MW",
            lastUpdate: "2025-03-21 15:40:00",
        },
    })
}

interface MapComponentProps {
    filter: "GI" | "GH" | "ALL"
}

export default function MapComponent({ filter }: MapComponentProps) {
    const mapRef = useRef<L.Map | null>(null)
    const [markers, setMarkers] = useState<SubstationMarker[]>([])

    // Custom marker icons
    const activeIcon = new L.Icon({
        iconUrl:
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzEwYjk4MSIvPjwvc3ZnPg==",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    })

    const inactiveIcon = new L.Icon({
        iconUrl:
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2VmNDQ0NCIvPjwvc3ZnPg==",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    })

    // Filter markers based on selected filter
    useEffect(() => {
        if (filter === "ALL") {
            setMarkers(sampleMarkers)
        } else {
            setMarkers(sampleMarkers.filter((marker) => marker.type === filter))
        }
    }, [filter])

    return (
        <MapContainer
            center={[-5.1381, 119.4469]} // Center on Makassar, Sulawesi
            zoom={11}
            style={{ height: "100%", width: "100%", zIndex: 1 }}
            zoomControl={false}
            whenCreated={(map) => {
                mapRef.current = map
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
                    position={marker.position}
                    icon={marker.status === "active" ? activeIcon : inactiveIcon}
                >
                    <Popup>
                        <Card className="border-0 shadow-none">
                            <div className="p-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-base">{marker.name}</h3>
                                    <Badge variant={marker.status === "active" ? "default" : "destructive"} className="ml-2">
                                        {marker.status.charAt(0).toUpperCase() + marker.status.slice(1)}
                                    </Badge>
                                </div>
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Type:</span>
                                        <span className="font-medium">{marker.type}</span>
                                    </div>
                                    {marker.data && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Voltage:</span>
                                                <span className="font-medium">{marker.data.voltage}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Load:</span>
                                                <span className="font-medium">{marker.data.load}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-2">Last update: {marker.data.lastUpdate}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}


