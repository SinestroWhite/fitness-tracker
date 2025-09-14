"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, CheckCircle, X, Timer, RotateCcw } from "lucide-react"
import { apiService, type Session, type SessionExercise } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

// ---- SORT BY PIVOT_ID ----
const sortByPivotId = (list: SessionExercise[] = []) => {
  return [...list].sort((a, b) => {
    const pa = Number(a?.pivot_id)
    const pb = Number(b?.pivot_id)

    if (Number.isFinite(pa) && Number.isFinite(pb)) return pa - pb // възходящо
    if (Number.isFinite(pa)) return -1
    if (Number.isFinite(pb)) return 1

    return String(a?.pivot_id ?? "").localeCompare(String(b?.pivot_id ?? ""), undefined, {
      numeric: true,
      sensitivity: "base",
    })
  })
}

// ---- MEDIA URL HELPERS ----
const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")

const toMediaUrl = (u?: string): string => {
  if (!u) return "/placeholder.svg"
  const s = u.trim()
  if (/^https?:\/\//i.test(s) || s.startsWith("blob:") || s.startsWith("data:")) return s
  if (s.startsWith("/uploads/")) return `${API_BASE}${s}`
  const name = s.split(/[\\/]/).pop() || s
  return `${API_BASE}/uploads/${name}`
}

// ---- ЛЕЙБЪЛИ ----
const MUSCLE_BG: Record<
  "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "full_body",
  string
> = {
  chest: "Гърди",
  back: "Гръб",
  legs: "Крака",
  shoulders: "Рамене",
  arms: "Ръце",
  core: "Корем",
  full_body: "Цяло тяло",
}
const tMuscle = (v?: string) => (v ? MUSCLE_BG[v as keyof typeof MUSCLE_BG] ?? v : "")

// ---- Helpers ----
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

// ---- НОРМАЛИЗАТОРИ ----
type BodyAreaKey = "full_body" | "upper_body" | "lower_body" | "core"

type RawSession = {
  id: number | string
  title: string
  body_area?: BodyAreaKey
  bodyArea?: BodyAreaKey
  duration_mins?: number
  durationMins?: number
  description?: string | null
  author_id?: number | string
  authorId?: number | string
  workout_plan_id?: number | string
  workoutPlanId?: number | string
  workoutPlan?: { id: number | string }
  created_at?: string
  createdAt?: string
  workout_plan_ids?: Array<number | string> // NEW
}

type SessionWithPlan = Session & {
  workoutPlanId?: string
  workoutPlanIds?: string[]
}

const toSession = (r: RawSession): SessionWithPlan => {
  const planIds = Array.isArray(r.workout_plan_ids) ? r.workout_plan_ids.map(String) : []
  return {
    id: String(r.id),
    title: r.title,
    bodyArea: (r.bodyArea ?? r.body_area) as BodyAreaKey,
    durationMins: (r as any).durationMins ?? (r as any).duration_mins ?? 0,
    description: r.description ?? undefined,
    authorId: String((r as any).authorId ?? (r as any).author_id ?? ""),
    createdAt: (r as any).createdAt ?? (r as any).created_at ?? "",
    workoutPlanId: r.workoutPlanId
      ? String(r.workoutPlanId)
      : r.workout_plan_id
      ? String(r.workout_plan_id)
      : r.workoutPlan?.id != null
      ? String(r.workoutPlan.id)
      : undefined,
    workoutPlanIds: planIds,
  }
}

const toSessionExercise = (e: any): SessionExercise => {
  const exercise = e.exercise ?? {
    id: String(e.exercise_id ?? e.exerciseId ?? e.id ?? ""),
    name: e.name,
    muscle: e.muscle,
    image: e.image,
    video: e.video,
  }

  return {
    // IMPORTANT: id here is the base exercise id (not unique per occurrence)
    id: String(e.id), // exercise_id
    name: e.name ?? exercise.name,
    muscle: e.muscle ?? exercise.muscle,
    exerciseId: String(e.exercise_id ?? e.exerciseId ?? exercise.id ?? ""), // base exercise id
    image: e.image ?? exercise.image,
    video: e.video ?? exercise.video,

    // Use pivot_id as the unique occurrence id (session_exercises.id)
    pivot_id: String(e.pivot_id ?? e.pivotId ?? e.session_exercise_id ?? e.se_id ?? e.sx_id ?? ""),
    repetitions: e.repetitions ?? undefined,
    time: e.time ?? undefined,
    exercise,
  } as SessionExercise
}


export default function WorkoutPlayerPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const sessionId = params.sessionId as string // това е ID-то на "sessions" таблицата (самата тренировка)

  const [session, setSession] = useState<SessionWithPlan | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)

  const [showMedia, setShowMedia] = useState<"image" | "video">("image")

  const planId = ((): string | undefined => {
    const fromUrl = searchParams.get("planId") ?? undefined
    return fromUrl ?? session?.workoutPlanId ?? undefined
  })()

  const wpsId = ((): string | undefined => {
    return (
      searchParams.get("wpsId") ??
      searchParams.get("workoutPlanSessionId") ??
      undefined
    )
  })()


  const [resolvedWpsId, setResolvedWpsId] = useState<string | undefined>(wpsId);

// If no wpsId in URL, resolve from planId + sessionId once we know the session plan
useEffect(() => {
  if (resolvedWpsId || !planId || !sessionId) return;
  (async () => {
    try {
      const wps = await apiService.getWorkoutPlanSessions(String(planId));
      const match = Array.isArray(wps)
        ? wps.find((s: any) =>
            String(s.session_id ?? s.sessionId ?? s.session?.id ?? "") === String(sessionId)
          )
        : undefined;
      if (match) setResolvedWpsId(String(match.id));
    } catch (e) {
      console.warn("Player: failed to resolve wpsId", e);
    }
  })();
}, [resolvedWpsId, planId, sessionId]);

const effectiveWpsId = resolvedWpsId ?? wpsId;


const performedOn = ((): string => {
  const explicitDate = searchParams.get("date")
  return explicitDate && /^\d{4}-\d{2}-\d{2}$/.test(explicitDate)
    ? explicitDate
    : toYMD(new Date())
})()

// track which exercises got completed (by session_exercises.id as string)
const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({})


const markExercise = (exerciseId: string, done: boolean) => {
  setCompletedMap(prev => ({ ...prev, [exerciseId]: done }))
}

useEffect(() => {
  // Need planId + wpsId + date + some exercises (for pivot ids to exist in UI)
  if (!planId || !wpsId || !performedOn || exercises.length === 0) return;

  let cancelled = false;
  (async () => {
    try {
      const res = await apiService.getExerciseChecklist({
        workoutPlanId: planId,
        sessionId: wpsId,          // pivot (workout_plan_sessions.id)
        performedOn,               // YYYY-MM-DD
      });

      // Build map by pivot id (session_exercise_id) -> completed boolean
      const map: Record<string, boolean> = {};
      for (const it of res.items ?? []) {
        const pid = String(it.session_exercise_id);
        map[pid] = !!it.completed;
      }
      if (!cancelled) setCompletedMap(map);
    } catch (e) {
      console.warn("Failed to hydrate exercise ticks:", e);
      // non-fatal; user can still tick and we'll persist on change
    }
  })();

  return () => { cancelled = true; };
}, [planId, wpsId, performedOn, exercises.length]);


const getPivotId = (sx?: SessionExercise) => String(sx?.pivot_id ?? "")

const handleTickChange = async (checked: boolean) => {
  if (!currentExercise) return
  const pivotId = getPivotId(currentExercise)
  if (!pivotId) return

  setCompletedMap(prev => ({ ...prev, [pivotId]: checked }))

  try {
    if (planId && wpsId) {
      await apiService.upsertExerciseCompletion({
        workout_plan_id: Number(planId),
        session_id: Number(wpsId),
        session_exercise_id: Number(pivotId),  // <-- use pivot id
        performed_on: performedOn,
        completed: !!checked,
      })
    }
  } catch (e) {
    console.warn("Tick save failed, will be covered by bulk on Finish.", e)
  }
}



  useEffect(() => {
    const fetchWorkoutData = async () => {
      try {
        setLoading(true)

        const rawSession = await apiService.getSession(sessionId)
        const normalizedSession = toSession(rawSession as RawSession)

        // choose effective workoutPlanId (може да идва и от URL)
        const explicitPlanId = searchParams.get("planId") ?? undefined
        let effectivePlanId = normalizedSession.workoutPlanId
        if (!effectivePlanId) {
          const ids = normalizedSession.workoutPlanIds ?? []
          if (explicitPlanId) {
            effectivePlanId = explicitPlanId
          } else if (ids.length === 1) {
            effectivePlanId = ids[0]
          }
        }

        const exRaw = await apiService.getSessionExercises(sessionId)
        const normalizedExercises = Array.isArray(exRaw) ? exRaw.map(toSessionExercise) : []

        setSession({ ...normalizedSession, workoutPlanId: effectivePlanId })
        setExercises(sortByPivotId(normalizedExercises))
      } catch (error) {
        console.error("Error fetching workout data:", error)
        toast({
          title: "Грешка",
          description: "Неуспешно зареждане на тренировката",
          variant: "destructive",
        })
        router.push("/schedule")
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) fetchWorkoutData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, toast, router])

  const currentExercise = exercises[currentExerciseIndex]
  const isLastExercise = currentExerciseIndex === exercises.length - 1
  const progressPercentage =
    exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0

  useEffect(() => {
    if (!currentExercise) return
    if (currentExercise.image) setShowMedia("image")
    else if (currentExercise.video) setShowMedia("video")
    else setShowMedia("image")
  }, [currentExerciseIndex, exercises.length])

  useEffect(() => {
    if (!currentExercise) return
    if (showMedia === "image" && !currentExercise.image && currentExercise.video) setShowMedia("video")
    if (showMedia === "video" && !currentExercise.video && currentExercise.image) setShowMedia("image")
  }, [showMedia, currentExercise])

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) setCurrentExerciseIndex((i) => i - 1)
  }

  const markExerciseDone = (exerciseId: string) => {
    setCompletedMap(prev => ({ ...prev, [exerciseId]: true }))
  }
  
  const handleNextExercise = async () => {
    if (!currentExercise) return;
  
    const pivotId = getPivotId(currentExercise); // session_exercises.id
    const isTicked = !!completedMap[pivotId];
  
    // Persist only if user ticked this occurrence
    if (isTicked && planId && wpsId) {
      try {
        await apiService.upsertExerciseCompletion({
          workout_plan_id: Number(planId),
          session_id: Number(wpsId),
          session_exercise_id: Number(pivotId),
          performed_on: performedOn,
          completed: true,
        });
      } catch (e) {
        console.warn("Tick save failed, will be covered by bulk on Finish.", e);
      }
    }
  
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((i) => i + 1);
    }
  };

  const handleFinishWorkout = async () => {
    if (!planId) {
      toast({
        title: "Липсва план",
        description: "Отвори тренировката с ?planId=... или свържи сесията към план.",
        variant: "destructive",
      })
      return
    }
    if (!wpsId) {
      toast({
        title: "Липсва сесия",
        description: "Отвори от Разписание, за да предаде wpsId (workout_plan_sessions.id).",
        variant: "destructive",
      })
      return
    }
  
    setIsCompleting(true)
  
    try {
      // 1) Събери всички pivot_id от текущата сесия
      const allPivotIds = exercises
        .map((sx) => String(sx?.pivot_id ?? ""))
        .filter((id) => id.length > 0)
  
      // 2) Оптимистично отбележи всичко като изпълнено в UI
      setCompletedMap((prev) => {
        const next = { ...prev }
        for (const pid of allPivotIds) next[pid] = true
        return next
      })
  
      // 3) Запиши всички като completed=true (bulk)
      if (allPivotIds.length > 0) {
        await apiService.bulkUpsertExerciseCompletions({
          workout_plan_id: Number(planId),
          session_id: Number(wpsId),
          performed_on: performedOn,
          items: allPivotIds.map((pid) => ({
            session_exercise_id: Number(pid), // <-- PIVOT ID
            completed: true,
          })),
        })
      }
  
      // 4) Отбележи тренировката като завършена
      await apiService.markWorkoutCompleted({
        workout_plan_id: String(planId),
        session_id: String(wpsId),
        performed_on: performedOn,
      } as any)
  
      toast({ title: "Браво!", description: `Тренировката е отбелязана за ${performedOn}.` })
      router.push("/schedule")
    } catch (error) {
      console.error("Error completing workout:", error)
      toast({
        title: "Грешка",
        description: "Неуспешно завършване на тренировката",
        variant: "destructive",
      })
    } finally {
      setIsCompleting(false)
    }
  }
  
  
  

  const handleExitWorkout = () => {
    const sp = new URLSearchParams();
    const planId = searchParams.get("planId");
    const date   = searchParams.get("date");
    const wpsId  = searchParams.get("wpsId"); // <-- add
  
    if (planId) sp.set("planId", planId);
    if (date)   sp.set("date", date);
    if (wpsId)  sp.set("wpsId", wpsId);       // <-- forward it
  
    //router.push(`/workout-details/${sessionId}`)
    router.push(`/workout-details/${sessionId}${sp.toString() ? `?${sp.toString()}` : ""}`)
  }

  const pivotId = getPivotId(currentExercise)
const currentDone = !!completedMap[pivotId]


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary">Зареждане на тренировката...</p>
        </div>
      </div>
    )
  }

  if (!session || exercises.length === 0 || !currentExercise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary mb-4">Няма упражнения в тази тренировка</p>
          <Button onClick={handleExitWorkout} variant="outline">
            Назад към програмата
          </Button>
        </div>
      </div>
    )
  }

 // const currentDone = !!(currentExercise && completedMap[String(currentExercise.id)])

  return (
    <div className="min-h-screen bg-[url(/bg.jpg)] bg-cover">
      {/* Header */}
      <div className="sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button className="text-secondary" onClick={handleExitWorkout} variant="ghost" size="sm">
                <X className="h-4 w-4 mr-2 text-secondary" /> Изход
              </Button>
              <div>
                <h1 className="font-semibold text-secondary">{session.title}</h1>
                <p className="text-sm text-secondary">
                  Упражнение {currentExerciseIndex + 1} от {exercises.length}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-secondary mb-1">Прогрес</div>
              <div className="w-32">
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 ">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{currentExercise.name}</h2>
                    {currentExercise.muscle && (
                      <Badge variant="outline" className="mb-2 text-secondary">
                        {tMuscle(currentExercise.muscle)}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    {currentExercise.repetitions && (
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-secondary" />
                        <span className="text-sm text-secondary">Повторения:</span>
                        <Badge className="text-primary" variant="secondary">{currentExercise.repetitions}</Badge>
                      </div>
                    )}
                    {currentExercise.time && (
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-secondary" />
                        <span className="text-sm text-secondary">Време:</span>
                        <Badge className="text-primary" variant="secondary">{currentExercise.time}с</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {currentExercise.image || currentExercise.video ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Демонстрация</h3>
                      <div className="inline-flex rounded-lg border p-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={showMedia === "image" ? "white" : "ghost"}
                          onClick={() => setShowMedia("image")}
                          disabled={!currentExercise.image}
                          className="rounded-md"
                        >
                          Снимка
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={showMedia === "video" ? "white" : "ghost"}
                          onClick={() => setShowMedia("video")}
                          disabled={!currentExercise.video}
                          className="rounded-md"
                        >
                          Видео
                        </Button>
                      </div>
                    </div>
                    <div className="w-full">
                      {showMedia === "image" && currentExercise.image && (
                        <img
                          src={toMediaUrl(currentExercise.image)}
                          alt={currentExercise.name}
                          className="w-full h-64 lg:h-96 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.src =
                              "/placeholder.svg?height=320&width=400&text=Няма+изображение"
                          }}
                        />
                      )}
                      {showMedia === "video" && currentExercise.video && (
                        <video
                          controls
                          className="w-full h-64 lg:h-96 rounded-lg border"
                          poster="/placeholder.svg?height=320&width=400&text=Видео"
                        >
                          <source src={toMediaUrl(currentExercise.video)} type="video/mp4" />
                          Вашият браузър не поддържа видео елемента.
                        </video>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <RotateCcw className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{currentExercise.name}</h3>
                    <p className="text-muted-foreground">
                      Няма налични медийни файлове за това упражнение
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-8">
  <Button
    onClick={handlePreviousExercise}
    disabled={currentExerciseIndex === 0}
    variant="outline"
    size="lg"
  >
    <ChevronLeft className="h-5 w-5 mr-2" /> Предишно
  </Button>

  <div className="flex items-center gap-2">
  <Checkbox
  id="tick-current-ex"
  checked={currentDone}
  className="border-secondary"
  onCheckedChange={(v) => handleTickChange(Boolean(v))}
/>
    <label
      htmlFor="tick-current-ex"
      className="text-sm text-secondary select-none cursor-pointer"
    >
      Отбележи упражнението като изпълнено
    </label>
  </div>

  {isLastExercise ? (
    <Button
      onClick={handleFinishWorkout}
      disabled={isCompleting}
      size="lg"
      className="bg-green-600 hover:bg-green-700"
    >
      {isCompleting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary mr-2"></div>
          Завършване...
        </>
      ) : (
        <>
          <CheckCircle className="h-5 w-5 mr-2" />
          Завърши
        </>
      )}
    </Button>
  ) : (
    <Button variant="white" onClick={handleNextExercise} size="lg">
      Следващо
      <ChevronRight className="h-5 w-5 ml-2" />
    </Button>
  )}
</div>

        </div>
      </div>
    </div>
  )
}
