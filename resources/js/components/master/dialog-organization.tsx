import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import OrganizationForm from "@/components/master/form-organization"

interface Organization {
    id?: number
    name: string
    level: number
    parent_id: number | null
    address: string | null
    coordinate: string | null
    created_at?: string
    parent?: Organization
}

interface OrganizationDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (organizationData: any) => void
    organization?: Organization | null
    organizations: Organization[]
    isEdit?: boolean
}

export default function OrganizationDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    organization,
    organizations,
    isEdit = false,
}: OrganizationDialogProps) {
    const handleCancel = () => {
        onOpenChange(false)
    }

    const handleSubmit = (organizationData: any) => {
        onSubmit(organizationData)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Organization" : "Add New Organization"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update organization information" : "Fill in the details to add a new organization to the system."}
                    </DialogDescription>
                </DialogHeader>
                <OrganizationForm
                    organization={organization}
                    organizations={organizations}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isEdit={isEdit}
                />
            </DialogContent>
        </Dialog>
    )
}