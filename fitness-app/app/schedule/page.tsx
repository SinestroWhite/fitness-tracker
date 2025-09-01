
// "use client"

// import { useState, useEffect } from "react"
// import { DashboardLayout } from "@/components/layout/dashboard-layout"
// import { ProtectedRoute } from "@/components/auth/protected-route"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { apiService, type WorkoutPlan, type WorkoutPlanSession } from "@/lib/api"
// import { useAuth } from "@/contexts/auth-context"
// import { useRouter } from "next/navigation"
// import { useToast } from "@/hooks/use-toast"
// import { AssignWorkoutDialog } from "@/components/schedule/assign-workout-dialog"
// import { ChevronLeft, ChevronRight, Clock, Target, Plus, Calendar } from "lucide-react"

// const dayLabels = {
//   Mon: "Понеделник",
//   Tue: "Вторник",
//   Wed: "Сряда",
//   Thu: "Четвъртък",
//   Fri: "Петък",
//   Sat: "Събота",
//   Sun: "Неделя",
// }

// const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

// const goals = {
//   lose: { label: "Отслабване", color: "bg-red-100 text-red-800 border-red-200" },
//   gain: { label: "Покачване", color: "bg-green-100 text-green-800 border-green-200" },
//   maintain: { label: "Поддържане", color: "bg-blue-100 text-blue-800 border-blue-200" },
// }

// export default function SchedulePage() {
//   const { user } = useAuth()
//   const { toast } = useToast()
//   const router = useRouter()

//   const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
//   const [loading, setLoading] = useState(true)
//   const [currentWeek, setCurrentWeek] = useState(new Date())
//   const [showAssignDialog, setShowAssignDialog] = useState(false)

//   const isTrainer = user?.role === "trainer" || user?.role === "admin"

//   const fetchWorkoutPlans = async () => {
//     try {
//       setLoading(true)
//       const response = await apiService.getWorkoutPlanList({ pageSize: 100 })

//       const plansWithSessions = await Promise.all(
//         response.data.map(async (plan: WorkoutPlan) => {
//           try {
//             const sessions = await apiService.getWorkoutPlanSessions(plan.id)
//             return { ...plan, sessions }
//           } catch {
//             return { ...plan, sessions: [] }
//           }
//         }),
//       )

//       setWorkoutPlans(plansWithSessions as WorkoutPlan[])
//     } catch {
//       toast({
//         title: "Грешка",
//         description: "Неуспешно зареждане на разписанието",
//         variant: "destructive",
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     fetchWorkoutPlans()
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])

//   const getWeekDates = (date: Date) => {
//     const week: Date[] = []
//     const startOfWeek = new Date(date)
//     const day = startOfWeek.getDay()
//     const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
//     startOfWeek.setDate(diff)

//     for (let i = 0; i < 7; i++) {
//       const weekDate = new Date(startOfWeek)
//       weekDate.setDate(startOfWeek.getDate() + i)
//       week.push(weekDate)
//     }
//     return week
//   }

//   const getSessionsForDay = (dayKey: string) => {
//     const sessions: Array<WorkoutPlanSession & { workoutPlan: WorkoutPlan }> = []

//     workoutPlans.forEach((plan: any) => {
//       if (plan.sessions) {
//         plan.sessions.forEach((session: WorkoutPlanSession) => {
//           if (session?.schedule?.includes(dayKey as any)) {
//             sessions.push({ ...session, workoutPlan: plan })
//           }
//         })
//       }
//     })

//     return sessions
//   }

//   const navigateWeek = (direction: "prev" | "next") => {
//     const newWeek = new Date(currentWeek)
//     newWeek.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7))
//     setCurrentWeek(newWeek)
//   }

//   const weekDates = getWeekDates(currentWeek)
//   const weekStart = weekDates[0]
//   const weekEnd = weekDates[6]

//   if (loading) {
//     return (
//       <ProtectedRoute>
//         <DashboardLayout>
//           <div className="animate-pulse space-y-6">
//             <div className="h-8 bg-muted rounded w-1/3"></div>
//             <div className="h-64 bg-muted rounded"></div>
//           </div>
//         </DashboardLayout>
//       </ProtectedRoute>
//     )
//   }

//   return (
//     <ProtectedRoute>
//       <DashboardLayout>
//         <div className="space-y-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-3xl font-bold">Разписание</h1>
//               <p className="text-muted-foreground">
//                 {isTrainer ? "Управление на тренировъчни разписания" : "Вашето тренировъчно разписание"}
//               </p>
//             </div>
//             {isTrainer && (
//               <Button onClick={() => setShowAssignDialog(true)}>
//                 <Plus className="h-4 w-4 mr-2" />
//                 Назначи тренировка
//               </Button>
//             )}
//           </div>

//           {/* Week Navigation */}
//           <div className="flex items-center justify-between">
//             <Button variant="outline" onClick={() => navigateWeek("prev")}>
//               <ChevronLeft className="h-4 w-4 mr-2" />
//               Предишна седмица
//             </Button>
//             <div className="text-lg font-medium">
//               {weekStart.toLocaleDateString("bg-BG", { day: "numeric", month: "long" })} -{" "}
//               {weekEnd.toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" })}
//             </div>
//             <Button variant="outline" onClick={() => navigateWeek("next")}>
//               Следваща седмица
//               <ChevronRight className="h-4 w-4 ml-2" />
//             </Button>
//           </div>

//           {/* Weekly Schedule Grid */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
//             {dayOrder.map((dayKey, index) => {
//               const dayDate = weekDates[index]
//               const sessions = getSessionsForDay(dayKey)
//               const isToday = dayDate.toDateString() === new Date().toDateString()

//               return (
//                 <Card key={dayKey} className={`${isToday ? "ring-2 ring-primary" : ""}`}>
//                   <CardHeader className="pb-3 rounded-t-lg">
//                     <CardTitle className="text-sm font-medium flex items-center gap-2">
//                       <Calendar className="h-4 w-4" />
//                       {dayLabels[dayKey]}
//                     </CardTitle>
//                     <CardDescription className="text-xs">
//                       {dayDate.toLocaleDateString("bg-BG", { day: "numeric", month: "short" })}
//                       {isToday && (
//                         <Badge variant="secondary" className="ml-2 text-xs">
//                           Днес
//                         </Badge>
//                       )}
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent className="space-y-2">
//                     {sessions.length === 0 ? (
//                       <p className="text-xs text-muted-foreground">Няма тренировки</p>
//                     ) : (
//                       sessions.map((session) => (
//                         <div
//                           key={`${session.workoutPlan.id}-${(session as any).id}`}
//                           className="p-2 bg-muted rounded-lg space-y-1 cursor-pointer hover:bg-muted/80 transition-colors"
//                           onClick={() => router.push(`/workout-details/${String((session as any).id)}`)}
//                         >
//                           <div className="flex items-center justify-between">
//                             <h4 className="text-xs font-medium truncate">{(session as any).title}</h4>
//                             <Badge
//                               className={`text-xs ${goals[session.workoutPlan.goal as keyof typeof goals]?.color}`}
//                             >
//                               <Target className="h-2 w-2 mr-1" />
//                               {goals[session.workoutPlan.goal as keyof typeof goals]?.label}
//                             </Badge>
//                           </div>
//                           <div className="flex items-center text-xs text-muted-foreground">
//                             <Clock className="h-3 w-3 mr-1" />
//                             {(session as any).duration_mins} мин
//                           </div>
//                           <p className="text-xs text-muted-foreground truncate">{session.workoutPlan.title}</p>
//                         </div>
//                       ))
//                     )}
//                   </CardContent>
//                 </Card>
//               )
//             })}
//           </div>
//         </div>

//         {/* Assign Workout Dialog (само за треньори) */}
//         {isTrainer && (
//           <AssignWorkoutDialog
//             open={showAssignDialog}
//             onOpenChange={setShowAssignDialog}
//             onSuccess={() => {
//               setShowAssignDialog(false)
//               fetchWorkoutPlans()
//             }}
//           />
//         )}
//       </DashboardLayout>
//     </ProtectedRoute>
//   )
// }




// "use client"

// import { useState, useEffect } from "react"
// import { DashboardLayout } from "@/components/layout/dashboard-layout"
// import { ProtectedRoute } from "@/components/auth/protected-route"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { apiService, type WorkoutPlan, type WorkoutPlanSession } from "@/lib/api"
// import { useAuth } from "@/contexts/auth-context"
// import { useRouter } from "next/navigation"
// import { useToast } from "@/hooks/use-toast"
// import { AssignWorkoutDialog } from "@/components/schedule/assign-workout-dialog"
// import { ChevronLeft, ChevronRight, Clock, Target, Plus, Calendar, CheckCircle2 } from "lucide-react"

// // Етикети за дни (bg)
// const dayLabels: Record<"Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun", string> = {
//   Mon: "Понеделник",
//   Tue: "Вторник",
//   Wed: "Сряда",
//   Thu: "Четвъртък",
//   Fri: "Петък",
//   Sat: "Събота",
//   Sun: "Неделя",
// }

// const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

// const goals = {
//   lose: { label: "Отслабване", color: "bg-red-100 text-red-800 border-red-200" },
//   gain: { label: "Покачване", color: "bg-green-100 text-green-800 border-green-200" },
//   maintain: { label: "Поддържане", color: "bg-blue-100 text-blue-800 border-blue-200" },
// }

// // ---- Завършвания (локално съхранение) ----
// const STORAGE_KEY = "workout-completions-v1"
// const DELIM = "|"

// // Локална дата YYYY-MM-DD (без UTC изненади)
// const localDate = (d: Date) => {
//   const y = d.getFullYear()
//   const m = String(d.getMonth() + 1).padStart(2, "0")
//   const day = String(d.getDate()).padStart(2, "0")
//   return `${y}-${m}-${day}`
// }

// // Ключ: planId|YYYY-MM-DD (НЕ sessionId)
// const completionKey = (planId: string | number, date: Date) => `${planId}${DELIM}${localDate(date)}`

// const readCompletions = (): Record<string, boolean> => {
//   try {
//     if (typeof window === "undefined") return {}
//     const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, any>
//     return normalizeCompletionKeys(raw)
//   } catch {
//     return {}
//   }
// }

// const writeCompletions = (map: Record<string, boolean>) => {
//   try {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
//   } catch {
//     // ignore
//   }
// }

// // Нормализиране: "id-YYYY-MM-DD" -> "id|YYYY-MM-DD", конвертира "true"/"false" към булеви,
// // и изхвърля ключове без дата/разделител.
// function normalizeCompletionKeys(input: Record<string, any>) {
//   const out: Record<string, boolean> = {}
//   const dash = /^(.*)-(\d{4}-\d{2}-\d{2})$/
//   const pipe = new RegExp(`^(.*)\\${DELIM}(\\d{4}-\\d{2}-\\d{2})$`)
//   for (const [k, v] of Object.entries(input)) {
//     let val: boolean
//     if (typeof v === "string") {
//       if (v.toLowerCase() === "true") val = true
//       else if (v.toLowerCase() === "false") val = false
//       else continue
//     } else {
//       val = !!v
//     }

//     if (pipe.test(k)) {
//       out[k] = val
//       continue
//     }
//     const m = k.match(dash)
//     if (m) {
//       out[`${m[1]}${DELIM}${m[2]}`] = val
//     }
//     // иначе игнорираме лоши ключове
//   }
//   try {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(out))
//   } catch {}
//   return out
// }

// export default function SchedulePage() {
//   const { user } = useAuth()
//   const { toast } = useToast()
//   const router = useRouter()

//   const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
//   const [loading, setLoading] = useState(true)
//   const [currentWeek, setCurrentWeek] = useState(new Date())
//   const [showAssignDialog, setShowAssignDialog] = useState(false)
//   const [completions, setCompletions] = useState<Record<string, boolean>>({})

//   const isTrainer = user?.role === "trainer" || user?.role === "admin"

//   const fetchWorkoutPlans = async () => {
//     try {
//       setLoading(true)
//       const response = await apiService.getWorkoutPlanList({ pageSize: 100 })

//       const plansWithSessions = await Promise.all(
//         response.data.map(async (plan: WorkoutPlan) => {
//           try {
//             const sessions = await apiService.getWorkoutPlanSessions(plan.id)
//             return { ...plan, sessions }
//           } catch {
//             return { ...plan, sessions: [] }
//           }
//         }),
//       )

//       setWorkoutPlans(plansWithSessions as WorkoutPlan[])
//     } catch {
//       toast({
//         title: "Грешка",
//         description: "Неуспешно зареждане на разписанието",
//         variant: "destructive",
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     fetchWorkoutPlans()
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])

//   // Зареди завършванията (с нормализация)
//   useEffect(() => {
//     setCompletions(readCompletions())
//   }, [])

//   const getWeekDates = (date: Date) => {
//     const week: Date[] = []
//     const startOfWeek = new Date(date)
//     const day = startOfWeek.getDay() // 0=Sun
//     const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // понеделник
//     startOfWeek.setDate(diff)

//     for (let i = 0; i < 7; i++) {
//       const weekDate = new Date(startOfWeek)
//       weekDate.setDate(startOfWeek.getDate() + i)
//       week.push(weekDate)
//     }
//     return week
//   }

//   const getSessionsForDay = (dayKey: string) => {
//     const sessions: Array<WorkoutPlanSession & { workoutPlan: WorkoutPlan }> = []

//     workoutPlans.forEach((plan: any) => {
//       if (plan.sessions) {
//         plan.sessions.forEach((session: WorkoutPlanSession) => {
//           if (session?.schedule?.includes(dayKey as any)) {
//             sessions.push({ ...session, workoutPlan: plan })
//           }
//         })
//       }
//     })

//     return sessions
//   }

//   const navigateWeek = (direction: "prev" | "next") => {
//     const newWeek = new Date(currentWeek)
//     newWeek.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7))
//     setCurrentWeek(newWeek)
//   }

//   // Тук ключът е по planId + дата на КОЛОНАТА (dayDate)
// // Смени markWorkoutCompleted да приема performed_on.
// // Добави и unmarkWorkoutCompleted в apiService.
// const toggleCompleted = async (planId: string, date: Date) => {
//   const key = completionKey(planId, date)
//   const next = !completions[key]

//   // Оптимистично UI
//   const updated = { ...completions, [key]: next }
//   setCompletions(updated)
//   writeCompletions(updated)

//   try {
//     const payload = { workout_plan_id: planId, performed_on: localDate(date) }


//       await apiService.markWorkoutCompleted(payload)   // POST
//       toast({ title: "Браво! 🎉", description: "Тренировката е отбелязана като приключена." })
  
//   } catch {
//     // rollback
//     const rollback = { ...updated, [key]: !next }
//     setCompletions(rollback)
//     writeCompletions(rollback)
//     toast({ title: "Грешка", description: "Неуспешно записване на статуса.", variant: "destructive" })
//   }
// }


//   const weekDates = getWeekDates(currentWeek)
//   const weekDatesStr = weekDates.map(localDate)
//   const weekStart = weekDates[0]
//   const weekEnd = weekDates[6]

//   // --- Седмичен прогрес: ключове по planId|date, с Set за уникалност ---
//   const weekSessionKeys = new Set<string>(
//     dayOrder.flatMap((dk, i) => {
//       const dateStr = weekDatesStr[i]
//       return getSessionsForDay(dk).map((s) => `${s.workoutPlan.id}${DELIM}${dateStr}`)
//     }),
//   )
//   const totalThisWeek = weekSessionKeys.size
//   const doneThisWeek = Object.entries(completions).reduce((count, [k, v]) => {
//     if (!v) return count
//     return weekSessionKeys.has(k) ? count + 1 : count
//   }, 0)

//   if (loading) {
//     return (
//       <ProtectedRoute>
//         <DashboardLayout>
//           <div className="animate-pulse space-y-6">
//             <div className="h-8 bg-muted rounded w-1/3"></div>
//             <div className="h-64 bg-muted rounded"></div>
//           </div>
//         </DashboardLayout>
//       </ProtectedRoute>
//     )
//   }

//   return (
//     <ProtectedRoute>
//       <DashboardLayout>
//         <div className="space-y-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-3xl font-bold">Разписание</h1>
//               <p className="text-muted-foreground">
//                 {isTrainer ? "Управление на тренировъчни разписания" : "Вашето тренировъчно разписание"}
//               </p>
//             </div>
//             {isTrainer && (
//               <Button onClick={() => setShowAssignDialog(true)}>
//                 <Plus className="h-4 w-4 mr-2" />
//                 Назначи тренировка
//               </Button>
//             )}
//           </div>

//           {/* Week Navigation */}
//           <div className="flex items-center justify-between">
//             <Button variant="outline" onClick={() => navigateWeek("prev")}>
//               <ChevronLeft className="h-4 w-4 mr-2" />
//               Предишна седмица
//             </Button>
//             <div className="text-lg font-medium">
//               {weekStart.toLocaleDateString("bg-BG", { day: "numeric", month: "long" })} -{" "}
//               {weekEnd.toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" })}
//             </div>
//             <Button variant="outline" onClick={() => navigateWeek("next")}>
//               Следваща седмица
//               <ChevronRight className="h-4 w-4 ml-2" />
//             </Button>
//           </div>

//           {/* Weekly progress badge */}
//           <div className="flex items-center justify-center">
//             <Badge variant="secondary" className="text-sm">
//               Завършени тази седмица: {doneThisWeek}/{totalThisWeek}
//             </Badge>
//           </div>

//           {/* Weekly Schedule Grid */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
//             {dayOrder.map((dayKey, index) => {
//               const dayDate = weekDates[index]
//               const sessions = getSessionsForDay(dayKey)
//               const isToday = dayDate.toDateString() === new Date().toDateString()

//               return (
//                 <Card key={dayKey} className={`${isToday ? "ring-2 ring-primary" : ""}`}>
//                   <CardHeader className="pb-3 rounded-t-lg">
//                     <CardTitle className="text-sm font-medium flex items-center gap-2">
//                       <Calendar className="h-4 w-4" />
//                       {dayLabels[dayKey]}
//                     </CardTitle>
//                     <CardDescription className="text-xs">
//                       {dayDate.toLocaleDateString("bg-BG", { day: "numeric", month: "short" })}
//                       {isToday && (
//                         <Badge variant="secondary" className="ml-2 text-xs">
//                           Днес
//                         </Badge>
//                       )}
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent className="space-y-2">
//                     {sessions.length === 0 ? (
//                       <p className="text-xs text-muted-foreground">Няма тренировки</p>
//                     ) : (
//                       sessions.map((session) => {
//                         const planId = session.workoutPlan.id            // <-- ключът е по planId
//                         const sessionId = (session as any).id             // само за навигация
//                         const cKey = completionKey(planId, dayDate)
//                         const isDone = !!completions[cKey]

//                         return (
//                           <div
//                             key={`${planId}-${sessionId ?? "s"}`}
//                             className={`p-2 bg-muted rounded-lg space-y-1 cursor-pointer hover:bg-muted/80 transition-colors ${
//                               isDone ? "opacity-70" : ""
//                             }`}
//                             onClick={() => router.push(`/workout-details/${String(sessionId ?? planId)}`)}
//                           >
//                             <div className="flex items-center justify-between gap-2">
//                               <h4 className={`text-xs font-medium truncate ${isDone ? "line-through" : ""}`}>
//                                 {(session as any).title}
//                               </h4>

//                               <div className="flex items-center gap-1">
//                                 {isDone && (
//                                   <Badge className="text-[10px] bg-green-100 text-green-800 border-green-200">
//                                     <CheckCircle2 className="h-3 w-3 mr-1" />
//                                     Приключена
//                                   </Badge>
//                                 )}
//                                 <Button
//                                   variant={isDone ? "secondary" : "outline"}
//                                   size="sm"
//                                   className="h-6 px-2 text-[10px]"
//                                   onClick={(e) => {
//                                     e.stopPropagation()
//                                     toggleCompleted(planId, dayDate) // ВАЖНО: planId + дата на колоната
//                                   }}
//                                 >
//                                   <CheckCircle2 className="h-3 w-3 mr-1" />
//                                   {isDone ? "Отмени" : "Готово"}
//                                 </Button>
//                               </div>
//                             </div>

//                             <div className="flex items-center justify-between">
//                               <div className="flex items-center text-xs text-muted-foreground">
//                                 <Clock className="h-3 w-3 mr-1" />
//                                 {(session as any).duration_mins} мин
//                               </div>
//                               <Badge className={`text-xs ${goals[session.workoutPlan.goal as keyof typeof goals]?.color}`}>
//                                 <Target className="h-2 w-2 mr-1" />
//                                 {goals[session.workoutPlan.goal as keyof typeof goals]?.label}
//                               </Badge>
//                             </div>

//                             <p className={`text-xs text-muted-foreground truncate ${isDone ? "line-through" : ""}`}>
//                               {session.workoutPlan.title}
//                             </p>
//                           </div>
//                         )
//                       })
//                     )}
//                   </CardContent>
//                 </Card>
//               )
//             })}
//           </div>
//         </div>

//         {/* Assign Workout Dialog (само за треньори) */}
//         {isTrainer && (
//           <AssignWorkoutDialog
//             open={showAssignDialog}
//             onOpenChange={setShowAssignDialog}
//             onSuccess={() => {
//               setShowAssignDialog(false)
//               fetchWorkoutPlans()
//             }}
//           />
//         )}
//       </DashboardLayout>
//     </ProtectedRoute>
//   )
// }




"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiService, type WorkoutPlan, type WorkoutPlanSession } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AssignWorkoutDialog } from "@/components/schedule/assign-workout-dialog"
import { ChevronLeft, ChevronRight, Clock, Target, Plus, Calendar, CheckCircle2 } from "lucide-react"

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

// -------------------- Завършвания (кеш локално) --------------------
const STORAGE_KEY = "workout-completions-v1"
const DELIM = "|"

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
    row?.workoutId ??
    row?.workout_id ??
    row?.planId ??
    row?.workout?.id
  return pid != null ? String(pid) : undefined
}

function extractPerformedLocalDate(row: any): string | undefined {
  const s =
    row?.performed_on ??
    row?.performedOn ??
    row?.created_at ??
    row?.createdAt
  if (!s) return undefined
  const d = new Date(s) // respects timezone (e.g. ...Z)
  if (isNaN(d.getTime())) return String(s).slice(0, 10)
  return localDate(d) // <-- convert to LOCAL day
}

const completionKey = (planId: string | number, date: Date) => `${String(planId)}${DELIM}${localDate(date)}`

function readCompletions(): Record<string, boolean> {
  try {
    if (typeof window === "undefined") return {}
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, any>
    return normalizeCompletionKeys(raw)
  } catch {
    return {}
  }
}
function writeCompletions(map: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {}
}
function normalizeCompletionKeys(input: Record<string, any>) {
  const out: Record<string, boolean> = {}
  const dash = /^(.*)-(\d{4}-\d{2}-\d{2})$/
  const pipe = new RegExp(`^(.*)\\${DELIM}(\\d{4}-\\d{2}-\\d{2})$`)
  for (const [k, v] of Object.entries(input)) {
    const val = typeof v === "string" ? v.toLowerCase() === "true" : !!v
    if (pipe.test(k)) { out[k] = val; continue }
    const m = k.match(dash)
    if (m) out[`${m[1]}${DELIM}${m[2]}`] = val
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(out)) } catch {}
  return out
}

// -------------------- Помощници за извличане от API отговор --------------------
// Покриваме различни възможни имена на полета в CompletedUserWorkout

function extractPerformedDate(row: any): string | undefined {
  const d =
    row?.performedOn ??
    row?.performed_on ??
    row?.date ??
    row?.performedDate ??
    row?.performed ??
    (typeof row?.created_at === "string" ? row.created_at.slice(0, 10) : undefined) ??
    (typeof row?.createdAt === "string" ? row.createdAt.slice(0, 10) : undefined)
  return typeof d === "string" ? d.slice(0, 10) : undefined
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

  const isTrainer = user?.role === "trainer" || user?.role === "admin"

  // --- Зареди планове + сесии
  const fetchWorkoutPlans = async () => {
    try {
      setLoading(true)
      const response = await apiService.getWorkoutPlanList({ pageSize: 100 })
      const plansWithSessions = await Promise.all(
        response.data.map(async (plan: WorkoutPlan) => {
          try {
            const sessions = await apiService.getWorkoutPlanSessions(plan.id)
            return { ...plan, sessions }
          } catch {
            return { ...plan, sessions: [] }
          }
        }),
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
  }

  useEffect(() => {
    fetchWorkoutPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Локален кеш (ако има стар) -> нормализация + почистване
  useEffect(() => {
    const cur = readCompletions()
    const valid = new RegExp(`^(\\d+|[a-zA-Z0-9_-]+)\\${DELIM}(\\d{4}-\\d{2}-\\d{2})$`)
    const cleaned: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(cur)) if (valid.test(k)) cleaned[k] = !!v
    setCompletions(cleaned)
    writeCompletions(cleaned)
  }, [])

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
  const weekDates = getWeekDates(currentWeek)
  const weekDatesStr = weekDates.map(localDate)
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

  // --- Хидратирай завършванията от бекенда (GET) чрез getCompletedWorkouts()
  async function hydrateCompletionsForWeek(week: Date[]) {
    try {
      const dateFrom = localDate(week[0])
      const dateTo   = localDate(week[6])
  
      const resp = await apiService.getCompletedWorkouts({
        dateFrom,
        dateTo,
        pageSize: 1000,
      })
  
      // Your API returns { completedWorkouts, pagination }, not { data }
      const rows: any[] = Array.isArray((resp as any).data)
        ? (resp as any).data
        : Array.isArray((resp as any).completedWorkouts)
        ? (resp as any).completedWorkouts
        : []
  
      const serverMap: Record<string, boolean> = {}
      for (const row of rows) {
        const pid = extractPlanId(row)
        const d = extractPerformedLocalDate(row) // <-- local day derived from ISO
        if (pid && d) serverMap[`${pid}|${d}`] = true
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
  

  // Викай при смяна на седмицата и след зареждане на плановете
  useEffect(() => {
    hydrateCompletionsForWeek(weekDates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek, workoutPlans.length])

  // --- Седмичен прогрес (по уникален ключ planId|date)
  const weekSessionKeys = new Set<string>(
    dayOrder.flatMap((dk, i) => {
      const dateStr = weekDatesStr[i]
      return getSessionsForDay(dk).map((s) => `${String(s.workoutPlan.id)}${DELIM}${dateStr}`)
    }),
  )
  const totalThisWeek = weekSessionKeys.size
  const doneThisWeek = Object.entries(completions).reduce((count, [k, v]) => {
    if (!v) return count
    return weekSessionKeys.has(k) ? count + 1 : count
  }, 0)

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Разписание</h1>
              <p className="text-muted-foreground">
                {isTrainer ? "Управление на тренировъчни разписания" : "Вашето тренировъчно разписание"}
              </p>
            </div>
            {isTrainer && (
              <Button onClick={() => setShowAssignDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Назначи тренировка
              </Button>
            )}
          </div>

          {/* Навигация по седмици */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Предишна седмица
            </Button>
            <div className="text-lg font-medium">
              {weekStart.toLocaleDateString("bg-BG", { day: "numeric", month: "long" })} -{" "}
              {weekEnd.toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" })}
            </div>
            <Button variant="outline" onClick={() => navigateWeek("next")}>
              Следваща седмица
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Седмичен прогрес */}
          <div className="flex items-center justify-center">
            <Badge variant="secondary" className="text-sm">
              Завършени тази седмица: {doneThisWeek}/{totalThisWeek}
            </Badge>
          </div>

          {/* Грид по дни */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {dayOrder.map((dayKey, index) => {
              const dayDate = weekDates[index]
              const sessions = getSessionsForDay(dayKey)
              const isToday = dayDate.toDateString() === new Date().toDateString()

              return (
                <Card key={dayKey} className={`${isToday ? "ring-2 ring-primary" : ""}`}>
                  <CardHeader className="pb-3 rounded-t-lg">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {dayLabels[dayKey]}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {dayDate.toLocaleDateString("bg-BG", { day: "numeric", month: "short" })}
                      {isToday && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Днес
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {sessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Няма тренировки</p>
                    ) : (
                      sessions.map((session) => {
                        const planId = String(session.workoutPlan.id)
                        const sessionId = (session as any).id
                        const cKey = `${planId}|${localDate(dayDate)}`
                        const isDone = !!completions[cKey]

                        return (
                          <div
                            key={`${planId}-${sessionId ?? "s"}`}
                            className={`p-2 bg-muted rounded-lg space-y-1 cursor-pointer hover:bg-muted/80 transition-colors ${
                              isDone ? "opacity-70" : ""
                            }`}
                            onClick={() => router.push(`/workout-details/${String(sessionId ?? planId)}`)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs font-medium truncate ${isDone ? "line-through" : ""}`}>
                                {(session as any).title}
                              </h4>

                              <div className="flex items-center gap-1">
                                {isDone && (
                                  <Badge className="text-[10px] bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Приключена
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                {(session as any).duration_mins} мин
                              </div>
                              <Badge className={`text-xs ${goals[session.workoutPlan.goal as keyof typeof goals]?.color}`}>
                                <Target className="h-2 w-2 mr-1" />
                                {goals[session.workoutPlan.goal as keyof typeof goals]?.label}
                              </Badge>
                            </div>

                            <p className={`text-xs text-muted-foreground truncate ${isDone ? "line-through" : ""}`}>
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
