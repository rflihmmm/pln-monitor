import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import FeederForm from "@/components/master/feeder-form"

interface GarduInduk {
  id: number
  name: string
}

interface Keypoint {
  id: number
  name: string
}

interface StatusPoint {
  id: number
  name: string
}

interface StatusPoints {
  pmt: number
  apm: number
  mw: number
}

interface Feeder {
  id?: number
  name: string
  description: string | null
  gardu_induk_id: number
  created_at?: string
  gardu_induk?: GarduInduk
  keypoints: number[]
  status_points: StatusPoints
}

interface FeederDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (feederData: any) => void
  feeder?: Feeder | null
  garduIndukList: GarduInduk[]
  keypointsList: Keypoint[]
  statusPointsList: StatusPoint[]
  isEdit?: boolean
}

export default function FeederDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  feeder,
  garduIndukList,
  keypointsList,
  statusPointsList,
  isEdit = false,
}: FeederDialogProps) {
  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSubmit = (feederData: any) => {
    onSubmit(feederData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Feeder" : "Add New Feeder"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update feeder information" : "Fill in the details to add a new feeder to the system."}
          </DialogDescription>
        </DialogHeader>
        <FeederForm
          feeder={feeder}
          garduIndukList={garduIndukList}
          keypointsList={keypointsList}
          statusPointsList={statusPointsList}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={isEdit}
        />
      </DialogContent>
    </Dialog>
  )
}

