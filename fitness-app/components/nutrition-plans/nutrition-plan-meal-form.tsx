"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, type Meal, type NutritionPlanMealPivot } from "@/lib/api"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

interface NutritionPlanMealFormProps {
  mealPivot?: NutritionPlanMealPivot
  onSubmit: (data: any) => void | Promise<void>
  serverErrors?: Record<string, string[]>
  formError?: string | null
  onClearServerErrors?: () => void
}

const dayOptions = [
  { value: "Mon", label: "Понеделник" },
  { value: "Tue", label: "Вторник" },
  { value: "Wed", label: "Сряда" },
  { value: "Thu", label: "Четвъртък" },
  { value: "Fri", label: "Петък" },
  { value: "Sat", label: "Събота" },
  { value: "Sun", label: "Неделя" },
]

export function NutritionPlanMealForm({
  mealPivot,
  onSubmit,
  serverErrors,
  formError,
  onClearServerErrors,
}: NutritionPlanMealFormProps) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [selectedMealId, setSelectedMealId] = useState<string>(mealPivot?.mealId ?? "")
  const [quantity, setQuantity] = useState<string>(mealPivot?.quantity != null ? String(mealPivot.quantity) : "")
  const [quantityKg, setQuantityKg] = useState<string>(mealPivot?.quantityKg != null ? String(mealPivot.quantityKg) : "")
  const [schedule, setSchedule] = useState<{ day: "Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun"; time: string }[]>(
    mealPivot?.schedule && mealPivot.schedule.length > 0
      ? mealPivot.schedule as any
      : [{ day: "Mon", time: "08:00" }]
  )
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchMeals()
  }, [])

  // Когато потребителят променя стойности — чистим сървърните грешки (ако е подаден handler)
  useEffect(() => {
    if (!onClearServerErrors) return
    onClearServerErrors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMealId, quantity, quantityKg, schedule])

  const fetchMeals = async () => {
    try {
      const response = await apiService.getMeals({ pageSize: 100 })
      setMeals(response.data)
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на храните",
        variant: "destructive",
      })
    }
  }

  const addScheduleItem = () => {
    setSchedule((prev) => [...prev, { day: "Mon", time: "08:00" }])
  }

  const removeScheduleItem = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index))
  }

  const updateScheduleItem = (index: number, field: "day" | "time", value: string) => {
    setSchedule((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value } as any
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data: any = {
        mealId: selectedMealId,
        ...(quantity !== "" && { quantity: Number(quantity) }),
        ...(quantityKg !== "" && { quantityKg: Number(quantityKg) }),
        ...(schedule.length > 0 && { schedule }),
      }
      await onSubmit(data)
    } finally {
      setLoading(false)
    }
  }

  // helper за показване на грешки
  const fieldErrors = (key: string) => {
    const msgs = serverErrors?.[key]
    if (!msgs || msgs.length === 0) return null
    return <p className="text-sm text-red-600 mt-1">{msgs.join(" ")}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <Alert variant="destructive">
          <AlertTitle>Грешка</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Meal Selection */}
      <div className="space-y-2">
        <Label className="text-secondary">Избери храна *</Label>

        <Select value={selectedMealId} onValueChange={(v) => setSelectedMealId(v)}>
          <SelectTrigger className="text-secondary">
            <SelectValue placeholder="Избери храна от библиотеката" />
          </SelectTrigger>
          {/* position="popper" заради Dialog и висок z-index */}
          <SelectContent position="popper" className="z-[100]">
            {meals.map((meal) => (
              <SelectItem key={meal.id} value={String(meal.id)}>
                {meal.title} ({meal.calories} kcal)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Понеже shadcn Select не поддържа native required, валидираме ръчно чрез serverErrors["mealId"] */}
        {fieldErrors("mealId")}
      </div>

      {/* Quantity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-secondary" htmlFor="quantity">Количество (порции)</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            className="text-secondary"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Напр. 1.5"
          />
          {fieldErrors("quantity")}
        </div>
        <div className="space-y-2">
          <Label className="text-secondary" htmlFor="quantityKg">Количество (кг)</Label>
          <Input
            id="quantityKg"
            type="number"
            min="0"
            className="text-secondary"
            step="0.01"
            value={quantityKg}
            onChange={(e) => setQuantityKg(e.target.value)}
            placeholder="Напр. 0.2"
          />
          {fieldErrors("quantityKg")}
        </div>
      </div>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-secondary">График на хранене</CardTitle>
            <Button className="text-primary" type="button" variant="outline" size="sm" onClick={addScheduleItem}>
              <Plus className="h-4 w-4 mr-2 text-seocndary" />
              Добави ден
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedule.map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-1">
                  <Select
                    value={item.day}
                    onValueChange={(value) => updateScheduleItem(index, "day", value)}
                  >
                    <SelectTrigger className="text-secondary">
                      <SelectValue placeholder="Ден" />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors(`schedule.${index}.day`)}
                </div>

                <div className="flex-1 ">
                  <Input
                    type="time"
                    className="text-secondary"
                    value={item.time}
                    onChange={(e) => updateScheduleItem(index, "time", e.target.value)}
                  />
                  {fieldErrors(`schedule.${index}.time`)}
                </div>

                {schedule.length > 1 && (
                  <Button className="text-primary" type="button" variant="outline" size="sm" onClick={() => removeScheduleItem(index)}>
                    <Trash2 className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>
            ))}
            {/* Ако бекендът връща обща грешка за schedule */}
            {fieldErrors("schedule")}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading || !selectedMealId ||(!quantity && !quantityKg)}>
          {loading ? "Запазване..." : mealPivot ? "Обнови" : "Добави храна"}
        </Button>
      </div>
    </form>
  )
}


