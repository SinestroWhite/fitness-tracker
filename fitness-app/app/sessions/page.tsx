"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Clock, Eye } from "lucide-react"
import { apiService, type Session, type SessionListParams } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { SessionForm } from "@/components/sessions/session-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const bodyAreas = [
  { value: "full_body", label: "Цяло тяло" },
  { value: "upper_body", label: "Горна част" },
  { value: "lower_body", label: "Долна част" },
  { value: "core", label: "Корем" },
]

// нормализираме snake_case от бекенда към camelCase за UI
const normalizeSession = (s: any): Session => ({
  ...s,
  bodyArea: s.bodyArea ?? s.body_area ?? s.focusArea ?? s.targetArea,
  durationMins: s.durationMins ?? s.duration_mins,
  description: s.description ?? "",
})

const getBodyAreaLabel = (value?: string) => {
  if (!value) return "—"
  const key = value.toLowerCase().replace(/-/g, "_")
  const map: Record<string, string> = {
    full_body: "Цяло тяло",
    upper_body: "Горна част",
    lower_body: "Долна част",
    core: "Корем",
  }
  return map[key] ?? value
}

export default function SessionsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [rawSessions, setRawSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  // 🔍 Търсене (дебоунснато) + локален филтър по част от тялото
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedBodyArea, setSelectedBodyArea] = useState<string>("all")

  const [showForm, setShowForm] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canManageSessions = user?.role === "trainer" || user?.role === "admin"

  // ⏱️ Debounce на търсенето
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(h)
  }, [searchTerm])

  const fetchSessions = async () => {
    try {
      setLoading(true)

      // Оставяме филтъра по част към бекенда (ако е поддържан). Търсенето е клиентско.
      const params: SessionListParams & Record<string, any> = { pageSize: 1000 }
      if (selectedBodyArea !== "all") params.body_area = selectedBodyArea

      const response = await apiService.getSessionList(params)
      const normalized: Session[] = (response.data ?? []).map(normalizeSession)
      setRawSessions(normalized)
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на сесиите",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Фечваме при mount и когато се смени частта на тялото (търсенето е клиентско)
  useEffect(() => {
    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBodyArea])

  const confirmDelete = (s: Session) => {
    setSessionToDelete(s)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return
    try {
      setDeleting(true)
      await apiService.deleteSession(String(sessionToDelete.id))
      toast({ title: "Успех", description: "Сесията е изтрита успешно" })
      fetchSessions()
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно изтриване на сесията",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingSession(null)
    fetchSessions()
  }

  // 🧠 Клиентско филтриране, за да работи търсенето независимо от бекенда
  const filteredSessions = useMemo(() => {
    let list = rawSessions

    if (selectedBodyArea !== "all") {
      list = list.filter((s) => (s.bodyArea ?? "").toLowerCase() === selectedBodyArea)
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (s) =>
          s.title?.toLowerCase?.().includes(q) ||
          s.bodyArea?.toLowerCase?.().includes(q) ||
          s.description?.toLowerCase?.().includes(q)
      )
    }

    return list
  }, [rawSessions, debouncedSearch, selectedBodyArea])

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-secondary font-bold">Тренировки</h1>
              <p className="text-secondary">Управление на тренировки и упражнения</p>
            </div>
            {canManageSessions && (
              <Button variant="white" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Нова тренировка
              </Button>
            )}
          </div>

          {/* Филтри */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary h-4 w-4" />
              <Input
                placeholder="Търси тренировка..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-1 border-gray-500"
              />
            </div>
            <Select value={selectedBodyArea} onValueChange={setSelectedBodyArea}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Част от тялото" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички части</SelectItem>
                {bodyAreas.map((area) => (
                  <SelectItem key={area.value} value={area.value}>
                    {area.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Опционално: брояч на резултата */}
          {(debouncedSearch || selectedBodyArea !== "all") && !loading && (
            <p className="text-sm text-secondary">Намерени: {filteredSessions.length}</p>
          )}

          {/* Списък със сесии */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded mb-4"></div>
                    <div className="h-8 bg-muted rounded w-20"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSessions.map((session) => (
                <Card key={session.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{session.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge className="text-secondary bg-transparent border-1 border-gray-500" variant="secondary">{getBodyAreaLabel(session.bodyArea)}</Badge>
                          <div className="flex items-center text-sm text-secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            {session.durationMins} мин
                          </div>
                        </CardDescription>
                      </div>
                      {canManageSessions && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingSession(session)
                              setShowForm(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => confirmDelete(session)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-secondary line-clamp-3">
                        {session.description || "Без описание"}
                      </p>
                      <div className="flex gap-2">
                        <Link href={`/sessions/${session.id}`}>
                          <Button size="sm" variant="white" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            Детайли
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-secondary">Няма намерени тренировки</p>
            </div>
          )}
        </div>

        {/* Диалог за форма на сесия */}
        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open)
            if (!open) setEditingSession(null)
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSession ? "Редактиране на сесия" : "Нова сесия"}</DialogTitle>
            </DialogHeader>

            <SessionForm
              key={editingSession?.id ?? "new"}   // ⬅️ принудителен ремоунт при смяна
              session={editingSession}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false)
                setEditingSession(null)
              }}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent
            onPointerDownCapture={(e) => e.stopPropagation()}
            onKeyDownCapture={(e) => {
              if ((e as React.KeyboardEvent).key === "Escape") e.stopPropagation()
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Изтриване на сесия</AlertDialogTitle>
              <AlertDialogDescription>
                Сигурни ли сте, че искате да изтриете{" "}
                <strong>{sessionToDelete?.title}</strong>? Това действие не може да бъде отменено.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSessionToDelete(null)}>
                Отказ
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-secondary hover:bg-destructive/90"
                disabled={deleting}
              >
                {deleting ? "Изтриване..." : "Изтрий"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
