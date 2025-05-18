// ─── components/master/feeder-form.tsx ───────────────────────────────────────

import { useState, useEffect } from "react";
import axios from "axios";
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

import {
  type DropdownBase,
  GarduInduk,
  Keypoint,
  StatusPoint,
  StatusPoints,
  Feeder,
} from "@/types";

interface FeederFormProps {
  feeder?: Feeder | null;
  garduIndukList: GarduInduk[];
  keypointsList: DropdownBase[];
  statusPointsList: StatusPoint[];
  onSubmit: (feederData: any) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

export default function FeederForm({
  feeder,
  garduIndukList,
  keypointsList: initialKeypointsList,
  statusPointsList,
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
    status_points: {
      pmt: 0,
      apm: 0,
      mw: 0,
    },
  });

  // State combobox Keypoints
  const [selectedKeypoints, setSelectedKeypoints] = useState<Keypoint[]>([]);
  const [keypointsOpen, setKeypointsOpen] = useState(false);
  // LIST ini akan berubah‐ubah sesuai hasil pencarian
  const [keypointsList, setKeypointsList] = useState<DropdownBase[]>(initialKeypointsList);

  // State combobox lain (Substation + Status Points)
  const [substationOpen, setSubstationOpen] = useState(false);
  const [pmtStatusOpen, setPmtStatusOpen] = useState(false);
  const [apmStatusOpen, setApmStatusOpen] = useState(false);
  const [mwStatusOpen, setMwStatusOpen] = useState(false);

  // Jika sedang edit, populate data awal
  useEffect(() => {
    if (feeder && isEdit) {
      setFeederData({
        name: feeder.name,
        description: feeder.description,
        gardu_induk_id: feeder.gardu_induk_id,
        keypoints: feeder.keypoints || [],
        status_points: feeder.status_points || { pmt: 0, apm: 0, mw: 0 },
      });

      // Tandai keypoints yang sudah terpilih
      if (feeder.keypoints && feeder.keypoints.length > 0) {
        const selected = initialKeypointsList.filter((kp) =>
          feeder.keypoints!.includes(kp.id)
        );
        setSelectedKeypoints(
          selected.map((kp) => ({ id: kp.id, name: kp.name })) as Keypoint[]
        );
      }
    }
  }, [feeder, isEdit, initialKeypointsList]);

  // Helpers untuk set state form
  const handleChange = (field: string, value: any) => {
    setFeederData({ ...feederData, [field]: value });
  };

  const handleStatusPointChange = (type: keyof StatusPoints, value: number) => {
    setFeederData({
      ...feederData,
      status_points: {
        ...(feederData.status_points as StatusPoints),
        [type]: value,
      },
    });
  };

  // Ketika user memilih/menghilangkan satu keypoint
  const handleKeypointSelect = (keypoint: DropdownBase) => {
    const isSelected = selectedKeypoints.some((kp) => kp.id === keypoint.id);
    if (isSelected) {
      setSelectedKeypoints((prev) => prev.filter((kp) => kp.id !== keypoint.id));
      setFeederData({
        ...feederData,
        keypoints: (feederData.keypoints || []).filter((id) => id !== keypoint.id),
      });
    } else {
      setSelectedKeypoints((prev) => [
        ...prev,
        { id: keypoint.id, name: keypoint.name } as Keypoint,
      ]);
      setFeederData({
        ...feederData,
        keypoints: [...(feederData.keypoints || []), keypoint.id],
      });
    }
  };

  // Remove satu keypoint ketika icon “X” ditekan
  const removeKeypoint = (id: number) => {
    setSelectedKeypoints((prev) => prev.filter((kp) => kp.id !== id));
    setFeederData({
      ...feederData,
      keypoints: (feederData.keypoints || []).filter((keypointId) => keypointId !== id),
    });
  };

  // Mendapatkan nama substation (Gardu Induk) berdasarkan id
  const getSubstationName = (id: number) => {
    const substation = garduIndukList.find((g) => g.id === id);
    return substation ? substation.name : "Select substation";
  };

  // Mendapatkan nama Status Points berdasarkan id
  const getStatusPointName = (id: number) => {
    const status = statusPointsList.find((s) => s.id === id);
    return status ? status.name : "None";
  };

  const handleSubmit = () => {
    onSubmit(feederData);
  };

  /**
   * Ketika user mengetik di combobox Keypoints (minimal 3 karakter),
   * lakukan pemanggilan ke endpoint Laravel untuk mengambil keypoints yang matching.
   */
  const handleOnSearchKeypoint = (search: string) => {
    if (search.length < 3) {
      // Jika kurang dari 3 karakter, clear list supaya dropdown kosong
      setKeypointsList([]);
      return;
    }

    // Panggil endpoint yang sudah kita definisikan di Laravel (lihat langkah #1 dan #2)
    axios
      .get(route("master.feeder.keypoint-data", { filter: search }))
      .then((resp) => {
        // resp.data diasumsikan array of { id, name }
        setKeypointsList(resp.data as DropdownBase[]);
      })
      .catch((err) => {
        console.error("Error fetching keypoints:", err);
        setKeypointsList([]);
      });
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
        <Label htmlFor="gardu_induk_id">Substation</Label>
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
                : "Select substation"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search substations..." />
              <CommandList>
                <CommandEmpty>No substations found.</CommandEmpty>
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
                ? `${selectedKeypoints.length} keypoint${
                    selectedKeypoints.length > 1 ? "s" : ""
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

        {/* Tampilkan “Badge” untuk setiap keypoint yang sudah dipilih */}
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
                  {feederData.status_points?.pmt
                    ? getStatusPointName(feederData.status_points.pmt)
                    : "None"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search status..." />
                  <CommandList>
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          handleStatusPointChange("pmt", 0);
                          setPmtStatusOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            feederData.status_points?.pmt === 0 ? "opacity-100" : "opacity-0"
                          )}
                        />
                        None
                      </CommandItem>
                      {statusPointsList.map((status) => (
                        <CommandItem
                          key={status.id}
                          value={status.name}
                          onSelect={() => {
                            handleStatusPointChange("pmt", status.id);
                            setPmtStatusOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              feederData.status_points?.pmt === status.id
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
                  {feederData.status_points?.apm
                    ? getStatusPointName(feederData.status_points.apm)
                    : "None"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search status..." />
                  <CommandList>
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          handleStatusPointChange("apm", 0);
                          setApmStatusOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            feederData.status_points?.apm === 0 ? "opacity-100" : "opacity-0"
                          )}
                        />
                        None
                      </CommandItem>
                      {statusPointsList.map((status) => (
                        <CommandItem
                          key={status.id}
                          value={status.name}
                          onSelect={() => {
                            handleStatusPointChange("apm", status.id);
                            setApmStatusOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              feederData.status_points?.apm === status.id
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
                  {feederData.status_points?.mw
                    ? getStatusPointName(feederData.status_points.mw)
                    : "None"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search status..." />
                  <CommandList>
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          handleStatusPointChange("mw", 0);
                          setMwStatusOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            feederData.status_points?.mw === 0 ? "opacity-100" : "opacity-0"
                          )}
                        />
                        None
                      </CommandItem>
                      {statusPointsList.map((status) => (
                        <CommandItem
                          key={status.id}
                          value={status.name}
                          onSelect={() => {
                            handleStatusPointChange("mw", status.id);
                            setMwStatusOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              feederData.status_points?.mw === status.id
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
