import { useState, useEffect } from "react";
import axios from "axios";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type DropdownBase, Keypoint, Mapping } from "@/types";

interface MappingFormProps {
    mapping?: Mapping | null;
    keypointsList: Keypoint[];
    onSubmit: (mappingData: any) => void;
    onCancel: () => void;
    isEdit?: boolean;
}

export default function MappingForm({
    mapping,
    keypointsList: initialKeypointsList,
    onSubmit,
    onCancel,
    isEdit = false,
}: MappingFormProps) {
    // State utama untuk form
    const [mappingData, setMappingData] = useState<Partial<Mapping>>({
        keypoint: "",
        dcc: "",
        up3: "",
        ulp: "",
        coordinate: "",
    });

    // State combobox Keypoints
    const [keypointsOpen, setKeypointsOpen] = useState(false);
    const [keypointsList, setKeypointsList] = useState<DropdownBase[]>([]);
    const [selectedKeypointName, setSelectedKeypointName] = useState<string>("");

    // State combobox DCC
    const [dccOpen, setDccOpen] = useState(false);
    const [dccList, setDccList] = useState<DropdownBase[]>([]);
    const [selectedDccName, setSelectedDccName] = useState<string>("");

    // State combobox UP3
    const [up3Open, setUp3Open] = useState(false);
    const [up3List, setUp3List] = useState<DropdownBase[]>([]);
    const [selectedUp3Name, setSelectedUp3Name] = useState<string>("");

    // State combobox ULP
    const [ulpOpen, setUlpOpen] = useState(false);
    const [ulpList, setUlpList] = useState<DropdownBase[]>([]);
    const [selectedUlpName, setSelectedUlpName] = useState<string>("");

    // Search terms state
    const [keypointSearchTerm, setKeypointSearchTerm] = useState("");
    const [dccSearchTerm, setDccSearchTerm] = useState("");
    const [up3SearchTerm, setUp3SearchTerm] = useState("");
    const [ulpSearchTerm, setUlpSearchTerm] = useState("");

    // Debounced search terms (500ms delay)
    const [debouncedKeypointSearch] = useDebounce(keypointSearchTerm, 500);
    const [debouncedDccSearch] = useDebounce(dccSearchTerm, 500);
    const [debouncedUp3Search] = useDebounce(up3SearchTerm, 500);
    const [debouncedUlpSearch] = useDebounce(ulpSearchTerm, 500);

    // Inisialisasi data form
    useEffect(() => {
        if (mapping && isEdit) {
            setMappingData({
                keypoint: mapping.keypoint,
                dcc: mapping.dcc || "",
                up3: mapping.up3 || "",
                ulp: mapping.ulp || "",
                coordinate: mapping.coordinate || "",
            });
            setSelectedKeypointName(mapping.keypoint || "");
            setSelectedDccName(mapping.dcc || "");
            setSelectedUp3Name(mapping.up3 || "");
            setSelectedUlpName(mapping.ulp || "");
        } else {
            setMappingData({
                keypoint: "",
                dcc: "",
                up3: "",
                ulp: "",
                coordinate: "",
            });
            setSelectedKeypointName("");
            setSelectedDccName("");
            setSelectedUp3Name("");
            setSelectedUlpName("");
        }
    }, [mapping, isEdit]);

    // Effect untuk search keypoints dengan debounce
    useEffect(() => {
        if (debouncedKeypointSearch.length >= 3) {
            fetchKeypoints(debouncedKeypointSearch);
        } else {
            setKeypointsList([]);
        }
    }, [debouncedKeypointSearch]);

    // Effect untuk search DCC dengan debounce
    useEffect(() => {
        if (debouncedDccSearch.length >= 3) {
            fetchDcc(debouncedDccSearch);
        } else {
            setDccList([]);
        }
    }, [debouncedDccSearch]);

    // Effect untuk search UP3 dengan debounce
    useEffect(() => {
        if (debouncedUp3Search.length >= 3) {
            fetchUp3(debouncedUp3Search);
        } else {
            setUp3List([]);
        }
    }, [debouncedUp3Search]);

    // Effect untuk search ULP dengan debounce
    useEffect(() => {
        if (debouncedUlpSearch.length >= 3) {
            fetchUlp(debouncedUlpSearch);
        } else {
            setUlpList([]);
        }
    }, [debouncedUlpSearch]);

    // Helpers untuk set state form
    const handleChange = (field: string, value: string) => {
        setMappingData({ ...mappingData, [field]: value });
    };

    const handleKeypointSelect = (keypoint: DropdownBase) => {
        setMappingData({ ...mappingData, keypoint: keypoint.id }); // id harus integer
        setSelectedKeypointName(keypoint.name);
        setKeypointsOpen(false);
    };

    const handleDccSelect = (dcc: DropdownBase) => {
        setMappingData({ ...mappingData, dcc: dcc.name });
        setSelectedDccName(dcc.name);
        setDccOpen(false);
    };

    const handleUp3Select = (up3: DropdownBase) => {
        setMappingData({ ...mappingData, up3: up3.name });
        setSelectedUp3Name(up3.name);
        setUp3Open(false);
    };

    const handleUlpSelect = (ulp: DropdownBase) => {
        setMappingData({ ...mappingData, ulp: ulp.name });
        setSelectedUlpName(ulp.name);
        setUlpOpen(false);
    };

    const handleSubmit = () => {
        onSubmit(mappingData);
    };

    // Fetch function untuk keypoints
    const fetchKeypoints = async (search: string) => {
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
        }
    };

    // Fetch function untuk DCC
    const fetchDcc = async (search: string) => {
        try {
            const response = await axios.get(route("master.mapping.dcc"), {
                params: { filter: search }
            });

            if (response.data && Array.isArray(response.data)) {
                setDccList(response.data);
            } else {
                console.warn("Unexpected response format:", response.data);
                setDccList([]);
            }
        } catch (error) {
            console.error("Error fetching DCC:", error);
            setDccList([]);
        }
    };

    // Fetch function untuk UP3
    const fetchUp3 = async (search: string) => {
        try {
            const response = await axios.get(route("master.mapping.up3"), {
                params: { filter: search }
            });

            if (response.data && Array.isArray(response.data)) {
                setUp3List(response.data);
            } else {
                console.warn("Unexpected response format:", response.data);
                setUp3List([]);
            }
        } catch (error) {
            console.error("Error fetching UP3:", error);
            setUp3List([]);
        }
    };

    // Fetch function untuk ULP
    const fetchUlp = async (search: string) => {
        try {
            const response = await axios.get(route("master.mapping.ulp"), {
                params: { filter: search }
            });

            if (response.data && Array.isArray(response.data)) {
                setUlpList(response.data);
            } else {
                console.warn("Unexpected response format:", response.data);
                setUlpList([]);
            }
        } catch (error) {
            console.error("Error fetching ULP:", error);
            setUlpList([]);
        }
    };

    // Handler function untuk mengupdate search terms
    const handleOnSearchKeypoint = (search: string) => {
        setKeypointSearchTerm(search);
    };

    const handleOnSearchDcc = (search: string) => {
        setDccSearchTerm(search);
    };

    const handleOnSearchUp3 = (search: string) => {
        setUp3SearchTerm(search);
    };

    const handleOnSearchUlp = (search: string) => {
        setUlpSearchTerm(search);
    };

    return (
        <div className="grid gap-4 py-4">
            {/* Keypoint */}
            <div className="grid gap-2">
                <Label htmlFor="keypoint">Keypoint</Label>
                <Popover open={keypointsOpen} onOpenChange={setKeypointsOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={keypointsOpen}
                            className="justify-between"
                            id="keypoint"
                        >
                            {selectedKeypointName || "Select keypoint..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput
                                placeholder="Search keypoints..."
                                onValueChange={handleOnSearchKeypoint}
                            />
                            <CommandList>
                                <CommandEmpty>No keypoints found.</CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-y-auto">
                                    {keypointsList.map((keypoint) => (
                                        <CommandItem
                                            key={keypoint.id}
                                            value={keypoint.name}
                                            onSelect={() => handleKeypointSelect(keypoint)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedKeypointName === keypoint.name
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

            {/* DCC */}
            <div className="grid gap-2">
                <Label htmlFor="dcc">DCC</Label>
                <Popover open={dccOpen} onOpenChange={setDccOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={dccOpen}
                            className="justify-between"
                            id="dcc"
                        >
                            {selectedDccName || "Select DCC..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput
                                placeholder="Search DCC..."
                                onValueChange={handleOnSearchDcc}
                            />
                            <CommandList>
                                <CommandEmpty>No DCC found.</CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-y-auto">
                                    {dccList.map((dcc) => (
                                        <CommandItem
                                            key={dcc.id}
                                            value={dcc.name}
                                            onSelect={() => handleDccSelect(dcc)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedDccName === dcc.name
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            {dcc.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* UP3 */}
            <div className="grid gap-2">
                <Label htmlFor="up3">UP3</Label>
                <Popover open={up3Open} onOpenChange={setUp3Open}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={up3Open}
                            className="justify-between"
                            id="up3"
                        >
                            {selectedUp3Name || "Select UP3..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput
                                placeholder="Search UP3..."
                                onValueChange={handleOnSearchUp3}
                            />
                            <CommandList>
                                <CommandEmpty>No UP3 found.</CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-y-auto">
                                    {up3List.map((up3) => (
                                        <CommandItem
                                            key={up3.id}
                                            value={up3.name}
                                            onSelect={() => handleUp3Select(up3)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedUp3Name === up3.name
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            {up3.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* ULP */}
            <div className="grid gap-2">
                <Label htmlFor="ulp">ULP</Label>
                <Popover open={ulpOpen} onOpenChange={setUlpOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={ulpOpen}
                            className="justify-between"
                            id="ulp"
                        >
                            {selectedUlpName || "Select ULP..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput
                                placeholder="Search ULP..."
                                onValueChange={handleOnSearchUlp}
                            />
                            <CommandList>
                                <CommandEmpty>No ULP found.</CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-y-auto">
                                    {ulpList.map((ulp) => (
                                        <CommandItem
                                            key={ulp.id}
                                            value={ulp.name}
                                            onSelect={() => handleUlpSelect(ulp)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedUlpName === ulp.name
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            {ulp.name}
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
                    value={mappingData.coordinate}
                    onChange={(e) => handleChange("coordinate", e.target.value)}
                    placeholder="Coordinate (optional)"
                />
            </div>

            {/* Tombol Cancel & Submit */}
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit}>{isEdit ? "Save Changes" : "Add Mapping"}</Button>
            </DialogFooter>
        </div>
    );
}