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

// Нормализатор за всички сесии
function normalizeSessions(raw: any): Session[] {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
  return list.map((s: any) => ({
    id: String(s.id ?? s.session_id),
    title: s.title ?? s.name ?? "(без име)",
    durationMins: s.durationMins ?? s.duration_mins ?? s.duration ?? 0,
    ...s,
  })) as Session[]
}

// Нормализатор за вече използваните сесии в плана → масив от session_id (string)
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

type FieldErrors = { sessionId?: string; schedule?: string }

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
  const [formData, setFormData] = useState({ sessionId: "", schedule: [] as Weekday[] })

  // validation state
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState({ sessionId: false, schedule: false })
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validate = (vals: { sessionId: string; schedule: Weekday[] }): FieldErrors => {
    const e: FieldErrors = {}
    if (!workoutPlanSession) {
      if (!vals.sessionId) e.sessionId = "Моля, изберете сесия."
      else if (!sessions.some((s) => String(s.id) === String(vals.sessionId))) e.sessionId = "Невалидна сесия."
    }
    if (!vals.schedule?.length) e.schedule = "Изберете поне един ден."
    else if (!vals.schedule.every(isWeekday)) e.schedule = "Невалидни дни в разписанието."
    return e
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (workoutPlanSession) {
      const incoming = (workoutPlanSession as any).schedule
      const safeSchedule: Weekday[] = Array.isArray(incoming) ? (incoming.filter(isWeekday) as Weekday[]) : []
      setFormData({
        sessionId: String(
          (workoutPlanSession as any).sessionId ?? (workoutPlanSession as any).session_id ?? ""
        ),
        schedule: safeSchedule,
      })
    } else {
      // reset при превключване към add режим
      setFormData({ sessionId: "", schedule: [] })
    }
    setErrors({})
    setTouched({ sessionId: false, schedule: false })
    setSubmitAttempted(false)
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

  // auto-select ако има точно 1 възможна сесия
  useEffect(() => {
    if (!workoutPlanSession && !formData.sessionId && availableSessions.length === 1) {
      setFormData((f) => ({ ...f, sessionId: String(availableSessions[0].id) }))
    }
  }, [availableSessions, workoutPlanSession, formData.sessionId])

  // изчисти стойността ако стане невалидна
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
    } catch {
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
    setTouched((t) => ({ ...t, schedule: true }))
    setFormData((prev) => ({
      ...prev,
      schedule: checked ? [...prev.schedule, day] : prev.schedule.filter((d) => d !== day),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    const nextErrors = validate(formData)
    setErrors(nextErrors)

    if (nextErrors.sessionId || nextErrors.schedule) {
      toast({
        title: "Има грешки във формата",
        description: "Моля, коригирайте полетата, отбелязани в червено.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const payload: UpdateWorkoutPlanSessionData = { schedule: formData.schedule }

      if (workoutPlanSession) {
        const pivotId = String((workoutPlanSession as any).pivot_id ?? (workoutPlanSession as any).pivotId)
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
    } catch {
      toast({
        title: "Грешка",
        description: workoutPlanSession ? "Неуспешно обновяване на сесията" : "Неуспешно добавяне на сесията",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const showSessionError = !!errors.sessionId && (touched.sessionId || submitAttempted)
  const showScheduleError = !!errors.schedule && (touched.schedule || submitAttempted)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {!workoutPlanSession && (
        <div className="space-y-2">
          <Label className="text-secondary" htmlFor="session">Сесия *</Label>
          <Select
            key={formData.sessionId || "empty"}
            value={formData.sessionId || undefined}
            onValueChange={(value) => {
              setFormData({ ...formData, sessionId: value })
              if (!touched.sessionId) setTouched((t) => ({ ...t, sessionId: true }))
            }}
            disabled={loadingSessions}
          >
            <SelectTrigger
              id="session"
              className={`text-secondary ${showSessionError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              aria-required="true"
              aria-invalid={showSessionError}
              aria-errormessage={showSessionError ? "session-error" : undefined}
            >
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
          {showSessionError && <p id="session-error" className="text-sm text-destructive">{errors.sessionId}</p>}
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-secondary">Разписание (дни от седмицата) *</Label>
        <div
          className={`grid grid-cols-2 gap-3 p-2 rounded-md ${
            showScheduleError ? "border border-destructive" : ""
          }`}
          role="group"
          aria-invalid={showScheduleError}
          aria-errormessage={showScheduleError ? "schedule-error" : undefined}
        >
          {days.map((day) => (
            <div key={day.value} className="flex items-center space-x-2">
              <Checkbox
                id={day.value}
                className="text-secondary"
                checked={formData.schedule.includes(day.value)}
                onCheckedChange={(checked) => handleScheduleChange(day.value, !!checked)}
              />
              <Label className="text-secondary text-sm font-normal" htmlFor={day.value}>
                {day.label}
              </Label>
            </div>
          ))}
        </div>
        {showScheduleError && <p id="schedule-error" className="text-sm text-destructive">{errors.schedule}</p>}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={
            loading ||
            (!workoutPlanSession && (availableSessions.length === 0 || loadingSessions))
          }
        >
          {loading ? "Запазване..." : workoutPlanSession ? "Обнови" : "Добави"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отказ
        </Button>
      </div>
    </form>
  )
}
