"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  apiService,
  type Session,
  type WorkoutPlanSession,
  type AddWorkoutPlanSessionData,
  type UpdateWorkoutPlanSessionData,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface WorkoutPlanSessionFormProps {
  workoutPlanId: string
  workoutPlanSession?: WorkoutPlanSession | null
  onSuccess: () => void
  onCancel: () => void
}

// Използваме същия домейн на типовете, както в API
export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
const DAY_VALUES: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const isWeekday = (v: unknown): v is Weekday => typeof v === "string" && (DAY_VALUES as readonly string[]).includes(v)

const days = [
  { value: "Mon" as Weekday, label: "Понеделник" },
  { value: "Tue" as Weekday, label: "Вторник" },
  { value: "Wed" as Weekday, label: "Сряда" },
  { value: "Thu" as Weekday, label: "Четвъртък" },
  { value: "Fri" as Weekday, label: "Петък" },
  { value: "Sat" as Weekday, label: "Събота" },
  { value: "Sun" as Weekday, label: "Неделя" },
] as const

// Нормализатор за различни форми на отговор от API за всички сесии
function normalizeSessions(raw: any): Session[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : []

  return list.map((s: any) => ({
    id: String(s.id ?? s.session_id),
    title: s.title ?? s.name ?? "(без име)",
    durationMins: s.durationMins ?? s.duration_mins ?? s.duration ?? 0,
    ...s,
  })) as Session[]
}

// Нормализатор за вече използваните сесии в конкретния план → връща масив от session_id (string)
function normalizePlanSessions(raw: any): string[] {
  const list =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.data) && raw.data) ||
    (Array.isArray(raw?.sessions) && raw.sessions) ||
    (Array.isArray(raw?.data?.sessions) && raw.data.sessions) ||
    []

  const ids = list
    .map((x: any) => {
      const sid =
        x?.session_id ??
        x?.sessionId ??
        x?.sessionID ??
        x?.session?.id ??
        x?.session?.session_id ??
        x?.id ??
        x?.session?.sessionId ??
        x?.session?.sessionID
      return sid ? String(sid) : null
    })
    .filter(Boolean) as string[]

  return Array.from(new Set(ids))
}

export function WorkoutPlanSessionForm({
  workoutPlanId,
  workoutPlanSession,
  onSuccess,
  onCancel,
}: WorkoutPlanSessionFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [usedSessionIds, setUsedSessionIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    sessionId: "",
    schedule: [] as Weekday[],
  })

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (workoutPlanSession) {
      const incoming = (workoutPlanSession as any).schedule
      const safeSchedule: Weekday[] = Array.isArray(incoming)
        ? (incoming.filter(isWeekday) as Weekday[])
        : []

      setFormData({
        sessionId: String((workoutPlanSession as any).sessionId ?? (workoutPlanSession as any).session_id ?? ""),
        schedule: safeSchedule,
      })
    }
  }, [workoutPlanSession])

  const availableSessions = useMemo(() => {
    const used = new Set(usedSessionIds)
    return sessions.filter((s) => {
      const id = String(s.id)
      if (
        workoutPlanSession &&
        id === String((workoutPlanSession as any).sessionId ?? (workoutPlanSession as any).session_id)
      ) {
        return true
      }
      return !used.has(id)
    })
  }, [sessions, usedSessionIds, workoutPlanSession])

  useEffect(() => {
    if (!workoutPlanSession && !formData.sessionId && availableSessions.length === 1) {
      setFormData((f) => ({ ...f, sessionId: String(availableSessions[0].id) }))
    }
  }, [availableSessions, workoutPlanSession, formData.sessionId])

  useEffect(() => {
    if (
      !workoutPlanSession &&
      formData.sessionId &&
      !availableSessions.some((s) => String(s.id) === String(formData.sessionId))
    ) {
      setFormData((f) => ({ ...f, sessionId: "" }))
    }
  }, [availableSessions, workoutPlanSession, formData.sessionId])

  const fetchData = async () => {
    try {
      setLoadingSessions(true)

      const allResp = await apiService.getSessionList({ pageSize: 100 })

      const usedResp = (apiService as any).getWorkoutPlanSessions
        ? await (apiService as any).getWorkoutPlanSessions(workoutPlanId)
        : await (apiService as any).getWorkoutPlan(workoutPlanId)

      const normalizedAll = normalizeSessions((allResp as any)?.data ?? allResp)
      setSessions(normalizedAll)

      const usedIds = Array.from(new Set(normalizePlanSessions((usedResp as any)?.data ?? usedResp)))
      setUsedSessionIds(usedIds)
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на сесиите",
        variant: "destructive",
      })
      setSessions([])
      setUsedSessionIds([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleScheduleChange = (day: Weekday, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      schedule: checked ? [...prev.schedule, day] : prev.schedule.filter((d) => d !== day),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.sessionId && !workoutPlanSession) {
      toast({
        title: "Грешка",
        description: "Моля изберете сесия",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const payload: UpdateWorkoutPlanSessionData = { schedule: formData.schedule }

      if (workoutPlanSession) {

        const pivotId = String(workoutPlanSession.pivot_id)

        // Използваме изцяло helper-а от apiService
        await apiService.updateWorkoutPlanSession(pivotId, payload)
        toast({ title: "Успех", description: "Сесията е обновена успешно" })
      } else {
        const createData: AddWorkoutPlanSessionData = {
          sessionId: formData.sessionId,
          schedule: formData.schedule,
        }
        await apiService.addWorkoutPlanSession(workoutPlanId, createData)
        toast({ title: "Успех", description: "Сесията е добавена успешно" })
      }

      onSuccess()
    } catch (error) {
      toast({
        title: "Грешка",
        description: workoutPlanSession ? "Неуспешно обновяване на сесията" : "Неуспешно добавяне на сесията",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!workoutPlanSession && (
        <div className="space-y-2">
          <Label htmlFor="session">Сесия *</Label>
          <Select
            value={formData.sessionId}
            onValueChange={(value) => setFormData({ ...formData, sessionId: value })}
            disabled={loadingSessions}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingSessions
                    ? "Зареждане..."
                    : availableSessions.length
                    ? "Изберете сесия"
                    : "Няма свободни сесии"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableSessions.map((session) => (
                <SelectItem key={String(session.id)} value={String(session.id)}>
                  {session.title} ({session.durationMins ?? 0} мин)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3">
        <Label>Разписание (дни от седмицата)</Label>
        <div className="grid grid-cols-2 gap-3">
          {days.map((day) => (
            <div key={day.value} className="flex items-center space-x-2">
              <Checkbox
                id={day.value}
                checked={formData.schedule.includes(day.value)}
                onCheckedChange={(checked) => handleScheduleChange(day.value, checked as boolean)}
              />
              <Label htmlFor={day.value} className="text-sm font-normal">
                {day.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading || (!workoutPlanSession && availableSessions.length === 0)}>
          {loading ? "Запазване..." : workoutPlanSession ? "Обнови" : "Добави"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отказ
        </Button>
      </div>
    </form>
  )
}
