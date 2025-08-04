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

    const [parentSearchTerm, setParentSearchTerm] = useState<string>("")
    const [isParentSelectOpen, setIsParentSelectOpen] = useState<boolean>(false)

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

            // Set initial search term for parent organization
            if (organization.parent_id && organization.parent) {
                setParentSearchTerm(organization.parent.name)
            }
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

    // Filter parent organizations based on search term
    const filteredParents = availableParents.filter(org =>
        org.name.toLowerCase().includes(parentSearchTerm.toLowerCase())
    )

    const handleParentSelect = (value: string) => {
        if (value === "none") {
            handleChange("parent_id", null)
            setParentSearchTerm("")
        } else {
            const selectedOrg = availableParents.find(org => org.id!.toString() === value)
            if (selectedOrg) {
                handleChange("parent_id", parseInt(value))
                setParentSearchTerm(selectedOrg.name)
            }
        }
        setIsParentSelectOpen(false)
    }

    const clearParentSelection = () => {
        handleChange("parent_id", null)
        setParentSearchTerm("")
    }

    // Get selected parent name for display
    const selectedParentName = organizationData.parent_id
        ? availableParents.find(org => org.id === organizationData.parent_id)?.name
        : null

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
                <div className="relative">
                    <Input
                        id="parent_search"
                        value={parentSearchTerm}
                        onChange={(e) => {
                            setParentSearchTerm(e.target.value)
                            setIsParentSelectOpen(true)
                        }}
                        onFocus={() => setIsParentSelectOpen(true)}
                        placeholder="Search parent organization (optional)..."
                        className="pr-20"
                    />
                    {selectedParentName && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 px-2 text-xs"
                            onClick={clearParentSelection}
                        >
                            Clear
                        </Button>
                    )}

                    {isParentSelectOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            <div
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                onClick={() => handleParentSelect("none")}
                            >
                                None
                            </div>
                            {filteredParents.length > 0 ? (
                                filteredParents.map((org) => (
                                    <div
                                        key={org.id}
                                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                        onClick={() => handleParentSelect(org.id!.toString())}
                                    >
                                        {org.name}
                                    </div>
                                ))
                            ) : parentSearchTerm && (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                    No organizations found
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Show selected parent organization */}
                {selectedParentName && (
                    <div className="text-sm text-gray-600 mt-1">
                        Selected: <span className="font-medium">{selectedParentName}</span>
                    </div>
                )}
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