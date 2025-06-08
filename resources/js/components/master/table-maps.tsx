import { router } from "@inertiajs/react";
import { Edit, MoreHorizontal, Plus, Search, Trash } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MapsDialog from "@/components/master/maps-dialog";
import { type Keypoint, MapsData } from "@/types";

interface TableMapsProps {
  mapsDataList: MapsData[];
  keypointsList: Keypoint[];
}

export default function TableMaps({
  mapsDataList: initialMapsData,
  keypointsList,
}: TableMapsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddMapsOpen, setIsAddMapsOpen] = useState(false);
  const [isEditMapsOpen, setIsEditMapsOpen] = useState(false);
  const [editingMapsData, setEditingMapsData] = useState<MapsData | null>(null);

  // Filter maps data based on search term
  const filteredMapsData = initialMapsData.filter((mapsData) => {
    const matchesSearch =
      mapsData.no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapsData.ulp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapsData.up3?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapsData.dcc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapsData.lokasi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getKeypointName(mapsData.keypoint_id).toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getKeypointName = (keypointId: number) => {
    const keypoint = keypointsList.find((k) => k.keypoint_id === keypointId);
    return keypoint ? keypoint.name : "Unknown";
  };

  // Handle adding a new maps data
  const handleAddMapsData = (mapsData: any) => {
    router.post(
      route("master.maps.store"),
      {
        no: mapsData.no,
        keypoint_id: mapsData.keypoint_id,
        ulp: mapsData.ulp,
        up3: mapsData.up3,
        dcc: mapsData.dcc,
        lokasi: mapsData.lokasi,
      },
      {
        onSuccess: () => {
          setIsAddMapsOpen(false);
        },
      }
    );
  };

  // Handle editing a maps data
  const handleEditMapsData = (mapsData: any) => {
    if (!editingMapsData) return;

    router.put(
      route("master.maps.update", editingMapsData.id),
      {
        no: mapsData.no,
        keypoint_id: mapsData.keypoint_id,
        ulp: mapsData.ulp,
        up3: mapsData.up3,
        dcc: mapsData.dcc,
        lokasi: mapsData.lokasi,
      },
      {
        onSuccess: () => {
          setIsEditMapsOpen(false);
          setEditingMapsData(null);
        },
      }
    );
  };

  // Open edit dialog for a maps data
  const openEditDialog = (mapsData: MapsData) => {
    setEditingMapsData({ ...mapsData });
    setIsEditMapsOpen(true);
  };

  // Handle deleting a maps data
  const handleDeleteMapsData = (mapsDataId: number) => {
    if (confirm("Are you sure you want to delete this maps data?")) {
      router.delete(route("master.maps.destroy", mapsDataId));
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mt-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search maps data..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex items-center gap-1"
              onClick={() => setIsAddMapsOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Maps Data
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>No</TableHead>
                <TableHead>Keypoint</TableHead>
                <TableHead>ULP</TableHead>
                <TableHead>UP3</TableHead>
                <TableHead>DCC</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMapsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                    No maps data found matching your search
                  </TableCell>
                </TableRow>
              ) : (
                filteredMapsData.map((mapsData) => (
                  <TableRow key={mapsData.id}>
                    <TableCell>{mapsData.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{mapsData.no || "-"}</div>
                    </TableCell>
                    <TableCell>{getKeypointName(mapsData.keypoint_id)}</TableCell>
                    <TableCell>{mapsData.ulp || "-"}</TableCell>
                    <TableCell>{mapsData.up3 || "-"}</TableCell>
                    <TableCell>{mapsData.dcc || "-"}</TableCell>
                    <TableCell>{mapsData.lokasi || "-"}</TableCell>
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
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => openEditDialog(mapsData)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Maps Data
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => handleDeleteMapsData(mapsData.id ?? 0)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Maps Data
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
            Showing <strong>{filteredMapsData.length}</strong> of{" "}
            <strong>{initialMapsData.length}</strong> maps data
          </div>
        </div>
      </div>

      {/* Add Maps Data Dialog */}
      <MapsDialog
        isOpen={isAddMapsOpen}
        onOpenChange={setIsAddMapsOpen}
        onSubmit={handleAddMapsData}
        keypointsList={keypointsList}
        isEdit={false}
      />

      {/* Edit Maps Data Dialog */}
      <MapsDialog
        isOpen={isEditMapsOpen}
        onOpenChange={setIsEditMapsOpen}
        onSubmit={handleEditMapsData}
        mapsData={editingMapsData}
        keypointsList={keypointsList}
        isEdit={true}
      />
    </div>
  );
}