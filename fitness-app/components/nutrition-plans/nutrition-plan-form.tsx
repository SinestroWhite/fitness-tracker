"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { NutritionPlan } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface NutritionPlanFormProps {
  plan?: NutritionPlan
  onSubmit: (data: any) => void
}

type FieldErrors = { title?: string; goal?: string }

const GOAL_VALUES = ["lose", "gain", "maintain"] as const
const normalizeGoal = (g: unknown): string => {
  const v = String(g ?? "").trim().toLowerCase()
  return (GOAL_VALUES as readonly string[]).includes(v) ? v : ""
}

export function NutritionPlanForm({ plan, onSubmit }: NutritionPlanFormProps) {
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: plan?.title || "",
    goal: normalizeGoal(plan?.goal),
    description: plan?.description || "",
  })
  const [loading, setLoading] = useState(false)

  // validation state (име + цел)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState({ title: false, goal: false })
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // rehydrate при смяна на plan
  useEffect(() => {
    setFormData({
      title: plan?.title || "",
      goal: normalizeGoal(plan?.goal),
      description: plan?.description || "",
    })
    setErrors({})
    setTouched({ title: false, goal: false })
    setSubmitAttempted(false)
  }, [plan])

  const validate = (vals: { title: string; goal: string }): FieldErrors => {
    const e: FieldErrors = {}
    const t = vals.title.trim()
    if (!t) e.title = "Моля, въведете име на плана."
    else if (t.length > 120) e.title = "Името може да е най-много 120 символа."

    if (!vals.goal) e.goal = "Моля, изберете цел."
    else if (!(GOAL_VALUES as readonly string[]).includes(vals.goal)) e.goal = "Невалидна цел."

    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    const nextErrors = validate(formData)
    setErrors(nextErrors)

    if (nextErrors.title || nextErrors.goal) {
      toast({
        title: "Има грешки във формата",
        description: "Моля, коригирайте полетата, отбелязани в червено.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        ...formData,
        title: formData.title.trim(),
        goal: normalizeGoal(formData.goal),
      })
    } finally {
      setLoading(false)
    }
  }

  const showTitleError = !!errors.title && (touched.title || submitAttempted)
  const showGoalError = !!errors.goal && (touched.goal || submitAttempted)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="space-y-2">
        <Label className="text-secondary" htmlFor="title">Име на плана *</Label>
        <Input
          id="title"
          value={formData.title}
          className={`text-secondary ${showTitleError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, title: e.target.value }))
            if (!touched.title) setTouched((t) => ({ ...t, title: true }))
          }}
          onBlur={() => setTouched((t) => ({ ...t, title: true }))}
          placeholder="Напр. План за отслабване"
          aria-required="true"
          aria-invalid={showTitleError}
          aria-errormessage={showTitleError ? "title-error" : undefined}
        />
        {showTitleError && (
          <p id="title-error" className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-secondary" htmlFor="goal">Цел *</Label>
        <Select
          key={formData.goal || "empty"}
          value={formData.goal || undefined}
          onValueChange={(value) => {
            setFormData((prev) => ({ ...prev, goal: value }))
            if (!touched.goal) setTouched((t) => ({ ...t, goal: true }))
          }}
        >
          <SelectTrigger
            className={`text-secondary ${showGoalError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            id="goal"
            aria-required="true"
            aria-invalid={showGoalError}
            aria-errormessage={showGoalError ? "goal-error" : undefined}
          >
            <SelectValue placeholder="Избери цел" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lose">Отслабване</SelectItem>
            <SelectItem value="gain">Качване на тегло</SelectItem>
            <SelectItem value="maintain">Поддържане</SelectItem>
          </SelectContent>
        </Select>
        {showGoalError && (
          <p id="goal-error" className="text-sm text-destructive">{errors.goal}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-secondary" htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          className="text-secondary"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Кратко описание на хранителния план..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Запазване..." : plan ? "Обнови план" : "Създай план"}
        </Button>
      </div>
    </form>
  )
}
