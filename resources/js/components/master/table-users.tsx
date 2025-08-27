import { router } from "@inertiajs/react"
import { MoreHorizontal, Plus, Search, Trash, UserCog } from "lucide-react"
import { useState, useMemo } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import UserDialog from "@/components/master/users-dialog"

// Define user type
interface User {
  id: string
  name: string
  email: string
  role: string
  unit: string
  createdAt: string
  avatarUrl?: string
}

interface TableUsersProps {
  users: User[]
}

export default function TableUsers({ users: initialUsers }: TableUsersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15 // Maksimal 15 data per halaman

  // Filter users based on search term and filters
  const filteredUsers = useMemo(() => {
    return initialUsers.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesRole = roleFilter === "all" || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [initialUsers, searchTerm, roleFilter])

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredUsers.slice(startIndex, endIndex)
  }, [filteredUsers, currentPage, itemsPerPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Handle adding a new user
  const handleAddUser = (userData: any) => {
    router.post(
      route("master.manage-users.store"),
      {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        password_confirmation: userData.password_confirmation,
        role: userData.role,
        unit: userData.unit,
      },
      {
        onSuccess: () => {
          setIsAddUserOpen(false)
        },
      },
    )
  }

  // Handle editing a user
  const handleEditUser = (userData: any) => {
    if (!editingUser) return

    router.put(
      `/master/manage-users/${editingUser.id}`,
      {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        unit: userData.unit,
      },
      {
        onSuccess: () => {
          setIsEditUserOpen(false)
          setEditingUser(null)
        },
      },
    )
  }

  // Open edit dialog for a user
  const openEditDialog = (user: User) => {
    setEditingUser({ ...user })
    setIsEditUserOpen(true)
  }

  // Handle deleting a user
  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      router.delete(`/master/manage-users/${userId}`)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mt-5">
        {/* Rest of your component remains the same */}
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
            <Button className="flex items-center gap-1" onClick={() => setIsAddUserOpen(true)}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    No users found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl || "/placeholder.svg"} />
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
                    <TableCell>
                      <div className="capitalize">{user.unit || "No unit assigned"}</div>
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
            Showing{" "}
            <strong>
              {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
            </strong>{" "}
            of <strong>{filteredUsers.length}</strong> users
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

      {/* Add User Dialog */}
      <UserDialog isOpen={isAddUserOpen} onOpenChange={setIsAddUserOpen} onSubmit={handleAddUser} isEdit={false} />

      {/* Edit User Dialog */}
      <UserDialog
        isOpen={isEditUserOpen}
        onOpenChange={setIsEditUserOpen}
        onSubmit={handleEditUser}
        user={editingUser}
        isEdit={true}
      />
    </div>
  )
}
