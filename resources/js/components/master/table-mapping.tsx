import KendoGrid from "@/components/ui/kendo-grid";
import { router } from "@inertiajs/react";
import { useState } from "react";
import { Edit, MoreHorizontal, Plus, Search, Trash } from "lucide-react";
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
import MappingDialog from "@/components/master/dialog-mapping";
import { type Keypoint, Mapping } from "@/types";

interface TableMappingProps {
    mappingList: Mapping[];
    keypointsList: Keypoint[];
    datas: any[];
}

export default function TableMapping({
    mappingList: initialMappings,
    datas,
    keypointsList,
}: TableMappingProps) {
    const [isAddMappingOpen, setIsAddMappingOpen] = useState(false);
    const [isEditMappingOpen, setIsEditMappingOpen] = useState(false);
    const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);

    // Handle adding a new mapping
    const handleAddMapping = (mappingData: any) => {
        console.log("Submitting mapping data:", mappingData);

        // Pastikan data sesuai dengan yang diharapkan backend
        const submitData = {
            keypoints: mappingData.keypoints, // Array keypoints
            dcc: mappingData.dcc,
            up3: mappingData.up3,
            ulp: mappingData.ulp,
            coordinate: mappingData.coordinate,
        };

        console.log("Final submit data:", submitData);

        router.post(
            route("master.mapping.store"),
            submitData,
            {
                onSuccess: (page) => {
                    console.log("Success:", page);
                    setIsAddMappingOpen(false);
                },
                onError: (errors) => {
                    console.error("Validation errors:", errors);
                    alert("Error: " + JSON.stringify(errors));
                },
                onFinish: () => {
                    console.log("Request finished");
                }
            }
        );
    };

    // Handle editing a mapping
    const handleEditMapping = (mappingData: any) => {
        if (!editingMapping) return;

        console.log("Editing mapping data:", mappingData);

        // Untuk edit, backend expect single keypoint
        const submitData = {
            keypoint: mappingData.keypoints && mappingData.keypoints.length > 0
                ? mappingData.keypoints[0]
                : mappingData.keypoint,
            dcc: mappingData.dcc,
            up3: mappingData.up3,
            ulp: mappingData.ulp,
            coordinate: mappingData.coordinate,
        };

        console.log("Final edit data:", submitData);

        router.put(
            route("master.mapping.update", editingMapping.id),
            submitData,
            {
                onSuccess: (page) => {
                    console.log("Edit success:", page);
                    setIsEditMappingOpen(false);
                    setEditingMapping(null);
                },
                onError: (errors) => {
                    console.error("Edit errors:", errors);
                    alert("Error: " + JSON.stringify(errors));
                },
                onFinish: () => {
                    console.log("Edit request finished");
                }
            }
        );
    };

    // Open edit dialog for a mapping
    const openEditDialog = (mapping: Mapping) => {
        setEditingMapping({ ...mapping });
        setIsEditMappingOpen(true);
    };

    // Handle deleting a mapping
    const handleDeleteMapping = (mappingId: number) => {
        if (confirm("Are you sure you want to delete this mapping?")) {
            router.delete(route("master.mapping.destroy", mappingId));
        }
    };

    const config = {
        columns: [{
            title: "Keypoint",
            width: "100px",
            field: "keypoint"
        }, {
            title: "Feeder",
            width: "100px",
            field: "feeder"
        }, {
            title: "Gardu Induk",
            width: "100px",
            field: "gardu_induk"
        }, {
            title: "ULP",
            width: "100px",
            field: "ulp",
        }, {
            title: "UP3",
            width: "100px",
            field: "up3",
        }, {
            title: "DCC",
            width: "100px",
            field: "dcc",
        }, {
            title: "Coordinate",
            width: "100px",
            field: "coordinate"
        }, {
            title: "Actions",
            width: "100px",
            template: (dataItem: any) => {
                return `
                    <div class="flex gap-2">
                        <button class="edit-btn text-blue-600 hover:text-blue-800" data-id="${dataItem.id}"
                        id="edit-btn-${dataItem.id}">
                            Edit
                        </button>
                        <button class="delete-btn text-red-600 hover:text-red-800" data-id="${dataItem.id}"
                        id="delete-btn-${dataItem.id}">
                            Delete
                        </button>
                    </div>
                `;
            }
        }],
        dataSource: {
            data: datas,
            pageSize: 10,
            pageable: true,
            sortable: true,
            filterable: true,
            resizable: true,
            scrollable: true,
            total: datas.length,
            group: [{
                field: "dcc"
            }, {
                field: "up3"
            }, {
                field: "ulp"
            }],
        },
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                    className="flex items-center gap-1"
                    onClick={() => setIsAddMappingOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    Add Mapping
                </Button>
            </div>
            <KendoGrid
                config={config}
            />
            {/* Add Mapping Dialog */}
            <MappingDialog
                isOpen={isAddMappingOpen}
                onOpenChange={setIsAddMappingOpen}
                onSubmit={handleAddMapping}
                keypointsList={keypointsList}
                isEdit={false}
            />

            {/* Edit Mapping Dialog */}
            <MappingDialog
                isOpen={isEditMappingOpen}
                onOpenChange={setIsEditMappingOpen}
                onSubmit={handleEditMapping}
                mapping={editingMapping}
                keypointsList={keypointsList}
                isEdit={true}
            />
        </div>
    );
}