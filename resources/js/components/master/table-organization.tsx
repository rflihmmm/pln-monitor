import { router } from "@inertiajs/react"
import { Edit, MoreHorizontal, Plus, Search, Trash } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import OrganizationDialog from "@/components/master/dialog-organization"

interface Organization {
    id: number
    name: string
    level: number
    parent_id: number | null
    address: string | null
    coordinate: string | null
    parent?: Organization
}

interface TableOrganizationProps {
    organizationList: Organization[]
}

export default function TableOrganization({ organizationList: initialOrganizations }: TableOrganizationProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [levelFilter, setLevelFilter] = useState("")
    const [isAddOrgOpen, setIsAddOrgOpen] = useState(false)
    const [isEditOrgOpen, setIsEditOrgOpen] = useState(false)
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null)

    const levelOptions = [
        { value: "1", label: "1 : DCC" },
        { value: "2", label: "2 : UP3" },
        { value: "3", label: "3 : ULP" },
    ]

    const getLevelName = (level: number) => {
        const levels = {
            1: "DCC",
            2: "UP3",
            3: "ULP"
        }
        return levels[level as keyof typeof levels] || "Unknown"
    }

    // Filter organizations based on search term and level filter
    const filteredOrganizations = initialOrganizations.filter((org) => {
        const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (org.address && org.address.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesLevel = levelFilter === "all" || levelFilter === "" || org.level.toString() === levelFilter

        return matchesSearch && matchesLevel
    })

    // Format date to readable format
    const formatDate = (dateString: string) => {
        if (!dateString) return "-"
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return "-"
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        }).format(date)
    }

    // Handle adding a new organization
    const handleAddOrg = (orgData: any) => {
        router.post(
            route("master.organization.store"),
            {
                name: orgData.name,
                level: orgData.level,
                parent_id: orgData.parent_id,
                address: orgData.address,
                coordinate: orgData.coordinate,
            },
            {
                onSuccess: () => {
                    setIsAddOrgOpen(false)
                    window.location.reload()
                },
                preserveScroll: true,
            },
        )
    }

    // Handle editing an organization
    const handleEditOrg = (orgData: any) => {
        if (!editingOrg) return

        router.put(
            route("master.organization.update", editingOrg.id),
            {
                name: orgData.name,
                level: orgData.level,
                parent_id: orgData.parent_id,
                address: orgData.address,
                coordinate: orgData.coordinate,
            },
            {
                onSuccess: () => {
                    setIsEditOrgOpen(false)
                    setEditingOrg(null)
                    window.location.reload()
                },
                preserveScroll: true,
            },
        )
    }

    // Open edit dialog for an organization
    const openEditDialog = (org: Organization) => {
        setEditingOrg({ ...org })
        setIsEditOrgOpen(true)
    }

    // Handle deleting an organization
    const handleDeleteOrg = (orgId: number) => {
        if (confirm("Are you sure you want to delete this organization?")) {
            router.delete(route("master.organization.destroy", orgId), {
                onSuccess: () => window.location.reload(),
                preserveScroll: true,
            })
        }
    }

    return (
        <div>
            <div className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="relative w-full sm:w-64">
                            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                            <Input
                                type="search"
                                placeholder="Search organizations..."
                                className="w-full pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={levelFilter} onValueChange={setLevelFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" key="all">All Levels</SelectItem>
                                {levelOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button className="flex items-center gap-1" onClick={() => setIsAddOrgOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Add Organization
                    </Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Parent</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Coordinate</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrganizations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                                        No organizations found matching your search criteria
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrganizations.map((org) => (
                                    <TableRow key={org.id}>
                                        <TableCell>{org.id}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{org.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{org.level}</span>
                                                <span className="text-muted-foreground">: {getLevelName(org.level)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{org.parent?.name || "-"}</TableCell>
                                        <TableCell>{org.address || "-"}</TableCell>
                                        <TableCell>{org.coordinate || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(org)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit Organization
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive cursor-pointer"
                                                        onClick={() => handleDeleteOrg(org.id)}
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Delete Organization
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-sm">
                        Showing <strong>{filteredOrganizations.length}</strong> of <strong>{initialOrganizations.length}</strong>{" "}
                        organizations
                    </div>
                </div>
            </div>

            {/* Add Organization Dialog */}
            <OrganizationDialog
                isOpen={isAddOrgOpen}
                onOpenChange={setIsAddOrgOpen}
                onSubmit={handleAddOrg}
                organizations={initialOrganizations}
                isEdit={false}
            />

            {/* Edit Organization Dialog */}
            <OrganizationDialog
                isOpen={isEditOrgOpen}
                onOpenChange={setIsEditOrgOpen}
                onSubmit={handleEditOrg}
                organization={editingOrg}
                organizations={initialOrganizations}
                isEdit={true}
            />
        </div>
    )
}