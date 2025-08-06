import { useState, useEffect } from "react";
import axios from "axios";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
    // State utama untuk form (hanya keypoints dan ulp)
    const [mappingData, setMappingData] = useState({
        keypoints: [] as number[],
        ulp: "",
    });

    // State untuk validation (hanya keypoints dan ulp)
    const [errors, setErrors] = useState({
        keypoints: "",
        ulp: "",
    });

    // State combobox Keypoints
    const [keypointsOpen, setKeypointsOpen] = useState(false);
    const [keypointsList, setKeypointsList] = useState<DropdownBase[]>([]);
    const [selectedKeypoints, setSelectedKeypoints] = useState<DropdownBase[]>([]);

    // State combobox ULP
    const [ulpOpen, setUlpOpen] = useState(false);
    const [ulpList, setUlpList] = useState<DropdownBase[]>([]);
    const [selectedUlpName, setSelectedUlpName] = useState<string>("");

    // Search terms state (hanya keypoint dan ulp)
    const [keypointSearchTerm, setKeypointSearchTerm] = useState("");
    const [ulpSearchTerm, setUlpSearchTerm] = useState("");

    // Debounced search terms (500ms delay)
    const [debouncedKeypointSearch] = useDebounce(keypointSearchTerm, 500);
    const [debouncedUlpSearch] = useDebounce(ulpSearchTerm, 500);

    // Inisialisasi data form
    useEffect(() => {
        if (!initialKeypointsList) {
            return;
        }

        if (mapping && isEdit) {
            // CARI keypoint object berdasarkan NAMA, bukan konversi ke Number
            const initialSelectedKeypoint = initialKeypointsList.find(
                (kp) => kp.name === mapping.keypoint
            );

            if (initialSelectedKeypoint && initialSelectedKeypoint.id !== undefined) {
                // Jika ditemukan, set state dengan ID dan object yang benar
                setMappingData({
                    keypoints: [initialSelectedKeypoint.id], // Gunakan ID-nya
                    ulp: mapping.ulp || "",
                });
                setSelectedKeypoints([initialSelectedKeypoint]); // Set object untuk UI
            } else {
                // Fallback jika tidak ditemukan (seharusnya jarang terjadi)
                setMappingData({
                    keypoints: [],
                    ulp: mapping.ulp || "",
                });
                setSelectedKeypoints([]);
            }

            setSelectedUlpName(mapping.ulp || "");
        } else {
            // Reset form for add mode (ini sudah benar)
            setMappingData({
                keypoints: [],
                ulp: "",
            });
            setSelectedKeypoints([]);
            setSelectedUlpName("");
        }

        // Clear errors
        setErrors({
            keypoints: "",
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
            ulp: "",
        };

        if (mappingData.keypoints.length === 0) {
            newErrors.keypoints = "Please select at least one keypoint";
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
        // TAMBAHKAN LOGIKA INI
        if (isEdit) {
            // Dalam mode edit, selalu GANTI keypoint yang sudah ada
            setSelectedKeypoints([keypoint]);
            setMappingData((prev) => ({
                ...prev,
                keypoints: [keypoint.id],
            }));
        } else {
            // Dalam mode tambah, gunakan logika toggle (tambah/hapus) yang sudah ada
            const isSelected = selectedKeypoints.some((kp) => kp.id === keypoint.id);

            if (isSelected) {
                // Remove from selection
                setSelectedKeypoints((prev) => prev.filter((kp) => kp.id !== keypoint.id));
                setMappingData((prev) => ({
                    ...prev,
                    keypoints: prev.keypoints.filter((id) => id !== keypoint.id),
                }));
            } else {
                // Add to selection
                setSelectedKeypoints((prev) => [...prev, keypoint]);
                setMappingData((prev) => ({
                    ...prev,
                    keypoints: [...prev.keypoints, keypoint.id],
                }));
            }
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
        if (!validateForm()) {
            console.log("Form validation failed:", errors);
            return;
        }

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