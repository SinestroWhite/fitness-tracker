
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
  const norm = String(v ?? "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_")
  return AREA_VALUES.includes(norm as any) ? norm : ""
}

export function SessionForm({ session, onSuccess, onCancel }: SessionFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // отделни state-ове
  const [title, setTitle] = useState("")
  const [bodyArea, setBodyArea] = useState<string>("")
  const [durationMins, setDurationMins] = useState<string>("")
  const [description, setDescription] = useState("")

  // попълване/изчистване при смяна на id
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
  }, [session?.id])

  // fallback за първия рендер (ако state още е празен)
  const derivedArea = bodyArea || toArea((session as any)?.bodyArea)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !derivedArea || !durationMins) {
      toast({ title: "Грешка", description: "Моля попълнете всички полета", variant: "destructive" })
      return
    }

    const duration = Number.parseInt(durationMins)
    if (!Number.isFinite(duration) || duration <= 0) {
      toast({ title: "Грешка", description: "Продължителността трябва да бъде положително число", variant: "destructive" })
      return
    }

    try {
      setLoading(true)
      const data = {
        title: title.trim(),
        bodyArea: derivedArea as any,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Заглавие *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Напр. Тренировка за гърди и трицепс"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bodyArea-trigger">Част от тялото *</Label>
        <Select value={derivedArea || undefined} onValueChange={setBodyArea}>
          <SelectTrigger id="bodyArea-trigger">
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Продължителност (минути) *</Label>
        <Input
          id="duration"
          type="number"
          min="1"
          value={durationMins}
          onChange={(e) => setDurationMins(e.target.value)}
          placeholder="45"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание на тренировката..."
          rows={4}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Запазване..." : session?.id ? "Обнови" : "Създай"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отказ
        </Button>
      </div>
    </form>
  )
}
