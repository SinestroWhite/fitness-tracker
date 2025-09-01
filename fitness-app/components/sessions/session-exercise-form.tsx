
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

  const excludeSet = useMemo(
    () => new Set(excludeExerciseIds.map((x) => String(x))),
    [excludeExerciseIds]
  )

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionExercise])

  const fetchExercises = async () => {
    try {
      const response = await apiService.getExerciseList({ pageSize: 100 })
      const all: Exercise[] = response.data ?? []

      // When creating, hide already-used exercises
      //const filtered = sessionExercise ? all : all.filter((ex: any) => !excludeSet.has(String(ex.id)))
      setExercises(all)
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на упражненията",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const hasReps = formData.repetitions.trim() !== ""
    const hasTime = formData.time.trim() !== ""
    const count = (hasReps ? 1 : 0) + (hasTime ? 1 : 0)

    if (!sessionExercise && !formData.exerciseId) {
      toast({ title: "Грешка", description: "Моля изберете упражнение", variant: "destructive" })
      return
    }

    // XOR rule: exactly one of the fields must be provided
    if (count !== 1) {
      toast({
        title: "Грешка",
        description: "Попълни само едно: или „Повторения“, или „Време“.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      if (sessionExercise) {
        const data: UpdateSessionExerciseData = (hasReps
          ? { repetitions: parseInt(formData.repetitions, 10), time: null }
          : { time: parseInt(formData.time, 10), repetitions: null }
        ) as any

        await apiService.updateSessionExercise(sessionExercise.pivot_id, data)
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

  const hasReps = formData.repetitions.trim() !== ""
  const hasTime = formData.time.trim() !== ""
  const noAvailable = !sessionExercise && exercises.length === 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!sessionExercise && (
        <div className="space-y-2">
          <Label htmlFor="exercise">Упражнение *</Label>
          <Select
            value={formData.exerciseId}
            onValueChange={(value) => setFormData({ ...formData, exerciseId: value })}
            disabled={noAvailable}
          >
            <SelectTrigger id="exercise">
              <SelectValue placeholder={noAvailable ? "Няма свободни упражнения" : "Изберете упражнение"} />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((exercise: any) => (
                <SelectItem key={String(exercise.id)} value={String(exercise.id)}>
                  {exercise.name} ({getMuscleLabel(exercise.muscle)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {noAvailable && (
            <p className="text-sm text-muted-foreground">
              Всички упражнения вече са добавени към сесията.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="repetitions">Повторения</Label>
          <Input
            id="repetitions"
            type="number"
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
            }}
            placeholder="12"
            required={!hasTime}
            disabled={hasTime}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">Време (секунди)</Label>
          <Input
            id="time"
            type="number"
            min="1"
            step="1"
            value={formData.time}
            onChange={(e) => {
              const v = e.target.value
              setFormData({
                ...formData,
                time: v,
                repetitions: v ? "" : formData.repetitions,
              })
            }}
            placeholder="30"
            required={!hasReps}
            disabled={hasReps}
          />
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
