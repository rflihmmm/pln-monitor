// ─── components/master/keypoint-ext-dialog.tsx ─────────────────────────────

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import KeypointExtForm from "@/components/master/form-keypoint-ext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KeypointExt {
    keypoint_id: number;
    coordinate?: string;
    alamat?: string;
    parent_stationpoints?: number;
    name?: string;
    parent_name?: string;
}

interface KeypointExtDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (keypointExtData: any) => void;
    keypointExt?: KeypointExt | null;
    isEdit?: boolean;
}

export default function KeypointExtDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    keypointExt,
    isEdit = false,
}: KeypointExtDialogProps) {
    const handleCancel = () => {
        onOpenChange(false);
    };

    const handleSubmit = (keypointExtData: any) => {
        onSubmit(keypointExtData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Edit Keypoint Ext" : "Add New Keypoint Ext"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? "Update keypoint extension information"
                            : "Fill in the details to add a new keypoint extension to the system."}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] px-5">
                    <KeypointExtForm
                        keypointExt={keypointExt}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        isEdit={isEdit}
                    />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}