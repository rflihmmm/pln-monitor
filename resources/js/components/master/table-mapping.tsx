import KendoGrid from "@/components/ui/kendo-grid";
import * as ReactDOM from 'react-dom/client';
import { router } from "@inertiajs/react";
import { useState } from "react";
import { Edit, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MappingDialog from "@/components/master/dialog-mapping";
import { type Keypoint, Mapping } from "@/types";

interface TableMappingProps {
    datas: any[];
    keypointsList: Keypoint[];
}

// [FIX] Komponen ActionDialog sudah tidak diperlukan dan bisa dihapus.

export default function TableMapping({
    datas,
    keypointsList,
}: TableMappingProps) {
    const [isAddMappingOpen, setIsAddMappingOpen] = useState(false);
    const [isEditMappingOpen, setIsEditMappingOpen] = useState(false);
    const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);

    // --- [FIX] Logika dipindahkan ke komponen utama ---

    // Membuka dialog untuk mengedit mapping
    const openEditDialog = (mapping: Mapping) => {
        setEditingMapping(mapping);
        setIsEditMappingOpen(true);
    };

    // Menangani penambahan mapping baru
    const handleAddMapping = (mappingData: any) => {
        const submitData = {
            keypoints: mappingData.keypoints,
            ulp: mappingData.ulp,
        };
        router.post(route("master.mapping.store"), submitData, {
            onSuccess: () => setIsAddMappingOpen(false),
            onError: (errors) => alert("Error: " + JSON.stringify(errors)),
        });
    };

    // Menangani pengeditan mapping
    const handleEditMapping = (mappingData: any) => {
        if (!editingMapping) return;

        const submitData = {
            keypoint: mappingData.keypoints?.[0] ?? mappingData.keypoint,
            ulp: mappingData.ulp,
        };

        router.put(route("master.mapping.update", editingMapping.id), submitData, {
            onSuccess: () => {
                setIsEditMappingOpen(false);
                setEditingMapping(null);
            },
            onError: (errors) => alert("Error: " + JSON.stringify(errors)),
        });
    };

    // Menangani penghapusan mapping
    const handleDeleteMapping = (mappingId: number) => {
        if (confirm("Are you sure you want to delete this mapping?")) {
            router.delete(route("master.mapping.destroy", mappingId));
        }
    };

    // --- [FIX] Fungsi untuk me-render tombol aksi ---
    const renderActions = (dataItem: any) => {
        return (
            <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" onClick={() => openEditDialog(dataItem)}>
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteMapping(dataItem.id)}>
                    <Trash className="h-4 w-4" />
                </Button>
            </div>

        )
    };

    const config = {
        columns: [{
            title: "Keypoint",
            field: "keypoint"
        }, {
            title: "Feeder",
            field: "feeder"
        }, {
            title: "Gardu Induk",
            field: "gardu_induk"
        }, {
            title: "ULP",
            field: "ulp",
        }, {
            title: "UP3",
            field: "up3",
        }, {
            title: "DCC",
            field: "dcc",
        }, {
            title: "Parent Keypoint",
            field: "parent_keypoint",
        }, {
            title: "Coordinate",
            field: "coordinate"
        }, {
            title: "Actions",
            width: "120px",
            template: (dataItem: any) => `<div id="aksi-dropdown-${dataItem.id}"></div>`,
            filterable: false,
            sortable: false,
            attributes: { style: "text-align: center;" }
        }],
        dataSource: {
            data: datas,
            pageSize: 10,
            group: [{ field: "dcc" }, { field: "up3" }, { field: "ulp" }],
            // ...properti lain seperti pageable, sortable, dll.
        },
        dataBound: (e: any) => {
            const grid = e.sender;
            const view = grid.dataSource.view();

            // Fungsi rekursif untuk menelusuri data yang di-grouping
            // dcc
            view.forEach((item: any) => {
                if (item.hasSubgroups) {
                    // up3
                    const ups = item.items;
                    ups.forEach((up: any) => {
                        up.items.forEach((subItem: any) => {
                            const ulps = subItem.items;

                            ulps.forEach((ulp: any) => {
                                const container = document.getElementById(`aksi-dropdown-${ulp.id}`);

                                if (container) {
                                    const root = ReactDOM.createRoot(container);
                                    root.render(
                                        renderActions(item)
                                    );
                                }
                            });

                        });

                    })
                }
            });
        }
    };


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
            <KendoGrid config={config} />

            {/* Dialog untuk Tambah Mapping */}
            <MappingDialog
                isOpen={isAddMappingOpen}
                onOpenChange={setIsAddMappingOpen}
                onSubmit={handleAddMapping}
                keypointsList={keypointsList}
                isEdit={false}
            />

            {/* Dialog untuk Edit Mapping */}
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