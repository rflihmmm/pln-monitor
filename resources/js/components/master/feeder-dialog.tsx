// ─── components/master/feeder-dialog.tsx ─────────────────────────────────────

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FeederForm from "@/components/master/feeder-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type DropdownBase, GarduInduk, StatusPoint, Feeder } from "@/types";

interface FeederDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feederData: any) => void;
  feeder?: Feeder | null;
  garduIndukList: GarduInduk[];
  keypointsList: DropdownBase[];
  statusPointsList: StatusPoint[];
  isEdit?: boolean;
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
    onOpenChange(false);
  };

  const handleSubmit = (feederData: any) => {
    onSubmit(feederData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Feeder" : "Add New Feeder"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update feeder information"
              : "Fill in the details to add a new feeder to the system."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] px-5">
          <FeederForm
            feeder={feeder}
            garduIndukList={garduIndukList}
            keypointsList={keypointsList}
            statusPointsList={statusPointsList}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEdit={isEdit}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
