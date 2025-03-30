
import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

// Define types for our data
type StatusType = "ON" | "OFF" | "RESET"
type IndicatorType = "R" | "G" | "M"

interface KeypointData {
    id: string
    garduInduk: string
    feeder: string
    pmt1: { color: string; indicators: IndicatorType[] }
    amp: number
    mw: number
    keypoint: string
    pmt2: { color: string; indicators: IndicatorType[] }
    hotlineTag: StatusType | null
    res: StatusType | null
    ir: number
    is: number
    it: number
    ifR: number
    ifS: number
    ifT: number
    ifN: number
    kvAB: number
    kvBC: number
    kvAC: number
    cosP: number
}

// Update the generateInitialData function to reflect the correct relationships
const generateInitialData = (): KeypointData[] => {
    return [
        {
            id: "1",
            garduInduk: "PARE",
            feeder: "BOJO",
            pmt1: { color: "fuchsia", indicators: ["R", "M"] },
            amp: 165.87,
            mw: 8.3,
            keypoint: "LBS.TMP PARE",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "ON",
            res: null,
            ir: 40.8,
            is: 38.7,
            it: 49.8,
            ifR: 0.0,
            ifS: 0.0,
            ifT: 0.0,
            ifN: 0.0,
            kvAB: 0.0,
            kvBC: 0.0,
            kvAC: 0.0,
            cosP: 0.0,
        },
        {
            id: "2",
            garduInduk: "PARE",
            feeder: "BOJO",
            pmt1: { color: "", indicators: [] },
            amp: 0,
            mw: 0,
            keypoint: "REC.BOJO",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "OFF",
            res: null,
            ir: 44.0,
            is: 40.0,
            it: 43.0,
            ifR: 0.0,
            ifS: 0.0,
            ifT: 0.0,
            ifN: 0.0,
            kvAB: 20.47,
            kvBC: 20.75,
            kvAC: 20.2,
            cosP: 0.0,
        },
        {
            id: "3",
            garduInduk: "PARE",
            feeder: "BOJO",
            pmt1: { color: "", indicators: [] },
            amp: 0,
            mw: 0,
            keypoint: "LBS KUPA",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "OFF",
            res: null,
            ir: 21.0,
            is: 16.0,
            it: 21.0,
            ifR: 0.0,
            ifS: 0.0,
            ifT: 0.0,
            ifN: 0.0,
            kvAB: 20.65,
            kvBC: 20.35,
            kvAC: 20.27,
            cosP: 0.0,
        },
        {
            id: "4",
            garduInduk: "PARE",
            feeder: "BOJO",
            pmt1: { color: "", indicators: [] },
            amp: 0,
            mw: 0,
            keypoint: "REC TMP SUMPANG",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "OFF",
            res: "RESET",
            ir: 89.0,
            is: 88.0,
            it: 88.0,
            ifR: 0.0,
            ifS: 0.0,
            ifT: 0.0,
            ifN: 0.0,
            kvAB: 12.52,
            kvBC: 12.68,
            kvAC: 12.58,
            cosP: 0.0,
        },
        {
            id: "5",
            garduInduk: "PARE",
            feeder: "CAPAGALUNG",
            pmt1: { color: "green", indicators: ["R"] },
            amp: 33.7,
            mw: 1.64,
            keypoint: "LBS.GARDU 10",
            pmt2: { color: "fuchsia", indicators: ["R"] },
            hotlineTag: null,
            res: null,
            ir: 0.0,
            is: 0.0,
            it: 0.0,
            ifR: 0.0,
            ifS: 0.0,
            ifT: 0.0,
            ifN: 0.0,
            kvAB: 0.0,
            kvBC: 0.0,
            kvAC: 0.0,
            cosP: 0.0,
        },
        {
            id: "6",
            garduInduk: "PARE",
            feeder: "CAPAGALUNG",
            pmt1: { color: "", indicators: [] },
            amp: 0,
            mw: 0,
            keypoint: "REC BATRA",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "OFF",
            res: "RESET",
            ir: 26.0,
            is: 28.0,
            it: 27.0,
            ifR: 0.0,
            ifS: 0.0,
            ifT: 0.0,
            ifN: 0.0,
            kvAB: 12.87,
            kvBC: 13.09,
            kvAC: 13.0,
            cosP: 0.0,
        },
        {
            id: "7",
            garduInduk: "PARE",
            feeder: "CAPAGALUNG",
            pmt1: { color: "", indicators: [] },
            amp: 0,
            mw: 0,
            keypoint: "REC ANDI MAKKASAU",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "OFF",
            res: "RESET",
            ir: 62.0,
            is: 67.0,
            it: 64.0,
            ifR: 0.0,
            ifS: 0.0,
            ifT: 0.0,
            ifN: 0.0,
            kvAB: 13.03,
            kvBC: 13.1,
            kvAC: 13.05,
            cosP: 0.0,
        },
        {
            id: "8",
            garduInduk: "PARE",
            feeder: "LAPPADE",
            pmt1: { color: "green", indicators: ["R"] },
            amp: 107.0,
            mw: -2.6,
            keypoint: "REC.RM_3",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "OFF",
            res: null,
            ir: 88.0,
            is: 89.0,
            it: 89.0,
            ifR: 0.0,
            ifS: 1.0,
            ifT: 0.0,
            ifN: 12217.0,
            kvAB: 21.31,
            kvBC: 21.25,
            kvAC: 21.23,
            cosP: 0.9,
        },
        {
            id: "9",
            garduInduk: "PARE",
            feeder: "LAPPADE",
            pmt1: { color: "", indicators: [] },
            amp: 0,
            mw: 0,
            keypoint: "LBS RM_7",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "OFF",
            res: null,
            ir: 0.0,
            is: 0.0,
            it: 0.0,
            ifR: 14.5,
            ifS: 24.5,
            ifT: 28.7,
            ifN: 0.0,
            kvAB: 0.0,
            kvBC: 0.0,
            kvAC: 0.0,
            cosP: 0.0,
        },
        {
            id: "10",
            garduInduk: "PARE",
            feeder: "LAPPADE",
            pmt1: { color: "", indicators: [] },
            amp: 0,
            mw: 0,
            keypoint: "LBS JAWIJAWI",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "OFF",
            res: null,
            ir: 0.0,
            is: 0.0,
            it: 0.0,
            ifR: 20814.0,
            ifS: 674.0,
            ifT: 0.0,
            ifN: 0.0,
            kvAB: 1.14,
            kvBC: 20.33,
            kvAC: 21.06,
            cosP: 0.0,
        },
        {
            id: "11",
            garduInduk: "PARE",
            feeder: "LAPPADE",
            pmt1: { color: "", indicators: [] },
            amp: 0,
            mw: 0,
            keypoint: "LBS SEKTUR",
            pmt2: { color: "green", indicators: ["R"] },
            hotlineTag: "OFF",
            res: "RESET",
            ir: 17.0,
            is: 16.1,
            it: 17.7,
            ifR: 0.0,
            ifS: 0.0,
            ifT: 0.0,
            ifN: 0.0,
            kvAB: 20.86,
            kvBC: 20.62,
            kvAC: 21.05,
            cosP: 0.0,
        },
    ]
}

export default function TableHMI() {
    const [data, setData] = useState<KeypointData[]>(generateInitialData())
    const [filteredData, setFilteredData] = useState<KeypointData[]>(data)
    const [searchTerm, setSearchTerm] = useState("")
    const [isUpdating, setIsUpdating] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(new Date())


    // Function to update data randomly to simulate real-time updates
    const updateDataRandomly = useCallback(() => {
        setData((prevData) =>
            prevData.map((item) => ({
                ...item,
                amp: Number.parseFloat((item.amp + (Math.random() * 0.4 - 0.2)).toFixed(2)),
                mw: Number.parseFloat((item.mw + (Math.random() * 0.2 - 0.1)).toFixed(2)),
                ir: Number.parseFloat((item.ir + (Math.random() * 0.5 - 0.25)).toFixed(2)),
                is: Number.parseFloat((item.is + (Math.random() * 0.5 - 0.25)).toFixed(2)),
                it: Number.parseFloat((item.it + (Math.random() * 0.5 - 0.25)).toFixed(2)),
                kvAB: item.kvAB > 0 ? Number.parseFloat((item.kvAB + (Math.random() * 0.1 - 0.05)).toFixed(2)) : item.kvAB,
                kvBC: item.kvBC > 0 ? Number.parseFloat((item.kvBC + (Math.random() * 0.1 - 0.05)).toFixed(2)) : item.kvBC,
                kvAC: item.kvAC > 0 ? Number.parseFloat((item.kvAC + (Math.random() * 0.1 - 0.05)).toFixed(2)) : item.kvAC,
            })),
        )
        setLastUpdated(new Date())
        setIsUpdating(false)
    }, [])

    // Filter data based on search term
    useEffect(() => {
        const filtered = data.filter(
            (item) =>
                item.keypoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.garduInduk.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.feeder.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        setFilteredData(filtered)
    }, [searchTerm, data])

    // Set up real-time data updates
    useEffect(() => {
        const interval = setInterval(() => {
            setIsUpdating(true)
            setTimeout(updateDataRandomly, 500) // Add a small delay to show the updating indicator
        }, 5000) // Update every 5 seconds

        return () => clearInterval(interval)
    }, [updateDataRandomly])

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
    }

    // Force a manual update
    const handleManualUpdate = () => {
        setIsUpdating(true)
        setTimeout(updateDataRandomly, 500)
    }

    // Helper function to calculate rowspan for cells that should be merged
    const calculateRowSpan = (data: KeypointData[], rowIndex: number, field: keyof KeypointData): number | undefined => {
        if (rowIndex === 0 || data[rowIndex][field] !== data[rowIndex - 1][field]) {
            // Count how many consecutive rows have the same value
            let span = 1
            while (rowIndex + span < data.length && data[rowIndex + span][field] === data[rowIndex][field]) {
                span++
            }
            return span
        }
        return undefined // Return undefined for cells that should not be rendered
    }

    // Helper function to determine if a cell should be rendered
    const shouldRenderCell = (data: KeypointData[], rowIndex: number, field: keyof KeypointData): boolean => {
        return rowIndex === 0 || data[rowIndex][field] !== data[rowIndex - 1][field]
    }

    return (

        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            {/* Search and Controls */}
            <Card className="p-4 bg-muted/20 border-b">
                <CardContent className=" flex flex-wrap items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by keypoint, gardu induk, or feeder..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">Last updated: {lastUpdated.toLocaleTimeString()}</div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManualUpdate}
                            disabled={isUpdating}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={cn("h-4 w-4", isUpdating && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table Container with horizontal scroll */}
            <Card className="overflow-x-auto bg-background">
                <CardContent className="min-w-max">
                    <Table className="border-collapse w-full">
                        <TableHeader>
                            <TableRow>
                                {[
                                    "GARDU INDUK",
                                    "FEEDER",
                                    "PMT",
                                    "AMP",
                                    "MW",
                                    "KEYPOINT",
                                    "PMT",
                                    "HOTLINE TAG",
                                    "RES.",
                                    "IR",
                                    "IS",
                                    "IT",
                                    "IF-R",
                                    "IF-S",
                                    "IF-T",
                                    "IF-N",
                                    "KV-AB",
                                    "KV BC",
                                    "KV AC",
                                    "COS Φ",
                                ].map((header, index) => (
                                    <TableHead key={index} className="bg-muted/50 font-bold text-center border">
                                        {header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((row, rowIndex) => (
                                <TableRow key={row.id} className={rowIndex % 2 === 0 ? "bg-muted/10" : ""}>
                                    {/* GARDU INDUK - Merged cells */}
                                    {shouldRenderCell(filteredData, rowIndex, "garduInduk") && (
                                        <TableCell
                                            className="border font-medium text-center align-middle"
                                            rowSpan={calculateRowSpan(filteredData, rowIndex, "garduInduk")}
                                        >
                                            {row.garduInduk}
                                        </TableCell>
                                    )}

                                    {/* FEEDER - Merged cells */}
                                    {shouldRenderCell(filteredData, rowIndex, "feeder") && (
                                        <TableCell
                                            className="border font-medium text-center align-middle"
                                            rowSpan={calculateRowSpan(filteredData, rowIndex, "feeder")}
                                        >
                                            {row.feeder}
                                        </TableCell>
                                    )}

                                    <TableCell className="border text-center">
                                        {row.pmt1.color && (
                                            <div className="flex justify-center items-center">
                                                {row.pmt1.indicators.includes("R") && (
                                                    <>
                                                        <div className={`w-4 h-4 bg-${row.pmt1.color}-600 mr-1 rounded-sm`}></div>
                                                        <span className="text-red-500 mr-1">R</span>
                                                    </>
                                                )}
                                                {row.pmt1.indicators.includes("M") && (
                                                    <>
                                                        <div className={`w-4 h-4 bg-${row.pmt1.color}-600 ml-1 rounded-sm`}></div>
                                                        <span className="text-yellow-500 ml-1">M</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="border text-center">{row.amp.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.mw.toFixed(2)}</TableCell>
                                    <TableCell className="border font-medium">{row.keypoint}</TableCell>
                                    <TableCell className="border text-center">
                                        {row.pmt2.color && (
                                            <div className="flex justify-center items-center">
                                                <div className={`w-4 h-4 bg-${row.pmt2.color}-600 mr-1 rounded-sm`}></div>
                                                <span className="text-red-500">R</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="border text-center">
                                        {row.hotlineTag === "ON" && <Badge variant="destructive">ON</Badge>}
                                        {row.hotlineTag === "OFF" && (
                                            <Badge variant="outline" className="bg-green-100 text-green-800">
                                                OFF
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="border text-center">
                                        {row.res === "RESET" && (
                                            <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                                RESET
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="border text-center">{row.ir.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.is.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.it.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.ifR.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.ifS.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.ifT.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.ifN.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.kvAB.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.kvBC.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.kvAC.toFixed(2)}</TableCell>
                                    <TableCell className="border text-center">{row.cosP.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                            {filteredData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={20} className="text-center py-8">
                                        No results found for "{searchTerm}"
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div >
    )
}


