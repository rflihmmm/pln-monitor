import { router} from "@inertiajs/react"
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
import GarduIndukDialog from "@/components/master/gardu-induk-dialog"

// Define GarduInduk type based on the schema
interface GarduInduk {
  id: number
  name: string
  description: string | null
  created_at: string
}

interface TableGarduIndukProps {
  garduIndukList: GarduInduk[]
}

export default function TableGarduInduk({ garduIndukList: initialGarduInduk }: TableGarduIndukProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddGarduOpen, setIsAddGarduOpen] = useState(false)
  const [isEditGarduOpen, setIsEditGarduOpen] = useState(false)
  const [editingGardu, setEditingGardu] = useState<GarduInduk | null>(null)

  // Filter gardu induk based on search term
  const filteredGarduInduk = initialGarduInduk.filter((gardu) => {
    return (
      gardu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (gardu.description && gardu.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
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

  // Handle adding a new gardu induk
  const handleAddGardu = (garduData: any) => {
    router.post(
      route("gardu-induk.store"),
      {
        name: garduData.name,
        description: garduData.description,
      },
      {
        onSuccess: () => {
          setIsAddGarduOpen(false)
        },
      },
    )
  }

  // Handle editing a gardu induk
  const handleEditGardu = (garduData: any) => {
    if (!editingGardu) return

    router.put(
      route("gardu-induk.update", editingGardu.id),
      {
        name: garduData.name,
        description: garduData.description,
      },
      {
        onSuccess: () => {
          setIsEditGarduOpen(false)
          setEditingGardu(null)
        },
      },
    )
  }

  // Open edit dialog for a gardu induk
  const openEditDialog = (gardu: GarduInduk) => {
    setEditingGardu({ ...gardu })
    setIsEditGarduOpen(true)
  }

  // Handle deleting a gardu induk
  const handleDeleteGardu = (garduId: number) => {
    if (confirm("Are you sure you want to delete this substation?")) {
      router.delete(route("gardu-induk.destroy", garduId))
    }
  }

  return (
    <div>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search substations..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="flex items-center gap-1" onClick={() => setIsAddGarduOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Substation
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGarduInduk.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    No substations found matching your search
                  </TableCell>
                </TableRow>
              ) : (
                filteredGarduInduk.map((gardu) => (
                  <TableRow key={gardu.id}>
                    <TableCell>{gardu.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{gardu.name}</div>
                    </TableCell>
                    <TableCell>{gardu.description || "-"}</TableCell>
                    <TableCell>{formatDate(gardu.created_at)}</TableCell>
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
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(gardu)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Substation
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => handleDeleteGardu(gardu.id)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Substation
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
            Showing <strong>{filteredGarduInduk.length}</strong> of <strong>{initialGarduInduk.length}</strong>{" "}
            substations
          </div>
        </div>
      </div>

      {/* Add Gardu Induk Dialog */}
      <GarduIndukDialog
        isOpen={isAddGarduOpen}
        onOpenChange={setIsAddGarduOpen}
        onSubmit={handleAddGardu}
        isEdit={false}
      />

      {/* Edit Gardu Induk Dialog */}
      <GarduIndukDialog
        isOpen={isEditGarduOpen}
        onOpenChange={setIsEditGarduOpen}
        onSubmit={handleEditGardu}
        garduInduk={editingGardu}
        isEdit={true}
      />
    </div>
  )
}

