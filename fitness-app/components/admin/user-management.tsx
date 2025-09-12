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
import { Plus, Edit, Trash2, Search, Filter, Loader2, Ban, Unlock } from "lucide-react"
import { apiService, type User, type CreateUserData, type UpdateUserData, type UserListParams } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

// Extend the User type locally to include block-related fields returned by the backend
type UserWithBlock = User & {
  status?: "active" | "blocked"
  blocked_until?: string | null
  blocked_reason?: string | null
}

export function UserManagement() {
  const [users, setUsers] = useState<UserWithBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<UserListParams>({ page: 1, pageSize: 20 })
  const [searchEmail, setSearchEmail] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithBlock | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserWithBlock | null>(null)

  // NEW: simple confirm popups for block/unblock
  const [confirmBlockUser, setConfirmBlockUser] = useState<UserWithBlock | null>(null)
  const [confirmUnblockUser, setConfirmUnblockUser] = useState<UserWithBlock | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { toast } = useToast()

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({ email: "", password: "", name: "", role: "user" })
  const [editForm, setEditForm] = useState<UpdateUserData>({})
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")

  const loadUsers = async () => {
    try {
      setLoading(true)
      const result = await apiService.getUserList(filters)
      setUsers((result.users as UserWithBlock[]) || [])
    } catch (error) {
      toast({ title: "Грешка", description: "Неуспешно зареждане на потребителите", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast({ title: "Успех", description: "Потребителят е създаден успешно" })
      setShowCreateDialog(false)
      setCreateForm({ email: "", password: "", name: "", role: "user" })
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
      toast({ title: "Успех", description: "Потребителят е обновен успешно" })
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
      toast({ title: "Успех", description: "Потребителят е изтрит успешно" })
      setDeletingUser(null)
      loadUsers()
    } catch (error) {
      toast({ title: "Грешка", description: "Неуспешно изтриване на потребител", variant: "destructive" })
    }
  }

  // --- Block/Unblock ---
  const isBlocked = (u: UserWithBlock) => {
    if (!u) return false
    if (u.status === "blocked") return true
    if (u.blocked_until && new Date(u.blocked_until) > new Date()) return true
    return false
  }

  const handleConfirmBlock = async () => {
    if (!confirmBlockUser) return
    try {
      setActionLoading(true)
      // Permanent block by default (no payload)
      // @ts-expect-error - add blockUser to your apiService
      await apiService.blockUser(confirmBlockUser.id)
      toast({ title: "Блокиране", description: `Потребителят ${confirmBlockUser.name} е блокиран.` })
      setConfirmBlockUser(null)
      loadUsers()
    } catch (error: any) {
      toast({ title: "Грешка", description: error?.message || "Неуспешно блокиране", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmUnblock = async () => {
    if (!confirmUnblockUser) return
    try {
      setActionLoading(true)
      // @ts-expect-error - add unblockUser to your apiService
      await apiService.unblockUser(confirmUnblockUser.id)
      toast({ title: "Разблокиране", description: `Потребителят ${confirmUnblockUser.name} е разблокиран.` })
      setConfirmUnblockUser(null)
      loadUsers()
    } catch (error: any) {
      toast({ title: "Грешка", description: error?.message || "Неуспешно разблокиране", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive" as const
      case "trainer":
        return "default" as const
      default:
        return "secondary" as const
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        // червено
        return "border-rose-200 bg-rose-600 text-rose-50 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
      case "trainer":
        // зелено
        return "border-emerald-200 bg-emerald-600 text-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      default:
        // неутрално
        return "border-slate-200 bg-slate-600 text-slate-50 dark:border-slate-900 dark:bg-slate-950 dark:text-slate-300"
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

  const renderStatusBadge = (u: UserWithBlock) => {
    if (isBlocked(u)) {
      return (
        <Badge variant="destructive" className="text-secondary">
          Блокиран{u.blocked_until ? ` до ${new Date(u.blocked_until).toLocaleString("bg-BG")}` : ""}
        </Badge>
      )
    }
    return <Badge className="text-secondary" variant="outline">Активен</Badge>
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
                className="border-1 border-gray-500"
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
                <Button variant="white" onClick={handleSearch} className="shrink-0 whitespace-nowrap cursor-pointer">
                  <Search className="mr-2 h-4 w-4" />
                  Търси
                </Button>

                <Button
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
              <Button variant="white" size="sm" className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Нов потребител
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-secondary">Създай нов потребител</DialogTitle>
                <DialogDescription className="text-secondary">Добавете нов потребител в системата</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-secondary">{formError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label className="text-secondary" htmlFor="createName">Име</Label>
                  <Input
                    id="createName"
                    value={createForm.name}
                    className="text-secondary"
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    disabled={formLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-secondary" htmlFor="createEmail">Имейл</Label>
                  <Input
                    id="createEmail"
                    type="email"
                    value={createForm.email}
                    className="text-secondary"
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    disabled={formLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-secondary" htmlFor="createPassword">Парола</Label>
                  <Input
                    id="createPassword"
                    type="password"
                    value={createForm.password}
                    className="text-secondary"
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    disabled={formLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createRole">Роля</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(value: "user" | "trainer" | "admin") => setCreateForm({ ...createForm, role: value })}
                    disabled={formLoading}
                  >
                    <SelectTrigger className="text-secondary">
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
                <Button className="cursor-pointer" variant="outline" onClick={() => setShowCreateDialog(false)} disabled={formLoading}>
                  Отказ
                </Button>
                <Button className="cursor-pointer" onClick={handleCreateUser} disabled={formLoading}>
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
                  <TableHead className="text-secondary">Име</TableHead>
                  <TableHead className="text-secondary">Имейл</TableHead>
                  <TableHead className="text-secondary">Роля</TableHead>
                  <TableHead className="text-secondary">Статус</TableHead>
                  <TableHead className="text-secondary">Създаден</TableHead>
                  <TableHead className="text-secondary">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge  className={getRoleBadgeColor(user.role)} variant={getRoleBadgeVariant(user.role)}>{getRoleText(user.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-secondary">{renderStatusBadge(user)}</TableCell>
                    <TableCell>
                      {new Date(user.created_at as any).toLocaleDateString("bg-BG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {/* Edit */}
                        <Dialog
                          open={editingUser?.id === user.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditingUser(user)
                              setEditForm({ name: user.name, email: user.email, role: user.role })
                            } else {
                              setEditingUser(null)
                              setEditForm({})
                            }
                            setFormError("")
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button className="cursor-pointer bg-transparent border-1 border-gray-500" variant="outline" size="sm">
                              <Edit className="h-4 w-4 text-secondary" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="text-secondary">Редактирай потребител</DialogTitle>
                              <DialogDescription className="text-secondary">Обновете информацията за потребителя</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {formError && (
                                <Alert variant="destructive">
                                  <AlertDescription className="text-secondary">{formError}</AlertDescription>
                                </Alert>
                              )}
                              <div className="space-y-2">
                                <Label className="text-secondary" htmlFor="editName">Име</Label>
                                <Input
                                  id="editName"
                                  value={editForm.name || ""}
                                  className="text-secondary"
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  disabled={formLoading}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-secondary" htmlFor="editEmail">Имейл</Label>
                                <Input
                                  id="editEmail"
                                  type="email"
                                  value={editForm.email || ""}
                                  className="text-secondary"
                                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                  disabled={formLoading}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-secondary" htmlFor="editRole">Роля</Label>
                                <Select
                                  value={editForm.role}
                                  onValueChange={(value: "user" | "trainer" | "admin") => setEditForm({ ...editForm, role: value })}
                                  disabled={formLoading}
                                >
                                  <SelectTrigger className="text-secondary">
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

                        {/* Delete */}
                        <AlertDialog open={deletingUser?.id === user.id} onOpenChange={(open: any) => { if (!open) setDeletingUser(null) }}>
                          <AlertDialogTrigger asChild>
                            <Button className="cursor-pointer bg-transparent border-1 border-gray-500" variant="outline" size="sm" onClick={() => setDeletingUser(user)}>
                              <Trash2 className="h-4 w-4 text-secondary" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Изтриване на потребител</AlertDialogTitle>
                              <AlertDialogDescription>
                                Сигурни ли сте, че искате да изтриете потребителя "{user.name}"? Това действие не може да бъде отменено.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отказ</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-secondary hover:bg-destructive/90">
                                Изтрий
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* BLOCK (simple popup) */}
                        {!isBlocked(user) && (
                          <AlertDialog open={confirmBlockUser?.id === user.id} onOpenChange={(open) => { if (!open) setConfirmBlockUser(null) }}>
                            <AlertDialogTrigger asChild>
                              <Button className="cursor-pointer" variant="destructive" size="sm" disabled={user.role === "admin"} onClick={() => setConfirmBlockUser(user)}>
                                <Ban className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Блокиране на потребител</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Сигурни ли сте, че искате да блокирате "{user.name}"? Това е <b>постоянен</b> блок (може да бъде отменен по-късно).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отказ</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirmBlock} className="bg-destructive text-secondary hover:bg-destructive/90">
                                  Блокирай
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {/* UNBLOCK (simple popup) */}
                        {isBlocked(user) && (
                          <AlertDialog open={confirmUnblockUser?.id === user.id} onOpenChange={(open) => { if (!open) setConfirmUnblockUser(null) }}>
                            <AlertDialogTrigger asChild>
                              <Button className="cursor-pointer" variant="outline" size="sm" onClick={() => setConfirmUnblockUser(user)}>
                                <Unlock className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Разблокиране</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Сигурни ли сте, че искате да разблокирате "{user.name}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отказ</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirmUnblock}>Разблокирай</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
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
