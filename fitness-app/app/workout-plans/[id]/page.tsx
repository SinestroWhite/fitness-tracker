"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Plus, Edit, Trash2, Target, Calendar } from "lucide-react"
import { apiService, type WorkoutPlan, type WorkoutPlanSession } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { WorkoutPlanSessionForm } from "@/components/workout-plans/workout-plan-session-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

const goals = [
  { value: "lose", label: "Отслабване" },
  { value: "gain", label: "Покачване на тегло" },
  { value: "maintain", label: "Поддържане" },
]

const dayLabels: Record<string, string> = {
  Mon: "Понеделник",
  Tue: "Вторник",
  Wed: "Сряда",
  Thu: "Четвъртък",
  Fri: "Петък",
  Sat: "Събота",
  Sun: "Неделя",
}

// Adapter: snake_case -> camelCase so created_at works everywhere
// (keeps UI code consistent with WorkoutPlan type)
type WorkoutPlanApi = {
  id: number | string
  title: string
  goal: "lose" | "gain" | "maintain" | string
  created_at: string
  updated_at?: string
  author_id?: number
  author_name?: string
}

const toWorkoutPlan = (p: WorkoutPlanApi): WorkoutPlan =>
  ({
    id: String(p.id),
    title: p.title,
    goal: p.goal as any,
    createdAt: p.created_at,
    updatedAt: p.updated_at ?? p.created_at,
    authorId: p.author_id as any,
    authorName: p.author_name as any,
  } as unknown as WorkoutPlan)

// --- Helpers ---
function formatBgDate(input: any): string {
  if (!input) return "—"
  const d = input instanceof Date ? input : new Date(input)
  return isNaN(+d)
    ? "—"
    : new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium" }).format(d)
}

/** Normalizes various backend shapes into a string[] of weekday codes like ["Mon","Wed"] */
function normalizeSchedule(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {
      /* not JSON */
    }
    return value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
  }

  if (typeof value === "object") {
    if (Array.isArray((value as any).days)) return (value as any).days.filter(Boolean)
    if (Array.isArray((value as any).schedule)) return (value as any).schedule.filter(Boolean)
  }

  return []
}

export default function WorkoutPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [sessions, setSessions] = useState<WorkoutPlanSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [editingSession, setEditingSession] = useState<WorkoutPlanSession | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const planId = params.id as string
  const canManagePlans = user?.role === "trainer" || user?.role === "admin"

  const fetchWorkoutPlan = async () => {
    try {
      setLoading(true)
      const [planData, sessionsData] = await Promise.all([
        apiService.getWorkoutPlan(Number(planId), "sessions,schedule"),
        apiService.getWorkoutPlanSessions(planId),
      ])

      // Some APIs return { data: {...} } — support both
      const rawPlan: WorkoutPlanApi = (planData as any)?.data ?? (planData as any)
      setWorkoutPlan(toWorkoutPlan(rawPlan))

      const rawSessions: any = (sessionsData as any)?.data ?? sessionsData
      const normalizedSessions: WorkoutPlanSession[] = (Array.isArray(rawSessions) ? rawSessions : []).map(
        (s: any) => ({
          ...s,
          schedule: normalizeSchedule(s?.schedule),
        })
      )
      setSessions(normalizedSessions)
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на тренировъчния план",
        variant: "destructive",
      })
      router.push("/workout-plans")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkoutPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  const handleDeleteSession = async (pivotId: string) => {
    try {
      setDeletingId(pivotId)
      await apiService.deleteWorkoutPlanSession(pivotId)
      toast({
        title: "Успех",
        description: "Сесията е премахната от плана",
      })
      await fetchWorkoutPlan()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно премахване на сесията",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleSessionFormSuccess = () => {
    setShowSessionForm(false)
    setEditingSession(null)
    fetchWorkoutPlan()
  }

  const getGoalLabel = (goal: string) => goals.find((g) => g.value === goal)?.label || goal

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case "lose":
        return "bg-red-600 text-red-50"
      case "gain":
        return "bg-green-600 text-green-50"
      case "maintain":
        return "bg-blue-600 text-blue-50"
      default:
        return "bg-gray-600 text-gray-50"
    }
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

  if (!workoutPlan) return null

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-secondary" size="sm" onClick={() => router.push("/workout-plans")}>
              <ArrowLeft className="h-4 w-4 mr-2 text-secondary" />
              Назад към плановете
            </Button>
          </div>

          {/* Workout Plan Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{workoutPlan.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <Badge className={getGoalColor(workoutPlan.goal as string)}>
                      <Target className="h-3 w-3 mr-1" />
                      {getGoalLabel(workoutPlan.goal as string)}
                    </Badge>
                    <div className="text-sm text-secondary">
                      Създаден на {formatBgDate((workoutPlan as any).createdAt ?? (workoutPlan as any).created_at)}
                    </div>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Sessions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Тренировъчни планове</CardTitle>
                  <CardDescription>Сесии включени в този план с разписание</CardDescription>
                </div>
                {canManagePlans && (
                  <Button variant="white" onClick={() => setShowSessionForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добави план
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-secondary">Няма добавени сесии в този план</p>
                  {canManagePlans && (
                    <Button className="mt-4" onClick={() => setShowSessionForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Добави първи план
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((planSession, index) => {
                    const days = Array.isArray(planSession.schedule) ? planSession.schedule : []
                    return (
                      <div key={planSession.id}>
                        <div className="flex items-center justify-between p-4 border-1 border-gray-500 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-secondary text-primary rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{planSession.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-secondary">
                                {/* <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {planSession.durationMins} мин
                                </div> */}
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {days.length > 0
                                    ? days.map((day) => dayLabels[day] ?? day).join(", ")
                                    : "Без разписание"}
                                </div>
                              </div>
                            </div>
                          </div>
                          {canManagePlans && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="border-1 border-gray-500"
                                onClick={() => {
                                  setEditingSession(planSession)
                                  setShowSessionForm(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              {/* Delete with AlertDialog */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="border-1 border-gray-500"
                                    disabled={deletingId === planSession.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Изтриване на сесия</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Сигурни ли сте, че искате да изтриете тази сесия от плана? Това действие не може да бъде
                                      отменено.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отказ</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteSession(planSession.pivot_id)}
                                      className="bg-destructive text-secondary hover:bg-destructive/90"
                                      disabled={deletingId === planSession.pivot_id}
                                    >
                                      {deletingId === planSession.id ? "Изтриване..." : "Изтрий"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                        {index < sessions.length - 1 && <Separator className="my-2" />}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Form Dialog */}
        <Dialog open={showSessionForm} onOpenChange={setShowSessionForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSession ? "Редактиране на сесия" : "Добавяне на сесия"}</DialogTitle>
            </DialogHeader>
            <WorkoutPlanSessionForm
              workoutPlanId={planId}
              workoutPlanSession={editingSession}
              onSuccess={handleSessionFormSuccess}
              onCancel={() => {
                setShowSessionForm(false)
                setEditingSession(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
