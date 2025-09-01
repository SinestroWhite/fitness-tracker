"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, Search, Filter, Loader2 } from "lucide-react"
import { apiService, type User, type CreateUserData, type UpdateUserData, type UserListParams } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<UserListParams>({
    page: 1,
    pageSize: 20,
  })
  const [searchEmail, setSearchEmail] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const { toast } = useToast()

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    email: "",
    password: "",
    name: "",
    role: "user",
  })
  const [editForm, setEditForm] = useState<UpdateUserData>({})
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")

  const loadUsers = async () => {
    try {
      setLoading(true)
      const result = await apiService.getUserList(filters)
      setUsers(result.users)
      console.log(result.users)
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на потребителите",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [filters])

  const handleSearch = () => {
    setFilters({
      ...filters,
      email: searchEmail || undefined,
      role: selectedRole === "all" ? undefined : (selectedRole as "user" | "trainer" | "admin"),
      page: 1,
    })
  }

  const handleCreateUser = async () => {
    setFormError("")
    setFormLoading(true)

    try {
      await apiService.createUser(createForm)
      toast({
        title: "Успех",
        description: "Потребителят е създаден успешно",
      })
      setShowCreateDialog(false)
      setCreateForm({
        email: "",
        password: "",
        name: "",
        role: "user",
      })
      loadUsers()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Грешка при създаване на потребител")
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    setFormError("")
    setFormLoading(true)

    try {
      await apiService.updateUser(editingUser.id, editForm)
      toast({
        title: "Успех",
        description: "Потребителят е обновен успешно",
      })
      setEditingUser(null)
      setEditForm({})
      loadUsers()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Грешка при обновяване на потребител")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    try {
      await apiService.deleteUser(deletingUser.id)
      toast({
        title: "Успех",
        description: "Потребителят е изтрит успешно",
      })
      setDeletingUser(null)
      loadUsers()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно изтриване на потребител",
        variant: "destructive",
      })
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "trainer":
        return "default"
      default:
        return "secondary"
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Администратор"
      case "trainer":
        return "Треньор"
      default:
        return "Потребител"
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4" />
      <CardTitle>Търсене и филтри</CardTitle>
    </div>
  </CardHeader>

  <CardContent>
    <div className="grid gap-4 md:grid-cols-12">
      {/* Email */}
      <div className="space-y-2 col-span-12 md:col-span-6 lg:col-span-5">
        <Label htmlFor="searchEmail">Търсене по имейл</Label>
        <Input
          id="searchEmail"
          placeholder="example@email.com"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch()
            if (e.key === "Escape") {
              setSearchEmail("")
              setSelectedRole("all")
              setFilters({ page: 1, pageSize: 20 })
            }
          }}
        />
      </div>

      {/* Role */}
      <div className="space-y-2 col-span-12 md:col-span-6 lg:col-span-3">
        <Label htmlFor="roleFilter">Роля</Label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger id="roleFilter">
            <SelectValue placeholder="Всички роли" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всички</SelectItem>
            <SelectItem value="user">Потребители</SelectItem>
            <SelectItem value="trainer">Треньори</SelectItem>
            <SelectItem value="admin">Администратори</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="col-span-12 mt-5.5 lg:col-span-4 flex md:justify-end">
        <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
          <Button
            onClick={handleSearch}
            className="shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Search className="mr-2 h-4 w-4" />
            Търси
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setSearchEmail("")
              setSelectedRole("all")
              setFilters({ page: 1, pageSize: 20 })
            }}
            disabled={!searchEmail && selectedRole === "all"}
            className="shrink-0 whitespace-nowrap cursor-pointer"
          >
            Изчисти
          </Button>
        </div>
      </div>
    </div>
  </CardContent>
</Card>



      {/* Users Table */}
      <Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>Потребители</CardTitle>
      <CardDescription>Управление на всички потребители в системата</CardDescription>
    </div>

    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Нов потребител
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Създай нов потребител</DialogTitle>
          <DialogDescription>Добавете нов потребител в системата</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="createName">Име</Label>
            <Input
              id="createName"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              disabled={formLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="createEmail">Имейл</Label>
            <Input
              id="createEmail"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              disabled={formLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="createPassword">Парола</Label>
            <Input
              id="createPassword"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              disabled={formLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="createRole">Роля</Label>
            <Select
              value={createForm.role}
              onValueChange={(value: "user" | "trainer" | "admin") =>
                setCreateForm({ ...createForm, role: value })
              }
              disabled={formLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Потребител</SelectItem>
                <SelectItem value="trainer">Треньор</SelectItem>
                <SelectItem value="admin">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="cursor-pointer"
            variant="outline"
            onClick={() => setShowCreateDialog(false)}
            disabled={formLoading}
          >
            Отказ
          </Button>
          <Button
            className="cursor-pointer"
            onClick={handleCreateUser}
            disabled={formLoading}
          >
            {formLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Създаване...
              </>
            ) : (
              "Създай"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Име</TableHead>
                  <TableHead>Имейл</TableHead>
                  <TableHead>Роля</TableHead>
                  <TableHead>Създаден</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleText(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("bg-BG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog
                          open={editingUser?.id === user.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditingUser(user)
                              setEditForm({
                                name: user.name,
                                email: user.email,
                                role: user.role,
                              })
                            } else {
                              setEditingUser(null)
                              setEditForm({})
                            }
                            setFormError("")
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button className="cursor-pointer" variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Редактирай потребител</DialogTitle>
                              <DialogDescription>Обновете информацията за потребителя</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {formError && (
                                <Alert variant="destructive">
                                  <AlertDescription>{formError}</AlertDescription>
                                </Alert>
                              )}
                              <div className="space-y-2">
                                <Label htmlFor="editName">Име</Label>
                                <Input
                                  id="editName"
                                  value={editForm.name || ""}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  disabled={formLoading}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="editEmail">Имейл</Label>
                                <Input
                                  id="editEmail"
                                  type="email"
                                  value={editForm.email || ""}
                                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                  disabled={formLoading}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="editRole">Роля</Label>
                                <Select
                                  value={editForm.role}
                                  onValueChange={(value: "user" | "trainer" | "admin") =>
                                    setEditForm({ ...editForm, role: value })
                                  }
                                  disabled={formLoading}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">Потребител</SelectItem>
                                    <SelectItem value="trainer">Треньор</SelectItem>
                                    <SelectItem value="admin">Администратор</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button className="cursor-pointer" variant="outline" onClick={() => setEditingUser(null)} disabled={formLoading}>
                                Отказ
                              </Button>
                              <Button className="cursor-pointer" onClick={handleUpdateUser} disabled={formLoading}>
                                {formLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Обновяване...
                                  </>
                                ) : (
                                  "Обнови"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog
                          open={deletingUser?.id === user.id}
                          onOpenChange={(open: any) => {
                            if (!open) setDeletingUser(null)
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button className="cursor-pointer" variant="outline" size="sm" onClick={() => setDeletingUser(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Изтриване на потребител</AlertDialogTitle>
                              <AlertDialogDescription>
                                Сигурни ли сте, че искате да изтриете потребителя "{user.name}"? Това действие не може
                                да бъде отменено.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отказ</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteUser}
                                className="bg-destructive text-white  hover:bg-destructive/90"
                              >
                                Изтрий
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
