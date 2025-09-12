"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  apiService,
  type Exercise,
  type SessionExercise,
  type AddSessionExerciseData,
  type UpdateSessionExerciseData,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

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

interface SessionExerciseFormProps {
  sessionId: string
  sessionExercise?: SessionExercise | null
  onSuccess: () => void
  onCancel: () => void
  /** Pass the IDs of exercises already used in this session; they'll be hidden in the dropdown when creating */
  excludeExerciseIds?: Array<string | number>
}

type FieldErrors = {
  exerciseId?: string
  repetitions?: string
  time?: string
}

export function SessionExerciseForm({
  sessionId,
  sessionExercise,
  onSuccess,
  onCancel,
  excludeExerciseIds = [],
}: SessionExerciseFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [formData, setFormData] = useState({
    exerciseId: "",
    repetitions: "",
    time: "",
  })

  // validation state
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState({ exerciseId: false, repetitions: false, time: false })
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const excludeSet = useMemo(
    () => new Set(excludeExerciseIds.map((x) => String(x))),
    [excludeExerciseIds]
  )

  const availableExercises = useMemo(() => {
    // When editing, keep the currently selected exercise visible even if excluded
    if (sessionExercise) return exercises
    return exercises.filter((ex: any) => !excludeSet.has(String(ex.id)))
  }, [exercises, excludeSet, sessionExercise])

  useEffect(() => {
    fetchExercises()
    if (sessionExercise) {
      const existingExerciseId =
        (sessionExercise as any).exerciseId ??
        (sessionExercise as any).exercise_id ??
        (sessionExercise as any).exercise?.id ??
        ""

      setFormData({
        exerciseId: existingExerciseId ? String(existingExerciseId) : "",
        repetitions: sessionExercise.repetitions?.toString() || "",
        time: sessionExercise.time?.toString() || "",
      })
    } else {
      setFormData({ exerciseId: "", repetitions: "", time: "" })
    }
    setErrors({})
    setTouched({ exerciseId: false, repetitions: false, time: false })
    setSubmitAttempted(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionExercise])

  const fetchExercises = async () => {
    try {
      const response = await apiService.getExerciseList({ pageSize: 100 })
      const all: Exercise[] = response.data ?? []
      setExercises(all)
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на упражненията",
        variant: "destructive",
      })
    }
  }

  const validate = (vals: { exerciseId: string; repetitions: string; time: string }): FieldErrors => {
    const e: FieldErrors = {}

    if (!sessionExercise) {
      if (!vals.exerciseId) e.exerciseId = "Моля, изберете упражнение."
      else if (!availableExercises.some((ex: any) => String(ex.id) === String(vals.exerciseId))) {
        e.exerciseId = "Невалидно упражнение."
      }
    }

    const repsStr = vals.repetitions.trim()
    const timeStr = vals.time.trim()
    const hasReps = repsStr !== ""
    const hasTime = timeStr !== ""
    const count = (hasReps ? 1 : 0) + (hasTime ? 1 : 0)


    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    const nextErrors = validate(formData)
    setErrors(nextErrors)
    if (nextErrors.exerciseId || nextErrors.repetitions || nextErrors.time) {
      toast({
        title: "Има грешки във формата",
        description: "Моля, коригирайте полетата, отбелязани в червено.",
        variant: "destructive",
      })
      return
    }

    const hasReps = formData.repetitions.trim() !== ""
    // const hasTime = formData.time.trim() !== "" // not needed below

    try {
      setLoading(true)

      if (sessionExercise) {
        const data: UpdateSessionExerciseData = (hasReps
          ? { repetitions: parseInt(formData.repetitions, 10), time: null }
          : { time: parseInt(formData.time, 10), repetitions: null }
        ) as any

        await apiService.updateSessionExercise((sessionExercise as any).pivot_id, data)
        toast({ title: "Успех", description: "Упражнението е обновено успешно" })
      } else {
        const createPayload: AddSessionExerciseData = {
          exercise_id: Number(formData.exerciseId),
          ...(hasReps
            ? { repetitions: parseInt(formData.repetitions, 10) }
            : { time: parseInt(formData.time, 10) }),
        } as any

        await apiService.addSessionExercise(sessionId, createPayload)
        toast({ title: "Успех", description: "Упражнението е добавено успешно" })
      }

      onSuccess()
    } catch {
      toast({
        title: "Грешка",
        description: sessionExercise ? "Неуспешно обновяване на упражнението" : "Неуспешно добавяне на упражнението",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const showExerciseError = !!errors.exerciseId && (touched.exerciseId || submitAttempted)
  const showRepsError = !!errors.repetitions && (touched.repetitions || submitAttempted)
  const showTimeError = !!errors.time && (touched.time || submitAttempted)

  const noAvailable = !sessionExercise && availableExercises.length === 0

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {!sessionExercise && (
        <div className="space-y-2">
          <Label className="text-secondary" htmlFor="exercise">Упражнение *</Label>
          <Select
            key={formData.exerciseId || "empty"}
            value={formData.exerciseId || undefined}
            onValueChange={(value) => {
              setFormData({ ...formData, exerciseId: value })
              if (!touched.exerciseId) setTouched((t) => ({ ...t, exerciseId: true }))
            }}
            disabled={noAvailable}
          >
            <SelectTrigger
              className={`text-secondary ${showExerciseError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              id="exercise"
              aria-required="true"
              aria-invalid={showExerciseError}
              aria-errormessage={showExerciseError ? "exercise-error" : undefined}
            >
              <SelectValue placeholder={noAvailable ? "Няма свободни упражнения" : "Изберете упражнение"} />
            </SelectTrigger>
            <SelectContent>
              {availableExercises.map((exercise: any) => (
                <SelectItem key={String(exercise.id)} value={String(exercise.id)}>
                  {exercise.name} ({getMuscleLabel(exercise.muscle)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showExerciseError && <p id="exercise-error" className="text-sm text-destructive">{errors.exerciseId}</p>}
          {noAvailable && (
            <p className="text-sm text-muted-foreground">
              Всички упражнения вече са добавени към сесията.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-secondary" htmlFor="repetitions">Повторения</Label>
          <Input
            id="repetitions"
            type="number"
            inputMode="numeric"
            className={`text-secondary ${showRepsError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            min="1"
            step="1"
            value={formData.repetitions}
            onChange={(e) => {
              const v = e.target.value
              setFormData({
                ...formData,
                repetitions: v,
                time: v ? "" : formData.time,
              })
              if (!touched.repetitions) setTouched((t) => ({ ...t, repetitions: true }))
            }}
            onBlur={() => setTouched((t) => ({ ...t, repetitions: true }))}
            placeholder="12"
            aria-invalid={showRepsError}
            aria-errormessage={showRepsError ? "repetitions-error" : undefined}
          />
          {showRepsError && <p id="repetitions-error" className="text-sm text-destructive">{errors.repetitions}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-secondary" htmlFor="time">Време (секунди)</Label>
          <Input
            id="time"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            className={`text-secondary ${showTimeError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            value={formData.time}
            onChange={(e) => {
              const v = e.target.value
              setFormData({
                ...formData,
                time: v,
                repetitions: v ? "" : formData.repetitions,
              })
              if (!touched.time) setTouched((t) => ({ ...t, time: true }))
            }}
            onBlur={() => setTouched((t) => ({ ...t, time: true }))}
            placeholder="30"
            aria-invalid={showTimeError}
            aria-errormessage={showTimeError ? "time-error" : undefined}
          />
          {showTimeError && <p id="time-error" className="text-sm text-destructive">{errors.time}</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading || (noAvailable && !sessionExercise)}>
          {loading ? "Запазване..." : sessionExercise ? "Обнови" : "Добави"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отказ
        </Button>
      </div>
    </form>
  )
}
