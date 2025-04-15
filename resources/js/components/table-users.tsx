import { MoreHorizontal, Plus, Search, Trash, UserCog } from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Define user type
interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'editor';
    createdAt: string;
    avatarUrl?: string;
}

// Sample data
const initialUsers: User[] = [
    {
        id: '1',
        name: 'Alex Johnson',
        email: 'alex@example.com',
        role: 'admin',
        createdAt: '2023-01-15T10:30:00.000Z',
        avatarUrl: '/placeholder.svg?height=40&width=40',
    },
    {
        id: '2',
        name: 'Sarah Williams',
        email: 'sarah@example.com',
        role: 'user',
        createdAt: '2023-02-20T14:45:00.000Z',
    },
    {
        id: '3',
        name: 'Michael Brown',
        email: 'michael@example.com',
        role: 'user',
        createdAt: '2023-03-05T09:15:00.000Z',
        avatarUrl: '/placeholder.svg?height=40&width=40',
    },
    {
        id: '4',
        name: 'Emily Davis',
        email: 'emily@example.com',
        role: 'user',
        createdAt: '2023-03-18T16:20:00.000Z',
        avatarUrl: '/placeholder.svg?height=40&width=40',
    },
    {
        id: '5',
        name: 'David Wilson',
        email: 'david@example.com',
        role: 'user',
        createdAt: '2023-04-01T11:10:00.000Z',
        avatarUrl: '/placeholder.svg?height=40&width=40',
    },
];

export default function TableUsers() {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [newUser, setNewUser] = useState<Partial<User>>({
        name: '',
        email: '',
        role: 'user',
    });
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Filter users based on search term and filters
    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        return matchesSearch && matchesRole;
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

    // Handle adding a new user
    const handleAddUser = () => {
        if (!newUser.name || !newUser.email) return;

        const user: User = {
            id: (users.length + 1).toString(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role as 'admin' | 'user',
            createdAt: new Date().toISOString(),
        };

        setUsers([...users, user]);
        setNewUser({
            name: '',
            email: '',
            role: 'user',
        });
        setIsAddUserOpen(false);
    };

    // Handle editing a user
    const handleEditUser = () => {
        if (!editingUser || !editingUser.name || !editingUser.email) return;

        setUsers(users.map((user) => (user.id === editingUser.id ? { ...user, ...editingUser } : user)));
        setIsEditUserOpen(false);
        setEditingUser(null);
    };

    // Open edit dialog for a user
    const openEditDialog = (user: User) => {
        setEditingUser({ ...user });
        setIsEditUserOpen(true);
    };

    // Handle deleting a user
    const handleDeleteUser = (userId: string) => {
        setUsers(users.filter((user) => user.id !== userId));
    };
    return (
        <div>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="relative w-full sm:w-64">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                            type="search"
                            placeholder="Search users..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                        </Select>
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
                                        <Label htmlFor="role">Role</Label>
                                        <Select
                                            value={newUser.role}
                                            onValueChange={(value) => setNewUser({ ...newUser, role: value as any })}
                                        >
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
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                                        No users found matching your filters
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={user.avatarUrl || '/placeholder.svg'} />
                                                    <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{user.name}</div>
                                                    <div className="text-muted-foreground text-sm">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="capitalize">{user.role}</div>
                                        </TableCell>
                                        <TableCell>{formatDate(user.createdAt)}</TableCell>
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
                                                    <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(user)}>
                                                        <UserCog className="mr-2 h-4 w-4" />
                                                        Edit User
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive cursor-pointer"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Delete User
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
                        Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" disabled>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" className="px-4">
                            1
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user information</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Full Name</Label>
                            <Input
                                id="edit-name"
                                value={editingUser?.name || ''}
                                onChange={(e) => setEditingUser(editingUser ? { ...editingUser, name: e.target.value } : null)}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editingUser?.email || ''}
                                onChange={(e) => setEditingUser(editingUser ? { ...editingUser, email: e.target.value } : null)}
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditUser}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
