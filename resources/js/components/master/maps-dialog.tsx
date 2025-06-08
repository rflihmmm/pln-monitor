// ─── components/master/maps-dialog.tsx ─────────────────────────────────────

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MapsForm from "@/components/master/maps-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Keypoint, MapsData } from "@/types";

interface MapsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (mapsData: any) => void;
  mapsData?: MapsData | null;
  keypointsList: Keypoint[];
  isEdit?: boolean;
}

export default function MapsDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  mapsData,
  keypointsList,
  isEdit = false,
}: MapsDialogProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSubmit = (mapsData: any) => {
    onSubmit(mapsData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Maps Data" : "Add New Maps Data"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update maps data information"
              : "Fill in the details to add a new maps data to the system."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] px-5">
          <MapsForm
            mapsData={mapsData}
            keypointsList={keypointsList}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEdit={isEdit}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}