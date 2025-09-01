

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiService, type WorkoutPlan, type CreateWorkoutPlanData, type UpdateWorkoutPlanData } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface WorkoutPlanFormProps {
  workoutPlan?: WorkoutPlan | null
  onSuccess: () => void
  onCancel: () => void
}

const goals = [
  { value: "lose", label: "Отслабване" },
  { value: "gain", label: "Покачване на тегло" },
  { value: "maintain", label: "Поддържане" },
] as const

const GOAL_VALUES = goals.map(g => g.value) as readonly string[]
const normalizeGoal = (g: unknown): string => {
  const v = String(g ?? "").trim().toLowerCase()
  return GOAL_VALUES.includes(v) ? v : ""
}

export function WorkoutPlanForm({ workoutPlan, onSuccess, onCancel }: WorkoutPlanFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // ДВА отделни state-a
  const [title, setTitle] = useState("")
  const [goal, setGoal] = useState<string>("") // може да остане "" докато падне пропът

  // При смяна на плана – попълни/изчисти
  useEffect(() => {
    setTitle(workoutPlan?.title ?? "")
    setGoal(normalizeGoal((workoutPlan as any)?.goal))
  }, [workoutPlan?.id])

  // Fallback: ако state-ът е още празен (на първи рендер), ползвай стойността от пропа
  const derivedGoal = goal || normalizeGoal((workoutPlan as any)?.goal)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const submitGoal = derivedGoal // гарантирано е валидната стойност
    if (!title.trim() || !submitGoal) {
      toast({ title: "Грешка", description: "Моля попълнете всички полета", variant: "destructive" })
      return
    }

    try {
      setLoading(true)
      const data = { title: title.trim(), goal: submitGoal as any }

      if (workoutPlan?.id) {
        await apiService.updateWorkoutPlan(workoutPlan.id, data as UpdateWorkoutPlanData)
        toast({ title: "Успех", description: "Тренировъчният план е обновен успешно" })
      } else {
        await apiService.createWorkoutPlan(data as CreateWorkoutPlanData)
        toast({ title: "Успех", description: "Тренировъчният план е създаден успешно" })
      }

      onSuccess()
    } catch {
      toast({
        title: "Грешка",
        description: workoutPlan?.id ? "Неуспешно обновяване на плана" : "Неуспешно създаване на плана",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Заглавие *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Напр. Програма за отслабване за начинаещи"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-trigger">Цел *</Label>
        {/* Контролирано Select с fallback към проповете */}
        <Select value={derivedGoal} onValueChange={setGoal}>
          <SelectTrigger id="goal-trigger">
            <SelectValue placeholder="Изберете цел" />
          </SelectTrigger>
          <SelectContent>
            {goals.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Запазване..." : workoutPlan?.id ? "Обнови" : "Създай"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отказ
        </Button>
      </div>
    </form>
  )
}
