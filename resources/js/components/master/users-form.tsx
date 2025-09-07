import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import axios from "axios"

interface User {
  id?: string
  name: string
  email: string
  role: string
  unit?: number | null
  unit_id?: number | null
  createdAt?: string
  avatarUrl?: string
}

interface Organization {
  id: number
  name: string
  level: number
  level_name: string
  parent_id: number | null
  parent_name: string | null
  address: string | null
  display_name: string
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
    unit: null,
    password: "",
    password_confirmation: "",
  })

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [unitSearchTerm, setUnitSearchTerm] = useState<string>("")
  const [isUnitSelectOpen, setIsUnitSelectOpen] = useState<boolean>(false)
  const [passwordError, setPasswordError] = useState<string>("")
  const [unitError, setUnitError] = useState<string>("")
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState<boolean>(false)

  useEffect(() => {
    if (user && isEdit) {
      const initialUnit = user.unit_id || user.unit;
      setUserData({
        name: user.name,
        email: user.email,
        role: user.role,
        unit: initialUnit,
      })

      // Set initial search term for unit organization
      if (initialUnit && organizations.length > 0) {
        const selectedOrg = organizations.find(org => org.id === initialUnit)
        if (selectedOrg) {
          setUnitSearchTerm(selectedOrg.display_name)
        }
      } else if (initialUnit === null) {
        setUnitSearchTerm("All")
      }
    }
  }, [user, isEdit, organizations])

  // Fetch organizations data
  useEffect(() => {
    const fetchOrganizations = async () => {
      setIsLoadingOrganizations(true)
      try {
        const response = await axios.get('/master/api/organizations')
        if (response.data.success) {
          setOrganizations(response.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error)
      } finally {
        setIsLoadingOrganizations(false)
      }
    }

    fetchOrganizations()
  }, [])

  const handleChange = (field: string, value: string | number | null) => {
    const newUserData = { ...userData, [field]: value }

    if (field === 'role' && value === 'admin') {
      newUserData.unit = null
      setUnitSearchTerm("")
    }

    setUserData(newUserData)

    // Validate password length
    if (field === 'password') {
      const passwordValue = value as string
      if (passwordValue && passwordValue.length > 0 && passwordValue.length < 8) {
        setPasswordError('Password harus minimal 8 karakter')
      } else {
        setPasswordError('')
      }
    }
  }

  const handleSubmit = () => {
    // Final password validation before submit
    if (!isEdit && userData.password && userData.password.length < 8) {
      setPasswordError('Password harus minimal 8 karakter')
      return
    }

    // Validate unit for user role
    // if (userData.role === 'user' && !userData.unit) {
    //   setUnitError('Unit is required for user role.')
    //   return
    // }
    setUnitError('') // Clear error if validation passes

    onSubmit(userData)
  }

  // Filter organizations based on search term
  const filteredOrganizations = organizations.filter(org =>
    org.display_name.toLowerCase().includes(unitSearchTerm.toLowerCase()) ||
    org.name.toLowerCase().includes(unitSearchTerm.toLowerCase())
  )

  const handleUnitSelect = (value: string) => {
    if (unitError) setUnitError("")
    if (value === "none") {
      handleChange("unit", null)
      setUnitSearchTerm("All")
    } else {
      const selectedOrg = organizations.find(org => org.id.toString() === value)
      if (selectedOrg) {
        handleChange("unit", parseInt(value))
        setUnitSearchTerm(selectedOrg.display_name)
      }
    }
    setIsUnitSelectOpen(false)
  }

  const clearUnitSelection = () => {
    handleChange("unit", null)
    setUnitSearchTerm("All")
  }

  // Get selected unit name for display
  const selectedUnitName = userData.unit
    ? organizations.find(org => org.id === userData.unit)?.display_name
    : "All"

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

      {userData.role === 'user' && (
        <div className="grid gap-2">
          <Label htmlFor="unit">Unit</Label>
          <div className="relative">
            <Input
              id="unit_search"
              value={unitSearchTerm}
              onChange={(e) => {
                setUnitSearchTerm(e.target.value)
                setIsUnitSelectOpen(true)
              }}
              onFocus={() => setIsUnitSelectOpen(true)}
              placeholder={isLoadingOrganizations ? "Loading organizations..." : "Search unit organization..."}
              className="pr-20"
              disabled={isLoadingOrganizations}
            />
            {userData.unit !== null && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 px-2 text-xs"
                onClick={clearUnitSelection}
              >
                Clear
              </Button>
            )}

            {isUnitSelectOpen && !isLoadingOrganizations && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                <div
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm border-b"
                  onClick={() => handleUnitSelect("none")}
                >
                  <span className="font-medium">All</span>
                  <div className="text-xs text-gray-500">All units assigned</div>
                </div>
                {filteredOrganizations.length > 0 ? (
                  filteredOrganizations.map((org) => (
                    <div
                      key={org.id}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm border-b last:border-b-0"
                      onClick={() => handleUnitSelect(org.id.toString())}
                    >
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-gray-500">
                        {org.level_name}
                        {org.parent_name && ` • Parent: ${org.parent_name}`}
                        {org.address && ` • ${org.address}`}
                      </div>
                    </div>
                  ))
                ) : unitSearchTerm && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No organizations found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Show selected unit organization */}
          {userData.unit === null ? (
            <div className="text-sm text-gray-600 mt-1">
              Selected: <span className="font-medium">All</span>
            </div>
          ) : (
            selectedUnitName && (
              <div className="text-sm text-gray-600 mt-1">
                Selected: <span className="font-medium">{selectedUnitName}</span>
              </div>
            )
          )}
          {unitError && (
            <div className="text-sm text-red-500 mt-1">
              {unitError}
            </div>
          )}
        </div>
      )}

      {!isEdit && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={userData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className={passwordError ? "border-red-500" : ""}
            />
            {passwordError && (
              <div className="text-sm text-red-500 mt-1">
                {passwordError}
              </div>
            )}
            {!passwordError && userData.password && userData.password.length > 0 && userData.password.length >= 8 && (
              <div className="text-sm text-green-500 mt-1">
                Password sudah memenuhi syarat minimum
              </div>
            )}
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

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isEdit && passwordError !== ""}
        >
          {isEdit ? "Save Changes" : "Add User"}
        </Button>
      </DialogFooter>
    </div>
  )
}
