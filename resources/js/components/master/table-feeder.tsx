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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import FeederDialog from "@/components/master/feeder-dialog";
import { type GarduInduk, Keypoint, StatusPoint, Feeder } from "@/types";

interface TableFeederProps {
  feederList: Feeder[];
  garduIndukList: GarduInduk[];
  keypointsList: Keypoint[];
  statusPointsList: StatusPoint[];
}

export default function TableFeeder({
  feederList: initialFeeders,
  garduIndukList,
  keypointsList,
  statusPointsList,
}: TableFeederProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [garduFilter, setGarduFilter] = useState<string>("all");
  const [isAddFeederOpen, setIsAddFeederOpen] = useState(false);
  const [isEditFeederOpen, setIsEditFeederOpen] = useState(false);
  const [editingFeeder, setEditingFeeder] = useState<Feeder | null>(null);

  // Filter feeders based on search term and substation filter
  const filteredFeeders = initialFeeders.filter((feeder) => {
    const matchesSearch =
      feeder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feeder.description &&
        feeder.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGardu =
      garduFilter === "all" ||
      feeder.gardu_induk_id.toString() === garduFilter;

    return matchesSearch && matchesGardu;
  });

  // Format date to "MMM DD, YYYY"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getGarduName = (garduId: number) => {
    const gardu = garduIndukList.find((g) => g.id === garduId);
    return gardu ? gardu.name : "Unknown";
  };

  // Fixed: Properly get keypoint names based on the feeder's keypoints
  const getKeypointNames = (feederKeypoints: Keypoint[]): string[] => {
    if (!feederKeypoints || feederKeypoints.length === 0) {
      return [];
    }
    
    return feederKeypoints.map(kp => kp.name || "Unknown");
  };

  // Fixed: Helper function to get status_id by type with null/undefined check
  function getStatusIdByType(statusPoints: StatusPoint[] | undefined, type: string): number {
    if (!statusPoints || !Array.isArray(statusPoints)) {
      return 0;
    }
    return statusPoints.find(sp => sp.type === type)?.status_id ?? 0;
  }

  // Fixed: Helper function to get name by type with null/undefined check
  function getStatusNameByType(statusPoints: StatusPoint[] | undefined, type: string): string {
    if (!statusPoints || !Array.isArray(statusPoints)) {
      return "-";
    }
    return statusPoints.find(sp => sp.type === type)?.name ?? "-";
  }

  // Handle adding a new feeder
  const handleAddFeeder = (feederData: any) => {
    router.post(
      route("master.feeder.store"),
      {
        name: feederData.name,
        description: feederData.description,
        gardu_induk_id: feederData.gardu_induk_id,
        keypoints: feederData.keypoints, // Array objek {keypoint_id, name}
        status_points: feederData.status_points, // Array objek {type, status_id, name}
      },
      {
        onSuccess: () => {
          setIsAddFeederOpen(false);
        },
      }
    );
  };

  // Handle editing a feeder
  const handleEditFeeder = (feederData: any) => {
    if (!editingFeeder) return;

    router.put(
      route("master.feeder.update", editingFeeder.id),
      {
        name: feederData.name,
        description: feederData.description,
        gardu_induk_id: feederData.gardu_induk_id,
        keypoints: feederData.keypoints,
        status_points: feederData.status_points,
      },
      {
        onSuccess: () => {
          setIsEditFeederOpen(false);
          setEditingFeeder(null);
        },
      }
    );
  };

  // Open edit dialog for a feeder
  const openEditDialog = (feeder: Feeder) => {
    setEditingFeeder({ ...feeder });
    setIsEditFeederOpen(true);
  };

  // Handle deleting a feeder
  const handleDeleteFeeder = (feederId: number) => {
    if (confirm("Are you sure you want to delete this feeder?")) {
      router.delete(route("master.feeder.destroy", feederId));
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
            <Button
              className="flex items-center gap-1"
              onClick={() => setIsAddFeederOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Feeder
            </Button>
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
                <TableHead>Status Points</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeeders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
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
                    <TableCell>
                      {feeder.keypoints && feeder.keypoints.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {getKeypointNames(feeder.keypoints).map((name, idx) => (
                            <Badge key={idx} variant="outline">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusIdByType(feeder.status_points, "PMT") > 0 && (
                          <Badge variant="secondary">
                            PMT: {getStatusNameByType(feeder.status_points, "PMT")}
                          </Badge>
                        )}
                        {getStatusIdByType(feeder.status_points, "APM") > 0 && (
                          <Badge variant="secondary">
                            APM: {getStatusNameByType(feeder.status_points, "APM")}
                          </Badge>
                        )}
                        {getStatusIdByType(feeder.status_points, "MW") > 0 && (
                          <Badge variant="secondary">
                            MW: {getStatusNameByType(feeder.status_points, "MW")}
                          </Badge>
                        )}
                        {(!feeder.status_points ||
                          !Array.isArray(feeder.status_points) ||
                          (getStatusIdByType(feeder.status_points, "PMT") === 0 &&
                            getStatusIdByType(feeder.status_points, "APM") === 0 &&
                            getStatusIdByType(feeder.status_points, "MW") === 0)) &&
                          "-"}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(feeder.created_at ?? "")}</TableCell>
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
                            onClick={() => openEditDialog(feeder)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Feeder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => handleDeleteFeeder(feeder.id ?? 0)}
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
            Showing <strong>{filteredFeeders.length}</strong> of{" "}
            <strong>{initialFeeders.length}</strong> feeders
          </div>
        </div>
      </div>

      {/* Add Feeder Dialog */}
      <FeederDialog
        isOpen={isAddFeederOpen}
        onOpenChange={setIsAddFeederOpen}
        onSubmit={handleAddFeeder}
        garduIndukList={garduIndukList}
        keypointsList={keypointsList}
        statusPointsList={statusPointsList}
        isEdit={false}
      />

      {/* Edit Feeder Dialog */}
      <FeederDialog
        isOpen={isEditFeederOpen}
        onOpenChange={setIsEditFeederOpen}
        onSubmit={handleEditFeeder}
        feeder={editingFeeder}
        garduIndukList={garduIndukList}
        keypointsList={keypointsList}
        statusPointsList={statusPointsList}
        isEdit={true}
      />
    </div>
  );
}