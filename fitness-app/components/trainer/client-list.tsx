"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  const getGoalBadgeClass = (goal?: string) => {
    switch (goal) {
      case "lose":
        return "bg-red-600 text-red-50 dark:bg-red-900/30 dark:text-red-200 border-transparent"
      case "gain":
        return "bg-emerald-600 text-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-200 border-transparent"
      case "keep":
        return "bg-sky-600 text-sky-50 dark:bg-sky-900/30 dark:text-sky-200 border-transparent"
      default:
        return "bg-primary text-secondary"
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
              className="flex-1 border-1 border-gray-500"
            />
            <Button
              className="cursor-pointer"
              onClick={applySearch}
              title="Търси"
              variant="white"
            >
              <Search className="h-4 w-4 mr-1" />
              Търси
            </Button>

            <Button
              className="cursor-pointer border-1 border-gray-500"
              onClick={clearSearch}
              disabled={!searchInput && !searchTerm}
              title="Изчисти"
            >
              <X className="h-4 w-4 mr-1 text-secondary" />
              Изчисти
            </Button>
          </div>

          {/* Показваме активния филтър (по желание) */}
          {searchTerm && (
            <p className="text-xs text-secondary mt-2">
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
                  <TableHead className="text-secondary">Клиент</TableHead>
                  <TableHead className="text-secondary">Цел</TableHead>
                  <TableHead className="text-secondary">Височина</TableHead>
                  <TableHead className="text-secondary">Пол</TableHead>
                  <TableHead className="text-secondary">Регистриран</TableHead>
                  <TableHead className="text-secondary">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-secondary">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge  variant={getGoalBadgeVariant(client.personal?.goal)}  className={getGoalBadgeClass(client.personal?.goal)}>
                        {getGoalText(client.personal?.goal)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.personal?.height ? `${client.personal.height} см` : "Не е зададена"}
                    </TableCell>
                    <TableCell className="text-secondary">
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

                          <Button className="text-primary" variant="outline" size="sm" onClick={() => handleViewClient(client.id)}>
                            <Eye className="h-4 w-4 mr-1 text-primary" />
                            Детайли
                          </Button>
                    
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

