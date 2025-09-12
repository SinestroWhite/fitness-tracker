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
  return (GOAL_VALUES as readonly string[]).includes(v) ? v : ""
}

type FieldErrors = { title?: string; goal?: string }

export function WorkoutPlanForm({ workoutPlan, onSuccess, onCancel }: WorkoutPlanFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState("")
  const [goal, setGoal] = useState<string>("")

  // validation state
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState({ title: false, goal: false })
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validate = (vals: { title: string; goal: string }): FieldErrors => {
    const e: FieldErrors = {}
    const t = vals.title.trim()

    if (!t) e.title = "Моля, въведете заглавие."
    else if (t.length > 120) e.title = "Заглавието може да е най-много 120 символа."

    if (!vals.goal) e.goal = "Изберете цел."
    else if (!(GOAL_VALUES as readonly string[]).includes(vals.goal)) e.goal = "Невалидна цел."

    return e
  }

  // hydrate/reset при смяна на плана
  useEffect(() => {
    setTitle(workoutPlan?.title ?? "")
    setGoal(normalizeGoal((workoutPlan as any)?.goal))
    setErrors({})
    setTouched({ title: false, goal: false })
    setSubmitAttempted(false)
  }, [workoutPlan])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    const nextErrors = validate({ title, goal })
    setErrors(nextErrors)

    if (nextErrors.title || nextErrors.goal) {
      toast({
        title: "Има грешки във формата",
        description: "Моля, коригирайте полетата, отбелязани в червено.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const data = { title: title.trim(), goal: goal as any }

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

  const showTitleError = !!errors.title && (touched.title || submitAttempted)
  const showGoalError = !!errors.goal && (touched.goal || submitAttempted)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label className="text-secondary" htmlFor="title">Заглавие *</Label>
        <Input
          id="title"
          value={title}
          className={`text-secondary ${showTitleError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!touched.title) setTouched((t) => ({ ...t, title: true }))
          }}
          onBlur={() => setTouched((t) => ({ ...t, title: true }))}
          placeholder="Напр. Програма за отслабване за начинаещи"
          aria-required="true"
          aria-invalid={showTitleError}
          aria-errormessage={showTitleError ? "title-error" : undefined}
        />
        {showTitleError && <p id="title-error" className="text-sm text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-secondary" htmlFor="goal-trigger">Цел *</Label>
        <Select
          key={goal || "empty"}
          value={goal || undefined}
          onValueChange={(v) => {
            setGoal(v)
            if (!touched.goal) setTouched((t) => ({ ...t, goal: true }))
          }}
        >
          <SelectTrigger
            className={`text-secondary ${showGoalError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            id="goal-trigger"
            aria-required="true"
            aria-invalid={showGoalError}
            aria-errormessage={showGoalError ? "goal-error" : undefined}
          >
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
        {showGoalError && <p id="goal-error" className="text-sm text-destructive">{errors.goal}</p>}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Запазване..." : workoutPlan?.id ? "Обнови" : "Създай"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Отказ
        </Button>
      </div>
    </form>
  )
}
