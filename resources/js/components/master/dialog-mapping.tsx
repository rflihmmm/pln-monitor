// ─── components/master/mapping-dialog.tsx ─────────────────────────────────────

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import MappingForm from "@/components/master/form-mapping";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Keypoint, Mapping } from "@/types";

interface MappingDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (mappingData: any) => void;
    mapping?: Mapping | null;
    keypointsList: Keypoint[];
    isEdit?: boolean;
}

export default function MappingDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    mapping,
    keypointsList,
    isEdit = false,
}: MappingDialogProps) {
    const handleCancel = () => {
        onOpenChange(false);
    };

    const handleSubmit = (mappingData: any) => {
        onSubmit(mappingData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Mapping" : "Add New Mapping"}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? "Update mapping information"
                            : "Fill in the details to add a new mapping to the system."}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] px-5">
                    <MappingForm
                        mapping={mapping}
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