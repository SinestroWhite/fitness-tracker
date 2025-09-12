// "use client"

// import { useState, useEffect } from "react"
// import { Calendar, Clock, Target, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Button } from "@/components/ui/button"
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { useToast } from "@/hooks/use-toast"
// import { useAuth } from "@/contexts/auth-context"
// import { apiService, type NutritionPlan, type NutritionPlanMealPivot } from "@/lib/api"
// import { DashboardLayout } from "@/components/layout/dashboard-layout"

// const dayLabels = {
//   Mon: "Понеделник",
//   Tue: "Вторник",
//   Wed: "Сряда",
//   Thu: "Четвъртък",
//   Fri: "Петък",
//   Sat: "Събота",
//   Sun: "Неделя",
// }

// const goalLabels = {
//   lose: "Отслабване",
//   gain: "Качване на тегло",
//   maintain: "Поддържане",
// }

// const goalColors = {
//   lose: "bg-red-100 text-red-800",
//   gain: "bg-green-100 text-green-800",
//   maintain: "bg-blue-100 text-blue-800",
// }

// export default function NutritionSchedulePage() {
//   const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
//   const [schedule, setSchedule] = useState<{ [key: string]: NutritionPlanMealPivot[] }>({})
//   const [loading, setLoading] = useState(true)
//   const [selectedDate, setSelectedDate] = useState<string | null>(null)
//   const [selectedMeals, setSelectedMeals] = useState<NutritionPlanMealPivot[]>([])
//   const [currentWeek, setCurrentWeek] = useState(new Date())

//   const { user } = useAuth()
//   const { toast } = useToast()

//   const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

//   useEffect(() => {
//     fetchNutritionSchedule()
//   }, [])

//   const fetchNutritionSchedule = async () => {
//     try {
//       setLoading(true)
//       const response = await apiService.getUserNutritionSchedule()
//       setNutritionPlan(response.nutritionPlan)
//       setSchedule(response.schedule)
//     } catch (error) {
//       toast({
//         title: "Грешка",
//         description: "Неуспешно зареждане на хранителния график",
//         variant: "destructive",
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleDateClick = (day: string) => {
//     const dayMeals = schedule[day] || []
//     setSelectedDate(day)
//     setSelectedMeals(dayMeals)
//   }

//   const getWeekDates = () => {
//     const startOfWeek = new Date(currentWeek)
//     const day = startOfWeek.getDay()
//     const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
//     startOfWeek.setDate(diff)

//     return days.map((_, index) => {
//       const date = new Date(startOfWeek)
//       date.setDate(startOfWeek.getDate() + index)
//       return date
//     })
//   }

//   const navigateWeek = (direction: "prev" | "next") => {
//     const newWeek = new Date(currentWeek)
//     newWeek.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7))
//     setCurrentWeek(newWeek)
//   }

//   const weekDates = getWeekDates()

//   if (loading) {
//     return (
//       <div className="container mx-auto p-6">
//         <div className="flex items-center justify-center h-64">
//           <div className="text-lg">Зареждане на хранителния график...</div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <DashboardLayout>
//     <div className="container mx-auto p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-3xl font-bold">Хранителен график</h1>
//           <p className="text-secondary">Вашият седмичен план за хранене</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
//             <ChevronLeft className="h-4 w-4" />
//           </Button>
//           <span className="text-sm font-medium px-4">
//             {weekDates[0].toLocaleDateString("bg-BG", { day: "numeric", month: "short" })} -{" "}
//             {weekDates[6].toLocaleDateString("bg-BG", { day: "numeric", month: "short", year: "numeric" })}
//           </span>
//           <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
//             <ChevronRight className="h-4 w-4" />
//           </Button>
//         </div>
//       </div>

//       {/* Current Nutrition Plan */}
//       {nutritionPlan && (
//         <Card className="mb-6">
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <Target className="h-5 w-5" />
//               Текущ хранителен план
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="flex items-center justify-between">
//               <div>
//                 <h3 className="text-lg font-semibold">{nutritionPlan.title}</h3>
//                 {nutritionPlan.description && (
//                   <p className="text-sm text-secondary mt-1">{nutritionPlan.description}</p>
//                 )}
//               </div>
//               <Badge className={goalColors[nutritionPlan.goal]}>{goalLabels[nutritionPlan.goal]}</Badge>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* Weekly Schedule */}
//       <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
//         {days.map((day, index) => {
//           const dayMeals = schedule[day] || []
//           const date = weekDates[index]
//           const isToday = date.toDateString() === new Date().toDateString()

//           return (
//             <Card
//               key={day}
//               className={`cursor-pointer transition-colors hover:bg-muted/50 ${isToday ? "ring-2 ring-primary" : ""}`}
//               onClick={() => handleDateClick(day)}
//             >
//               <CardHeader className="pb-3">
//                 <CardTitle className="text-sm text-center">
//                   <div className="font-medium">{dayLabels[day]}</div>
//                   <div className="text-xs text-secondary mt-1">
//                     {date.toLocaleDateString("bg-BG", { day: "numeric", month: "short" })}
//                   </div>
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-2">
//                   {dayMeals.length === 0 ? (
//                     <div className="text-center py-4">
//                       <p className="text-xs text-secondary">Няма планирани храни</p>
//                     </div>
//                   ) : (
//                     dayMeals.map((mealPivot, mealIndex) => (
//                       <div key={mealIndex} className="bg-muted/50 rounded-lg p-2">
//                         <div className="flex items-center gap-2 mb-1">
//                           <div className="w-8 h-8 bg-muted rounded overflow-hidden flex-shrink-0">
//                             {mealPivot.meal?.image ? (
//                               <img
//                                 src={mealPivot.meal.image || "/placeholder.svg"}
//                                 alt={mealPivot.meal.title}
//                                 className="w-full h-full object-cover"
//                                 onError={(e) => {
//                                   const target = e.target as HTMLImageElement
//                                   target.style.display = "none"
//                                   target.nextElementSibling?.classList.remove("hidden")
//                                 }}
//                               />
//                             ) : null}
//                             <div
//                               className={`w-full h-full flex items-center justify-center ${mealPivot.meal?.image ? "hidden" : ""}`}
//                             >
//                               <ImageIcon className="h-3 w-3 text-secondary" />
//                             </div>
//                           </div>
//                           <div className="flex-1 min-w-0">
//                             <p className="text-xs font-medium truncate">{mealPivot.meal?.title}</p>
//                             <p className="text-xs text-secondary">{mealPivot.meal?.calories} kcal</p>
//                           </div>
//                         </div>
//                         {mealPivot.schedule && mealPivot.schedule.length > 0 && (
//                           <div className="flex flex-wrap gap-1">
//                             {mealPivot.schedule
//                               .filter((s) => s.day === day)
//                               .map((scheduleItem, scheduleIndex) => (
//                                 <Badge key={scheduleIndex} variant="secondary" className="text-xs">
//                                   <Clock className="h-2 w-2 mr-1" />
//                                   {scheduleItem.time}
//                                 </Badge>
//                               ))}
//                           </div>
//                         )}
//                       </div>
//                     ))
//                   )}
//                 </div>
//               </CardContent>
//             </Card>
//           )
//         })}
//       </div>

//       {!nutritionPlan && (
//         <Card>
//           <CardContent className="text-center py-12">
//             <Calendar className="h-12 w-12 text-secondary mx-auto mb-4" />
//             <h3 className="text-lg font-semibold mb-2">Няма назначен хранителен план</h3>
//             <p className="text-secondary">Свържете се с вашия треньор за да ви назначи хранителен план.</p>
//           </CardContent>
//         </Card>
//       )}

//       {/* Day Details Dialog */}
//       <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
//         <DialogContent className="max-w-2xl">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               <Calendar className="h-5 w-5" />
//               {selectedDate && dayLabels[selectedDate as keyof typeof dayLabels]} - Хранителен план
//             </DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4">
//             {selectedMeals.length === 0 ? (
//               <div className="text-center py-8">
//                 <p className="text-secondary">Няма планирани храни за този ден</p>
//               </div>
//             ) : (
//               selectedMeals.map((mealPivot, index) => (
//                 <Card key={index}>
//                   <CardContent className="pt-6">
//                     <div className="flex items-start gap-4">
//                       <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
//                         {mealPivot.meal?.image ? (
//                           <img
//                             src={mealPivot.meal.image || "/placeholder.svg"}
//                             alt={mealPivot.meal.title}
//                             className="w-full h-full object-cover"
//                             onError={(e) => {
//                               const target = e.target as HTMLImageElement
//                               target.style.display = "none"
//                               target.nextElementSibling?.classList.remove("hidden")
//                             }}
//                           />
//                         ) : null}
//                         <div
//                           className={`w-full h-full flex items-center justify-center ${mealPivot.meal?.image ? "hidden" : ""}`}
//                         >
//                           <ImageIcon className="h-6 w-6 text-secondary" />
//                         </div>
//                       </div>
//                       <div className="flex-1">
//                         <h4 className="font-semibold text-lg">{mealPivot.meal?.title}</h4>
//                         {mealPivot.meal?.description && (
//                           <p className="text-sm text-secondary mt-1">{mealPivot.meal.description}</p>
//                         )}

//                         {/* Nutritional Info */}
//                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
//                           <div className="text-center">
//                             <div className="text-lg font-semibold">{mealPivot.meal?.calories}</div>
//                             <div className="text-xs text-secondary">kcal</div>
//                           </div>
//                           <div className="text-center">
//                             <div className="text-lg font-semibold">{mealPivot.meal?.protein}</div>
//                             <div className="text-xs text-secondary">Протеини (g)</div>
//                           </div>
//                           <div className="text-center">
//                             <div className="text-lg font-semibold">{mealPivot.meal?.carbohydrates}</div>
//                             <div className="text-xs text-secondary">Въглехидрати (g)</div>
//                           </div>
//                           <div className="text-center">
//                             <div className="text-lg font-semibold">{mealPivot.meal?.fat}</div>
//                             <div className="text-xs text-secondary">Мазнини (g)</div>
//                           </div>
//                         </div>

//                         {/* Quantity and Schedule */}
//                         <div className="flex items-center gap-4 mt-3">
//                           {(mealPivot.quantity || mealPivot.quantityKg) && (
//                             <Badge variant="outline">
//                               {mealPivot.quantity && `${mealPivot.quantity} порции`}
//                               {mealPivot.quantity && mealPivot.quantityKg && " • "}
//                               {mealPivot.quantityKg && `${mealPivot.quantityKg} кг`}
//                             </Badge>
//                           )}
//                           {mealPivot.schedule && mealPivot.schedule.length > 0 && (
//                             <div className="flex gap-1">
//                               {mealPivot.schedule
//                                 .filter((s) => s.day === selectedDate)
//                                 .map((scheduleItem, scheduleIndex) => (
//                                   <Badge key={scheduleIndex} variant="secondary">
//                                     <Clock className="h-3 w-3 mr-1" />
//                                     {scheduleItem.time}
//                                   </Badge>
//                                 ))}
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))
//             )}
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//     </DashboardLayout>
//   )
// }



"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Clock, Target, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

// ВАЖНО: импортни типовете от твоя api слой, за да не дублираме дефиниции
import {
  apiService,
  type NutritionPlan,
  type NutritionPlanMealPivot
} from "@/lib/api"

// DayKey: строгите ключове за седмицата


// Финален отговор от /schedule
export type ScheduleResponse = {
  nutritionPlan: NutritionPlan
  schedule: Record<DayKey, PivotWithCalc[]>
  totals: {
    byDay: Record<DayKey, MacroTotals>
    week: MacroTotals
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined" ? `${window.location.origin}` : "")

const toImageUrl = (u?: string): string => {
  if (!u) return "/placeholder.svg"
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith("/uploads/")) return `${API_BASE_URL}${u}`
  const name = u.split(/[\\/]/).pop() || u
  return `${API_BASE_URL}/uploads/${name}`
}

// ако тези типове не идват от lib/api, можеш да ги дефинираш локално:
type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
type MacroTotals = { calories: number; protein: number; carbohydrates: number; fat: number }
type PivotWithCalc = NutritionPlanMealPivot & { calc: MacroTotals }

// helper константа
const DAYS: DayKey[] = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

// нормализатор: Record<string, NutritionPlanMealPivot[]> -> Record<DayKey, PivotWithCalc[]>
function normalizeSchedule(raw: Record<string, NutritionPlanMealPivot[]>): Record<DayKey, PivotWithCalc[]> {
  const out: Record<DayKey, PivotWithCalc[]> = {
    Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: []
  }

  for (const d of DAYS) {
    const list = raw?.[d] ?? []
    out[d] = list.map((p) => {
      const qty =
        typeof p.quantity === "number" ? p.quantity
        : typeof p.quantityKg === "number" ? p.quantityKg
        : 1
      const m = p.meal
      const calc: MacroTotals = {
        calories: Math.round((m?.calories ?? 0) * qty),
        protein: Math.round((m?.protein ?? 0) * qty),
        carbohydrates: Math.round((m?.carbohydrates ?? 0) * qty),
        fat: Math.round((m?.fat ?? 0) * qty),
      }
      return { ...p, calc }
    })
  }
  return out
}



const dayLabels: Record<DayKey, string> = {
  Mon: "Понеделник",
  Tue: "Вторник",
  Wed: "Сряда",
  Thu: "Четвъртък",
  Fri: "Петък",
  Sat: "Събота",
  Sun: "Неделя",
}

const goalLabels: Record<NutritionPlan["goal"], string> = {
  lose: "Отслабване",
  gain: "Качване на тегло",
  maintain: "Поддържане",
}

const goalColors: Record<NutritionPlan["goal"], string> = {
  lose: "bg-red-600 text-red-50",
  gain: "bg-green-600 text-green-50",
  maintain: "bg-blue-600 text-blue-50",
}

const days: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function NutritionSchedulePage() {
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [schedule, setSchedule] = useState<Record<DayKey, PivotWithCalc[]>>({
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  })
  const [totals, setTotals] = useState<ScheduleResponse["totals"] | null>(null)

  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())

  // диалози
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null)
  const [selectedMeals, setSelectedMeals] = useState<PivotWithCalc[]>([])
  const [mealDetailsOpen, setMealDetailsOpen] = useState(false)
  const [selectedPivot, setSelectedPivot] = useState<PivotWithCalc | null>(null)

  const { toast } = useToast()
  const { user } = useAuth()

  const today = new Date().toLocaleDateString("en-US", { weekday: "short" }) as DayKey

  useEffect(() => {
    // зареди графика/плана при mount
    void fetchNutritionSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchNutritionSchedule = async () => {
    try {
      setLoading(true)

      // 1) Вземи планId от лични данни
      const personal = await apiService.getUserPersonal()
      const planId = personal?.nutritionPlanId as string | undefined

      if (!planId) {
        setNutritionPlan(null)
        setSchedule({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] })
        setTotals(null)
        toast({
          title: "Няма хранителен план",
          description: "Свържете се с треньор, за да ви назначи план.",
        })
        return
      }

      // 2) Вземи седмичния график
      const response = await apiService.getUserNutritionSchedule(planId) // тип: ScheduleResponse
      setNutritionPlan(response.nutritionPlan)
      setSchedule(normalizeSchedule(response.schedule))
      //setTotals(response.totals)
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на хранителния график",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  /** Навигация по седмици – графикът е седмичен, но датите в лентата показват реалната календарна седмица */
  const getWeekDates = () => {
    const startOfWeek = new Date(currentWeek)
    const day = startOfWeek.getDay() // 0=Sun ... 6=Sat
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // понеделник
    startOfWeek.setDate(diff)
    return days.map((_, index) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + index)
      return date
    })
  }
  const weekDates = getWeekDates()

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  /** Отваря дневен диалог */
  const handleDayClick = (day: DayKey) => {
    setSelectedDay(day)
    setSelectedMeals(schedule[day] ?? [])
  }

  /** Отваря детайли за ястие */
  const openMeal = (pivot: PivotWithCalc) => {
    setSelectedPivot(pivot)
    setMealDetailsOpen(true)
  }

  /** Калкулации за карта/детайл (fallback ако BE не е върнал calc в pivot) */
  const calcTotalsForPivot = (p: PivotWithCalc): MacroTotals => {
    if (p.calc) {
      return {
        calories: Math.round(p.calc.calories || 0),
        protein: Math.round(p.calc.protein || 0),
        carbohydrates: Math.round(p.calc.carbohydrates || 0),
        fat: Math.round(p.calc.fat || 0),
      }
    }
    const q =
      typeof p.quantity === "number"
        ? p.quantity
        : typeof p.quantityKg === "number"
        ? p.quantityKg
        : 1
    return {
      calories: Math.round((p.meal?.calories || 0) * q),
      protein: Math.round((p.meal?.protein || 0) * q),
      carbohydrates: Math.round((p.meal?.carbohydrates || 0) * q),
      fat: Math.round((p.meal?.fat || 0) * q),
    }
  }

  const dayTotal = (day: DayKey): MacroTotals => {
    if (totals?.byDay?.[day]) {
      const t = totals.byDay[day]
      return {
        calories: Math.round(t.calories),
        protein: Math.round(t.protein),
        carbohydrates: Math.round(t.carbohydrates),
        fat: Math.round(t.fat),
      }
    }
    // fallback: събери от schedule[day]
    return (schedule[day] ?? []).reduce<MacroTotals>(
      (acc, p) => {
        const t = calcTotalsForPivot(p)
        acc.calories += t.calories
        acc.protein += t.protein
        acc.carbohydrates += t.carbohydrates
        acc.fat += t.fat
        return acc
      },
      { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Зареждане на хранителния график...</div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        {/* Хедър и седмична навигация */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl text-secondary font-bold">Хранителен график</h1>
            <p className="text-secondary">Вашият седмичен план за хранене</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-transparent border-1 border-gray-500" variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-4 w-4 text-secondary" />
            </Button>
            <span className="text-sm text-secondary font-medium px-4">
              {weekDates[0].toLocaleDateString("bg-BG", { day: "numeric", month: "short" })} –{" "}
              {weekDates[6].toLocaleDateString("bg-BG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <Button className="bg-transparent border-1 border-gray-500" variant="outline" size="sm" onClick={() => navigateWeek("next")}>
              <ChevronRight className="h-4 w-4 text-secondary" />
            </Button>
          </div>
        </div>

        {/* Текущ хранителен план */}
        {nutritionPlan ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Текущ хранителен план
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{nutritionPlan.title}</h3>
                  {nutritionPlan.description && (
                    <p className="text-sm text-secondary mt-1">
                      {nutritionPlan.description}
                    </p>
                  )}
                </div>
                <Badge className={goalColors[nutritionPlan.goal]}>
                  {goalLabels[nutritionPlan.goal]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Няма назначен хранителен план</h3>
              <p className="text-secondary">
                Свържете се с вашия треньор за да ви назначи хранителен план.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Седмичен изглед */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {days.map((day, index) => {
            const dayMeals = schedule[day] ?? []
            const date = weekDates[index]
            const isToday = date.toDateString() === new Date().toDateString()
            const totalsForDay = dayTotal(day)

            return (
              <Card
                key={day}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  isToday ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleDayClick(day)}
                role="button"
                tabIndex={0}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-center">
                    <div className="font-medium">{dayLabels[day]}</div>
                    <div className="text-xs text-secondary mt-1">
                      {date.toLocaleDateString("bg-BG", { day: "numeric", month: "short" })}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Обобщение за деня */}
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                      <div className="text-sm font-semibold text-orange-600">
                        {Math.round(totalsForDay.calories)}
                      </div>
                      <div className="text-[11px] text-secondary">kcal</div>
                    </div>
                    <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                      <div className="text-sm font-semibold text-blue-600">
                        {Math.round(totalsForDay.protein)}g
                      </div>
                      <div className="text-[11px] text-secondary">Протеини</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dayMeals.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-xs text-secondary">Няма планирани храни</p>
                      </div>
                    ) : (
                      dayMeals.map((mealPivot, mealIndex) => (
                        <div key={mealIndex} className="bg-transparent border-1 border-gray-500 rounded-lg p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 bg-muted rounded overflow-hidden flex-shrink-0">
                              {mealPivot.meal?.image ? (
                                <img
                                  src={toImageUrl(mealPivot.meal.image)}
                                  alt={mealPivot.meal.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none"
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-3 w-3 text-primary" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{mealPivot.meal?.title}</p>
                              <p className="text-[11px] text-secondary">
                                {Math.round(mealPivot.calc?.calories ?? mealPivot.meal?.calories ?? 0)} kcal
                              </p>
                            </div>
                          </div>
                          {mealPivot.schedule && mealPivot.schedule.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {mealPivot.schedule
                                .filter((s) => s.day === day)
                                .map((scheduleItem, scheduleIndex) => (
                                  <Badge key={scheduleIndex} variant="secondary" className="text-xs bg-transparent border-1 border-gray-500 text-secondary">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {scheduleItem.time}
                                  </Badge>
                                ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Диалог: Детайли за деня */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null)
        }}
      >
        <DialogContent className="w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDay ? dayLabels[selectedDay] : ""} — Хранителен план
            </DialogTitle>
          </DialogHeader>

          {selectedDay ? (
            <div className="space-y-4">
              {/* Обобщение за деня */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  const t = dayTotal(selectedDay)
                  return (
                    <>
                      <div className="text-center p-3 bg-transparent border-1 border-gray-500 rounded">
                        <div className="font-semibold text-orange-600">{Math.round(t.calories)}</div>
                        <div className="text-xs text-secondary">kcal</div>
                      </div>
                      <div className="text-center p-3 bg-transparent border-1 border-gray-500 rounded">
                        <div className="font-semibold text-blue-600">{Math.round(t.protein)}g</div>
                        <div className="text-xs text-secondary">Протеини</div>
                      </div>
                      <div className="text-center p-3 bg-transparent border-1 border-gray-500 rounded">
                        <div className="font-semibold text-green-600">{Math.round(t.carbohydrates)}g</div>
                        <div className="text-xs text-secondary">Въглехидрати</div>
                      </div>
                      <div className="text-center p-3 bg-transparent border-1 border-gray-500 rounded">
                        <div className="font-semibold text-purple-600">{Math.round(t.fat)}g</div>
                        <div className="text-xs text-secondary">Мазнини</div>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Списък с ястия за избрания ден */}
              {selectedMeals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-secondary">Няма планирани храни за този ден</p>
                </div>
              ) : (
                <ScrollArea className="h-[60vh] pr-2">
                  <div className="space-y-4">
                    {selectedMeals.map((p, i) => {
                      const t = calcTotalsForPivot(p)
                      const times = p.schedule?.filter((s) => s.day === selectedDay).map((s) => s.time) ?? []
                      return (
                        <Card
                          key={i}
                          className="cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => openMeal(p)}
                          role="button"
                          tabIndex={0}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                {p.meal?.image ? (
                                  <img
                                    src={toImageUrl(p.meal.image)}
                                    alt={p.meal.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none"
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-primary" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold text-lg">{p.meal?.title}</h4>
                                  <div className="flex gap-1 flex-wrap">
                                    {times.map((t, idx) => (
                                      <Badge className="text-secondary bg-transparent border-1 border-gray-500" key={idx} variant="secondary">
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                {p.meal?.description && (
                                  <p className="text-sm text-secondary line-clamp-2">
                                    {p.meal.description}
                                  </p>
                                )}

                                {(p.quantity || p.quantityKg) && (
                                  <div className="mt-2">
                                    <Badge className="text-secondary" variant="outline">
                                      {p.quantity && `${p.quantity} пор.`}
                                      {p.quantity && p.quantityKg && " • "}
                                      {p.quantityKg && `${p.quantityKg} кг`}
                                    </Badge>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mt-3">
                                  <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                                    <div className="font-semibold text-orange-600">{t.calories}</div>
                                    <div className="text-xs text-secondary">kcal</div>
                                  </div>
                                  <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                                    <div className="font-semibold text-blue-600">{t.protein}g</div>
                                    <div className="text-xs text-secondary">Протеини</div>
                                  </div>
                                  <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                                    <div className="font-semibold text-green-600">{t.carbohydrates}g</div>
                                    <div className="text-xs text-secondary">Въглехидрати</div>
                                  </div>
                                  <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                                    <div className="font-semibold text-purple-600">{t.fat}g</div>
                                    <div className="text-xs text-secondary">Мазнини</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Диалог: Детайл за ястие */}
      <Dialog open={mealDetailsOpen} onOpenChange={(open) => setMealDetailsOpen(open)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPivot?.meal?.title ?? "Храна"}</DialogTitle>
          </DialogHeader>

          {selectedPivot && (
            <div className="space-y-4">
              {/* Снимка */}
              <div className="w-full aspect-[16/9] bg-muted rounded-lg overflow-hidden">
                {selectedPivot.meal?.image ? (
                  <img
                    src={toImageUrl(selectedPivot.meal.image)}
                    alt={selectedPivot.meal.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>

              {/* Часове за избрания ден (ако има) */}
              {selectedDay && (
                <div className="flex flex-wrap gap-2">
                  {selectedPivot.schedule
                    ?.filter((s) => s.day === selectedDay)
                    .map((s, idx) => (
                      <Badge className="text-secondary bg-transparent border-1 border-gray-500" key={idx} variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {s.time}
                      </Badge>
                    ))}
                </div>
              )}

              {/* Описание */}
              {selectedPivot.meal?.description && (
                <p className="text-sm text-secondary whitespace-pre-wrap">
                  {selectedPivot.meal.description}
                </p>
              )}

              {/* Количество */}
              {(selectedPivot.quantity || selectedPivot.quantityKg) && (
                <div>
                  <Badge className="text-secondary" variant="outline">
                    {selectedPivot.quantity && `${selectedPivot.quantity} порции`}
                    {selectedPivot.quantity && selectedPivot.quantityKg && " • "}
                    {selectedPivot.quantityKg && `${selectedPivot.quantityKg} кг`}
                  </Badge>
                </div>
              )}

              {/* Макроси */}
              {(() => {
                const t = calcTotalsForPivot(selectedPivot)
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                      <div className="font-semibold text-orange-600">{t.calories}</div>
                      <div className="text-xs text-secondary">kcal</div>
                    </div>
                    <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                      <div className="font-semibold text-blue-600">{t.protein}g</div>
                      <div className="text-xs text-secondary">Протеини</div>
                    </div>
                    <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                      <div className="font-semibold text-green-600">{t.carbohydrates}g</div>
                      <div className="text-xs text-secondary">Въглехидрати</div>
                    </div>
                    <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                      <div className="font-semibold text-purple-600">{t.fat}g</div>
                      <div className="text-xs text-secondary">Мазнини</div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
