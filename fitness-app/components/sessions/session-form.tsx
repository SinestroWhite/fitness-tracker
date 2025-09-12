"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiService, type Session, type CreateSessionData, type UpdateSessionData } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface SessionFormProps {
  session?: Session | null
  onSuccess: () => void
  onCancel: () => void
}

const bodyAreas = [
  { value: "full_body", label: "Цяло тяло" },
  { value: "upper_body", label: "Горна част" },
  { value: "lower_body", label: "Долна част" },
  { value: "core", label: "Корем" },
] as const

const AREA_VALUES = bodyAreas.map(a => a.value) as readonly string[]
const toArea = (v: unknown) => {
  const norm = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
  return (AREA_VALUES as readonly string[]).includes(norm) ? norm : ""
}

type FieldErrors = {
  title?: string
  bodyArea?: string
  durationMins?: string
}

export function SessionForm({ session, onSuccess, onCancel }: SessionFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // state
  const [title, setTitle] = useState("")
  const [bodyArea, setBodyArea] = useState<string>("")
  const [durationMins, setDurationMins] = useState<string>("")
  const [description, setDescription] = useState("")

  // validation state
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState({ title: false, bodyArea: false, durationMins: false })
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validate = (vals: { title: string; bodyArea: string; durationMins: string }): FieldErrors => {
    const e: FieldErrors = {}
    const t = vals.title.trim()

    if (!t) e.title = "Моля, въведете заглавие."
    else if (t.length > 120) e.title = "Заглавието може да е най-много 120 символа."

    if (!vals.bodyArea) e.bodyArea = "Изберете част от тялото."
    else if (!AREA_VALUES.includes(vals.bodyArea as any)) e.bodyArea = "Невалиден избор."

    const dStr = vals.durationMins.trim()
    if (!dStr) e.durationMins = "Въведете продължителност."
    else {
      const n = Number.parseInt(dStr, 10)
      if (!Number.isFinite(n) || n <= 0) e.durationMins = "Продължителността трябва да е положително цяло число."
    }

    return e
  }

  // populate/clear on session change
  useEffect(() => {
    if (session?.id) {
      setTitle(session.title ?? "")
      setBodyArea(toArea((session as any).bodyArea))
      setDurationMins(String(session.durationMins ?? ""))
      setDescription(session.description ?? "")
    } else {
      setTitle("")
      setBodyArea("")
      setDurationMins("")
      setDescription("")
    }
    setErrors({})
    setTouched({ title: false, bodyArea: false, durationMins: false })
    setSubmitAttempted(false)
  }, [session?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    const nextErrors = validate({ title, bodyArea, durationMins })
    setErrors(nextErrors)

    if (nextErrors.title || nextErrors.bodyArea || nextErrors.durationMins) {
      toast({
        title: "Има грешки във формата",
        description: "Моля, коригирайте полетата, отбелязани в червено.",
        variant: "destructive",
      })
      return
    }

    const duration = Number.parseInt(durationMins, 10)

    try {
      setLoading(true)
      const data = {
        title: title.trim(),
        bodyArea: bodyArea as any,
        durationMins: duration,
        description: description.trim(),
      }

      if (session?.id) {
        await apiService.updateSession(session.id, data as UpdateSessionData)
        toast({ title: "Успех", description: "Сесията е обновена успешно" })
      } else {
        await apiService.createSession(data as CreateSessionData)
        toast({ title: "Успех", description: "Сесията е създадена успешно" })
      }

      onSuccess()
    } catch {
      toast({
        title: "Грешка",
        description: session?.id ? "Неуспешно обновяване на сесията" : "Неуспешно създаване на сесията",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const showTitleError = !!errors.title && (touched.title || submitAttempted)
  const showAreaError = !!errors.bodyArea && (touched.bodyArea || submitAttempted)
  const showDurationError = !!errors.durationMins && (touched.durationMins || submitAttempted)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Title */}
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
          placeholder="Напр. Тренировка за гърди и трицепс"
          aria-required="true"
          aria-invalid={showTitleError}
          aria-errormessage={showTitleError ? "title-error" : undefined}
        />
        {showTitleError && <p id="title-error" className="text-sm text-destructive">{errors.title}</p>}
      </div>

      {/* Body area */}
      <div className="space-y-2">
        <Label className="text-secondary" htmlFor="bodyArea-trigger">Част от тялото *</Label>
        <Select
          key={bodyArea || "empty"}
          value={bodyArea || undefined}
          onValueChange={(v) => {
            setBodyArea(v)
            if (!touched.bodyArea) setTouched((t) => ({ ...t, bodyArea: true }))
          }}
        >
          <SelectTrigger
            className={`text-secondary ${showAreaError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            id="bodyArea-trigger"
            aria-required="true"
            aria-invalid={showAreaError}
            aria-errormessage={showAreaError ? "bodyArea-error" : undefined}
          >
            <SelectValue placeholder="Изберете част от тялото" />
          </SelectTrigger>
          <SelectContent>
            {bodyAreas.map((area) => (
              <SelectItem key={area.value} value={area.value}>
                {area.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showAreaError && <p id="bodyArea-error" className="text-sm text-destructive">{errors.bodyArea}</p>}
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label className="text-secondary" htmlFor="duration">Продължителност (минути) *</Label>
        <Input
          id="duration"
          type="number"
          inputMode="numeric"
          className={`text-secondary ${showDurationError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          min="1"
          value={durationMins}
          onChange={(e) => {
            setDurationMins(e.target.value)
            if (!touched.durationMins) setTouched((t) => ({ ...t, durationMins: true }))
          }}
          onBlur={() => setTouched((t) => ({ ...t, durationMins: true }))}
          placeholder="45"
          aria-required="true"
          aria-invalid={showDurationError}
          aria-errormessage={showDurationError ? "duration-error" : undefined}
        />
        {showDurationError && <p id="duration-error" className="text-sm text-destructive">{errors.durationMins}</p>}
      </div>

      {/* Description (optional) */}
      <div className="space-y-2">
        <Label className="text-secondary" htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={description}
          className="text-secondary"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание на тренировката..."
          rows={4}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Запазване..." : session?.id ? "Обнови" : "Създай"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Отказ
        </Button>
      </div>
    </form>
  )
}
