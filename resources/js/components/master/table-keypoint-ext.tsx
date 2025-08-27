import { router } from "@inertiajs/react";
import { Edit, MoreHorizontal, Plus, Search, Trash } from "lucide-react";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
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
import KeypointExtDialog from "@/components/master/dialog-keypoint-ext";

interface KeypointExt {
    keypoint_id: number;
    coordinate?: string;
    alamat?: string;
    parent_stationpoints?: number;
    name?: string;
    parent_name?: string;
}

interface TableKeypointExtProps {
    keypointExtList: KeypointExt[];
}

export default function TableKeypointExt({
    keypointExtList: initialKeypointExts,
}: TableKeypointExtProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilters, setActiveFilters] = useState<string[]>([]); // State baru untuk filter aktif
    const [isAddKeypointExtOpen, setIsAddKeypointExtOpen] = useState(false);
    const [isEditKeypointExtOpen, setIsEditKeypointExtOpen] = useState(false);
    const [editingKeypointExt, setEditingKeypointExt] = useState<KeypointExt | null>(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25; // Maksimal 25 data per halaman

    const keypointTypes = ["GI", "REC", "LBS", "GH"]; // Opsi filter

    // Fungsi untuk toggle filter
    const handleFilterToggle = (filter: string) => {
        setActiveFilters((prevFilters) =>
            prevFilters.includes(filter)
                ? prevFilters.filter((f) => f !== filter) // Hapus filter jika sudah ada
                : [...prevFilters, filter] // Tambahkan filter jika belum ada
        );
        setCurrentPage(1); // Reset halaman ke 1 saat filter berubah
    };

    // Filter keypoint extensions berdasarkan search term dan filter aktif
    const filteredKeypointExts = useMemo(() => {
        return initialKeypointExts.filter((keypointExt) => {
            // Cek kecocokan dengan filter prefiks yang aktif
            const matchesFilter =
                activeFilters.length === 0 || // Tampilkan semua jika tidak ada filter aktif
                activeFilters.some((filter) => keypointExt.name?.startsWith(filter));

            // Cek kecocokan dengan search term
            const matchesSearch =
                !searchTerm || // Tampilkan semua jika search kosong
                (keypointExt.name && keypointExt.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (keypointExt.coordinate && keypointExt.coordinate.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (keypointExt.alamat && keypointExt.alamat.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (keypointExt.parent_name && keypointExt.parent_name.toLowerCase().includes(searchTerm.toLowerCase()));

            // Hasil harus cocok dengan kedua kriteria
            return matchesFilter && matchesSearch;
        });
    }, [initialKeypointExts, searchTerm, activeFilters]);

    // Pagination logic
    const totalPages = Math.ceil(filteredKeypointExts.length / itemsPerPage);
    const paginatedKeypointExts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredKeypointExts.slice(startIndex, endIndex);
    }, [filteredKeypointExts, currentPage, itemsPerPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Format date to "MMM DD, YYYY"
    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        }).format(date);
    };

    // Handle adding a new keypoint extension
    const handleAddKeypointExt = (keypointExtData: any) => {
        router.post(
            route("master.keypoint-ext.store"),
            {
                keypoint_id: keypointExtData.keypoint_id,
                coordinate: keypointExtData.coordinate,
                alamat: keypointExtData.alamat,
                parent_stationpoints: keypointExtData.parent_stationpoints,
            },
            {
                onSuccess: () => {
                    setIsAddKeypointExtOpen(false);
                },
            }
        );
    };

    // Handle editing a keypoint extension
    const handleEditKeypointExt = (keypointExtData: any) => {
        if (!editingKeypointExt) return;

        router.put(
            route("master.keypoint-ext.update", editingKeypointExt.keypoint_id),
            {
                keypoint_id: keypointExtData.keypoint_id,
                coordinate: keypointExtData.coordinate,
                alamat: keypointExtData.alamat,
                parent_stationpoints: keypointExtData.parent_stationpoints,
            },
            {
                onSuccess: () => {
                    setIsEditKeypointExtOpen(false);
                    setEditingKeypointExt(null);
                },
            }
        );
    };

    // Open edit dialog for a keypoint extension
    const openEditDialog = (keypointExt: KeypointExt) => {
        setEditingKeypointExt({ ...keypointExt });
        setIsEditKeypointExtOpen(true);
    };

    // Handle deleting a keypoint extension
    const handleDeleteKeypointExt = (keypointId: number) => {
        if (confirm("Are you sure you want to delete this keypoint extension?")) {
            router.delete(route("master.keypoint-ext.destroy", keypointId));
        }
    };

    return (
        <div>
            <div className="flex flex-col gap-4 mt-5">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex flex-col w-full gap-4 sm:flex-row sm:items-center">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                            <Input
                                type="search"
                                placeholder="Search keypoint extensions..."
                                className="w-full pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* Tombol Filter Baru */}
                        <div className="flex items-center gap-2">
                            {keypointTypes.map((type) => (
                                <Button
                                    key={type}
                                    variant={activeFilters.includes(type) ? "default" : "outline"}
                                    onClick={() => handleFilterToggle(type)}
                                    size="sm"
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </div>
                    {/* Tombol Add Keypoint */}
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            className="flex items-center w-full gap-1 sm:w-auto"
                            onClick={() => setIsAddKeypointExtOpen(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Add Keypoint Ext
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Keypoint ID</TableHead>
                                <TableHead>Keypoint Name</TableHead>
                                <TableHead>Coordinate</TableHead>
                                <TableHead>Alamat</TableHead>
                                <TableHead>Parent Station</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredKeypointExts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                                        No keypoint extensions found matching your search or filter
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedKeypointExts.map((keypointExt) => (
                                    <TableRow key={keypointExt.keypoint_id}>
                                        <TableCell>
                                            <div className="font-medium">{keypointExt.keypoint_id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{keypointExt.name || "-"}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-mono text-sm">
                                                {keypointExt.coordinate || "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-xs truncate" title={keypointExt.alamat}>
                                                {keypointExt.alamat || "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {keypointExt.parent_name || "-"}
                                        </TableCell>
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
                                                        onClick={() => openEditDialog(keypointExt)}
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit Keypoint Ext
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive cursor-pointer"
                                                        onClick={() => handleDeleteKeypointExt(keypointExt.keypoint_id)}
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Delete Keypoint Ext
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
                        Showing{" "}
                        <strong>
                            {(currentPage - 1) * itemsPerPage + 1} -{" "}
                            {Math.min(currentPage * itemsPerPage, filteredKeypointExts.length)}
                        </strong>{" "}
                        of <strong>{filteredKeypointExts.length}</strong> keypoint extensions
                    </div>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                                />
                            </PaginationItem>
                            {/* Render first page */}
                            {totalPages > 0 && (
                                <PaginationItem>
                                    <PaginationLink
                                        onClick={() => handlePageChange(1)}
                                        isActive={currentPage === 1}
                                    >
                                        1
                                    </PaginationLink>
                                </PaginationItem>
                            )}

                            {/* Render ellipsis if needed after first page */}
                            {currentPage > 3 && totalPages > 5 && (
                                <PaginationItem>
                                    <span className="px-2 py-1.5 text-sm">...</span>
                                </PaginationItem>
                            )}

                            {/* Render pages around current page */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((pageNumber) => {
                                    if (totalPages <= 5) return true; // Show all if 5 or less pages
                                    if (pageNumber === 1 || pageNumber === totalPages) return false; // Already handled
                                    return (
                                        pageNumber >= currentPage - 1 &&
                                        pageNumber <= currentPage + 1
                                    );
                                })
                                .map((pageNumber) => (
                                    <PaginationItem key={pageNumber}>
                                        <PaginationLink
                                            onClick={() => handlePageChange(pageNumber)}
                                            isActive={currentPage === pageNumber}
                                        >
                                            {pageNumber}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}

                            {/* Render ellipsis if needed before last page */}
                            {currentPage < totalPages - 2 && totalPages > 5 && (
                                <PaginationItem>
                                    <span className="px-2 py-1.5 text-sm">...</span>
                                </PaginationItem>
                            )}

                            {/* Render last page */}
                            {totalPages > 1 && (
                                <PaginationItem>
                                    <PaginationLink
                                        onClick={() => handlePageChange(totalPages)}
                                        isActive={currentPage === totalPages}
                                    >
                                        {totalPages}
                                    </PaginationLink>
                                </PaginationItem>
                            )}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>

            {/* Add Keypoint Extension Dialog */}
            <KeypointExtDialog
                isOpen={isAddKeypointExtOpen}
                onOpenChange={setIsAddKeypointExtOpen}
                onSubmit={handleAddKeypointExt}
                isEdit={false}
            />

            {/* Edit Keypoint Extension Dialog */}
            <KeypointExtDialog
                isOpen={isEditKeypointExtOpen}
                onOpenChange={setIsEditKeypointExtOpen}
                onSubmit={handleEditKeypointExt}
                keypointExt={editingKeypointExt}
                isEdit={true}
            />
        </div>
    );
}
