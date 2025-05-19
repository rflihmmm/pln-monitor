import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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

  useEffect(() => {
    if (garduInduk && isEdit) {
      setGarduData({
        name: garduInduk.name,
        description: garduInduk.description,
      })
    }
  }, [garduInduk, isEdit])

  const handleChange = (field: string, value: string) => {
    setGarduData({ ...garduData, [field]: value })
  }

  const handleSubmit = () => {
    onSubmit(garduData)
  }

  return (
    <div className="grid gap-4 py-4">
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

