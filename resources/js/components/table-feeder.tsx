import { router } from "@inertiajs/react"
import { Edit, MoreHorizontal, Plus, Search, Trash } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

// Define Feeder and GarduInduk types based on the schema
interface GarduInduk {
  id: number
  name: string
}

interface Feeder {
  id: number
  name: string
  description: string | null
  gardu_induk_id: number
  created_at: string
  gardu_induk?: GarduInduk
}

interface TableFeederProps {
  feederList: Feeder[]
  garduIndukList: GarduInduk[]
}

export default function TableFeeder({ feederList: initialFeeders, garduIndukList }: TableFeederProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [garduFilter, setGarduFilter] = useState<string>("all")
  const [isAddFeederOpen, setIsAddFeederOpen] = useState(false)
  const [isEditFeederOpen, setIsEditFeederOpen] = useState(false)
  const [newFeeder, setNewFeeder] = useState<Partial<Feeder>>({
    name: "",
    description: "",
    gardu_induk_id: 0,
  })
  const [editingFeeder, setEditingFeeder] = useState<Feeder | null>(null)

  // Filter feeders based on search term and filters
  const filteredFeeders = initialFeeders.filter((feeder) => {
    const matchesSearch =
      feeder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feeder.description && feeder.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesGardu = garduFilter === "all" || feeder.gardu_induk_id.toString() === garduFilter

    return matchesSearch && matchesGardu
  })

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Get gardu induk name by id
  const getGarduName = (garduId: number) => {
    const gardu = garduIndukList.find((g) => g.id === garduId)
    return gardu ? gardu.name : "Unknown"
  }

  // Handle adding a new feeder
  const handleAddFeeder = () => {
    if (!newFeeder.name || !newFeeder.gardu_induk_id) return

    router.post(
      "/feeder",
      {
        name: newFeeder.name,
        description: newFeeder.description,
        gardu_induk_id: newFeeder.gardu_induk_id,
      },
      {
        onSuccess: () => {
          setIsAddFeederOpen(false)
          setNewFeeder({
            name: "",
            description: "",
            gardu_induk_id: 0,
          })
        },
      },
    )
  }

  // Handle editing a feeder
  const handleEditFeeder = () => {
    if (!editingFeeder || !editingFeeder.name || !editingFeeder.gardu_induk_id) return

    router.put(
      `/feeder/${editingFeeder.id}`,
      {
        name: editingFeeder.name,
        description: editingFeeder.description,
        gardu_induk_id: editingFeeder.gardu_induk_id,
      },
      {
        onSuccess: () => {
          setIsEditFeederOpen(false)
          setEditingFeeder(null)
        },
      },
    )
  }

  // Open edit dialog for a feeder
  const openEditDialog = (feeder: Feeder) => {
    setEditingFeeder({ ...feeder })
    setIsEditFeederOpen(true)
  }

  // Handle deleting a feeder
  const handleDeleteFeeder = (feederId: number) => {
    if (confirm("Are you sure you want to delete this feeder?")) {
      router.delete(`/feeder/${feederId}`)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mt-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search feeders..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={garduFilter} onValueChange={setGarduFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by substation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Substations</SelectItem>
                {garduIndukList.map((gardu) => (
                  <SelectItem key={gardu.id} value={gardu.id.toString()}>
                    {gardu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddFeederOpen} onOpenChange={setIsAddFeederOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Add Feeder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Feeder</DialogTitle>
                  <DialogDescription>Fill in the details to add a new feeder to the system.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newFeeder.name}
                      onChange={(e) => setNewFeeder({ ...newFeeder, name: e.target.value })}
                      placeholder="Feeder Name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newFeeder.description || ""}
                      onChange={(e) => setNewFeeder({ ...newFeeder, description: e.target.value })}
                      placeholder="Feeder description (optional)"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gardu_induk_id">Substation</Label>
                    <Select
                      value={newFeeder.gardu_induk_id ? newFeeder.gardu_induk_id.toString() : ""}
                      onValueChange={(value) => setNewFeeder({ ...newFeeder, gardu_induk_id: Number.parseInt(value) })}
                    >
                      <SelectTrigger id="gardu_induk_id">
                        <SelectValue placeholder="Select substation" />
                      </SelectTrigger>
                      <SelectContent>
                        {garduIndukList.map((gardu) => (
                          <SelectItem key={gardu.id} value={gardu.id.toString()}>
                            {gardu.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddFeederOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddFeeder}>Add Feeder</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Substation</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeeders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    No feeders found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredFeeders.map((feeder) => (
                  <TableRow key={feeder.id}>
                    <TableCell>{feeder.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{feeder.name}</div>
                    </TableCell>
                    <TableCell>{feeder.description || "-"}</TableCell>
                    <TableCell>{getGarduName(feeder.gardu_induk_id)}</TableCell>
                    <TableCell>{formatDate(feeder.created_at)}</TableCell>
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
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(feeder)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Feeder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => handleDeleteFeeder(feeder.id)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Feeder
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
            Showing <strong>{filteredFeeders.length}</strong> of <strong>{initialFeeders.length}</strong> feeders
          </div>
        </div>
      </div>

      {/* Edit Feeder Dialog */}
      <Dialog open={isEditFeederOpen} onOpenChange={setIsEditFeederOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Feeder</DialogTitle>
            <DialogDescription>Update feeder information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editingFeeder?.name || ""}
                onChange={(e) => setEditingFeeder(editingFeeder ? { ...editingFeeder, name: e.target.value } : null)}
                placeholder="Feeder Name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingFeeder?.description || ""}
                onChange={(e) =>
                  setEditingFeeder(editingFeeder ? { ...editingFeeder, description: e.target.value } : null)
                }
                placeholder="Feeder description (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-gardu">Substation</Label>
              <Select
                value={editingFeeder?.gardu_induk_id.toString() || ""}
                onValueChange={(value) =>
                  setEditingFeeder(editingFeeder ? { ...editingFeeder, gardu_induk_id: Number.parseInt(value) } : null)
                }
              >
                <SelectTrigger id="edit-gardu">
                  <SelectValue placeholder="Select substation" />
                </SelectTrigger>
                <SelectContent>
                  {garduIndukList.map((gardu) => (
                    <SelectItem key={gardu.id} value={gardu.id.toString()}>
                      {gardu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFeederOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditFeeder}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

