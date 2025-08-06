import { router } from "@inertiajs/react"
import { ChevronDown, ChevronRight, Users, Package, DollarSign, Building, UserCheck, Zap, MapPin, Edit, MoreHorizontal, Plus, Search, Trash } from 'lucide-react'
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MappingDialog from "@/components/master/dialog-mapping"
import { type Keypoint, Mapping } from "@/types"

// Data type for mapping based on your structure
type MappingData = {
    id: number
    keypoint: string
    feeder: string | null
    gardu_induk: string | null
    ulp: string
    up3: string
    dcc: string
    parent_keypoint: string | null
    coordinate: string | null
}

interface TableMappingProps {
    datas: MappingData[]
    keypointsList: Keypoint[]
}

// 3-level nested grouping structure: DCC -> UP3 -> ULP
type TripleNestedGroupedData = {
    [dcc: string]: {
        [up3: string]: {
            [ulp: string]: MappingData[]
        }
    }
}

export default function TableMapping({ datas, keypointsList }: TableMappingProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [expandedDCC, setExpandedDCC] = useState<Set<string>>(new Set())
    const [expandedUP3, setExpandedUP3] = useState<Set<string>>(new Set())
    const [expandedULP, setExpandedULP] = useState<Set<string>>(new Set())
    const [isAddMappingOpen, setIsAddMappingOpen] = useState(false)
    const [isEditMappingOpen, setIsEditMappingOpen] = useState(false)
    const [editingMapping, setEditingMapping] = useState<Mapping | null>(null)

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm) return datas

        return datas.filter((item) => {
            return (
                item.keypoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.ulp.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.up3.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.dcc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.feeder && item.feeder.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.gardu_induk && item.gardu_induk.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        })
    }, [datas, searchTerm])

    // Create 3-level nested grouped data: DCC -> UP3 -> ULP
    const tripleNestedGroupedData = useMemo(() => {
        return filteredData.reduce((groups: TripleNestedGroupedData, item) => {
            const dcc = item.dcc || "TIDAK DIKETAHUI"
            const up3 = item.up3 || "TIDAK DIKETAHUI"
            const ulp = item.ulp || "TIDAK DIKETAHUI"

            if (!groups[dcc]) {
                groups[dcc] = {}
            }
            if (!groups[dcc][up3]) {
                groups[dcc][up3] = {}
            }
            if (!groups[dcc][up3][ulp]) {
                groups[dcc][up3][ulp] = []
            }
            groups[dcc][up3][ulp].push(item)
            return groups
        }, {})
    }, [filteredData])

    const toggleDCC = (dcc: string) => {
        const newExpanded = new Set(expandedDCC)
        if (newExpanded.has(dcc)) {
            newExpanded.delete(dcc)
            // Collapse all UP3 and ULP under this DCC
            const up3KeysToRemove = Array.from(expandedUP3).filter((key) => key.startsWith(`${dcc}-`))
            const ulpKeysToRemove = Array.from(expandedULP).filter((key) => key.startsWith(`${dcc}-`))
            up3KeysToRemove.forEach((key) => expandedUP3.delete(key))
            ulpKeysToRemove.forEach((key) => expandedULP.delete(key))
            setExpandedUP3(new Set(expandedUP3))
            setExpandedULP(new Set(expandedULP))
        } else {
            newExpanded.add(dcc)
        }
        setExpandedDCC(newExpanded)
    }

    const toggleUP3 = (dcc: string, up3: string) => {
        const groupKey = `${dcc}-${up3}`
        const newExpanded = new Set(expandedUP3)
        if (newExpanded.has(groupKey)) {
            newExpanded.delete(groupKey)
            // Collapse all ULP under this UP3
            const ulpKeysToRemove = Array.from(expandedULP).filter((key) => key.startsWith(`${groupKey}-`))
            ulpKeysToRemove.forEach((key) => expandedULP.delete(key))
            setExpandedULP(new Set(expandedULP))
        } else {
            newExpanded.add(groupKey)
        }
        setExpandedUP3(newExpanded)
    }

    const toggleULP = (dcc: string, up3: string, ulp: string) => {
        const groupKey = `${dcc}-${up3}-${ulp}`
        const newExpanded = new Set(expandedULP)
        if (newExpanded.has(groupKey)) {
            newExpanded.delete(groupKey)
        } else {
            newExpanded.add(groupKey)
        }
        setExpandedULP(newExpanded)
    }

    const getTotalInDCC = (dcc: string) => {
        return Object.values(tripleNestedGroupedData[dcc] || {}).reduce(
            (total, up3Data) => total + Object.values(up3Data).reduce(
                (up3Total, ulpData) => up3Total + ulpData.length, 0
            ), 0
        )
    }

    const getTotalInUP3 = (dcc: string, up3: string) => {
        return Object.values(tripleNestedGroupedData[dcc]?.[up3] || {}).reduce(
            (total, ulpData) => total + ulpData.length, 0
        )
    }

    const getKeypointTypeIcon = (keypoint: string) => {
        if (keypoint.includes("REC-") || keypoint.includes("rec-")) {
            return <Zap className="w-3 h-3 text-blue-500" />
        } else if (keypoint.includes("LBS-") || keypoint.includes("lbs-")) {
            return <Package className="w-3 h-3 text-green-500" />
        } else if (keypoint.includes("GI-") || keypoint.includes("gi-")) {
            return <Building className="w-3 h-3 text-purple-500" />
        } else if (keypoint.includes("GH-") || keypoint.includes("gh-")) {
            return <UserCheck className="w-3 h-3 text-orange-500" />
        }
        return <MapPin className="w-3 h-3 text-gray-500" />
    }

    const getKeypointTypeBadge = (keypoint: string) => {
        if (keypoint.includes("REC-") || keypoint.includes("rec-")) {
            return <Badge variant="default" className="text-xs bg-blue-500">REC</Badge>
        } else if (keypoint.includes("LBS-") || keypoint.includes("lbs-")) {
            return <Badge variant="secondary" className="text-xs bg-green-500 text-white">LBS</Badge>
        } else if (keypoint.includes("GI-") || keypoint.includes("gi-")) {
            return <Badge variant="outline" className="text-xs border-purple-500 text-purple-500">GI</Badge>
        } else if (keypoint.includes("GH-") || keypoint.includes("gh-")) {
            return <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">GH</Badge>
        }
        return <Badge variant="outline" className="text-xs">OTHER</Badge>
    }

    // Handle adding a new mapping
    const handleAddMapping = (mappingData: any) => {
        const submitData = {
            keypoints: mappingData.keypoints,
            ulp: mappingData.ulp,
        }
        router.post(route("master.mapping.store"), submitData, {
            onSuccess: () => setIsAddMappingOpen(false),
            onError: (errors) => alert("Error: " + JSON.stringify(errors)),
        })
    }

    // Open edit dialog for a mapping
    const openEditDialog = (mapping: MappingData) => {
        setEditingMapping({ ...mapping } as Mapping)
        setIsEditMappingOpen(true)
    }

    // Handle editing a mapping
    const handleEditMapping = (mappingData: any) => {
        if (!editingMapping) return

        const submitData = {
            keypoint: mappingData.keypoints?.[0] ?? mappingData.keypoint,
            ulp: mappingData.ulp,
        }

        router.put(route("master.mapping.update", editingMapping.id), submitData, {
            onSuccess: () => {
                setIsEditMappingOpen(false)
                setEditingMapping(null)
            },
            onError: (errors) => alert("Error: " + JSON.stringify(errors)),
        })
    }

    // Handle deleting a mapping
    const handleDeleteMapping = (mappingId: number) => {
        if (confirm("Are you sure you want to delete this mapping?")) {
            router.delete(route("master.mapping.destroy", mappingId))
        }
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
            <Card>

                <CardContent>
                    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
                        <div className="relative w-full sm:w-64">
                            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                            <Input
                                type="search"
                                placeholder="Search mappings..."
                                className="w-full pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button className="flex items-center gap-1" onClick={() => setIsAddMappingOpen(true)}>
                            <Plus className="h-4 w-4" />
                            Add Mapping
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]"></TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Keypoint</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Gardu Induk</TableHead>
                                    <TableHead>Feeder</TableHead>
                                    <TableHead>Line Station </TableHead>
                                    <TableHead>Coordinate</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.keys(tripleNestedGroupedData).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                                            No mappings found matching your search
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    Object.entries(tripleNestedGroupedData).flatMap(([dcc, up3Data]) => {
                                        const rows = []

                                        // DCC Header Row (Level 1)
                                        rows.push(
                                            <TableRow
                                                key={`dcc-${dcc}`}
                                                className="bg-primary/15 hover:bg-primary/25 border-l-4 border-l-primary"
                                            >
                                                <TableCell colSpan={9} className="font-bold">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-auto p-1 hover:bg-transparent"
                                                        onClick={() => toggleDCC(dcc)}
                                                    >
                                                        {expandedDCC.has(dcc) ? (
                                                            <ChevronDown className="w-5 h-5 mr-2" />
                                                        ) : (
                                                            <ChevronRight className="w-5 h-5 mr-2" />
                                                        )}
                                                        <div className="flex items-center gap-3">
                                                            <Building className="w-5 h-5 text-primary" />
                                                            <span className="text-lg font-bold">{dcc}</span>
                                                            <Badge variant="default" className="ml-2">
                                                                {getTotalInDCC(dcc)} keypoints
                                                            </Badge>
                                                        </div>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )

                                        // UP3 and ULP Groups
                                        if (expandedDCC.has(dcc)) {
                                            Object.entries(up3Data).forEach(([up3, ulpData]) => {
                                                // UP3 Header Row (Level 2)
                                                rows.push(
                                                    <TableRow
                                                        key={`up3-${dcc}-${up3}`}
                                                        className="bg-secondary/50 hover:bg-secondary/70 border-l-4 border-l-secondary"
                                                    >
                                                        <TableCell colSpan={9} className="font-semibold pl-8">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-auto p-1 hover:bg-transparent"
                                                                onClick={() => toggleUP3(dcc, up3)}
                                                            >
                                                                {expandedUP3.has(`${dcc}-${up3}`) ? (
                                                                    <ChevronDown className="w-4 h-4 mr-2" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 mr-2" />
                                                                )}
                                                                <div className="flex items-center gap-2">
                                                                    <Users className="w-4 h-4 text-secondary-foreground" />
                                                                    <span className="font-semibold">{up3}</span>
                                                                    <Badge variant="secondary" className="ml-2">
                                                                        {getTotalInUP3(dcc, up3)} keypoints
                                                                    </Badge>
                                                                </div>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )

                                                // ULP Groups
                                                if (expandedUP3.has(`${dcc}-${up3}`)) {
                                                    Object.entries(ulpData).forEach(([ulp, mappings]) => {
                                                        // ULP Header Row (Level 3)
                                                        rows.push(
                                                            <TableRow
                                                                key={`ulp-${dcc}-${up3}-${ulp}`}
                                                                className="bg-muted/50 hover:bg-muted/70 border-l-4 border-l-muted"
                                                            >
                                                                <TableCell colSpan={9} className="font-medium pl-16">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-auto p-1 hover:bg-transparent"
                                                                        onClick={() => toggleULP(dcc, up3, ulp)}
                                                                    >
                                                                        {expandedULP.has(`${dcc}-${up3}-${ulp}`) ? (
                                                                            <ChevronDown className="w-4 h-4 mr-2" />
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4 mr-2" />
                                                                        )}
                                                                        <div className="flex items-center gap-2">
                                                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                                                            <span className="font-semibold">{ulp}</span>
                                                                            <Badge variant="outline" className="ml-2">
                                                                                {mappings.length} {mappings.length === 1 ? "keypoint" : "keypoints"}
                                                                            </Badge>
                                                                        </div>
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        )

                                                        // Mapping Data Rows (Level 4)
                                                        if (expandedULP.has(`${dcc}-${up3}-${ulp}`)) {
                                                            mappings.forEach((mapping) => {
                                                                rows.push(
                                                                    <TableRow key={`mapping-${mapping.id}`} className="border-l-4 border-l-muted/30">
                                                                        <TableCell className="w-[100px] pl-20">
                                                                            <div className="flex items-center gap-1">
                                                                                {getKeypointTypeIcon(mapping.keypoint)}
                                                                                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="font-mono text-sm">{mapping.id}</TableCell>
                                                                        <TableCell className="font-medium">{mapping.keypoint}</TableCell>
                                                                        <TableCell>{getKeypointTypeBadge(mapping.keypoint)}</TableCell>
                                                                        <TableCell className="text-sm">
                                                                            {mapping.gardu_induk || <span className="text-muted-foreground">-</span>}
                                                                        </TableCell>
                                                                        <TableCell className="text-sm">
                                                                            {mapping.feeder || <span className="text-muted-foreground">-</span>}
                                                                        </TableCell>
                                                                        <TableCell className="text-sm">
                                                                            {mapping.parent_keypoint || <span className="text-muted-foreground">-</span>}
                                                                        </TableCell>
                                                                        <TableCell className="text-sm font-mono">
                                                                            {mapping.coordinate || <span className="text-muted-foreground">-</span>}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                                        <span className="sr-only">Open menu</span>
                                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                                    <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(mapping)}>
                                                                                        <Edit className="mr-2 h-4 w-4" />
                                                                                        Edit Mapping
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuSeparator />
                                                                                    <DropdownMenuItem
                                                                                        className="text-destructive focus:text-destructive cursor-pointer"
                                                                                        onClick={() => handleDeleteMapping(mapping.id)}
                                                                                    >
                                                                                        <Trash className="mr-2 h-4 w-4" />
                                                                                        Delete Mapping
                                                                                    </DropdownMenuItem>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            })
                                                        }
                                                    })
                                                }
                                            })
                                        }

                                        return rows
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>


                </CardContent>
            </Card>

            {/* Add Mapping Dialog */}
            <MappingDialog
                isOpen={isAddMappingOpen}
                onOpenChange={setIsAddMappingOpen}
                onSubmit={handleAddMapping}
                keypointsList={keypointsList}
                isEdit={false}
            />

            {/* Edit Mapping Dialog */}
            <MappingDialog
                isOpen={isEditMappingOpen}
                onOpenChange={setIsEditMappingOpen}
                onSubmit={handleEditMapping}
                mapping={editingMapping}
                keypointsList={keypointsList}
                isEdit={true}
            />
        </div>
    )
}