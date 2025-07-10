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
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
    const [mappingData, setMappingData] = useState({
        keypoints: [] as number[],
        dcc: "",
        up3: "",
        ulp: "",
        coordinate: "",
    });

    // State untuk validation
    const [errors, setErrors] = useState({
        keypoints: "",
        dcc: "",
        up3: "",
        ulp: "",
    });

    // State combobox Keypoints
    const [keypointsOpen, setKeypointsOpen] = useState(false);
    const [keypointsList, setKeypointsList] = useState<DropdownBase[]>([]);
    const [selectedKeypoints, setSelectedKeypoints] = useState<DropdownBase[]>([]);

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
            // Handle edit mode - convert single keypoint to array
            const keypointArray = mapping.keypoint ? [Number(mapping.keypoint)] : [];

            setMappingData({
                keypoints: keypointArray,
                dcc: mapping.dcc || "",
                up3: mapping.up3 || "",
                ulp: mapping.ulp || "",
                coordinate: mapping.coordinate || "",
            });

            // Initialize selected keypoints for UI
            if (mapping.keypoint) {
                const initialSelected = initialKeypointsList.find(kp => kp.id === Number(mapping.keypoint));
                setSelectedKeypoints(initialSelected ? [initialSelected] : []);
            }

            setSelectedDccName(mapping.dcc || "");
            setSelectedUp3Name(mapping.up3 || "");
            setSelectedUlpName(mapping.ulp || "");
        } else {
            // Reset form for add mode
            setMappingData({
                keypoints: [],
                dcc: "",
                up3: "",
                ulp: "",
                coordinate: "",
            });
            setSelectedKeypoints([]);
            setSelectedDccName("");
            setSelectedUp3Name("");
            setSelectedUlpName("");
        }

        // Clear errors
        setErrors({
            keypoints: "",
            dcc: "",
            up3: "",
            ulp: "",
        });
    }, [mapping, isEdit, initialKeypointsList]);

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

    // Validation function
    const validateForm = () => {
        const newErrors = {
            keypoints: "",
            dcc: "",
            up3: "",
            ulp: "",
        };

        if (mappingData.keypoints.length === 0) {
            newErrors.keypoints = "Please select at least one keypoint";
        }

        if (!mappingData.dcc.trim()) {
            newErrors.dcc = "DCC is required";
        }

        if (!mappingData.up3.trim()) {
            newErrors.up3 = "UP3 is required";
        }

        if (!mappingData.ulp.trim()) {
            newErrors.ulp = "ULP is required";
        }

        setErrors(newErrors);

        // Return true if no errors
        return Object.values(newErrors).every(error => error === "");
    };

    // Helpers untuk set state form
    const handleChange = (field: string, value: string) => {
        setMappingData({ ...mappingData, [field]: value });

        // Clear error when user starts typing
        if (errors[field as keyof typeof errors]) {
            setErrors({ ...errors, [field]: "" });
        }
    };

    const handleKeypointSelect = (keypoint: DropdownBase) => {
        const isSelected = selectedKeypoints.some((kp) => kp.id === keypoint.id);

        if (isSelected) {
            // Remove from selection
            setSelectedKeypoints((prev) => prev.filter((kp) => kp.id !== keypoint.id));
            setMappingData(prev => ({
                ...prev,
                keypoints: prev.keypoints.filter(id => id !== keypoint.id),
            }));
        } else {
            // Add to selection
            setSelectedKeypoints((prev) => [...prev, keypoint]);
            setMappingData(prev => ({
                ...prev,
                keypoints: [...prev.keypoints, keypoint.id],
            }));
        }

        // Clear keypoints error
        if (errors.keypoints) {
            setErrors({ ...errors, keypoints: "" });
        }
    };

    const removeKeypoint = (keypointId: number) => {
        setSelectedKeypoints((prev) => prev.filter((kp) => kp.id !== keypointId));
        setMappingData(prev => ({
            ...prev,
            keypoints: prev.keypoints.filter(id => id !== keypointId),
        }));
    };

    const handleDccSelect = (dcc: DropdownBase) => {
        setMappingData({ ...mappingData, dcc: dcc.name });
        setSelectedDccName(dcc.name);
        setDccOpen(false);

        // Clear DCC error
        if (errors.dcc) {
            setErrors({ ...errors, dcc: "" });
        }
    };

    const handleUp3Select = (up3: DropdownBase) => {
        setMappingData({ ...mappingData, up3: up3.name });
        setSelectedUp3Name(up3.name);
        setUp3Open(false);

        // Clear UP3 error
        if (errors.up3) {
            setErrors({ ...errors, up3: "" });
        }
    };

    const handleUlpSelect = (ulp: DropdownBase) => {
        setMappingData({ ...mappingData, ulp: ulp.name });
        setSelectedUlpName(ulp.name);
        setUlpOpen(false);

        // Clear ULP error
        if (errors.ulp) {
            setErrors({ ...errors, ulp: "" });
        }
    };

    const handleSubmit = () => {
        // console.log("Form submitted with data:", mappingData);

        // if (!validateForm()) {
        //     console.log("Form validation failed:", errors);
        //     return;
        // }

        // Ensure data structure is correct for submission
        const submitData = {
            ...mappingData,
            // For edit mode, backend might expect single keypoint
            ...(isEdit && mappingData.keypoints.length > 0 && {
                keypoint: mappingData.keypoints[0] // Use first keypoint for edit
            })
        };
        onSubmit(submitData);
    };

    // Fetch functions
    const fetchKeypoints = async (search: string) => {
        try {
            const response = await axios.get(route("master.feeder.keypoint-data"), {
                params: { filter: search }
            });
            if (response.data && Array.isArray(response.data)) {
                setKeypointsList(response.data);
            } else {
                setKeypointsList([]);
            }
        } catch (error) {
            console.error("Error fetching keypoints:", error);
            setKeypointsList([]);
        }
    };

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

    // Handler functions untuk search terms
    const handleOnSearchKeypoint = (search: string) => setKeypointSearchTerm(search);
    const handleOnSearchDcc = (search: string) => setDccSearchTerm(search);
    const handleOnSearchUp3 = (search: string) => setUp3SearchTerm(search);
    const handleOnSearchUlp = (search: string) => setUlpSearchTerm(search);

    return (
        <div className="grid gap-4 py-4">
            {/* Keypoints - Multi-select */}
            <div className="grid gap-2">
                <Label htmlFor="keypoint">
                    Keypoints <span className="text-red-500">*</span>
                </Label>
                <Popover open={keypointsOpen} onOpenChange={setKeypointsOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={keypointsOpen}
                            className={cn(
                                "justify-between",
                                errors.keypoints && "border-red-500"
                            )}
                        >
                            {selectedKeypoints.length > 0
                                ? `${selectedKeypoints.length} keypoint${selectedKeypoints.length > 1 ? "s" : ""} selected`
                                : "Select keypoints..."}
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
                                                    selectedKeypoints.some((kp) => kp.id === keypoint.id)
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
                {errors.keypoints && (
                    <p className="text-sm text-red-500">{errors.keypoints}</p>
                )}

                {selectedKeypoints.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {selectedKeypoints.map((keypoint) => (
                            <Badge key={keypoint.id} variant="secondary" className="flex items-center gap-1">
                                {keypoint.name}
                                <button
                                    type="button"
                                    onClick={() => removeKeypoint(keypoint.id)}
                                    className="rounded-full hover:bg-muted"
                                >
                                    <X className="h-3 w-3" />
                                    <span className="sr-only">Remove {keypoint.name}</span>
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* DCC */}
            <div className="grid gap-2">
                <Label htmlFor="dcc">
                    DCC <span className="text-red-500">*</span>
                </Label>
                <Popover open={dccOpen} onOpenChange={setDccOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={dccOpen}
                            className={cn(
                                "justify-between",
                                errors.dcc && "border-red-500"
                            )}
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
                {errors.dcc && (
                    <p className="text-sm text-red-500">{errors.dcc}</p>
                )}
            </div>

            {/* UP3 */}
            <div className="grid gap-2">
                <Label htmlFor="up3">
                    UP3 <span className="text-red-500">*</span>
                </Label>
                <Popover open={up3Open} onOpenChange={setUp3Open}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={up3Open}
                            className={cn(
                                "justify-between",
                                errors.up3 && "border-red-500"
                            )}
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
                {errors.up3 && (
                    <p className="text-sm text-red-500">{errors.up3}</p>
                )}
            </div>

            {/* ULP */}
            <div className="grid gap-2">
                <Label htmlFor="ulp">
                    ULP <span className="text-red-500">*</span>
                </Label>
                <Popover open={ulpOpen} onOpenChange={setUlpOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={ulpOpen}
                            className={cn(
                                "justify-between",
                                errors.ulp && "border-red-500"
                            )}
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
                {errors.ulp && (
                    <p className="text-sm text-red-500">{errors.ulp}</p>
                )}
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

            {/* Submit Buttons */}
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit}>
                    {isEdit ? "Save Changes" : "Add Mapping"}
                </Button>
            </DialogFooter>
        </div>
    );
}