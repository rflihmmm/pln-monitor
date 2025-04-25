import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface GarduInduk {
    name: string;
    description: string | null;
}

export default function AddGarduIndukButton() {
    const [isAddGarduOpen, setIsAddGarduOpen] = useState(false);
    const [newGardu, setNewGardu] = useState<GarduInduk>({
        name: '',
        description: '',
    });

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

    return (
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
    );
}
