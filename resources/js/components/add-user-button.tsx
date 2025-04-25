import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
    name: string;
    email: string;
    role: string;
    password?: string;
    password_confirmation?: string;
}

export default function AddUserButton() {
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState<User>({
        name: '',
        email: '',
        role: 'user',
        password: '',
        password_confirmation: '',
    });

    // Handle adding a new user
    const handleAddUser = () => {
        if (!newUser.name || !newUser.email || !newUser.password) return;

        router.post(
            '/master/manage-users',
            {
                name: newUser.name,
                email: newUser.email,
                password: newUser.password,
                password_confirmation: newUser.password_confirmation,
                role: newUser.role,
            },
            {
                onSuccess: () => {
                    setIsAddUserOpen(false);
                    setNewUser({
                        name: '',
                        email: '',
                        role: 'user',
                        password: '',
                        password_confirmation: '',
                    });
                },
            },
        );
    };

    return (
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    Add User
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Fill in the details to add a new user to the system.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            placeholder="john@example.com"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm Password</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            value={newUser.password_confirmation}
                            onChange={(e) => setNewUser({ ...newUser, password_confirmation: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleAddUser}>Add User</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
