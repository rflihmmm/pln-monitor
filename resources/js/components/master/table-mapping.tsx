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
        router.post(
            route("master.mapping.store"),
            {
                keypoint: mappingData.keypoint,
                dcc: mappingData.dcc,
                up3: mappingData.up3,
                ulp: mappingData.ulp,
                coordinate: mappingData.coordinate,
            },
            {
                onSuccess: () => {
                    setIsAddMappingOpen(false);
                },
            }
        );
    };

    // Handle editing a mapping
    const handleEditMapping = (mappingData: any) => {
        if (!editingMapping) return;

        router.put(
            route("master.mapping.update", editingMapping.id),
            {
                keypoint: mappingData.keypoint,
                dcc: mappingData.dcc,
                up3: mappingData.up3,
                ulp: mappingData.ulp,
                coordinate: mappingData.coordinate,
            },
            {
                onSuccess: () => {
                    setIsEditMappingOpen(false);
                    setEditingMapping(null);
                },
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
            //editor: ulpDropdownEditor
        }, {
            title: "UP3",
            width: "100px",
            field: "up3",
            //editor: up3DropdownEditor
        }, {
            title: "DCC",
            width: "100px",
            field: "dcc",
            //editor: dccDropdownEditor
        }, {
            title: "Coordinate",
            width: "100px",
            field: "coordinate"
        }, {
            command: "destroy",
            title: "&nbsp;",
            width: "80px"
        }],
        dataSource: {
            data: datas,
            pageSize: 10,
            pageable: true,
            sortable: true,
            filterable: true,
            resizable: true,
            //editable: "popup",
            scrollable: true,
            total: 0,
            group: [{
                field: "dcc"
            }, {
                field: "up3"
            }, {
                field: "ulp"
            }
            ],
            //batch: true,
        },
        //editable: true,
        //toolbar: ["create", "save", "cancel"],
    }

    // function dccDropdownEditor(container: HTMLElement, options: any) {
    //     window.kendo.jQuery('<input data-bind="value:' + options.field + '" />')
    //         .appendTo(container)
    //         .kendoDropDownList({
    //             dataTextField: "name",
    //             dataValueField: "id",
    //             filter: "contains",
    //             dataSource: {
    //                 transport: {
    //                     read: "organization-grid/dcc"
    //                 }
    //             }
    //         });
    // }
    // function up3DropdownEditor(container: HTMLElement, options: any) {
    //     window.kendo.jQuery('<input data-bind="value:' + options.field + '" />')
    //         .appendTo(container)
    //         .kendoDropDownList({
    //             dataTextField: "name",
    //             dataValueField: "id",
    //             filter: "contains",
    //             dataSource: {
    //                 transport: {
    //                     read: "organization-grid/up3"
    //                 }
    //             }
    //         });
    // }
    // function ulpDropdownEditor(container: HTMLElement, options: any) {
    //     window.kendo.jQuery('<input data-bind="value:' + options.field + '" />')
    //         .appendTo(container)
    //         .kendoDropDownList({
    //             dataTextField: "name",
    //             dataValueField: "id",
    //             filter: "contains",
    //             dataSource: {
    //                 transport: {
    //                     read: "organization-grid/ulp"
    //                 }
    //             }
    //         });
    // }


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