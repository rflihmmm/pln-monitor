import { router } from '@inertiajs/react';
import { Edit, MoreHorizontal, Plus, Search, Trash } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

// Define GarduInduk type based on the schema
interface GarduInduk {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
}

interface TableGarduIndukProps {
    garduIndukList: GarduInduk[];
}

export default function TableGarduInduk({ garduIndukList: initialGarduInduk }: TableGarduIndukProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddGarduOpen, setIsAddGarduOpen] = useState(false);
    const [isEditGarduOpen, setIsEditGarduOpen] = useState(false);
    const [newGardu, setNewGardu] = useState<Partial<GarduInduk>>({
        name: '',
        description: '',
    });
    const [editingGardu, setEditingGardu] = useState<GarduInduk | null>(null);

    // Filter gardu induk based on search term
    const filteredGarduInduk = initialGarduInduk.filter((gardu) => {
        return (
            gardu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (gardu.description && gardu.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    });

    // Format date to readable format
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    };

    // Handle adding a new gardu induk
    const handleAddGardu = () => {
        if (!newGardu.name) return;

        router.post(
            route('gardu-induk.store'),
            {
                name: newGardu.name,
                description: newGardu.description,
            },
            {
                onSuccess: () => {
                    setIsAddGarduOpen(false);
                    setNewGardu({
                        name: '',
                        description: '',
                    });
                },
            },
        );
    };

    // Handle editing a gardu induk
    const handleEditGardu = () => {
        if (!editingGardu || !editingGardu.name) return;

        router.put(
            route('gardu-induk.update', editingGardu.id),
            {
                name: editingGardu.name,
                description: editingGardu.description,
            },
            {
                onSuccess: () => {
                    setIsEditGarduOpen(false);
                    setEditingGardu(null);
                },
            },
        );
    };

    // Open edit dialog for a gardu induk
    const openEditDialog = (gardu: GarduInduk) => {
        setEditingGardu({ ...gardu });
        setIsEditGarduOpen(true);
    };

    // Handle deleting a gardu induk
    const handleDeleteGardu = (garduId: number) => {
        if (confirm('Are you sure you want to delete this substation?')) {
            router.delete(route('gardu-induk.destroy', garduId))
        }
    };

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
                    <Dialog open={isAddGarduOpen} onOpenChange={setIsAddGarduOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex items-center gap-1">
                                <Plus className="h-4 w-4" />
                                Add Substation
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Substation</DialogTitle>
                                <DialogDescription>Fill in the details to add a new substation to the system.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={newGardu.name}
                                        onChange={(e) => setNewGardu({ ...newGardu, name: e.target.value })}
                                        placeholder="Substation Name"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={newGardu.description || ''}
                                        onChange={(e) => setNewGardu({ ...newGardu, description: e.target.value })}
                                        placeholder="Substation description (optional)"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddGarduOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAddGardu}>Add Substation</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                                        <TableCell>{gardu.description || '-'}</TableCell>
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
                        Showing <strong>{filteredGarduInduk.length}</strong> of <strong>{initialGarduInduk.length}</strong> substations
                    </div>
                </div>
            </div>

            {/* Edit Gardu Induk Dialog */}
            <Dialog open={isEditGarduOpen} onOpenChange={setIsEditGarduOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Substation</DialogTitle>
                        <DialogDescription>Update substation information</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editingGardu?.name || ''}
                                onChange={(e) => setEditingGardu(editingGardu ? { ...editingGardu, name: e.target.value } : null)}
                                placeholder="Substation Name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={editingGardu?.description || ''}
                                onChange={(e) => setEditingGardu(editingGardu ? { ...editingGardu, description: e.target.value } : null)}
                                placeholder="Substation description (optional)"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditGarduOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditGardu}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
