import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface OrganizationFormProps {
    organization?: Organization | null
    organizations: Organization[]
    onSubmit: (organizationData: any) => void
    onCancel: () => void
    isEdit?: boolean
}

export default function OrganizationForm({
    organization,
    organizations,
    onSubmit,
    onCancel,
    isEdit = false
}: OrganizationFormProps) {
    const [organizationData, setOrganizationData] = useState<Partial<Organization>>({
        name: "",
        level: 1,
        parent_id: null,
        address: "",
        coordinate: "",
    })

    const levelOptions = [
        { value: 1, label: "1 : DCC" },
        { value: 2, label: "2 : UP3" },
        { value: 3, label: "3 : ULP" },
    ]

    useEffect(() => {
        if (organization && isEdit) {
            setOrganizationData({
                name: organization.name,
                level: organization.level,
                parent_id: organization.parent_id,
                address: organization.address,
                coordinate: organization.coordinate,
            })
        }
    }, [organization, isEdit])

    const handleChange = (field: string, value: any) => {
        setOrganizationData({ ...organizationData, [field]: value })
    }

    const handleSubmit = () => {
        onSubmit(organizationData)
    }

    // Filter organizations that can be parent (exclude current organization and its children)
    const availableParents = organizations.filter(org => {
        if (isEdit && organization) {
            return org.id !== organization.id
        }
        return true
    })

    return (
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    value={organizationData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Organization Name"
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="level">Level</Label>
                <Select value={organizationData.level?.toString()} onValueChange={(value) => handleChange("level", parseInt(value))}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                        {levelOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="parent_id">Parent Organization</Label>
                <Select
                    value={organizationData.parent_id?.toString() || ""}
                    onValueChange={(value) => handleChange("parent_id", value ? parseInt(value) : null)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select parent organization (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableParents.map((org) => (
                            <SelectItem key={org.id} value={org.id!.toString()}>
                                {org.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                    id="address"
                    value={organizationData.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Organization address (optional)"
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="coordinate">Coordinate</Label>
                <Input
                    id="coordinate"
                    value={organizationData.coordinate || ""}
                    onChange={(e) => handleChange("coordinate", e.target.value)}
                    placeholder="Coordinate (optional)"
                />
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit}>{isEdit ? "Save Changes" : "Add Organization"}</Button>
            </DialogFooter>
        </div>
    )
}