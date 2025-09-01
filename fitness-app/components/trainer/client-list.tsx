"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Eye, TrendingUp, Calendar, X } from "lucide-react"
import { apiService, type UserPersonal } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type ApiClient = {
  id: string | number
  name?: string
  email?: string
  role?: string
  created_at?: string
  createdAt?: string
}

export interface ClientWithPersonal {
  id: string
  name: string
  email: string
  createdAt: string
  personal?: UserPersonal
  lastActivity?: string
}

const toClientBase = (user: ApiClient): Omit<ClientWithPersonal, "personal"> => ({
  id: String(user.id),
  name: user.name ?? "",
  email: user.email ?? "",
  createdAt: user.created_at ?? user.createdAt ?? new Date().toISOString(),
})

const toPersonal = (resp: any): UserPersonal | undefined => {
  const profile = resp?.profile
  if (!profile) return undefined
  return {
    ...profile,
    height: profile.height != null ? Number(profile.height) : undefined,
  }
}

export function ClientList() {
  const [clients, setClients] = useState<ClientWithPersonal[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // NEW: разделяме въведен текст и активен филтър
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const [selectedClient, setSelectedClient] = useState<ClientWithPersonal | null>(null)
  const { toast } = useToast()

  const loadClients = async () => {
    try {
      setLoading(true)
      const result = await apiService.getTrainerClients()
      const clientsWithPersonal: ClientWithPersonal[] = await Promise.all(
        (result.clients as ApiClient[]).map(async (user) => {
          try {
            const resp = await apiService.getUserPersonalByUserId(String(user.id))
            const personal = toPersonal(resp)
            return { ...toClientBase(user), personal }
          } catch {
            return { ...toClientBase(user), personal: undefined }
          }
        })
      )
      setClients(clientsWithPersonal)
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на клиентите",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  // Филтрация по активния термин (прилага се с бутона Търси или Enter)
  const filteredClients = clients.filter((client) => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    return (
      client.name.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q)
    )
  })

  const handleViewClient = (clientId: string) => {
    router.push(`/clients/${clientId}`)
  }

  const getGoalText = (goal?: string) => {
    switch (goal) {
      case "lose":
        return "Отслабване"
      case "gain":
        return "Качване на тегло"
      case "keep":
        return "Поддържане"
      default:
        return "Не е зададена"
    }
  }

  const getGoalBadgeVariant = (goal?: string) => {
    switch (goal) {
      case "lose":
        return "destructive"
      case "gain":
        return "default"
      case "keep":
        return "secondary"
      default:
        return "outline"
    }
  }

  // NEW: handler-и за търсене/изчистване
  const applySearch = () => setSearchTerm(searchInput.trim())
  const clearSearch = () => {
    setSearchInput("")
    setSearchTerm("")
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-4 w-4" />
            Търсене на клиенти
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Търсете по име или имейл..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch()
                if (e.key === "Escape") clearSearch()
              }}
              className="flex-1"
            />
            <Button
              className="cursor-pointer"
              onClick={applySearch}
              title="Търси"
            >
              <Search className="h-4 w-4 mr-1" />
              Търси
            </Button>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={clearSearch}
              disabled={!searchInput && !searchTerm}
              title="Изчисти"
            >
              <X className="h-4 w-4 mr-1" />
              Изчисти
            </Button>
          </div>

          {/* Показваме активния филтър (по желание) */}
          {searchTerm && (
            <p className="text-xs text-muted-foreground mt-2">
              Активен филтър: <span className="font-medium">{searchTerm}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Моите клиенти</CardTitle>
          <CardDescription>
            Преглед и управление на всички ваши клиенти ({filteredClients.length} общо)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Цел</TableHead>
                  <TableHead>Височина</TableHead>
                  <TableHead>Пол</TableHead>
                  <TableHead>Регистриран</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getGoalBadgeVariant(client.personal?.goal)}>
                        {getGoalText(client.personal?.goal)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.personal?.height ? `${client.personal.height} см` : "Не е зададена"}
                    </TableCell>
                    <TableCell>
                      {client.personal?.sex === "male"
                        ? "Мъж"
                        : client.personal?.sex === "female"
                          ? "Жена"
                          : "Не е зададен"}
                    </TableCell>
                    <TableCell>
                      {new Date(client.createdAt).toLocaleDateString("bg-BG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {/* <Dialog
                        open={selectedClient?.id === client.id}
                        onOpenChange={(open) => {
                          if (open) setSelectedClient(client)
                          else setSelectedClient(null)
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button className="cursor-pointer" variant="outline" size="sm"> */}
                          <Button variant="outline" size="sm" onClick={() => handleViewClient(client.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Детайли
                          </Button>
                        {/* </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Профил на клиент</DialogTitle>
                            <DialogDescription>Детайлна информация за {client.name}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm flex items-center">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Основна информация
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Име</Label>
                                    <p className="font-medium">{client.name}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Имейл</Label>
                                    <p className="font-medium">{client.email}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Регистриран</Label>
                                    <p className="font-medium">
                                      {new Date(client.createdAt).toLocaleDateString("bg-BG", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm flex items-center">
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                    Фитнес данни
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  {client.personal ? (
                                    <>
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Цел</Label>
                                        <p className="font-medium">{getGoalText(client.personal.goal)}</p>
                                      </div>
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Височина</Label>
                                        <p className="font-medium">{client.personal.height} см</p>
                                      </div>
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Пол</Label>
                                        <p className="font-medium">
                                          {client.personal.sex === "male" ? "Мъж" : "Жена"}
                                        </p>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Няма фитнес данни</p>
                                  )}
                                </CardContent>
                              </Card>
                            </div>

                            <div className="flex space-x-2">
                              <Button variant="outline" className="flex-1 cursor-pointer bg-transparent">
                                <Calendar className="mr-2 h-4 w-4" />
                                Планирай тренировка
                              </Button>
                              <Button variant="outline" className="flex-1 cursor-pointer bg-transparent">
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Виж прогрес
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog> */}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredClients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Няма резултати. Опитайте с друг термин или изчистете търсенето.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

