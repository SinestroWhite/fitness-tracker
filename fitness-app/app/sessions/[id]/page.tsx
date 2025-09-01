"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Clock, Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { apiService, type Session, type SessionExercise } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { SessionExerciseForm } from "@/components/sessions/session-exercise-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const bodyAreas = [
  { value: "full_body", label: "Цяло тяло" },
  { value: "upper_body", label: "Горна част" },
  { value: "lower_body", label: "Долна част" },
  { value: "core", label: "Корем" },
]

const getMuscleLabel = (value?: string) => {
  if (!value) return "—"
  const key = String(value).toLowerCase().replace(/[\s-]/g, "_")
  const map: Record<string, string> = {
    chest: "Гърди",
    back: "Гръб",
    legs: "Крака",
    shoulders: "Рамене",
    arms: "Ръце",
    core: "Корем",
    full_body: "Цяло тяло",
  }
  return map[key] ?? value
}

// нормализация от snake_case към camelCase за UI
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

// извлича сигурно pivot id от ред
const getPivotId = (row: any): string | null => {
  const pid =
    row?.pivot_id ??
    row?.pivotId ??
    row?.session_exercise_id ??
    row?.sessionExerciseId ??
    row?.se_id ??
    null
  return pid != null ? String(pid) : null
}

// извлича сигурно exercise id от ред
const getExerciseId = (row: any): string | null => {
  const eid = row?.exercise_id ?? row?.exerciseId ?? row?.exercise?.id ?? row?.id ?? null
  return eid != null ? String(eid) : null
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [session, setSession] = useState<Session | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showExerciseForm, setShowExerciseForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<SessionExercise | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sessionId = params.id as string
  const canManageSessions = user?.role === "trainer" || user?.role === "admin"

  const fetchSession = async () => {
    try {
      setLoading(true)
      const [sessionData, exercisesData] = await Promise.all([
        apiService.getSession(sessionId, "exercises"),
        apiService.getSessionExercises(sessionId),
      ])
      setSession(normalizeSession(sessionData))
      setExercises(exercisesData ?? [])
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на сесията",
        variant: "destructive",
      })
      router.push("/sessions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const handleDeleteExercise = async (pivotId: string) => {
    try {
      setDeletingId(pivotId)
      await apiService.deleteSessionExercise(pivotId) // DELETE /session-exercises/:pivotId
      toast({ title: "Успех", description: "Упражнението е премахнато от сесията" })
      fetchSession()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно премахване на упражнението",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleExerciseFormSuccess = () => {
    setShowExerciseForm(false)
    setEditingExercise(null)
    fetchSession()
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!session) return null

  // за филтъра в формата: списък от exercise ids (НЕ pivot ids)
  const usedExerciseIds = exercises
    .map((se: any) => getExerciseId(se))
    .filter((x: any): x is string => x != null)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/sessions")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад към сесиите
            </Button>
          </div>

          {/* Session Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{session.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <Badge variant="secondary">{getBodyAreaLabel(session.bodyArea)}</Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {session.durationMins} минути
                    </div>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{session.description || "Без описание"}</p>
            </CardContent>
          </Card>

          {/* Exercises */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Упражнения</CardTitle>
                  <CardDescription>Упражнения включени в тази сесия</CardDescription>
                </div>
                {canManageSessions && (
                  <Button onClick={() => setShowExerciseForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добави упражнение
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {exercises.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Няма добавени упражнения в тази сесия</p>
                  {canManageSessions && (
                    <Button className="mt-4" onClick={() => setShowExerciseForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Добави първото упражнение
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {exercises.map((sessionExercise: any, index) => {
                    const pivotId = getPivotId(sessionExercise)                // session_exercises.id
                    const exerciseId = getExerciseId(sessionExercise)          // exercises.id
                    const isDeleting = pivotId != null && deletingId === pivotId

                    // ключ за стабилен render — предпочитаме pivotId, иначе комбинираме с exerciseId
                    const rowKey = pivotId ?? `ex-${exerciseId ?? index}`

                    return (
                      <div key={rowKey}>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">
                                {sessionExercise.name ?? sessionExercise?.exercise?.name ?? "—"}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {/* <Badge variant="outline">
                                  {sessionExercise.muscle ?? sessionExercise?.exercise?.muscle ?? "—"}
                                </Badge> */}
                                <Badge variant="outline">
  {getMuscleLabel(sessionExercise.muscle ?? sessionExercise?.exercise?.muscle)}
</Badge>
                                {sessionExercise.repetitions && <span>{sessionExercise.repetitions} повторения</span>}
                                {sessionExercise.time && <span>{sessionExercise.time} секунди</span>}
                              </div>
                            </div>
                          </div>

                          {canManageSessions && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingExercise(sessionExercise)
                                  setShowExerciseForm(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              {/* DELETE via pivot id with AlertDialog */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    className="cursor-pointer"
                                    variant="outline"
                                    size="sm"
                                    disabled={!pivotId || isDeleting}
                                    title={!pivotId ? "Липсва pivot_id в отговора" : undefined}
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Изтриване на упражнение</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Сигурни ли сте, че искате да изтриете това упражнение от сесията? Това действие не може да бъде отменено.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отказ</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => pivotId && handleDeleteExercise(pivotId)}
                                      className="bg-destructive text-white hover:bg-destructive/90"
                                      disabled={!pivotId}
                                    >
                                      Изтрий
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>

                        {index < exercises.length - 1 && <Separator className="my-2" />}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Exercise Form Dialog */}
        <Dialog
          open={showExerciseForm}
          onOpenChange={(open) => {
            setShowExerciseForm(open)
            if (!open) setEditingExercise(null)
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingExercise ? "Редактиране на упражнение" : "Добавяне на упражнение"}</DialogTitle>
            </DialogHeader>
            <SessionExerciseForm
              sessionId={sessionId}
              sessionExercise={editingExercise}
              excludeExerciseIds={usedExerciseIds}
              onSuccess={handleExerciseFormSuccess}
              onCancel={() => {
                setShowExerciseForm(false)
                setEditingExercise(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

