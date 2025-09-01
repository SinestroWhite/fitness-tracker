// "use client"

// import { useState, useEffect } from "react"
// import { useParams, useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Separator } from "@/components/ui/separator"
// import { Play, Clock, Target, ArrowLeft } from "lucide-react"
// import { apiService, type Session, type SessionExercise } from "@/lib/api"
// import { DashboardLayout } from "@/components/layout/dashboard-layout"
// import { ProtectedRoute } from "@/components/auth/protected-route"
// import { useToast } from "@/hooks/use-toast"

// const bodyAreaLabels = {
//   full_body: "Цяло тяло",
//   upper_body: "Горна част",
//   lower_body: "Долна част",
//   core: "Корем",
// }

// const muscleLabels = {
//   chest: "Гърди",
//   back: "Гръб",
//   legs: "Крака",
//   shoulders: "Рамене",
//   arms: "Ръце",
//   core: "Корем",
//   full_body: "Цяло тяло",
// }

// export default function WorkoutDetailsPage() {
//   const params = useParams()
//   const router = useRouter()
//   const { toast } = useToast()
//   const sessionId = params.sessionId as string

//   const [session, setSession] = useState<Session | null>(null)
//   const [exercises, setExercises] = useState<SessionExercise[]>([])
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     const fetchWorkoutDetails = async () => {
//       try {
//         setLoading(true)

//         // Fetch session details
//         const sessionData = await apiService.getSession(sessionId, "exercises")
//         setSession(sessionData)

//         // Fetch session exercises
//         const exercisesData = await apiService.getSessionExercises(sessionId)
//         setExercises(exercisesData)
//       } catch (error) {
//         console.error("Error fetching workout details:", error)
//         toast({
//           title: "Грешка",
//           description: "Неуспешно зареждане на детайлите за тренировката",
//           variant: "destructive",
//         })
//       } finally {
//         setLoading(false)
//       }
//     }

//     if (sessionId) {
//       fetchWorkoutDetails()
//     }
//   }, [sessionId, toast])

//   const handleStartWorkout = () => {
//     router.push(`/workout-player/${sessionId}`)
//   }

//   const handleGoBack = () => {
//     router.back()
//   }

//   if (loading) {
//     return (
//       <ProtectedRoute>
//         <DashboardLayout>
//           <div className="flex items-center justify-center min-h-[400px]">
//             <div className="text-center">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
//               <p className="text-muted-foreground">Зареждане на тренировката...</p>
//             </div>
//           </div>
//         </DashboardLayout>
//       </ProtectedRoute>
//     )
//   }

//   if (!session) {
//     return (
//       <ProtectedRoute>
//         <DashboardLayout>
//           <div className="flex items-center justify-center min-h-[400px]">
//             <div className="text-center">
//               <p className="text-muted-foreground mb-4">Тренировката не е намерена</p>
//               <Button onClick={handleGoBack} variant="outline">
//                 <ArrowLeft className="h-4 w-4 mr-2" />
//                 Назад
//               </Button>
//             </div>
//           </div>
//         </DashboardLayout>
//       </ProtectedRoute>
//     )
//   }

//   return (
//     <ProtectedRoute>
//       <DashboardLayout>
//         <div className="space-y-6">
//           {/* Header */}
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <Button onClick={handleGoBack} variant="outline" size="sm">
//                 <ArrowLeft className="h-4 w-4 mr-2" />
//                 Назад
//               </Button>
//               <div>
//                 <h1 className="text-3xl font-bold">{session.title}</h1>
//                 <p className="text-muted-foreground">{session.description}</p>
//               </div>
//             </div>
//             <Button onClick={handleStartWorkout} size="lg" className="bg-green-600 hover:bg-green-700">
//               <Play className="h-5 w-5 mr-2" />
//               Започни тренировка
//             </Button>
//           </div>

//           {/* Session Info */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Target className="h-5 w-5" />
//                 Информация за тренировката
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div className="flex items-center gap-2">
//                   <Clock className="h-4 w-4 text-muted-foreground" />
//                   <span className="text-sm text-muted-foreground">Продължителност:</span>
//                   <Badge variant="secondary">{session.durationMins} мин</Badge>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <Target className="h-4 w-4 text-muted-foreground" />
//                   <span className="text-sm text-muted-foreground">Област:</span>
//                   <Badge variant="outline">{bodyAreaLabels[session.bodyArea]}</Badge>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <span className="text-sm text-muted-foreground">Упражнения:</span>
//                   <Badge>{exercises.length}</Badge>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Exercises List */}
//           <Card>
//             <CardHeader>
//               <CardTitle>Упражнения ({exercises.length})</CardTitle>
//               <CardDescription>Преглед на всички упражнения в тази тренировка</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {exercises.map((sessionExercise, index) => (
//                   <div key={sessionExercise.id}>
//                     <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
//                       <div className="flex-shrink-0">
//                         <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
//                           {index + 1}
//                         </div>
//                       </div>

//                       <div className="flex-1 space-y-3">
//                         <div className="flex items-start justify-between">
//                           <div>
//                             <h3 className="font-semibold text-lg">{sessionExercise.name}</h3>
//                             <Badge variant="outline" className="mt-1">
//                               {muscleLabels[sessionExercise.muscle]}
//                             </Badge>
//                           </div>
//                           <div className="text-right space-y-1">
//                             {sessionExercise.repetitions && (
//                               <div className="text-sm">
//                                 <span className="text-muted-foreground">Повторения: </span>
//                                 <span className="font-medium">{sessionExercise.repetitions}</span>
//                               </div>
//                             )}
//                             {sessionExercise.time && (
//                               <div className="text-sm">
//                                 <span className="text-muted-foreground">Време: </span>
//                                 <span className="font-medium">{sessionExercise.time}с</span>
//                               </div>
//                             )}
//                           </div>
//                         </div>

//                         {/* Exercise Media */}
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                           {sessionExercise.image && (
//                             <div>
//                               <p className="text-sm text-muted-foreground mb-2">Изображение:</p>
//                               <img
//                                 src={sessionExercise.image || "/placeholder.svg"}
//                                 alt={sessionExercise.name}
//                                 className="w-full h-48 object-cover rounded-lg border"
//                                 onError={(e) => {
//                                   e.currentTarget.src = "/placeholder.svg?height=192&width=300&text=Няма изображение"
//                                 }}
//                               />
//                             </div>
//                           )}

//                           {sessionExercise.video && (
//                             <div>
//                               <p className="text-sm text-muted-foreground mb-2">Видео:</p>
//                               <video
//                                 src={sessionExercise.video}
//                                 controls
//                                 className="w-full h-48 rounded-lg border"
//                                 onError={(e) => {
//                                   e.currentTarget.style.display = "none"
//                                   const placeholder = document.createElement("div")
//                                   placeholder.className =
//                                     "w-full h-48 bg-muted rounded-lg border flex items-center justify-center text-muted-foreground"
//                                   placeholder.textContent = "Видеото не може да бъде заредено"
//                                   e.currentTarget.parentNode?.appendChild(placeholder)
//                                 }}
//                               >
//                                 Вашият браузър не поддържа видео елемента.
//                               </video>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     </div>

//                     {index < exercises.length - 1 && <Separator className="my-4" />}
//                   </div>
//                 ))}

//                 {exercises.length === 0 && (
//                   <div className="text-center py-8 text-muted-foreground">
//                     <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
//                     <p>Няма добавени упражнения в тази тренировка</p>
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>

//           {/* Start Workout Button (Bottom) */}
//           {exercises.length > 0 && (
//             <div className="flex justify-center pb-6">
//               <Button onClick={handleStartWorkout} size="lg" className="bg-green-600 hover:bg-green-700">
//                 <Play className="h-5 w-5 mr-2" />
//                 Започни тренировка ({exercises.length} упражнения)
//               </Button>
//             </div>
//           )}
//         </div>
//       </DashboardLayout>
//     </ProtectedRoute>
//   )
// }


"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Play, Clock, Target, ArrowLeft } from "lucide-react"
import { apiService, type Session, type SessionExercise } from "@/lib/api"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useToast } from "@/hooks/use-toast"

// ---- MEDIA URL HELPERS (същите както в предишния файл) ----
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

// ---- ЛЕЙБЪЛИ / ПРЕВОДИ ----
type BodyAreaKey = "full_body" | "upper_body" | "lower_body" | "core"

const BODY_AREA_BG: Record<BodyAreaKey, string> = {
  full_body: "Цяло тяло",
  upper_body: "Горна част",
  lower_body: "Долна част",
  core: "Корем",
}

const tBodyArea = (v?: string) =>
  v ? (BODY_AREA_BG[v as BodyAreaKey] ?? v.replace("_", " ")) : ""

type MuscleKey = "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "full_body"

const MUSCLE_BG: Record<MuscleKey, string> = {
  chest: "Гърди",
  back: "Гръб",
  legs: "Крака",
  shoulders: "Рамене",
  arms: "Ръце",
  core: "Корем",
  full_body: "Цяло тяло",
}

const tMuscle = (v?: string) =>
  v ? (MUSCLE_BG[v as MuscleKey] ?? v.replace("_", " ")) : ""

// ---- НОРМАЛИЗАТОРИ (идентични по идея с предишния файл) ----
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
  created_at?: string
  createdAt?: string
}

const toSession = (r: RawSession): Session => ({
  id: String(r.id),
  title: r.title,
  bodyArea: (r.bodyArea ?? r.body_area) as BodyAreaKey,
  durationMins: (r as any).durationMins ?? (r as any).duration_mins ?? 0,
  description: r.description ?? undefined,
  authorId: String((r as any).authorId ?? (r as any).author_id ?? ""),
  createdAt: (r as any).createdAt ?? (r as any).created_at ?? "",
})

const toSessionExercise = (e: any): SessionExercise => {
  const exercise = e.exercise ?? {
    id: String(e.exercise_id ?? e.exerciseId ?? e.id ?? ""),
    name: e.name,
    muscle: e.muscle,
    image: e.image,
    video: e.video,
  }

  return {
    id: String(e.id),
    name: e.name ?? exercise.name,
    muscle: e.muscle ?? exercise.muscle,
    exerciseId: String(e.exercise_id ?? e.exerciseId ?? exercise.id ?? ""),
    image: e.image ?? exercise.image,
    video: e.video ?? exercise.video,
    pivot_id: String(e.pivot_id ?? e.pivotId ?? ""),
    repetitions: e.repetitions ?? undefined,
    time: e.time ?? undefined,
    exercise,
  } as SessionExercise
}

export default function WorkoutDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<Session | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWorkoutDetails = async () => {
      try {
        setLoading(true)

        // 1) Взимаме сесията (може да е raw) и я нормализираме
        const rawSession = await apiService.getSession(sessionId)
        setSession(toSession(rawSession as RawSession))

        // 2) Взимаме упражненията и ги нормализираме (същата логика като в предишния файл)
        const exRaw = await apiService.getSessionExercises(sessionId)
        const normalized = Array.isArray(exRaw) ? exRaw.map(toSessionExercise) : []
        setExercises(normalized)
      } catch (error) {
        console.error("Error fetching workout details:", error)
        toast({
          title: "Грешка",
          description: "Неуспешно зареждане на детайлите за тренировката",
          variant: "destructive",
        })
        setSession(null)
        setExercises([])
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      fetchWorkoutDetails()
    }
  }, [sessionId, toast])

  const handleStartWorkout = () => {
    router.push(`/workout-player/${sessionId}`)
  }

  const handleGoBack = () => {
    router.push(`/schedule`)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Зареждане на тренировката...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!session) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Тренировката не е намерена</p>
              <Button onClick={handleGoBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={handleGoBack} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{session.title}</h1>
                {session.description && <p className="text-muted-foreground">{session.description}</p>}
              </div>
            </div>
            <Button onClick={handleStartWorkout} size="lg" className="bg-green-600 hover:bg-green-700">
              <Play className="h-5 w-5 mr-2" />
              Започни тренировка
            </Button>
          </div>

          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Информация за тренировката
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Продължителност:</span>
                  <Badge variant="secondary">{session.durationMins} мин</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Област:</span>
                  <Badge variant="outline">{tBodyArea(session.bodyArea)}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Упражнения:</span>
                  <Badge>{exercises.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercises List */}
          <Card>
            <CardHeader>
              <CardTitle>Упражнения ({exercises.length})</CardTitle>
              <CardDescription>Преглед на всички упражнения в тази тренировка</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exercises.map((sx, index) => {
                  const ex = sx.exercise ?? ({} as any)
                  const imageSrc = ex.image ?? sx.image
                  const videoSrc = ex.video ?? sx.video
                  const displayName = ex.name ?? sx.name
                  const displayMuscle = ex.muscle ?? sx.muscle

                  return (
                    <div key={sx.id}>
                      <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{displayName}</h3>
                              {displayMuscle && (
                                <Badge variant="outline" className="mt-1">
                                  {tMuscle(String(displayMuscle))}
                                </Badge>
                              )}
                            </div>
                            <div className="text-right space-y-1">
                              {sx.repetitions && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Повторения: </span>
                                  <span className="font-medium">{sx.repetitions}</span>
                                </div>
                              )}
                              {sx.time && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Време: </span>
                                  <span className="font-medium">{sx.time}с</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Exercise Media */}
                          {(imageSrc || videoSrc) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {imageSrc && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Изображение:</p>
                                  <img
                                    src={toMediaUrl(imageSrc)}
                                    alt={displayName || "Exercise"}
                                    className="w-full h-48 object-cover rounded-lg border"
                                    onError={(e) => {
                                      e.currentTarget.src = "/placeholder.svg?height=192&width=300&text=Няма+изображение"
                                    }}
                                  />
                                </div>
                              )}

                              {videoSrc && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Видео:</p>
                                  <video
                                    controls
                                    className="w-full h-48 rounded-lg border"
                                    poster="/placeholder.svg?height=192&width=300&text=Видео"
                                  >
                                    <source src={toMediaUrl(videoSrc)} type="video/mp4" />
                                    Вашият браузър не поддържа видео елемента.
                                  </video>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {index < exercises.length - 1 && <Separator className="my-4" />}
                    </div>
                  )
                })}

                {exercises.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Няма добавени упражнения в тази тренировка</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Start Workout Button (Bottom) */}
          {exercises.length > 0 && (
            <div className="flex justify-center pb-6">
              <Button onClick={handleStartWorkout} size="lg" className="bg-green-600 hover:bg-green-700">
                <Play className="h-5 w-5 mr-2" />
                Започни тренировка ({exercises.length} упражнения)
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
