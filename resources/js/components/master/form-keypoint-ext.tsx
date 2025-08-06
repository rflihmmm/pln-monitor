import { useState, useEffect } from "react";
import axios from "axios";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { type DropdownBase } from "@/types";

interface KeypointExt {
    keypoint_id: number;
    coordinate?: string;
    alamat?: string;
    parent_stationpoints?: number;
    name?: string;
    parent_name?: string;
}

interface KeypointExtFormProps {
    keypointExt?: KeypointExt | null;
    onSubmit: (keypointExtData: any) => void;
    onCancel: () => void;
    isEdit?: boolean;
}

export default function KeypointExtForm({
    keypointExt,
    onSubmit,
    onCancel,
    isEdit = false,
}: KeypointExtFormProps) {
    // State utama untuk form
    const [keypointExtData, setKeypointExtData] = useState<Partial<KeypointExt>>({
        keypoint_id: 0,
        coordinate: "",
        alamat: "",
        parent_stationpoints: 0,
    });

    // State untuk dropdown lists
    const [keypointsList, setKeypointsList] = useState<DropdownBase[]>([]);
    const [parentStationsList, setParentStationsList] = useState<DropdownBase[]>([]);

    // State untuk combobox
    const [keypointOpen, setKeypointOpen] = useState(false);
    const [parentStationOpen, setParentStationOpen] = useState(false);

    // State untuk search terms
    const [keypointSearchTerm, setKeypointSearchTerm] = useState("");
    const [parentStationSearchTerm, setParentStationSearchTerm] = useState("");

    //State untuk validasi coordinate
    const [coordinateError, setCoordinateError] = useState<string | null>(null);

    // Debounced search terms
    const [debouncedKeypointSearch] = useDebounce(keypointSearchTerm, 500);
    const [debouncedParentStationSearch] = useDebounce(parentStationSearchTerm, 500);

    // Loading states
    const [isKeypointLoading, setIsKeypointLoading] = useState(false);
    const [isParentStationLoading, setIsParentStationLoading] = useState(false);

    // Inisialisasi data form
    useEffect(() => {
        if (keypointExt && isEdit) {
            setKeypointExtData({
                keypoint_id: keypointExt.keypoint_id,
                coordinate: keypointExt.coordinate || "",
                alamat: keypointExt.alamat || "",
                parent_stationpoints: keypointExt.parent_stationpoints || 0,
            });
        } else {
            setKeypointExtData({
                keypoint_id: 0,
                coordinate: "",
                alamat: "",
                parent_stationpoints: 0,
            });
        }
    }, [keypointExt, isEdit]);

    // Effect untuk search keypoints
    useEffect(() => {
        if (debouncedKeypointSearch.length >= 3) {
            fetchKeypoints(debouncedKeypointSearch);
        } else {
            setKeypointsList([]);
        }
    }, [debouncedKeypointSearch]);

    // Effect untuk search parent stations
    useEffect(() => {
        if (debouncedParentStationSearch.length >= 3) {
            fetchParentStations(debouncedParentStationSearch);
        } else {
            setParentStationsList([]);
        }
    }, [debouncedParentStationSearch]);

    //fungsi valisasi coordinate
    const validateCoordinate = (input: string) => {
        // Regex untuk format: -angka.desimal, spasi opsional angka.desimal
        const regex = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
        return regex.test(input);
    };

    // Helper untuk update form data
    const handleChange = (field: string, value: any) => {
        // Khusus untuk input coordinate
        if (field === 'coordinate') {
            const isValid = validateCoordinate(value);
            if (!isValid && value.length > 0) {
                setCoordinateError("Format koordinat salah. Gunakan 'latitude, longitude'.");
            } else {
                setCoordinateError(null);
            }
        }

        setKeypointExtData({ ...keypointExtData, [field]: value });
    };

    // Handler untuk submit form
    const handleSubmit = () => {
        onSubmit(keypointExtData);
    };

    // Fetch functions
    const fetchKeypoints = async (search: string) => {
        setIsKeypointLoading(true);
        try {
            const response = await axios.get(route("master.feeder.keypoint-data"), {
                params: { filter: search }
            });

            if (response.data && Array.isArray(response.data)) {
                setKeypointsList(response.data);
            } else {
                console.warn("Unexpected response format:", response.data);
                setKeypointsList([]);
            }
        } catch (error) {
            console.error("Error fetching keypoints:", error);
            setKeypointsList([]);
        } finally {
            setIsKeypointLoading(false);
        }
    };

    const fetchParentStations = async (search: string) => {
        setIsParentStationLoading(true);
        try {
            const response = await axios.get(route("master.feeder.keypoint-data"), {
                params: { filter: search }
            });

            if (response.data && Array.isArray(response.data)) {
                setParentStationsList(response.data);
            } else {
                console.warn("Unexpected response format:", response.data);
                setParentStationsList([]);
            }
        } catch (error) {
            console.error("Error fetching parent stations:", error);
            setParentStationsList([]);
        } finally {
            setIsParentStationLoading(false);
        }
    };

    // Helper functions untuk mendapatkan nama berdasarkan ID
    const getKeypointName = (id: number) => {
        if (id === 0) return "Select Keypoint";
        const keypoint = keypointsList.find((k) => k.id === id);
        return keypoint ? keypoint.name : keypointExt?.name || "Select Keypoint";
    };

    const getParentStationName = (id: number) => {
        if (id === 0) return "Select Line Station";
        const parent = parentStationsList.find((p) => p.id === id);
        return parent ? parent.name : keypointExt?.parent_name || "Select Line Station";
    };

    // Handler functions untuk search
    const handleOnSearchKeypoint = (search: string) => {
        setKeypointSearchTerm(search);
    };

    const handleOnSearchParentStation = (search: string) => {
        setParentStationSearchTerm(search);
    };

    return (
        <div className="grid gap-4 py-4">
            {/* Keypoint ID */}
            <div className="grid gap-2">
                <Label htmlFor="keypoint_id">Keypoint</Label>
                <Popover open={keypointOpen} onOpenChange={setKeypointOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={keypointOpen}
                            className="justify-between"
                            id="keypoint_id"
                        >
                            {getKeypointName(keypointExtData.keypoint_id || 0)}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput
                                placeholder="Search keypoint..."
                                onValueChange={handleOnSearchKeypoint}
                            />
                            <CommandList>
                                {keypointSearchTerm === "" ? (
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
                                    {keypointsList.map((keypoint) => (
                                        <CommandItem
                                            key={keypoint.id}
                                            value={keypoint.name}
                                            onSelect={() => {
                                                handleChange("keypoint_id", keypoint.id);
                                                setKeypointOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    keypointExtData.keypoint_id === keypoint.id
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

            {/* Coordinate */}
            <div className="grid gap-2">
                <Label htmlFor="coordinate">Coordinate</Label>
                <Input
                    id="coordinate"
                    value={keypointExtData.coordinate || ""}
                    onChange={(e) => handleChange("coordinate", e.target.value)}
                    placeholder="e.g., -6.2088, 106.8456"
                    className={coordinateError ? "border-red-500" : ""}
                />
                {coordinateError && (
                    <p className="text-sm text-red-500 mt-1">{coordinateError}</p>
                )}
            </div>

            {/* Alamat */}
            <div className="grid gap-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Textarea
                    id="alamat"
                    value={keypointExtData.alamat || ""}
                    onChange={(e) => handleChange("alamat", e.target.value)}
                    placeholder="Enter address..."
                    rows={3}
                />
            </div>

            {/* Parent Station Points */}
            <div className="grid gap-2">
                <Label htmlFor="parent_stationpoints">Line Station</Label>
                <Popover open={parentStationOpen} onOpenChange={setParentStationOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={parentStationOpen}
                            className="justify-between"
                            id="parent_stationpoints"
                        >
                            {getParentStationName(keypointExtData.parent_stationpoints || 0)}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput
                                placeholder="Search line station..."
                                onValueChange={handleOnSearchParentStation}
                            />
                            <CommandList>
                                {parentStationSearchTerm === "" ? (
                                    <div className="py-5 text-sm text-muted-foreground text-center">
                                        Type to search...
                                    </div>
                                ) : (
                                    <CommandEmpty>
                                        {isParentStationLoading ? (
                                            <div className="flex items-center justify-center p-2">
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Loading...
                                            </div>
                                        ) : (
                                            <div className="p-2 text-muted-foreground text-center">
                                                No line station found
                                            </div>
                                        )}
                                    </CommandEmpty>
                                )}
                                <CommandGroup className="max-h-[200px] overflow-y-auto">
                                    <CommandItem
                                        value="none"
                                        onSelect={() => {
                                            handleChange("parent_stationpoints", 0);
                                            setParentStationOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                keypointExtData.parent_stationpoints === 0
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        None
                                    </CommandItem>
                                    {parentStationsList.map((parent) => (
                                        <CommandItem
                                            key={parent.id}
                                            value={parent.name}
                                            onSelect={() => {
                                                handleChange("parent_stationpoints", parent.id);
                                                setParentStationOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    keypointExtData.parent_stationpoints === parent.id
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            {parent.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Tombol Cancel & Submit */}
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit}>
                    {isEdit ? "Save Changes" : "Add Keypoint Ext"}
                </Button>
            </DialogFooter>
        </div>
    );
}