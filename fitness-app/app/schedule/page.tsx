"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { apiService, type WorkoutPlan, type WorkoutPlanSession } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AssignWorkoutDialog } from "@/components/schedule/assign-workout-dialog"
import { ChevronLeft, ChevronRight, Clock, Target, Plus, Calendar, CheckCircle2, Dumbbell } from "lucide-react"

// -------------------- Константи и етикети --------------------
const dayLabels: Record<"Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun", string> = {
  Mon: "Понеделник",
  Tue: "Вторник",
  Wed: "Сряда",
  Thu: "Четвъртък",
  Fri: "Петък",
  Sat: "Събота",
  Sun: "Неделя",
}
const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

const goals = {
  lose: { label: "Отслабване", color: "bg-red-100 text-red-800 border-red-200" },
  gain: { label: "Покачване", color: "bg-green-100 text-green-800 border-green-200" },
  maintain: { label: "Поддържане", color: "bg-blue-100 text-blue-800 border-blue-200" },
}

// -------------------- Завършвания (локален кеш) --------------------
// v2: ключовете вече са session-aware => `${planId}:${sessionId}|YYYY-MM-DD`
const STORAGE_KEY = "workout-completions-v2"
const DELIM = "|"
const SUBKEY = ":" // разделител между planId и sessionId

// Use local timezone for the date key
const localDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function extractPlanId(row: any): string | undefined {
  const pid =
    row?.workout_plan_id ??
    row?.workoutPlanId ??
    row?.workoutId ??
    row?.workout_id ??
    row?.planId ??
    row?.workout?.id
  return pid != null ? String(pid) : undefined
}

function extractSessionId(row: any): string | undefined {
  // Покриваме различни възможни имена от бекенда
  const sid =
    row?.workout_plan_session_id ??
    row?.workoutSessionId ??
    row?.session_id ??
    row?.sessionId ??
    row?.workout_session_id ??
    row?.id // ако редът е самата сесия
  return sid != null ? String(sid) : undefined
}

function extractPerformedLocalDate(row: any): string | undefined {
  const s =
    row?.performed_on ??
    row?.performedOn ??
    row?.date ??
    row?.performedDate ??
    row?.performed ??
    row?.created_at ??
    row?.createdAt
  if (!s) return undefined
  const d = new Date(s)
  if (isNaN(d.getTime())) return String(s).slice(0, 10)
  return localDate(d) // локален ден
}

const makeKey = (planId: string | number, sessionId: string | number | undefined, date: string | Date) => {
  const d = typeof date === "string" ? date : localDate(date)
  const sid = sessionId != null ? String(sessionId) : "plan" // backstop
  return `${String(planId)}${SUBKEY}${sid}${DELIM}${d}`
}

function readCompletions(): Record<string, boolean> {
  try {
    if (typeof window === "undefined") return {}
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, any>

    // Миграция от v1 формат `${planId}|YYYY-MM-DD` към v2 `${planId}:plan|YYYY-MM-DD`
    const migrated: Record<string, boolean> = {}
    const v1Pipe = new RegExp(`^(.*)\\${DELIM}(\\d{4}-\\d{2}-\\d{2})$`)
    const v2Pipe = new RegExp(`^(.*)\\${SUBKEY}(.*)\\${DELIM}(\\d{4}-\\d{2}-\\d{2})$`)

    for (const [k, v] of Object.entries(raw)) {
      const val = typeof v === "string" ? v.toLowerCase() === "true" : !!v
      if (v2Pipe.test(k)) {
        migrated[k] = val
      } else if (v1Pipe.test(k)) {
        const m = k.match(v1Pipe)!
        migrated[`${m[1]}${SUBKEY}plan${DELIM}${m[2]}`] = val
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    return migrated
  } catch {
    return {}
  }
}
function writeCompletions(map: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)) } catch {}
}

// -------------------- Компонент --------------------
export default function SchedulePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [completions, setCompletions] = useState<Record<string, boolean>>({})

  const [activePlanId, setActivePlanId] = useState<string | null>(null)

  const isTrainer = user?.role === "trainer" || user?.role === "admin"

  const fetchActivePlanId = useCallback(async () => {
    try {
      // подаваме празно тяло — бекендът връща текущото UserPersonal
      const me: any = await apiService.getUserPersonal()
      // опитваме да извадим id през различни възможни полета
      const pid =
        me?.workout_plan_id ??
        me?.workoutPlanId ??
        me?.workout_plan?.id ??
        me?.workoutPlan?.id ??
        me?.workout?.id

      if (pid != null) {
        setActivePlanId(String(pid))
        return String(pid)
      }
    } catch (e) {
      console.warn("Неуспешно вземане на activePlanId", e)
    }
    setActivePlanId(null)
    return null
  }, [])

  const fetchWorkoutPlans = useCallback(
    async (selectedPlanId?: string | null) => {
      try {
        setLoading(true)
        const response = await apiService.getWorkoutPlanList({ pageSize: 100 })

        // ако не е треньор → показваме само активния план
        const basePlans = Array.isArray(response?.data) ? response.data : []
        const plansFiltered =
          !isTrainer && selectedPlanId
            ? basePlans.filter(
                (p: any) =>
                  String(p?.id) === String(selectedPlanId) ||
                  String(p?.workout_plan_id) === String(selectedPlanId)
              )
            : basePlans

        const plansWithSessions = await Promise.all(
          plansFiltered.map(async (plan: WorkoutPlan) => {
            try {
              const sessions = await apiService.getWorkoutPlanSessions(plan.id)
              return { ...plan, sessions }
            } catch {
              return { ...plan, sessions: [] }
            }
          })
        )

        setWorkoutPlans(plansWithSessions as WorkoutPlan[])
      } catch {
        toast({
          title: "Грешка",
          description: "Неуспешно зареждане на разписанието",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [isTrainer, toast]
  )

  // NEW: първо вземи activePlanId, после зареди плановете (филтрирани)
  useEffect(() => {
    ;(async () => {
      const pid = await fetchActivePlanId()
      await fetchWorkoutPlans(pid)
    })()
  }, [fetchActivePlanId, fetchWorkoutPlans])

  // --- Зареди планове + сесии
  // const fetchWorkoutPlans = async () => {
  //   try {
  //     setLoading(true)
  //     const response = await apiService.getWorkoutPlanList({ pageSize: 100 })
  //     console.log(response)
  //     const plansWithSessions = await Promise.all(
  //       response.data.map(async (plan: WorkoutPlan) => {
  //         try {
  //           const sessions = await apiService.getWorkoutPlanSessions(plan.id)
  //           return { ...plan, sessions }
  //         } catch {
  //           return { ...plan, sessions: [] }
  //         }
  //       }),
  //     )
  //     setWorkoutPlans(plansWithSessions as WorkoutPlan[])
  //   } catch {
  //     toast({
  //       title: "Грешка",
  //       description: "Неуспешно зареждане на разписанието",
  //       variant: "destructive",
  //     })
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  useEffect(() => {
    fetchWorkoutPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Локален кеш -> нормализация
  useEffect(() => { setCompletions(readCompletions()) }, [])

  // --- Помощни за седмицата
  const getWeekDates = (date: Date) => {
    const week: Date[] = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay() // 0=Sun
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // понеделник
    startOfWeek.setDate(diff)
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek)
      weekDate.setDate(startOfWeek.getDate() + i)
      week.push(weekDate)
    }
    return week
  }
  const weekDates = useMemo(() => getWeekDates(currentWeek), [currentWeek])
  const weekDatesStr = useMemo(() => weekDates.map(localDate), [weekDates])
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  // --- Сесии за ден
  const getSessionsForDay = (dayKey: string) => {
    const sessions: Array<WorkoutPlanSession & { workoutPlan: WorkoutPlan }> = []
    workoutPlans.forEach((plan: any) => {
      if (Array.isArray(plan.sessions)) {
        plan.sessions.forEach((session: WorkoutPlanSession) => {
          if (session?.schedule?.includes(dayKey as any)) {
            sessions.push({ ...session, workoutPlan: plan })
          }
        })
      }
    })
    return sessions
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  // --- Хидратирай завършванията от бекенда (GET)
  async function hydrateCompletionsForWeek(week: Date[]) {
    try {
      const dateFrom = localDate(week[0])
      const dateTo   = localDate(week[6])

      const resp = await apiService.getCompletedWorkouts({
        dateFrom,
        dateTo,
        pageSize: 1000,
      })

      const rows: any[] = Array.isArray((resp as any).data)
        ? (resp as any).data
        : Array.isArray((resp as any).completedWorkouts)
        ? (resp as any).completedWorkouts
        : []

      const serverMap: Record<string, boolean> = {}
      for (const row of rows) {
        const pid = extractPlanId(row)
        const sid = extractSessionId(row)
        const d = extractPerformedLocalDate(row)
        if (pid && d) serverMap[makeKey(pid, sid, d)] = true
      }

      setCompletions((prev) => {
        const merged = { ...prev, ...serverMap }
        writeCompletions(merged)
        return merged
      })
    } catch (e) {
      console.warn("Failed to hydrate completions", e)
    }
  }

  useEffect(() => { hydrateCompletionsForWeek(weekDates) }, [/* eslint-disable-line */ workoutPlans.length, currentWeek])

  // --- Седмичен прогрес (по уникален ключ planId:sessionId|date)
  const weekSessionKeys = useMemo(() => {
    return new Set<string>(
      dayOrder.flatMap((dk, i) => {
        const dateStr = weekDatesStr[i]
        return getSessionsForDay(dk).map((s: any) => {
          const planId = String(s.workoutPlan.id)
          const sessionId = s.id ?? s.sessionId
          return makeKey(planId, sessionId, dateStr)
        })
      }),
    )
  }, [workoutPlans, currentWeek])

  // Ако бекендът връща само plan-level завършване, го считаме за валидно за всички сесии в същия ден
  const isSessionDone = (planId: string, sessionId: string | undefined, dateStr: string) => {
    const cKeyExact = makeKey(planId, sessionId, dateStr)
    const cKeyPlan  = makeKey(planId, "plan", dateStr)
    return !!(completions[cKeyExact] || completions[cKeyPlan])
  }

  const totalThisWeek = weekSessionKeys.size

  const doneThisWeek = useMemo(() => {
    let count = 0
    dayOrder.forEach((dk, i) => {
      const dateStr = weekDatesStr[i]
      const sessions = getSessionsForDay(dk)
      sessions.forEach((s: any) => {
        const planId = String(s.workoutPlan.id)
        const sessionId = s.id ?? s.sessionId
        if (isSessionDone(planId, sessionId, dateStr)) count++
      })
    })
    return count
  }, [completions, workoutPlans, currentWeek])

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-[50vh] bg-muted rounded"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl text-secondary font-bold tracking-tight">Разписание</h1>
              <p className="text-secondary">
                {isTrainer ? "Управление на тренировъчни разписания" : "Вашето тренировъчно разписание"}
              </p>
            </div>
            {isTrainer && (
              <Button onClick={() => setShowAssignDialog(true)} className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Назначи тренировка
              </Button>
            )}
          </div>

          {/* Навигация по седмици */}
          <div className="flex items-center bg-transparent border-1 border-gray-500 justify-between rounded-xl rd p-2">
            <Button variant="ghost" onClick={() => navigateWeek("prev")} className="gap-2">
              <ChevronLeft className="h-4 w-4 text-secondary" /> <p className="text-secondary">Предишна</p>
            </Button>
            <div className="text-lg text-secondary font-medium">
              {weekStart.toLocaleDateString("bg-BG", { day: "numeric", month: "long" })} – {weekEnd.toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" })}
            </div>
            <Button variant="ghost" onClick={() => navigateWeek("next")} className="gap-2">
             <p className="text-secondary">Следваща</p>  <ChevronRight className="h-4 w-4 text-secondary" />
            </Button>
          </div>

          {/* Седмичен прогрес */}
          <div className="flex flex-col items-center gap-2">
            <Badge variant="secondary" className="text-sm bg-transparent border-1 border-gray-500 text-secondary">Завършени тази седмица: {doneThisWeek}/{totalThisWeek}</Badge>
            <Progress value={totalThisWeek ? (doneThisWeek / totalThisWeek) * 100 : 0} className="w-full max-w-2xl" />
          </div>

          {/* Грид по дни — подобрен за големи екрани */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-3 auto-rows-fr">
            {dayOrder.map((dayKey, index) => {
              const dayDate = weekDates[index]
              const sessions = getSessionsForDay(dayKey)
              const isToday = dayDate.toDateString() === new Date().toDateString()

              return (
                <Card key={dayKey} className={`h-full py-0 pb-5 flex flex-col ${isToday ? "ring-2 ring-primary" : ""}`}>
                  <CardHeader className="pb-3 pt-3 rounded-t-lg text-primary sticky top-0 bg-transperant border-1 border-gray-500 z-10">
                    <CardTitle className="text-sm font-semibold text-secondary flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-secondary" /> {dayLabels[dayKey]}
                    </CardTitle>
                    <CardDescription className="text-xs flex items-center gap-2">
                      {dayDate.toLocaleDateString("bg-BG", { day: "numeric", month: "short" })}
                      {isToday && (
                        <Badge variant="secondary" className="text-[10px] text-secondary bg-transparent border-1 border-gray-500">Днес</Badge>
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2 flex-1">
                    {sessions.length === 0 ? (
                      <div className="h-full min-h-[96px] grid place-items-center text-center text-xs text-muted-foreground">
                        <div className="flex flex-col text-secondary items-center gap-2">
                          <Dumbbell className="h-5 w-5 text-secondary" />
                          Няма тренировки
                        </div>
                      </div>
                    ) : (
                      sessions.map((session: any) => {
                        const planId = String(session.workoutPlan.id)
                        const sessionId = session.id ?? session.sessionId
                        const cKey = makeKey(planId, sessionId, localDate(dayDate))
                        const dateStr = localDate(dayDate)
                        const cKeyExact = makeKey(planId, sessionId, dateStr)
                        const cKeyPlan  = makeKey(planId, "plan", dateStr)
                        const isDone = !!(completions[cKeyExact] || completions[cKeyPlan])

                        return (
                          <div
                            key={`${planId}-${sessionId ?? "s"}`}
                            className={`p-3 bg-muted rounded-xl space-y-2 cursor-pointer transition-colors border hover:bg-background/60 ${
                              isDone ? "opacity-80" : ""
                            }`}
                            onClick={() =>
                              router.push(
                                `/workout-details/${String(session.session_id ?? session.id)}?` +
                                `planId=${encodeURIComponent(String(session.workoutPlan.id))}` +
                                `&date=${encodeURIComponent(localDate(dayDate))}` +
                                `&wpsId=${session.id}` // <-- pivot id
                              )
                            }
                            
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-sm font-medium text-primary truncate ${isDone ? "line-through" : ""}`}>
                                {session.title ?? session.name ?? "Тренировка"}
                              </h4>
                              {isDone && (
                                <Badge className="text-[10px] bg-secondary text-green-500 border-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-primary" /> Приключена
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-xs text-primary">
                                <Clock className="h-3 w-3 mr-1" /> {session.duration_mins ?? session.duration ?? "—"} мин
                              </div>
                              <Badge className={`text-xs ${goals[session.workoutPlan.goal as keyof typeof goals]?.color}`}>
                                <Target className="h-3 w-3 mr-1" />
                                {goals[session.workoutPlan.goal as keyof typeof goals]?.label}
                              </Badge>
                            </div>

                            <p className={`text-xs text-primary truncate ${isDone ? "line-through" : ""}`}>
                              {session.workoutPlan.title}
                            </p>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Диалог за назначаване (само за треньори) */}
        {isTrainer && (
          <AssignWorkoutDialog
            open={showAssignDialog}
            onOpenChange={setShowAssignDialog}
            onSuccess={() => {
              setShowAssignDialog(false)
              fetchWorkoutPlans()
            }}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}
