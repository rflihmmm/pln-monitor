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

import {
  type DropdownBase,
  Keypoint,
  MapsData,
} from "@/types";

interface MapsFormProps {
  mapsData?: MapsData | null;
  keypointsList: Keypoint[];
  onSubmit: (mapsData: any) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

export default function MapsForm({
  mapsData,
  keypointsList: initialKeypointsList,
  onSubmit,
  onCancel,
  isEdit = false,
}: MapsFormProps) {
  // State utama untuk form
  const [formData, setFormData] = useState<Partial<MapsData>>({
    no: "",
    keypoint_id: 0,
    ulp: "",
    up3: "",
    dcc: "",
    lokasi: "",
  });

  // State combobox Keypoints
  const [keypointsOpen, setKeypointsOpen] = useState(false);
  const [keypointsList, setKeypointsList] = useState<DropdownBase[]>([]);

  // Search terms state
  const [keypointSearchTerm, setKeypointSearchTerm] = useState("");

  // Debounced search terms (500ms delay)
  const [debouncedKeypointSearch] = useDebounce(keypointSearchTerm, 500);

  // Inisialisasi data form - PENTING: Hanya sekali saat component mount atau mapsData berubah
  useEffect(() => {
    if (mapsData && isEdit) {
      setFormData({
        no: mapsData.no || "",
        keypoint_id: mapsData.keypoint_id || 0,
        ulp: mapsData.ulp || "",
        up3: mapsData.up3 || "",
        dcc: mapsData.dcc || "",
        lokasi: mapsData.lokasi || "",
      });
    } else {
      // Mode tambah baru - inisialisasi dengan nilai default
      setFormData({
        no: "",
        keypoint_id: 0,
        ulp: "",
        up3: "",
        dcc: "",
        lokasi: "",
      });
    }
  }, [mapsData, isEdit]);

  // Effect untuk search keypoints dengan debounce
  useEffect(() => {
    if (debouncedKeypointSearch.length >= 3) {
      fetchKeypoints(debouncedKeypointSearch);
    } else {
      setKeypointsList([]);
    }
  }, [debouncedKeypointSearch]);

  // Helpers untuk set state form
  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // Mendapatkan nama keypoint berdasarkan id
  const getKeypointName = (id: number) => {
    // Cari di initialKeypointsList terlebih dahulu
    const keypoint = initialKeypointsList.find((k) => k.keypoint_id === id);
    if (keypoint) return keypoint.name;
    
    // Jika tidak ditemukan, cari di keypointsList hasil search
    const searchKeypoint = keypointsList.find((k) => k.id === id);
    return searchKeypoint ? searchKeypoint.name : "Select Keypoint";
  };

  const handleSubmit = () => {
    // Konversi 'no' ke string sebelum dikirim
    const submitData = {
      ...formData,
      no: formData.no?.toString() || "",
    };
    onSubmit(submitData);
  };

  // Fetch functions - UPDATED: Menggunakan endpoint baru untuk database PostgreSQL
  const fetchKeypoints = async (search: string) => {
    try {
      const response = await axios.get(route("master.maps.keypoint-data"), {
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

  // Handler functions untuk mengupdate search terms
  const handleOnSearchKeypoint = (search: string) => {
    setKeypointSearchTerm(search);
  };

  return (
    <div className="grid gap-4 py-4">
      {/* No */}
      <div className="grid gap-2">
        <Label htmlFor="no">No</Label>
        <Input
          id="no"
          type="number"
          value={formData.no}
          onChange={(e) => handleChange("no", e.target.value)}
          placeholder="Enter number"
        />
      </div>

      {/* Keypoint Combobox */}
      <div className="grid gap-2">
        <Label htmlFor="keypoint_id">Keypoint</Label>
        <Popover open={keypointsOpen} onOpenChange={setKeypointsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={keypointsOpen}
              className="justify-between"
              id="keypoint_id"
            >
              {formData.keypoint_id
                ? getKeypointName(formData.keypoint_id)
                : "Select Keypoint"}
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
                      onSelect={() => {
                        handleChange("keypoint_id", keypoint.id);
                        setKeypointsOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.keypoint_id === keypoint.id
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

      {/* ULP */}
      <div className="grid gap-2">
        <Label htmlFor="ulp">ULP</Label>
        <Input
          id="ulp"
          value={formData.ulp || ""}
          onChange={(e) => handleChange("ulp", e.target.value)}
          placeholder="Enter ULP"
        />
      </div>

      {/* UP3 */}
      <div className="grid gap-2">
        <Label htmlFor="up3">UP3</Label>
        <Input
          id="up3"
          value={formData.up3 || ""}
          onChange={(e) => handleChange("up3", e.target.value)}
          placeholder="Enter UP3"
        />
      </div>

      {/* DCC */}
      <div className="grid gap-2">
        <Label htmlFor="dcc">DCC</Label>
        <Input
          id="dcc"
          value={formData.dcc || ""}
          onChange={(e) => handleChange("dcc", e.target.value)}
          placeholder="Enter DCC"
        />
      </div>

      {/* Lokasi */}
      <div className="grid gap-2">
        <Label htmlFor="lokasi">Lokasi</Label>
        <Input
          id="lokasi"
          value={formData.lokasi || ""}
          onChange={(e) => handleChange("lokasi", e.target.value)}
          placeholder="Enter Lokasi"
        />
      </div>

      {/* Tombol Cancel & Submit */}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>{isEdit ? "Save Changes" : "Add Maps Data"}</Button>
      </DialogFooter>
    </div>
  );
}