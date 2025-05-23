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
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
// import { useForm } from 'laravel-precognition-react-inertia';

import {
  type DropdownBase,
  GarduInduk,
  Keypoint,
  StatusPoint,
  Feeder,
} from "@/types";

interface FeederFormProps {
  feeder?: Feeder | null;
  garduIndukList: GarduInduk[];
  keypointsList: Keypoint[];
  statusPointsList: StatusPoint[];
  onSubmit: (feederData: any) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

export default function FeederForm({
  feeder,
  garduIndukList,
  keypointsList: initialKeypointsList,
  statusPointsList: initialStatusPointsList,
  onSubmit,
  onCancel,
  isEdit = false,
}: FeederFormProps) {
  // State utama untuk form
  const [feederData, setFeederData] = useState<Partial<Feeder>>({
    name: "",
    description: "",
    gardu_induk_id: 0,
    keypoints: [],
    status_points: [],
  });

  // State combobox Keypoints
  const [selectedKeypoints, setSelectedKeypoints] = useState<Keypoint[]>([]);
  const [keypointsOpen, setKeypointsOpen] = useState(false);
  // LIST ini akan berubah‐ubah sesuai hasil pencarian
  const [keypointsList, setKeypointsList] = useState<DropdownBase[]>([]);

  // State untuk status points list dengan keadaan terpisah untuk setiap type
  const [pmtStatusList, setPmtStatusList] = useState<StatusPoint[]>([]);
  const [apmStatusList, setApmStatusList] = useState<StatusPoint[]>([]);
  const [mwStatusList, setMwStatusList] = useState<StatusPoint[]>([]);

  // State combobox lain (Substation + Status Points)
  const [substationOpen, setSubstationOpen] = useState(false);
  const [pmtStatusOpen, setPmtStatusOpen] = useState(false);
  const [apmStatusOpen, setApmStatusOpen] = useState(false);
  const [mwStatusOpen, setMwStatusOpen] = useState(false);

  // Search terms state
  const [keypointSearchTerm, setKeypointSearchTerm] = useState("");
  const [pmtSearchTerm, setPmtSearchTerm] = useState("");
  const [apmSearchTerm, setApmSearchTerm] = useState("");
  const [mwSearchTerm, setMwSearchTerm] = useState("");

  // Debounced search terms (500ms delay)
  const [debouncedKeypointSearch] = useDebounce(keypointSearchTerm, 500);
  const [debouncedPmtSearch] = useDebounce(pmtSearchTerm, 500);
  const [debouncedApmSearch] = useDebounce(apmSearchTerm, 500);
  const [debouncedMwSearch] = useDebounce(mwSearchTerm, 500);

  // Jika sedang edit, populate data awal
  useEffect(() => {
    if (feeder && isEdit) {
      setFeederData({
        name: feeder.name,
        description: feeder.description,
        gardu_induk_id: feeder.gardu_induk_id,
        keypoints: feeder.keypoints || [],
        status_points: feeder.status_points || [],
      });

      // Tandai keypoints yang sudah terpilih
      if (feeder.keypoints && feeder.keypoints.length > 0) {
        const selected = initialKeypointsList.filter((kp) =>
          feeder.keypoints!.some((k: Keypoint) => k.keypoint_id === kp.keypoint_id)
        );
        setSelectedKeypoints(
          selected.map((kp) => ({ id: kp.id, name: kp.name })) as Keypoint[]
        );
      }
    }
  }, [feeder, isEdit, initialKeypointsList]);

  // Inisialisasi state status points dengan array kosong
  useEffect(() => {
    // Inisialisasi status_points dengan struktur array yang berisi 3 objek (PMT, APM, MW)
    setFeederData(prev => ({
      ...prev,
      status_points: [
        { type: "PMT", status_id: 0, name: "None" },
        { type: "APM", status_id: 0, name: "None" },
        { type: "MW", status_id: 0, name: "None" }
      ]
    }));
  }, []);

  // Effect untuk search keypoints dengan debounce
  useEffect(() => {
    if (debouncedKeypointSearch.length >= 3) {
      fetchKeypoints(debouncedKeypointSearch);
    } else {
      setKeypointsList([]);
    }
  }, [debouncedKeypointSearch]);

  // Effect untuk search PMT status dengan debounce
  useEffect(() => {
    if (debouncedPmtSearch.length >= 3) {
      fetchPmtStatus(debouncedPmtSearch);
    } else {
      setPmtStatusList([]);
    }
  }, [debouncedPmtSearch]);

  // Effect untuk search APM status dengan debounce
  useEffect(() => {
    if (debouncedApmSearch.length >= 3) {
      fetchApmStatus(debouncedApmSearch);
    } else {
      setApmStatusList([]);
    }
  }, [debouncedApmSearch]);

  // Effect untuk search MW status dengan debounce
  useEffect(() => {
    if (debouncedMwSearch.length >= 3) {
      fetchMwStatus(debouncedMwSearch);
    } else {
      setMwStatusList([]);
    }
  }, [debouncedMwSearch]);

  // Helpers untuk set state form
  const handleChange = (field: string, value: any) => {
    setFeederData({ ...feederData, [field]: value });
  };

  const handleStatusPointChange = (type: string, value: number, name: string) => {
    setFeederData({
      ...feederData,
      status_points: (feederData.status_points as any[]).map(item => {
        if (item.type === type) {
          return { ...item, status_id: value, name };
        }
        return item;
      })
    });
  };

  const handleKeypointSelect = (keypoint: DropdownBase) => {
    const isSelected = selectedKeypoints.some((kp) => kp.id === keypoint.id);

    if (isSelected) {
      // Hapus dari selectedKeypoints untuk UI
      setSelectedKeypoints((prev) => prev.filter((kp) => kp.id !== keypoint.id));
      // Hapus dari feederData.keypoints
      setFeederData({
        ...feederData,
        keypoints: (feederData.keypoints || []).filter((kp: any) => kp.keypoint_id !== keypoint.id),
      });
    } else {
      // Tambahkan ke selectedKeypoints untuk UI
      setSelectedKeypoints((prev) => [
        ...prev,
        { id: keypoint.id, name: keypoint.name } as Keypoint,
      ]);
      // Tambahkan ke feederData.keypoints dengan format yang diinginkan
      setFeederData({
        ...feederData,
        keypoints: [
          ...(feederData.keypoints || []),
          { keypoint_id: keypoint.id, name: keypoint.name }
        ],
      });
    }
  };

  // Remove satu keypoint ketika icon "X" ditekan
  const removeKeypoint = (id: number) => {
    setSelectedKeypoints((prev) => prev.filter((kp) => kp.id !== id));
    setFeederData({
      ...feederData,
      keypoints:
        selectedKeypoints.filter((keypoint) => keypoint.keypoint_id !== id),
    });
  };

  // Mendapatkan nama substation (Gardu Induk) berdasarkan id
  const getSubstationName = (id: number) => {
    const substation = garduIndukList.find((g) => g.id === id);
    return substation ? substation.name : "Select Gardu Induk";
  };

  // Helper functions untuk mendapatkan status point berdasarkan type
  const getPmtStatus = () => {
    return (feederData.status_points as any[])?.find(point => point.type === "PMT") || { type: "PMT", status_id: 0, name: "None" };
  };

  const getApmStatus = () => {
    return (feederData.status_points as any[])?.find(point => point.type === "APM") || { type: "APM", status_id: 0, name: "None" };
  };

  const getMwStatus = () => {
    return (feederData.status_points as any[])?.find(point => point.type === "MW") || { type: "MW", status_id: 0, name: "None" };
  };

  // Helper functions untuk nama status point
  const getPmtStatusName = () => {
    const status = getPmtStatus();
    return status?.name || "None";
  };

  const getApmStatusName = () => {
    const status = getApmStatus();
    return status?.name || "None";
  };

  const getMwStatusName = () => {
    const status = getMwStatus();
    return status?.name || "None";
  };

  const handleSubmit = () => {
    onSubmit(feederData);
  };

  // Fetch functions yang akan dipanggil oleh useEffect
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

  const fetchPmtStatus = async (search: string) => {
    try {
      const response = await axios.get(route("master.feeder.statuspoint-data"), {
        params: { filter: search }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setPmtStatusList(response.data);
      } else {
        console.warn("Unexpected response format:", response.data);
        setPmtStatusList([]);
      }
    } catch (error) {
      console.error("Error fetching PMT status points:", error);
      setPmtStatusList([]);
    }
  };

  const fetchApmStatus = async (search: string) => {
    try {
      const response = await axios.get(route("master.feeder.statuspoint-data"), {
        params: { filter: search }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setApmStatusList(response.data);
      } else {
        console.warn("Unexpected response format:", response.data);
        setApmStatusList([]);
      }
    } catch (error) {
      console.error("Error fetching APM status points:", error);
      setApmStatusList([]);
    }
  };

  const fetchMwStatus = async (search: string) => {
    try {
      const response = await axios.get(route("master.feeder.statuspoint-data"), {
        params: { filter: search }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setMwStatusList(response.data);
      } else {
        console.warn("Unexpected response format:", response.data);
        setMwStatusList([]);
      }
    } catch (error) {
      console.error("Error fetching MW status points:", error);
      setMwStatusList([]);
    }
  };

  // Handler functions untuk mengupdate search terms
  const handleOnSearchKeypoint = (search: string) => {
    setKeypointSearchTerm(search);
  };

  const handleOnSearchStatusPointPmt = (search: string) => {
    setPmtSearchTerm(search);
  };

  const handleOnSearchStatusPointApm = (search: string) => {
    setApmSearchTerm(search);
  };

  const handleOnSearchStatusPointMw = (search: string) => {
    setMwSearchTerm(search);
  };

  return (
    <div className="grid gap-4 py-4">
      {/* Name */}
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={feederData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Feeder Name"
        />
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={feederData.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Feeder description (optional)"
        />
      </div>

      {/* Substation (Gardu Induk) Combobox */}
      <div className="grid gap-2">
        <Label htmlFor="gardu_induk_id">Gardu Induk</Label>
        <Popover open={substationOpen} onOpenChange={setSubstationOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={substationOpen}
              className="justify-between"
              id="gardu_induk_id"
            >
              {feederData.gardu_induk_id
                ? getSubstationName(feederData.gardu_induk_id)
                : "Select Gardu Induk"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search Gardu Induk..." />
              <CommandList>
                <CommandEmpty>No Gardu Induk found.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-y-auto">
                  {garduIndukList.map((gardu) => (
                    <CommandItem
                      key={gardu.id}
                      value={gardu.name}
                      onSelect={() => {
                        handleChange("gardu_induk_id", gardu.id);
                        setSubstationOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          feederData.gardu_induk_id === gardu.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {gardu.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Keypoints Multi‐select */}
      <div className="grid gap-2">
        <Label htmlFor="keypoints">Keypoints</Label>
        <Popover open={keypointsOpen} onOpenChange={setKeypointsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={keypointsOpen}
              className="justify-between"
            >
              {selectedKeypoints.length > 0
                ? `${selectedKeypoints.length} keypoint${selectedKeypoints.length > 1 ? "s" : ""
                } selected`
                : "Select keypoints..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput
                placeholder="Search keypoints..."
                // Setiap kali user mengubah teks di input, panggil handleOnSearchKeypoint
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
                      <div className="flex items-center space-x-2 w-full">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selectedKeypoints.some((kp) => kp.id === keypoint.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span>{keypoint.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              <div className="border-t p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setKeypointsOpen(false)}
                >
                  Done
                </Button>
              </div>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Tampilkan "Badge" untuk setiap keypoint yang sudah dipilih */}
        {selectedKeypoints.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedKeypoints.map((keypoint) => (
              <Badge key={keypoint.id} variant="secondary" className="flex items-center gap-1">
                {keypoint.name}
                <button
                  type="button"
                  onClick={() => removeKeypoint(keypoint.keypoint_id)}
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

      {/* Status Points (PMT, APM, MW) */}
      <div className="grid gap-4">
        <Label>Status Points</Label>
        <div className="grid grid-cols-1 gap-4">
          {/* PMT */}
          <div className="grid gap-2">
            <Label htmlFor="pmt_status">PMT</Label>
            <Popover open={pmtStatusOpen} onOpenChange={setPmtStatusOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pmtStatusOpen}
                  className="justify-between"
                  id="pmt_status"
                >
                  {getPmtStatusName()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search status..." onValueChange={handleOnSearchStatusPointPmt} />
                  <CommandList>
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          handleStatusPointChange("PMT", 0, "None");
                          setPmtStatusOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            getPmtStatus()?.status_id === 0 ? "opacity-100" : "opacity-0"
                          )}
                        />
                        None
                      </CommandItem>
                      {pmtStatusList.map((status) => (
                        <CommandItem
                          key={status.id}
                          value={status.name}
                          onSelect={() => {
                            handleStatusPointChange("PMT", status.id ?? 0, status.name);
                            setPmtStatusOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              getPmtStatus()?.status_id === status.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {status.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* APM */}
          <div className="grid gap-2">
            <Label htmlFor="apm_status">APM</Label>
            <Popover open={apmStatusOpen} onOpenChange={setApmStatusOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={apmStatusOpen}
                  className="justify-between"
                  id="apm_status"
                >
                  {getApmStatusName()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search status..." onValueChange={handleOnSearchStatusPointApm} />
                  <CommandList>
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          handleStatusPointChange("APM", 0, "None");
                          setApmStatusOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            getApmStatus()?.status_id === 0 ? "opacity-100" : "opacity-0"
                          )}
                        />
                        None
                      </CommandItem>
                      {apmStatusList.map((status) => (
                        <CommandItem
                          key={status.id}
                          value={status.name}
                          onSelect={() => {
                            handleStatusPointChange("APM", status.id ?? 0, status.name);
                            setApmStatusOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              getApmStatus()?.status_id === status.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {status.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* MW */}
          <div className="grid gap-2">
            <Label htmlFor="mw_status">MW</Label>
            <Popover open={mwStatusOpen} onOpenChange={setMwStatusOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={mwStatusOpen}
                  className="justify-between"
                  id="mw_status"
                >
                  {getMwStatusName()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search status..." onValueChange={handleOnSearchStatusPointMw} />
                  <CommandList>
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          handleStatusPointChange("MW", 0, "None");
                          setMwStatusOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            getMwStatus()?.status_id === 0 ? "opacity-100" : "opacity-0"
                          )}
                        />
                        None
                      </CommandItem>
                      {mwStatusList.map((status) => (
                        <CommandItem
                          key={status.id}
                          value={status.name}
                          onSelect={() => {
                            handleStatusPointChange("MW", status.id ?? 0, status.name);
                            setMwStatusOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              getMwStatus()?.status_id === status.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {status.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* END of STATUS POINT */}
        </div>
      </div>

      {/* Tombol Cancel & Submit */}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>{isEdit ? "Save Changes" : "Add Feeder"}</Button>
      </DialogFooter>
    </div>
  );
}