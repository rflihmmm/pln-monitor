import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import GarduIndukForm from "@/components/master/gardu-induk-form"

interface GarduInduk {
  id?: number
  name: string
  description: string | null
  created_at?: string
  keypoint_id?: number | null
  keypoint_name?: string | null
  coordinate: string | null
}

interface GarduIndukDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (garduData: any) => void
  garduIndukList?: GarduInduk | null
  isEdit?: boolean
}

export default function GarduIndukDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  garduIndukList,
  isEdit = false,
}: GarduIndukDialogProps) {
  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSubmit = (garduData: any) => {
    onSubmit(garduData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Gardu Induk" : "Add New Gardu Induk"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update Gardu Induk information" : "Fill in the details to add a new Gardu Induk to the system."}
          </DialogDescription>
        </DialogHeader>
        <GarduIndukForm garduInduk={garduIndukList} onSubmit={handleSubmit} onCancel={handleCancel} isEdit={isEdit} />
      </DialogContent>
    </Dialog>
  )
}

