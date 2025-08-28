import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    ZoomControl,
    Polyline,
    useMapEvents,
} from "react-leaflet"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { useDebounce } from "use-debounce"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import MapFilter from "@/components/map-filter"

type DropdownBase = {
    id: number
    name: string
    feeder?: number // Add feeder_id to DropdownBase
}

type NodeType = "GI" | "REC" | "LBS" | "GH"

type Feeder = {
    id: number
    name: string
    ["load-is"]: string
    ["load-mw"]: string
}

type NodeData = {
    ["load-is"]: string
    ["load-mw"]: string
    lastUpdate: string
}

type NodeItem = {
    id: number
    code: number
    name: string
    type: NodeType
    coordinate: [number, number]
    parent: number | null // code of parent
    status: "active" | "inactive" | string
    data: NodeData
    feeder: Feeder[] | null
}

type ApiResponse = { success: boolean; data: NodeItem[]; count: number };

type Visibility = Record<NodeType, boolean>

function useNetworkData() {
    const [data, setData] = useState<NodeItem[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch("/api/single-line")
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = (await res.json()) as ApiResponse;
            setData(json.data)
        } catch (e: any) {
            setError(e?.message ?? "Failed to load data")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Auto-refresh tiap 5 menit
    useEffect(() => {
        const t = setInterval(fetchData, 300000)
        return () => clearInterval(t)
    }, [fetchData])

    return { data, loading, error, refetch: fetchData }
}

// Komponen untuk memonitor zoom dan memberi tahu parent
function MapZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
    const map = useMapEvents({
        zoomend: () => {
            onZoom(map.getZoom())
        },
    })
    return null
}

export function SingleLineNetwork() {
    const { data, loading, error, refetch } = useNetworkData()
    const mapRef = useRef<L.Map | null>(null)

    // Zoom level untuk skala ikon
    const [zoom, setZoom] = useState(12)

    // Base64 SVG ikon
    const giIconUrl =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzEwYjk4MSIvPjwvc3ZnPg=="
    const recIconUrl =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzNiODJmNiIvPjwvc3ZnPg=="
    const lbsIconUrl =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzc1MzU5OSIvPjwvc3ZnPg=="

    const ghIconUrl =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2Y5NzMxNiIvPjwvc3ZnPg=="
    const inactiveIconUrl =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2VmNDQ0NCIvPjwvc3ZnPg=="

    // Hitung ukuran ikon mengikuti zoom:
    // - Saat zoom out (z kecil), ukuran minimum 12px agar tidak terlihat membesar relatif peta
    // - Saat zoom in (z besar), bertambah hingga 24px
    function sizeForZoom(z: number) {
        const min = 12
        const max = 24
        // skala linear dari z=12 (12px) hingga z=16 (24px), clamp di [12,24]
        const s = Math.round(12 + (z - 12) * 3) // 3 px per tingkat zoom
        return Math.max(min, Math.min(max, s))
    }

    const buildIcon = useCallback(
        (node: NodeItem, z: number) => {
            const s = sizeForZoom(z)
            let iconUrl: string

            if (node.status === "inactive") {
                iconUrl = inactiveIconUrl
            } else {
                switch (node.type) {
                    case "GI":
                        iconUrl = giIconUrl
                        break
                    case "REC":
                        iconUrl = recIconUrl
                        break
                    case "LBS":
                        iconUrl = lbsIconUrl
                        break
                    case "GH":
                        iconUrl = ghIconUrl
                        break
                    default:
                        iconUrl = giIconUrl // Fallback
                }
            }

            return new L.Icon({
                iconUrl: iconUrl,
                iconSize: [s, s],
                iconAnchor: [s / 2, s / 2],
                popupAnchor: [0, -s / 2],
            })
        },
        [giIconUrl, recIconUrl, lbsIconUrl, ghIconUrl, inactiveIconUrl]
    )

    const [visible, setVisible] = useState<Visibility>({ GI: true, REC: true, LBS: true, GH: true })
    const [statusFilter, setStatusFilter] = useState<'Active' | 'Inactive' | 'ALL'>('ALL');

    // State for new filters
    // State for selected values in dropdowns (not yet applied)
    const [tempSelectedFeeder, setTempSelectedFeeder] = useState<number | null>(null)
    const [tempSelectedKeypoint, setTempSelectedKeypoint] = useState<number | null>(null)

    // State for applied filter values (used for actual filtering)
    const [appliedFeeder, setAppliedFeeder] = useState<number | null>(null)
    const [appliedKeypoint, setAppliedKeypoint] = useState<number | null>(null)

    // State for dropdown lists
    const [feedersList, setFeedersList] = useState<DropdownBase[]>([])
    const [keypointsList, setKeypointsList] = useState<DropdownBase[]>([])

    // State for combobox
    const [feederOpen, setFeederOpen] = useState(false)
    const [keypointOpen, setKeypointOpen] = useState(false)

    // State for search terms
    const [feederSearchTerm, setFeederSearchTerm] = useState("")
    const [keypointSearchTerm, setKeypointSearchTerm] = useState("")

    // Debounced search terms
    const [debouncedFeederSearch] = useDebounce(feederSearchTerm, 500)
    const [debouncedKeypointSearch] = useDebounce(keypointSearchTerm, 500)

    // Loading states
    const [isFeederLoading, setIsFeederLoading] = useState(false)
    const [isKeypointLoading, setIsKeypointLoading] = useState(false)

    // Simpan ref marker agar bisa openPopup saat klik garis
    const markerRefs = useRef<Map<number, L.Marker>>(new Map())
    const registerMarkerRef = (code: number) => (ref: L.Marker | null) => {
        if (!ref) {
            markerRefs.current.delete(code)
        } else {
            markerRefs.current.set(code, ref)
        }
    }

    // Effect for search feeders
    useEffect(() => {
        if (debouncedFeederSearch.length >= 3) {
            fetchFeeders(debouncedFeederSearch)
        } else {
            setFeedersList([])
        }
    }, [debouncedFeederSearch])

    // Reset keypoint selection and list when feeder changes
    useEffect(() => {
        setTempSelectedKeypoint(null)
        setKeypointsList([])
        setKeypointSearchTerm("") // Clear keypoint search term
    }, [tempSelectedFeeder])

    // Effect for search keypoints
    useEffect(() => {
        if (tempSelectedFeeder !== null && (debouncedKeypointSearch.length >= 3 || debouncedKeypointSearch.length === 0)) {
            fetchKeypoints(debouncedKeypointSearch, tempSelectedFeeder)
        } else if (tempSelectedFeeder === null) {
            setKeypointsList([])
        }
    }, [debouncedKeypointSearch, tempSelectedFeeder])

    // Fetch functions
    const fetchFeeders = async (search: string) => {
        setIsFeederLoading(true)
        try {
            const response = await axios.get("/api/dropdown/feeders", {
                params: { filter: search },
            })

            if (response.data && Array.isArray(response.data)) {
                setFeedersList(response.data)
            } else {
                console.warn("Unexpected response format:", response.data)
                setFeedersList([])
            }
        } catch (error) {
            console.error("Error fetching feeders:", error)
            setFeedersList([])
        } finally {
            setIsFeederLoading(false)
        }
    }

    const fetchKeypoints = async (search: string, feederId: number | null) => {
        setIsKeypointLoading(true)
        try {
            const response = await axios.get("/api/dropdown/keypoints", {
                params: { filter: search, feeder_id: feederId },
            })

            if (response.data && Array.isArray(response.data)) {
                setKeypointsList(response.data)
            } else {
                console.warn("Unexpected response format:", response.data)
                setKeypointsList([])
            }
        } catch (error) {
            console.error("Error fetching keypoints:", error)
            setKeypointsList([])
        } finally {
            setIsKeypointLoading(false)
        }
    }

    // Helper functions to get name by ID
    const getFeederName = (id: number | null) => {
        if (id === null || id === 0) return "Select Feeder"
        const feeder = feedersList.find((f) => f.id === id)
        return feeder ? feeder.name : "Select Feeder"
    }

    const getKeypointName = (id: number | null) => {
        if (id === null || id === 0) return "Select Keypoint"
        const keypoint = keypointsList.find((k) => k.id === id)
        return keypoint ? keypoint.name : "Select Keypoint"
    }

    // Handler functions for search
    const handleOnSearchFeeder = (search: string) => {
        setFeederSearchTerm(search)
    }

    const handleOnSearchKeypoint = (search: string) => {
        setKeypointSearchTerm(search)
    }

    const handleApplyFilter = () => {
        setAppliedFeeder(tempSelectedFeeder)
        setAppliedKeypoint(tempSelectedKeypoint)
    }

    const byCode = useMemo(() => {
        const m = new Map<number, NodeItem>()
        for (const n of data ?? []) m.set(n.code, n)
        return m
    }, [data])

    const filteredNodes = useMemo(() => {
        if (!data) return []
        return data.filter((n) => {
            const typeVisible = visible[n.type]
            const feederMatch = appliedFeeder === null || n.feeder?.some(f => f.id === appliedFeeder)

            let keypointMatch = true // Assume true if no keypoint is applied

            if (appliedKeypoint !== null) {
                // Per user feedback, the keypoint ID from the dropdown is the same as the node's 'code'.
                keypointMatch = n.code === appliedKeypoint
            }

            const statusMatch =
                statusFilter === 'ALL' ||
                (statusFilter === 'Active' && n.status === 'active') ||
                (statusFilter === 'Inactive' && n.status === 'inactive');

            return typeVisible && feederMatch && keypointMatch && statusMatch
        })
    }, [data, visible, appliedFeeder, appliedKeypoint, keypointsList, statusFilter])

    const lines = useMemo(() => {
        // When a keypoint is selected, hide all lines.
        if (appliedKeypoint !== null) {
            return []
        }

        // If no data or filtered nodes, no lines.
        if (!filteredNodes) return []

        const ls: { parent: NodeItem; child: NodeItem; color: string; weight: number }[] = []

        // Create a set of codes from the filtered nodes for efficient lookup.
        const filteredNodeCodes = new Set(filteredNodes.map((n) => n.code))

        // Iterate over the currently visible (filtered) nodes.
        for (const node of filteredNodes) {
            // If a node has a parent, and that parent is also in the visible set, draw a line.
            if (node.parent !== null && filteredNodeCodes.has(node.parent)) {
                const parent = byCode.get(node.parent)
                if (parent) {
                    // Ensure parent exists in the main data map
                    const isGiRec = parent.type === "GI" && node.type === "REC"
                    const color = isGiRec ? "#ef4444" : "#10b981"
                    const weight = isGiRec ? 4 : 3
                    ls.push({ parent, child: node, color, weight })
                }
            }
        }
        return ls
    }, [byCode, filteredNodes, appliedKeypoint])

    // Effect to open popup when a keypoint is filtered
    useEffect(() => {
        if (appliedKeypoint !== null) {
            // Find the target node directly using the appliedKeypoint (which is the node's code)
            const targetNode = filteredNodes.find((n) => n.code === appliedKeypoint)

            if (targetNode) {
                const marker = markerRefs.current.get(targetNode.code)
                const map = mapRef.current

                if (marker && map) {
                    map.flyTo(targetNode.coordinate, 16, { animate: true, duration: 1 })

                    // Use a timeout to ensure the popup opens after the map pans
                    const timer = setTimeout(() => {
                        marker.openPopup()
                    }, 1000) // Adjust delay as needed

                    return () => clearTimeout(timer)
                }
            }
        }
    }, [appliedKeypoint, filteredNodes])

    if (loading) {
        return (
            <div className="flex h-[600px] items-center justify-center rounded-md border">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto" />
                    <p className="mt-2 text-muted-foreground text-sm">Memuat data peta...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-[600px] items-center justify-center rounded-md border">
                <div className="text-center">
                    <p className="text-red-600 mb-3">Gagal memuat data: {error}</p>
                    <Button onClick={refetch}>Coba lagi</Button>
                </div>
            </div>
        )
    }

    // Tentukan pusat peta awal
    const defaultCenter: [number, number] = [-1.980379, 120.512788]

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_360px]">
            <div className="relative h-[600px]">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                    <MapFilter currentFilter={statusFilter} onFilterChange={setStatusFilter} />
                </div>
                <MapContainer
                    center={defaultCenter}
                    zoom={7}
                    zoomControl={false}
                    style={{ height: "100%", width: "100%", zIndex: 1 }}
                    whenCreated={(m) => {
                        mapRef.current = m
                        setZoom(m.getZoom())
                    }}
                >
                    <MapZoomWatcher onZoom={setZoom} />

                    <TileLayer
                        attribution={
                            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        }
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ZoomControl position="bottomright" />

                    {/* Garis koneksi parent→child */}
                    {lines.map(({ parent, child, color, weight }) => (
                        <Polyline
                            key={`${parent.code}-${child.code}`}
                            positions={[parent.coordinate, child.coordinate]}
                            pathOptions={{ color, weight }}
                            eventHandlers={{
                                click: (e) => {
                                    // Zoom ke bounds, buka popup parent lalu child, dan highlight sementara
                                    const map = mapRef.current
                                    const layer = e.target as L.Polyline
                                    const old = { color, weight }
                                    if (map) {
                                        const b = layer.getBounds()
                                        map.fitBounds(b, { padding: [24, 24] })
                                    }
                                    // highlight
                                    layer.setStyle({ color: "#fde047", weight: weight + 2 })
                                    setTimeout(() => layer.setStyle(old), 1600)
                                    // buka popups
                                    const parentMarker = markerRefs.current.get(parent.code)
                                    const childMarker = markerRefs.current.get(child.code)
                                    parentMarker?.openPopup()
                                    setTimeout(() => childMarker?.openPopup(), 2000)
                                },
                            }}
                        />
                    ))}

                    {/* Marker */}
                    {filteredNodes.map((n) => (
                        <Marker
                            key={n.id}
                            position={n.coordinate}
                            icon={buildIcon(n, zoom)}
                            ref={registerMarkerRef(n.code)}
                        >
                            <Popup>
                                <Card className="border-0 shadow-none">
                                    <div className="p-1">
                                        <div className="mb-2 flex items-center justify-between">
                                            <h3 className="text-base font-bold">{n.name}</h3>
                                            <Badge
                                                variant={n.status === "active" ? "default" : "destructive"}
                                                className="ml-2"
                                            >
                                                {n.status.charAt(0).toUpperCase() + n.status.slice(1)}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Code:</span>
                                                <span className="font-medium">{n.code}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Type:</span>
                                                <span className="font-medium">{n.type}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Load IS:</span>
                                                <span className="font-medium">{n.data["load-is"]}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Load MW:</span>
                                                <span className="font-medium">{n.data["load-mw"]}</span>
                                            </div>
                                            <div className="text-muted-foreground mt-2 text-xs">
                                                Last update: {new Date(n.data.lastUpdate).toLocaleString()}
                                            </div>
                                        </div>

                                        {n.feeder && n.feeder.length > 0 && (
                                            <>
                                                <Separator className="my-2" />
                                                <div className="space-y-1 text-sm">
                                                    <div className="font-semibold">Feeder</div>
                                                    <ul className="list-disc pl-5">
                                                        {n.feeder.map((f) => (
                                                            <li key={f.id}>
                                                                <span className="font-medium">{f.name}</span> · {f["load-mw"]} · {f["load-is"]}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </Card>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Overlay jumlah marker */}
                <div className="absolute left-4 top-4 z-[1000] rounded-md bg-white px-3 py-2 shadow">
                    <p className="text-sm font-medium">{filteredNodes.length} Node terlihat</p>
                </div>
            </div>

            {/* Panel filter */}
            <aside>
                <div className="sticky top-4 rounded-md border">
                    <div className="p-4">
                        <div className="mb-1 text-base font-semibold">Panel</div>
                        <p className="text-xs text-muted-foreground mb-3">
                            Tampilkan/sembunyikan node berdasarkan tipe.
                        </p>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block size-2 rounded-full bg-green-500" />
                                    <Label htmlFor="gi">GI</Label>
                                </div>
                                <Switch
                                    id="gi"
                                    checked={visible.GI}
                                    onCheckedChange={() => setVisible((v) => ({ ...v, GI: !v.GI }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block size-2 rounded-full bg-blue-500" />
                                    <Label htmlFor="rec">REC</Label>
                                </div>
                                <Switch
                                    id="rec"
                                    checked={visible.REC}
                                    onCheckedChange={() => setVisible((v) => ({ ...v, REC: !v.REC }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block size-2 rounded-full bg-violet-500" />
                                    <Label htmlFor="lbs">LBS</Label>
                                </div>
                                <Switch
                                    id="lbs"
                                    checked={visible.LBS}
                                    onCheckedChange={() => setVisible((v) => ({ ...v, LBS: !v.LBS }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block size-2 rounded-full bg-amber-500" />
                                    <Label htmlFor="gh">GH</Label>
                                </div>
                                <Switch
                                    id="gh"
                                    checked={visible.GH}
                                    onCheckedChange={() => setVisible((v) => ({ ...v, GH: !v.GH }))}
                                />
                            </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Feeder Filter */}
                        <div className="grid gap-2 mb-4">
                            <Label htmlFor="feeder_filter">Feeder</Label>
                            <Popover open={feederOpen} onOpenChange={setFeederOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={feederOpen}
                                        className="justify-between"
                                        id="feeder_filter"
                                    >
                                        {getFeederName(tempSelectedFeeder)}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search feeder..."
                                            onValueChange={handleOnSearchFeeder}
                                        />
                                        <CommandList>
                                            {feederSearchTerm === "" ? (
                                                <div className="py-5 text-sm text-muted-foreground text-center">
                                                    Type to search...
                                                </div>
                                            ) : (
                                                <CommandEmpty>
                                                    {isFeederLoading ? (
                                                        <div className="flex items-center justify-center p-2">
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Loading...
                                                        </div>
                                                    ) : (
                                                        <div className="p-2 text-muted-foreground text-center">
                                                            No feeder found
                                                        </div>
                                                    )}
                                                </CommandEmpty>
                                            )}
                                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                                <CommandItem
                                                    value="none"
                                                    onSelect={() => {
                                                        setTempSelectedFeeder(null)
                                                        setTempSelectedKeypoint(null) // Clear keypoint selection
                                                        setFeederOpen(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            tempSelectedFeeder === null
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                        )}
                                                    />
                                                    None
                                                </CommandItem>
                                                {feedersList.map((feeder) => (
                                                    <CommandItem
                                                        key={feeder.id}
                                                        value={feeder.name}
                                                        onSelect={() => {
                                                            setTempSelectedFeeder(feeder.id)
                                                            setTempSelectedKeypoint(null) // Clear keypoint selection
                                                            setFeederOpen(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                tempSelectedFeeder === feeder.id
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {feeder.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Keypoint Filter */}
                        <div className="grid gap-2 mb-4">
                            <Label htmlFor="keypoint_filter">Keypoint</Label>
                            <Popover open={keypointOpen} onOpenChange={setKeypointOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={keypointOpen}
                                        className="justify-between"
                                        id="keypoint_filter"
                                        disabled={tempSelectedFeeder === null} // Disable if no feeder is selected
                                    >
                                        {getKeypointName(tempSelectedKeypoint)}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search keypoint..."
                                            onValueChange={handleOnSearchKeypoint}
                                            disabled={tempSelectedFeeder === null} // Disable if no feeder is selected
                                        />
                                        <CommandList>
                                            {tempSelectedFeeder === null ? (
                                                <div className="py-5 text-sm text-muted-foreground text-center">
                                                    Select a feeder first to enable keypoint search.
                                                </div>
                                            ) : keypointSearchTerm === "" ? (
                                                <div className="py-5 text-sm text-muted-foreground text-center">
                                                    Type to search...
                                                </div>
                                            ) : (
                                                <CommandEmpty>
                                                    {isKeypointLoading ? (
                                                        <div className="flex items-center justify-center p-2">
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Loading...
                                                        </div>
                                                    ) : (
                                                        <div className="p-2 text-muted-foreground text-center">
                                                            No keypoint found
                                                        </div>
                                                    )}
                                                </CommandEmpty>
                                            )}
                                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                                <CommandItem
                                                    value="none"
                                                    onSelect={() => {
                                                        setTempSelectedKeypoint(null)
                                                        setKeypointOpen(false)
                                                    }}
                                                    disabled={tempSelectedFeeder === null} // Disable if no feeder is selected
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            tempSelectedKeypoint === null
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                        )}
                                                    />
                                                    None
                                                </CommandItem>
                                                {keypointsList.map((keypoint) => (
                                                    <CommandItem
                                                        key={keypoint.id}
                                                        value={keypoint.name}
                                                        onSelect={() => {
                                                            setTempSelectedKeypoint(keypoint.id)
                                                            setKeypointOpen(false)
                                                        }}
                                                        disabled={tempSelectedFeeder === null} // Disable if no feeder is selected
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                tempSelectedKeypoint === keypoint.id
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {keypoint.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="default"
                                onClick={handleApplyFilter}
                            >
                                Search
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setVisible({ GI: true, REC: true, LBS: true, GH: true })
                                    setTempSelectedFeeder(null)
                                    setTempSelectedKeypoint(null)
                                    setAppliedFeeder(null)
                                    setAppliedKeypoint(null)
                                    setStatusFilter('ALL')
                                }}
                            >
                                Reset filter
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    )
}
