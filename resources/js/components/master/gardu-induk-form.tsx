import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import axios from "axios"
import { useDebounce } from "use-debounce"

interface GarduInduk {
  id?: number
  name: string
  description: string | null
  created_at?: string
}

interface GarduIndukFormProps {
  garduInduk?: GarduInduk | null
  onSubmit: (garduData: any) => void
  onCancel: () => void
  isEdit?: boolean
}

export default function GarduIndukForm({ garduInduk, onSubmit, onCancel, isEdit = false }: GarduIndukFormProps) {
  const [garduData, setGarduData] = useState<Partial<GarduInduk>>({
    name: "",
    description: "",
  })

  // Keypoint select state
  const [keypointOpen, setKeypointOpen] = useState(false)
  const [keypointList, setKeypointList] = useState<{ id: number; name: string }[]>([])
  const [selectedKeypoint, setSelectedKeypoint] = useState<{ id: number; name: string } | null>(null)
  const [keypointSearchTerm, setKeypointSearchTerm] = useState("")
  const [debouncedKeypointSearch] = useDebounce(keypointSearchTerm, 500)

  useEffect(() => {
    if (garduInduk && isEdit) {
      setGarduData({
        name: garduInduk.name,
        description: garduInduk.description,
      })
      // Optionally set selectedKeypoint if garduInduk has keypoint info in edit mode
    }
  }, [garduInduk, isEdit])

  // Effect untuk search keypoint dengan debounce
  useEffect(() => {
    if (debouncedKeypointSearch.length >= 3) {
      fetchKeypoints(debouncedKeypointSearch)
    } else {
      setKeypointList([])
    }
  }, [debouncedKeypointSearch])

  const fetchKeypoints = async (search: string) => {
    try {
      // Ganti endpoint sesuai kebutuhan
      const response = await axios.get(route("master.gardu-induk.keypoint-data"), {
        params: { filter: search }
      })
      if (response.data && Array.isArray(response.data)) {
        setKeypointList(response.data)
      } else {
        setKeypointList([])
      }
    } catch (error) {
      setKeypointList([])
    }
  }

  const handleKeypointSelect = (keypoint: { id: number; name: string }) => {
    setSelectedKeypoint(keypoint)
    setKeypointOpen(false)
  }

  const handleChange = (field: string, value: string) => {
    setGarduData({ ...garduData, [field]: value })
  }

  const handleSubmit = () => {
    // Sertakan keypoint jika dipilih
    const submitData = {
      ...garduData,
      ...(selectedKeypoint ? { keypoint_id: selectedKeypoint.id } : {})
    }
    onSubmit(submitData)
  }

  return (
    <div className="grid gap-4 py-4">
      {/* Keypoint select */}
      <div className="grid gap-2">
        <Label htmlFor="keypoint">Keypoint</Label>
        <Popover open={keypointOpen} onOpenChange={setKeypointOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={keypointOpen}
              className="justify-between"
              id="keypoint"
            >
              {selectedKeypoint ? selectedKeypoint.name : "Select keypoint..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput
                placeholder="Search keypoint..."
                onValueChange={setKeypointSearchTerm}
              />
              <CommandList>
                <CommandEmpty>No keypoint found.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-y-auto">
                  {keypointList.map((keypoint) => (
                    <CommandItem
                      key={keypoint.id}
                      value={keypoint.name}
                      onSelect={() => handleKeypointSelect(keypoint)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedKeypoint && selectedKeypoint.id === keypoint.id
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
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={garduData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Gardu Induk Name"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={garduData.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Gardu Induk description (optional)"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>{isEdit ? "Save Changes" : "Add Gardu Induk"}</Button>
      </DialogFooter>
    </div>
  )
}

