"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Target, Calendar, Apple, Clock, ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

// api service + типове (важно: тук приемаме, че ги имаш вече)
import { apiService, type NutritionPlan, type NutritionPlanMealPivot } from "@/lib/api"

// Recharts (client-only)
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
} from "recharts"

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

const dayLabels: Record<DayKey, string> = {
  Mon: "Понеделник",
  Tue: "Вторник",
  Wed: "Сряда",
  Thu: "Четвъртък",
  Fri: "Петък",
  Sat: "Събота",
  Sun: "Неделя",
}

const dayOrder: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// 1) Ключове за дни
export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"

// 2) Макроси
export type MacroTotals = {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
}

// 3) Pivot с изчислени стойности (ако BE ги дава)
export type PivotWithCalc = NutritionPlanMealPivot & {
  calc?: MacroTotals
}

// 4) Официалният отговор от ендпойнта
export type ScheduleResponse = {
  nutritionPlan: NutritionPlan               // НЕ е nullable
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

// Хелпъри за смятане, ако BE не дава totals/calc
const days: DayKey[] = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
const zero = (): MacroTotals => ({ calories: 0, protein: 0, carbohydrates: 0, fat: 0 })
const add = (a: MacroTotals, b: MacroTotals) => {
  a.calories += b.calories
  a.protein += b.protein
  a.carbohydrates += b.carbohydrates
  a.fat += b.fat
}

const calcFromPivot = (p: PivotWithCalc): MacroTotals => {
  if (p.calc) return {
    calories: Number(p.calc.calories) || 0,
    protein: Number(p.calc.protein) || 0,
    carbohydrates: Number(p.calc.carbohydrates) || 0,
    fat: Number(p.calc.fat) || 0,
  }
  const q = typeof p.quantity === "number" ? p.quantity
          : typeof p.quantityKg === "number" ? p.quantityKg
          : 1
  return {
    calories: Number(p.meal?.calories || 0) * q,
    protein: Number(p.meal?.protein || 0) * q,
    carbohydrates: Number(p.meal?.carbohydrates || 0) * q,
    fat: Number(p.meal?.fat || 0) * q,
  }
}

/**
 * ВАЖНО: ако имаш стар дженерик тип за този fetch (примерно axios.get<OldType>),
 * махни го или го смени със ScheduleResponse.
 */
export async function getUserNutritionSchedule(planId: number): Promise<ScheduleResponse> {
  const res = await fetch(`/api/nutrition-plans/${planId}/schedule`, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to load schedule")

  const data = await res.json() as any

  // гаранция: бекендът връща 404 при липса на план ⇒ тук не допускаме null
  if (!data.nutritionPlan) {
    throw new Error("Unexpected null nutritionPlan")
  }

  // нормализирай ключовете на графика към строгите DayKey
  const schedule: Record<DayKey, PivotWithCalc[]> = days.reduce((acc, d) => {
    acc[d] = (data.schedule?.[d] ?? []) as PivotWithCalc[]
    return acc
  }, {} as Record<DayKey, PivotWithCalc[]>)

  // ако BE вече дава totals — ползвай го; иначе изчисли тук
  let totals = data.totals as ScheduleResponse["totals"] | undefined
  if (!totals) {
    const byDay: Record<DayKey, MacroTotals> = days.reduce((a, d) => {
      a[d] = zero()
      return a
    }, {} as Record<DayKey, MacroTotals>)
    const week = zero()

    for (const d of days) {
      for (const p of schedule[d]) {
        const t = calcFromPivot(p)
        add(byDay[d], t)
        add(week, t)
      }
    }
    totals = { byDay, week }
  }

  return {
    nutritionPlan: data.nutritionPlan as NutritionPlan,
    schedule,
    totals,
  }
}



export default function NutritionPage() {
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [todayMeals, setTodayMeals] = useState<PivotWithCalc[]>([])
  const [totals, setTotals] = useState<ScheduleResponse["totals"] | null>(null)
  const [loading, setLoading] = useState(true)

  // диалози
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const [selectedPivot, setSelectedPivot] = useState<PivotWithCalc | null>(null)

  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const today = new Date().toLocaleDateString("en-US", { weekday: "short" }) as DayKey

  useEffect(() => {
    // ignore ESLint deps – искаме само веднъж при mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchNutritionData()
  }, [])

  const fetchNutritionData = async () => {
    try {
      setLoading(true)
      const personal = await apiService.getUserPersonal()
      const planId = personal?.nutritionPlanId

      if (!planId) {
        setNutritionPlan(null)
        setTodayMeals([])
        setTotals(null)
        toast({
          title: "Няма хранителен план",
          description: "Свържете се с треньор, за да ви назначи план.",
        })
        return
      }

      //const response: ScheduleResponse = await apiService.getUserNutritionSchedule(planId)
      // просто остави TS да вземе типа от apiService (не анотирай ръчно)
const response = await apiService.getUserNutritionSchedule(planId)
// response е от тип ScheduleResponse, няма да хвърля грешка

      setNutritionPlan(response.nutritionPlan)
      setTodayMeals(response.schedule?.[today] ?? [])
      //setTotals(response.totals ?? null)
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на хранителните данни",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  /** Fallback за калкулации, ако BE не е върнал totals или calc */
  const calcTotalsForPivot = (p: PivotWithCalc): MacroTotals => {
    if (p.calc) return {
      calories: Math.round(p.calc.calories || 0),
      protein: Math.round(p.calc.protein || 0),
      carbohydrates: Math.round(p.calc.carbohydrates || 0),
      fat: Math.round(p.calc.fat || 0),
    }
    const q = p.quantity ?? 1
    const meal = p.meal
    return {
      calories: Math.round((meal?.calories || 0) * q),
      protein: Math.round((meal?.protein || 0) * q),
      carbohydrates: Math.round((meal?.carbohydrates || 0) * q),
      fat: Math.round((meal?.fat || 0) * q),
    }
  }

  const todayStats: MacroTotals = useMemo(() => {
    if (totals?.byDay?.[today]) {
      const t = totals.byDay[today]
      return {
        calories: Math.round(t.calories),
        protein: Math.round(t.protein),
        carbohydrates: Math.round(t.carbohydrates),
        fat: Math.round(t.fat),
      }
    }
    // fallback: смятай от картите
    return todayMeals.reduce<MacroTotals>(
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
  }, [todayMeals, totals, today])

  const weekChartData = useMemo(() => {
    if (!totals?.byDay) return []
    return dayOrder.map((d) => ({
      dayKey: d,
      dayLabel: dayLabels[d],
      Calories: Math.round(totals.byDay[d]?.calories ?? 0),
      Protein: Math.round(totals.byDay[d]?.protein ?? 0),
      Carbs: Math.round(totals.byDay[d]?.carbohydrates ?? 0),
      Fat: Math.round(totals.byDay[d]?.fat ?? 0),
    }))
  }, [totals])

  const todayPieData = useMemo(() => {
    return [
      { name: "Протеини", value: todayStats.protein },
      { name: "Въглехидрати", value: todayStats.carbohydrates },
      { name: "Мазнини", value: todayStats.fat },
    ]
  }, [todayStats])

  const openMeal = (pivot: PivotWithCalc) => {
    setSelectedPivot(pivot)
    setDetailsOpen(true)
  }

  const onCardKeyDown = (e: React.KeyboardEvent, pivot: PivotWithCalc) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      openMeal(pivot)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Зареждане на хранителните данни...</div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl text-secondary font-bold">Моето хранене</h1>
            <p className="text-secondary">Преглед на вашия хранителен план и дневен прием</p>
          </div>
          <Button variant="white" onClick={() => router.push("/nutrition-schedule")}>
            <Calendar className="h-4 w-4 mr-2" />
            Пълен график
          </Button>
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{nutritionPlan.title}</h3>
                  {nutritionPlan.description && (
                    <p className="text-secondary mt-1">{nutritionPlan.description}</p>
                  )}
                </div>
                <Badge className={goalColors[nutritionPlan.goal]}>
                  {goalLabels[nutritionPlan.goal]}
                </Badge>
              </div>

              {/* Агрегирани стойности за ДНЕС */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-transperant border-1 border-gray-500 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(todayStats.calories)}
                  </div>
                  <div className="text-sm text-secondary">Калории днес</div>
                </div>
                <div className="text-center p-4 bg-transperant border-1 border-gray-500 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(todayStats.protein)}g
                  </div>
                  <div className="text-sm text-secondary">Протеини</div>
                </div>
                <div className="text-center p-4 bg-transperant border-1 border-gray-500 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">
                    {Math.round(todayStats.carbohydrates)}g
                  </div>
                  <div className="text-sm text-secondary">Въглехидрати</div>
                </div>
                <div className="text-center p-4 bg-transperant border-1 border-gray-500 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(todayStats.fat)}g
                  </div>
                  <div className="text-sm text-secondary">Мазнини</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardContent className="text-center py-12">
              <Apple className="h-12 w-12 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Няма назначен хранителен план</h3>
              <p className="text-secondary">
                Свържете се с вашия треньор за да ви назначи хранителен план.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Днешни храни */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setAllOpen(true)}
            >
              <Clock className="h-5 w-5" />
              Днешни храни — {dayLabels[today]}
            </CardTitle>
            <Button className="text-primary" variant="outline" onClick={() => setAllOpen(true)}>
              Виж списъка
            </Button>
          </CardHeader>
          <CardContent>
            {todayMeals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-secondary">Няма планирани храни за днес</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayMeals.map((mealPivot, index) => {
                  const totals = calcTotalsForPivot(mealPivot)
                  return (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => openMeal(mealPivot)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => onCardKeyDown(e, mealPivot)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {mealPivot.meal?.image ? (
                              <img
                                src={toImageUrl(mealPivot.meal.image)}
                                alt={mealPivot.meal.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = "none"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-primary" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-lg">{mealPivot.meal?.title}</h4>
                              <div className="flex gap-1 flex-wrap">
                                {mealPivot.schedule
                                  ?.filter((s) => s.day === today)
                                  .map((scheduleItem, scheduleIndex) => (
                                    <Badge className="text-secondary bg-transparent border-1 border-gray-500" key={scheduleIndex} variant="secondary">
                                      {scheduleItem.time}
                                    </Badge>
                                  ))}
                              </div>
                            </div>

                            {mealPivot.meal?.description && (
                              <p className="text-sm text-secondary mb-3">
                                {mealPivot.meal.description}
                              </p>
                            )}

                            {(mealPivot.quantity || mealPivot.quantityKg) && (
                              <div className="mb-3">
                                <Badge className="text-secondary" variant="outline">
                                  {mealPivot.quantity && `${mealPivot.quantity} порции`}
                                  {mealPivot.quantity && mealPivot.quantityKg && " • "}
                                  {mealPivot.quantityKg && `${mealPivot.quantityKg} кг`}
                                </Badge>
                              </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                                <div className="font-semibold text-orange-600">
                                  {totals.calories}
                                </div>
                                <div className="text-xs text-secondary">kcal</div>
                              </div>
                              <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                                <div className="font-semibold text-blue-600">
                                  {totals.protein}g
                                </div>
                                <div className="text-xs text-secondary">Протеини</div>
                              </div>
                              <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                                <div className="font-semibold text-green-600">
                                  {totals.carbohydrates}g
                                </div>
                                <div className="text-xs text-secondary">Въглехидрати</div>
                              </div>
                              <div className="text-center p-2 bg-transparent border-1 border-gray-500 rounded">
                                <div className="font-semibold text-purple-600">
                                  {totals.fat}g
                                </div>
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
            )}
          </CardContent>
        </Card>

        {/* Графика: днес макро-разпределение */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Днес: макро разпределение
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayPieData.reduce((s, i) => s + i.value, 0) === 0 ? (
              <div className="text-center text-secondary py-8">
                Няма данни за днес.
              </div>
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie data={todayPieData} dataKey="value" nameKey="name" outerRadius={100} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Диалог: Списък за днес */}
      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Днешни храни — {dayLabels[today]}</DialogTitle>
            <DialogDescription className="text-secondary">Снимки, часове и макроси за всяка храна днес.</DialogDescription>
          </DialogHeader>

          {todayMeals.length === 0 ? (
            <div className="text-center text-secondary py-8">
              Няма планирани храни за днес
            </div>
          ) : (
            <ScrollArea className="h-[70vh] pr-2">
              <div className="space-y-4">
                {todayMeals.map((p, i) => {
                  const t = calcTotalsForPivot(p)
                  const times = p.schedule?.filter((s) => s.day === today).map((s) => s.time) ?? []
                  return (
                    <div key={i} className="flex gap-4 p-3 rounded-lg border-1 border-gray-500">
                      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
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
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-lg text-secondary">{p.meal?.title}</h4>
                          <div className="flex gap-1 flex-wrap">
                            {times.map((t, idx) => (
                              <Badge className="text-secondary bg-transparent border-1 border-gray-500" key={idx} variant="secondary">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {p.meal?.description && (
                          <p className="text-sm text-secondary mt-1 line-clamp-3">
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

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
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

                        <div className="mt-3">
                          <Button
                            size="sm"
                            onClick={() => {
                              setAllOpen(false)
                              openMeal(p)
                            }}
                          >
                            Детайли
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог: Детайл за ястие */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPivot?.meal?.title ?? "Храна"}</DialogTitle>
            {selectedPivot?.meal?.description && (
              <DialogDescription className="text-secondary whitespace-pre-wrap">
                {selectedPivot.meal.description}
              </DialogDescription>
            )}
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

              {/* Часове за днес */}
              <div className="flex flex-wrap gap-2">
                {selectedPivot.schedule
                  ?.filter((s) => s.day === today)
                  .map((s, idx) => (
                    <Badge className="text-secondary bg-transparent border-1 border-gray-500" key={idx} variant="secondary">
                      {s.time}
                    </Badge>
                  ))}
              </div>

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

              {/* Макроси (тотал за това ястие) */}
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
