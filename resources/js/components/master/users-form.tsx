import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  id?: string
  name: string
  email: string
  role: string
  createdAt?: string
  avatarUrl?: string
}

interface UserFormProps {
  user?: User | null
  onSubmit: (userData: any) => void
  onCancel: () => void
  isEdit?: boolean
}

export default function UserForm({ user, onSubmit, onCancel, isEdit = false }: UserFormProps) {
  const [userData, setUserData] = useState<Partial<User> & { password?: string; password_confirmation?: string }>({
    name: "",
    email: "",
    role: "user",
    password: "",
    password_confirmation: "",
  })

  useEffect(() => {
    if (user && isEdit) {
      setUserData({
        name: user.name,
        email: user.email,
        role: user.role,
      })
    }
  }, [user, isEdit])

  const handleChange = (field: string, value: string) => {
    setUserData({ ...userData, [field]: value })
  }

  const handleSubmit = () => {
    onSubmit(userData)
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={userData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="John Doe"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={userData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="john@example.com"
        />
      </div>
      {!isEdit && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={userData.password}
              onChange={(e) => handleChange("password", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password_confirmation">Confirm Password</Label>
            <Input
              id="password_confirmation"
              type="password"
              value={userData.password_confirmation}
              onChange={(e) => handleChange("password_confirmation", e.target.value)}
            />
          </div>
        </>
      )}
      <div className="grid gap-2">
        <Label htmlFor="role">Role</Label>
        <Select value={userData.role} onValueChange={(value) => handleChange("role", value)}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>{isEdit ? "Save Changes" : "Add User"}</Button>
      </DialogFooter>
    </div>
  )
}

