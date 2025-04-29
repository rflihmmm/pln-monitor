import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import UserForm from "@/components/master/users-form"

interface User {
  id?: string
  name: string
  email: string
  role: string
  createdAt?: string
  avatarUrl?: string
}

interface UserDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (userData: any) => void
  user?: User | null
  isEdit?: boolean
}

export default function UserDialog({ isOpen, onOpenChange, onSubmit, user, isEdit = false }: UserDialogProps) {
  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSubmit = (userData: any) => {
    onSubmit(userData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update user information" : "Fill in the details to add a new user to the system."}
          </DialogDescription>
        </DialogHeader>
        <UserForm user={user} onSubmit={handleSubmit} onCancel={handleCancel} isEdit={isEdit} />
      </DialogContent>
    </Dialog>
  )
}

