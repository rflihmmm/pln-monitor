import { router } from "@inertiajs/react"
import { Edit, MoreHorizontal, Plus, Search, Trash } from "lucide-react"
import { useState, useEffect } from "react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

// Define types based on the schema
interface GarduInduk {
  id: number
  name: string
}

interface KeyPoint {
  id: number
  name: string
}

interface Feeder {
  id: number
  name: string
  description: string | null
  gardu_induk_id: number
  keypoints: number[]
  status_points: {
    pmt: number
    apm: number
    mw: number
  }
  created_at: string
  gardu_induk?: GarduInduk
}

interface TableFeederProps {
  feederList: Feeder[]
  garduIndukList: GarduInduk[]
  keyPointList: KeyPoint[]
  statusList: { id: number, name: string }[]
}

export default function TableFeeder({
  feederList: initialFeeders,
  garduIndukList,
    keyPointList = [
    { id: 1, name: "Pare" },
    { id: 2, name: "Wajo" },
    { id: 3, name: "Pangkep" },
    { id: 4, name: "Maros" },
    { id: 5, name: "Gowa" },
    { id: 6, name: "Takalar" },
    { id: 7, name: "Jeneponto" },
    { id: 8, name: "Bantaeng" },
    { id: 9, name: "Bulukumba" },
    { id: 10, name: "Sinjai" },
    { id: 11, name: "Bone" },
    { id: 12, name: "Soppeng" },
    { id: 13, name: "Barru" },
    { id: 14, name: "Pinrang" },
    { id: 15, name: "Enrekang" },
    { id: 16, name: "Tana Toraja" },
    { id: 17, name: "Toraja Utara" },
    { id: 18, name: "Luwu" },
    { id: 19, name: "Luwu Utara" },
    { id: 20, name: "Luwu Timur" }
],
  statusList = []
}: TableFeederProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [garduFilter, setGarduFilter] = useState<string>("all")
  const [isAddFeederOpen, setIsAddFeederOpen] = useState(false)
  const [isEditFeederOpen, setIsEditFeederOpen] = useState(false)
  const [newFeeder, setNewFeeder] = useState<Partial<Feeder>>({
    name: "",
    description: "",
    gardu_induk_id: 0,
    keypoints: [],
    status_points: {
      pmt: 0,
      apm: 0,
      mw: 0
    }
  })
  const [editingFeeder, setEditingFeeder] = useState<Feeder | null>(null)
  const [selectedKeypoints, setSelectedKeypoints] = useState<number[]>([])

  // Add states for keypoint search
  const [keypointSearchTerm, setKeypointSearchTerm] = useState("")
  const [editKeypointSearchTerm, setEditKeypointSearchTerm] = useState("")

  // Filter keypoints based on search terms
  const filteredKeypoints = keyPointList.filter((keypoint) =>
    keypoint.name.toLowerCase().includes(keypointSearchTerm.toLowerCase())
  )

  const filteredEditKeypoints = keyPointList.filter((keypoint) =>
    keypoint.name.toLowerCase().includes(editKeypointSearchTerm.toLowerCase())
  )

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

  // Handle keypoint selection
  const handleKeypointChange = (keypointId: string, isNew = true) => {
    const id = parseInt(keypointId)
    if (isNew) {
      // For new feeder
      const updatedKeypoints = [...(newFeeder.keypoints || [])]
      if (updatedKeypoints.includes(id)) {
        const filtered = updatedKeypoints.filter((kp) => kp !== id)
        setNewFeeder({ ...newFeeder, keypoints: filtered })
      } else {
        updatedKeypoints.push(id)
        setNewFeeder({ ...newFeeder, keypoints: updatedKeypoints })
      }
    } else {
      // For editing feeder
      if (editingFeeder) {
        const updatedKeypoints = [...(selectedKeypoints || [])]
        if (updatedKeypoints.includes(id)) {
          const filtered = updatedKeypoints.filter((kp) => kp !== id)
          setSelectedKeypoints(filtered)
          setEditingFeeder({ ...editingFeeder, keypoints: filtered })
        } else {
          updatedKeypoints.push(id)
          setSelectedKeypoints(updatedKeypoints)
          setEditingFeeder({ ...editingFeeder, keypoints: updatedKeypoints })
        }
      }
    }
  }

  // Reset search terms when dialogs close
  useEffect(() => {
    if (!isAddFeederOpen) {
      setKeypointSearchTerm("")
    }
    if (!isEditFeederOpen) {
      setEditKeypointSearchTerm("")
    }
  }, [isAddFeederOpen, isEditFeederOpen])

  // Handle adding a new feeder
  const handleAddFeeder = () => {
    if (!newFeeder.name || !newFeeder.gardu_induk_id) return

    router.post(
      route('feeder.store'),
      {
        name: newFeeder.name,
        description: newFeeder.description,
        gardu_induk_id: newFeeder.gardu_induk_id,
        keypoints: newFeeder.keypoints,
        status_points: newFeeder.status_points
      },
      {
        onSuccess: () => {
          setIsAddFeederOpen(false)
          setNewFeeder({
            name: "",
            description: "",
            gardu_induk_id: 0,
            keypoints: [],
            status_points: {
              pmt: 0,
              apm: 0,
              mw: 0
            }
          })
          setKeypointSearchTerm("")
        },
      },
    )
  }

  // Handle editing a feeder
  const handleEditFeeder = () => {
    if (!editingFeeder || !editingFeeder.name || !editingFeeder.gardu_induk_id) return

    router.put(
      route('feeder.update', editingFeeder.id),
      {
        name: editingFeeder.name,
        description: editingFeeder.description,
        gardu_induk_id: editingFeeder.gardu_induk_id,
        keypoints: editingFeeder.keypoints,
        status_points: editingFeeder.status_points
      },
      {
        onSuccess: () => {
          setIsEditFeederOpen(false)
          setEditingFeeder(null)
          setSelectedKeypoints([])
          setEditKeypointSearchTerm("")
        },
      },
    )
  }

  // Open edit dialog for a feeder
  const openEditDialog = (feeder: Feeder) => {
    setEditingFeeder({ ...feeder })
    setSelectedKeypoints(feeder.keypoints || [])
    setIsEditFeederOpen(true)
  }

  // Handle deleting a feeder
  const handleDeleteFeeder = (feederId: number) => {
    if (confirm("Are you sure you want to delete this feeder?")) {
      router.delete(route("feeder.destroy", feederId))
    }
  }

  // Helper to check if a keypoint is selected
  const isKeypointSelected = (keypointId: number, isNew = true) => {
    if (isNew) {
      return newFeeder.keypoints?.includes(keypointId) || false
    } else {
      return selectedKeypoints.includes(keypointId)
    }
  }

  // Format selected keypoints as string for display
  const formatKeypoints = (keypointIds: number[]) => {
    if (!keypointIds || keypointIds.length === 0) return "-"
    const selectedPoints = keyPointList
      .filter(kp => keypointIds.includes(kp.id))
      .map(kp => kp.name)
    return selectedPoints.join(", ")
  }

  // Handle status point changes
  const handleStatusPointChange = (type: 'pmt' | 'apm' | 'mw', value: string, isNew = true) => {
    const statusId = parseInt(value)
    if (isNew) {
      setNewFeeder({
        ...newFeeder,
        status_points: {
          ...newFeeder.status_points,
          [type]: statusId
        }
      })
    } else if (editingFeeder) {
      setEditingFeeder({
        ...editingFeeder,
        status_points: {
          ...editingFeeder.status_points,
          [type]: statusId
        }
      })
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
              <DialogContent className="sm:max-w-[525px]">
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

                  {/* Keypoints Selection with Search */}
                  <div className="grid gap-2">
                    <Label>Keypoints</Label>
                    <div className="border rounded-md p-3">
                      {/* Add search input for keypoints */}
                      <div className="relative mb-3">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                          type="search"
                          placeholder="Search keypoints..."
                          className="w-full pl-8"
                          value={keypointSearchTerm}
                          onChange={(e) => setKeypointSearchTerm(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {filteredKeypoints.length > 0 ? (
                          filteredKeypoints.map((keypoint) => (
                            <div
                              key={keypoint.id}
                              className={`px-3 py-1 rounded-full border cursor-pointer ${
                                isKeypointSelected(keypoint.id)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background"
                              }`}
                              onClick={() => handleKeypointChange(keypoint.id.toString())}
                            >
                              {keypoint.name}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No keypoints found</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Points */}
                  <div className="grid gap-4">
                    <Label>Status Points</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="pmt-status">PMT</Label>
                        <Select
                          value={newFeeder.status_points?.pmt?.toString() || "0"}
                          onValueChange={(value) => handleStatusPointChange('pmt', value)}
                        >
                          <SelectTrigger id="pmt-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {statusList.map((status) => (
                              <SelectItem key={`pmt-${status.id}`} value={status.id.toString()}>
                                {status.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="apm-status">APM</Label>
                        <Select
                          value={newFeeder.status_points?.apm?.toString() || "0"}
                          onValueChange={(value) => handleStatusPointChange('apm', value)}
                        >
                          <SelectTrigger id="apm-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {statusList.map((status) => (
                              <SelectItem key={`apm-${status.id}`} value={status.id.toString()}>
                                {status.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="mw-status">MW</Label>
                        <Select
                          value={newFeeder.status_points?.mw?.toString() || "0"}
                          onValueChange={(value) => handleStatusPointChange('mw', value)}
                        >
                          <SelectTrigger id="mw-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {statusList.map((status) => (
                              <SelectItem key={`mw-${status.id}`} value={status.id.toString()}>
                                {status.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
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
                <TableHead>Keypoints</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeeders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
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
                    <TableCell>{formatKeypoints(feeder.keypoints || [])}</TableCell>
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
        <DialogContent className="sm:max-w-[525px]">
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

            {/* Edit Keypoints Selection with Search */}
            <div className="grid gap-2">
              <Label>Keypoints</Label>
              <div className="border rounded-md p-3">
                {/* Add search input for keypoints in edit mode */}
                <div className="relative mb-3">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    type="search"
                    placeholder="Search keypoints..."
                    className="w-full pl-8"
                    value={editKeypointSearchTerm}
                    onChange={(e) => setEditKeypointSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {filteredEditKeypoints.length > 0 ? (
                    filteredEditKeypoints.map((keypoint) => (
                      <div
                        key={`edit-${keypoint.id}`}
                        className={`px-3 py-1 rounded-full border cursor-pointer ${
                          isKeypointSelected(keypoint.id, false)
                            ? "bg-primary text-primary-foreground"
                            : "bg-background"
                        }`}
                        onClick={() => handleKeypointChange(keypoint.id.toString(), false)}
                      >
                        {keypoint.name}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No keypoints found</p>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Status Points */}
            <div className="grid gap-4">
              <Label>Status Points</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-pmt-status">PMT</Label>
                  <Select
                    value={editingFeeder?.status_points?.pmt?.toString() || "0"}
                    onValueChange={(value) => handleStatusPointChange('pmt', value, false)}
                  >
                    <SelectTrigger id="edit-pmt-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {statusList.map((status) => (
                        <SelectItem key={`edit-pmt-${status.id}`} value={status.id.toString()}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-apm-status">APM</Label>
                  <Select
                    value={editingFeeder?.status_points?.apm?.toString() || "0"}
                    onValueChange={(value) => handleStatusPointChange('apm', value, false)}
                  >
                    <SelectTrigger id="edit-apm-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {statusList.map((status) => (
                        <SelectItem key={`edit-apm-${status.id}`} value={status.id.toString()}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-mw-status">MW</Label>
                  <Select
                    value={editingFeeder?.status_points?.mw?.toString() || "0"}
                    onValueChange={(value) => handleStatusPointChange('mw', value, false)}
                  >
                    <SelectTrigger id="edit-mw-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {statusList.map((status) => (
                        <SelectItem key={`edit-mw-${status.id}`} value={status.id.toString()}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
