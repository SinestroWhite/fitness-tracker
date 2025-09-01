// "use client"

// import { useState, useEffect } from "react"
// import { useParams, useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Progress } from "@/components/ui/progress"
// import { ChevronLeft, ChevronRight, CheckCircle, X, Timer, RotateCcw } from "lucide-react"
// import { apiService, type Session, type SessionExercise } from "@/lib/api"
// import { useToast } from "@/hooks/use-toast"

// const muscleLabels = {
//   chest: "Гърди",
//   back: "Гръб",
//   legs: "Крака",
//   shoulders: "Рамене",
//   arms: "Ръце",
//   core: "Корем",
//   full_body: "Цяло тяло",
// }

// export default function WorkoutPlayerPage() {
//   const params = useParams()
//   const router = useRouter()
//   const { toast } = useToast()
//   const sessionId = params.sessionId as string

//   const [session, setSession] = useState<Session | null>(null)
//   const [exercises, setExercises] = useState<SessionExercise[]>([])
//   const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
//   const [loading, setLoading] = useState(true)
//   const [isCompleting, setIsCompleting] = useState(false)

//   useEffect(() => {
//     const fetchWorkoutData = async () => {
//       try {
//         setLoading(true)

//         // Fetch session details
//         const sessionData = await apiService.getSession(sessionId)
//         setSession(sessionData)

//         // Fetch session exercises
//         const exercisesData = await apiService.getSessionExercises(sessionId)
//         setExercises(exercisesData)
//       } catch (error) {
//         console.error("Error fetching workout data:", error)
//         toast({
//           title: "Грешка",
//           description: "Неуспешно зареждане на тренировката",
//           variant: "destructive",
//         })
//         router.push("/schedule")
//       } finally {
//         setLoading(false)
//       }
//     }

//     if (sessionId) {
//       fetchWorkoutData()
//     }
//   }, [sessionId, toast, router])

//   const currentExercise = exercises[currentExerciseIndex]
//   const isLastExercise = currentExerciseIndex === exercises.length - 1
//   const progressPercentage = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0

//   const handlePreviousExercise = () => {
//     if (currentExerciseIndex > 0) {
//       setCurrentExerciseIndex(currentExerciseIndex - 1)
//     }
//   }

//   const handleNextExercise = () => {
//     if (currentExerciseIndex < exercises.length - 1) {
//       setCurrentExerciseIndex(currentExerciseIndex + 1)
//     }
//   }

//   const handleFinishWorkout = async () => {
//     try {
//       setIsCompleting(true)

//       // Mark workout as completed
//       await apiService.markWorkoutCompleted({ workoutId: sessionId })

//       toast({
//         title: "Браво!",
//         description: "Тренировката е завършена успешно!",
//       })

//       // Return to schedule page
//       router.push("/schedule")
//     } catch (error) {
//       console.error("Error completing workout:", error)
//       toast({
//         title: "Грешка",
//         description: "Неуспешно завършване на тренировката",
//         variant: "destructive",
//       })
//     } finally {
//       setIsCompleting(false)
//     }
//   }

//   const handleExitWorkout = () => {
//     router.push("/schedule")
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
//           <p className="text-muted-foreground">Зареждане на тренировката...</p>
//         </div>
//       </div>
//     )
//   }

//   if (!session || exercises.length === 0) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-muted-foreground mb-4">Няма упражнения в тази тренировка</p>
//           <Button onClick={handleExitWorkout} variant="outline">
//             Назад към програмата
//           </Button>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header */}
//       <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
//         <div className="container mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <Button onClick={handleExitWorkout} variant="ghost" size="sm">
//                 <X className="h-4 w-4 mr-2" />
//                 Изход
//               </Button>
//               <div>
//                 <h1 className="font-semibold">{session.title}</h1>
//                 <p className="text-sm text-muted-foreground">
//                   Упражнение {currentExerciseIndex + 1} от {exercises.length}
//                 </p>
//               </div>
//             </div>
//             <div className="text-right">
//               <div className="text-sm text-muted-foreground mb-1">Прогрес</div>
//               <div className="w-32">
//                 <Progress value={progressPercentage} className="h-2" />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="container mx-auto px-4 py-8">
//         <div className="max-w-4xl mx-auto">
//           <Card className="overflow-hidden">
//             <CardContent className="p-0">
//               {/* Exercise Header */}
//               <div className="p-6 bg-muted/50">
//                 <div className="flex items-start justify-between mb-4">
//                   <div>
//                     <h2 className="text-2xl font-bold mb-2">{currentExercise.name}</h2>
//                     <Badge variant="outline" className="mb-2">
//                       {muscleLabels[currentExercise.muscle]}
//                     </Badge>
//                   </div>
//                   <div className="text-right space-y-2">
//                     {currentExercise.repetitions && (
//                       <div className="flex items-center gap-2">
//                         <RotateCcw className="h-4 w-4 text-muted-foreground" />
//                         <span className="text-sm text-muted-foreground">Повторения:</span>
//                         <Badge variant="secondary">{currentExercise.repetitions}</Badge>
//                       </div>
//                     )}
//                     {currentExercise.time && (
//                       <div className="flex items-center gap-2">
//                         <Timer className="h-4 w-4 text-muted-foreground" />
//                         <span className="text-sm text-muted-foreground">Време:</span>
//                         <Badge variant="secondary">{currentExercise.time}с</Badge>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               {/* Exercise Media */}
//               <div className="p-6">
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                   {/* Image */}
//                   {currentExercise.image && (
//                     <div>
//                       <h3 className="text-lg font-semibold mb-3">Демонстрация</h3>
//                       <img
//                         src={currentExercise.image || "/placeholder.svg"}
//                         alt={currentExercise.name}
//                         className="w-full h-64 lg:h-80 object-cover rounded-lg border"
//                         onError={(e) => {
//                           e.currentTarget.src = "/placeholder.svg?height=320&width=400&text=Няма изображение"
//                         }}
//                       />
//                     </div>
//                   )}

//                   {/* Video */}
//                   {currentExercise.video && (
//                     <div>
//                       <h3 className="text-lg font-semibold mb-3">Видео инструкции</h3>
//                       <video
//                         src={currentExercise.video}
//                         controls
//                         className="w-full h-64 lg:h-80 rounded-lg border"
//                         onError={(e) => {
//                           e.currentTarget.style.display = "none"
//                           const placeholder = document.createElement("div")
//                           placeholder.className =
//                             "w-full h-64 lg:h-80 bg-muted rounded-lg border flex items-center justify-center text-muted-foreground"
//                           placeholder.textContent = "Видеото не може да бъде заредено"
//                           e.currentTarget.parentNode?.appendChild(placeholder)
//                         }}
//                       >
//                         Вашият браузър не поддържа видео елемента.
//                       </video>
//                     </div>
//                   )}
//                 </div>

//                 {/* No media fallback */}
//                 {!currentExercise.image && !currentExercise.video && (
//                   <div className="text-center py-12">
//                     <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
//                       <RotateCcw className="h-12 w-12 text-muted-foreground" />
//                     </div>
//                     <h3 className="text-lg font-semibold mb-2">{currentExercise.name}</h3>
//                     <p className="text-muted-foreground">Няма налични медийни файлове за това упражнение</p>
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>

//           {/* Navigation */}
//           <div className="flex items-center justify-between mt-8">
//             <Button onClick={handlePreviousExercise} disabled={currentExerciseIndex === 0} variant="outline" size="lg">
//               <ChevronLeft className="h-5 w-5 mr-2" />
//               Предишно
//             </Button>

//             <div className="text-center">
//               <div className="text-sm text-muted-foreground mb-1">Упражнение</div>
//               <div className="text-lg font-semibold">
//                 {currentExerciseIndex + 1} / {exercises.length}
//               </div>
//             </div>

//             {isLastExercise ? (
//               <Button
//                 onClick={handleFinishWorkout}
//                 disabled={isCompleting}
//                 size="lg"
//                 className="bg-green-600 hover:bg-green-700"
//               >
//                 {isCompleting ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                     Завършване...
//                   </>
//                 ) : (
//                   <>
//                     <CheckCircle className="h-5 w-5 mr-2" />
//                     Завърши
//                   </>
//                 )}
//               </Button>
//             ) : (
//               <Button onClick={handleNextExercise} size="lg">
//                 Следващо
//                 <ChevronRight className="h-5 w-5 ml-2" />
//               </Button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }


"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, CheckCircle, X, Timer, RotateCcw } from "lucide-react"
import { apiService, type Session, type SessionExercise } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

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

const localDateStr = (d: Date = new Date()) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }  

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

export default function WorkoutPlayerPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<Session | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)

  // Кой тип медия да е показан (по подразбиране снимка)
  const [showMedia, setShowMedia] = useState<"image" | "video">("image")

  useEffect(() => {
    const fetchWorkoutData = async () => {
      try {
        setLoading(true)

        // Нормализиране на сесията
        const rawSession = await apiService.getSession(sessionId)
        setSession(toSession(rawSession as RawSession))

        // Нормализиране на упражненията
        const exRaw = await apiService.getSessionExercises(sessionId)
        const normalized = Array.isArray(exRaw) ? exRaw.map(toSessionExercise) : []
        setExercises(normalized)
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

    if (sessionId) {
      fetchWorkoutData()
    }
  }, [sessionId, toast, router])

  const currentExercise = exercises[currentExerciseIndex]
  const isLastExercise = currentExerciseIndex === exercises.length - 1
  const progressPercentage = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0

  // ДЕФОЛТЕН ИЗБОР: първо СНИМКА, после видео
  useEffect(() => {
    if (!currentExercise) return
    if (currentExercise.image) setShowMedia("image")
    else if (currentExercise.video) setShowMedia("video")
    else setShowMedia("image")
  }, [currentExerciseIndex, exercises.length])

  // Ако текущият избор е невалиден – превключи към наличната медия
  useEffect(() => {
    if (!currentExercise) return
    if (showMedia === "image" && !currentExercise.image && currentExercise.video) {
      setShowMedia("video")
    }
    if (showMedia === "video" && !currentExercise.video && currentExercise.image) {
      setShowMedia("image")
    }
  }, [showMedia, currentExercise])

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) setCurrentExerciseIndex((i) => i - 1)
  }

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) setCurrentExerciseIndex((i) => i + 1)
  }

//   const handleFinishWorkout = async () => {
//     try {
//       setIsCompleting(true)
//       await apiService.markWorkoutCompleted({user_id: workout_plan_id: sessionId,  })
//       toast({
//         title: "Браво!",
//         description: "Тренировката е завършена успешно!",
//       })
//       router.push("/schedule")
//     } catch (error) {
//       console.error("Error completing workout:", error)
//       toast({
//         title: "Грешка",
//         description: "Неуспешно завършване на тренировката",
//         variant: "destructive",
//       })
//     } finally {
//       setIsCompleting(false)
//     }
//   }
const handleFinishWorkout = async () => {
    try {
      setIsCompleting(true)
  
      // Опит за извличане на planId от сесията; fallback към sessionId
      const planId =
        (session as any)?.workoutPlanId ??
        (session as any)?.workout_plan_id ??
        (session as any)?.workoutPlan?.id ??
        sessionId
  
      await apiService.markWorkoutCompleted({
        workout_plan_id: String(planId),
        performed_on: localDateStr(new Date()),
      })
  
      toast({
        title: "Браво!",
        description: "Тренировката е завършена успешно!",
      })
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
    router.push(`/workout-details/${sessionId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Зареждане на тренировката...</p>
        </div>
      </div>
    )
  }

  if (!session || exercises.length === 0 || !currentExercise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Няма упражнения в тази тренировка</p>
          <Button onClick={handleExitWorkout} variant="outline">
            Назад към програмата
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={handleExitWorkout} variant="ghost" size="sm">
                <X className="h-4 w-4 mr-2" />
                Изход
              </Button>
              <div>
                <h1 className="font-semibold">{session.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Упражнение {currentExerciseIndex + 1} от {exercises.length}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Прогрес</div>
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
              {/* Exercise Header */}
              <div className="p-6 bg-muted/50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{currentExercise.name}</h2>
                    {currentExercise.muscle && (
                      <Badge variant="outline" className="mb-2">
                        {tMuscle(currentExercise.muscle)}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    {currentExercise.repetitions && (
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Повторения:</span>
                        <Badge variant="secondary">{currentExercise.repetitions}</Badge>
                      </div>
                    )}
                    {currentExercise.time && (
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Време:</span>
                        <Badge variant="secondary">{currentExercise.time}с</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Exercise Media (само едно от двете + превключвател) */}
              <div className="p-6">
                {(currentExercise.image || currentExercise.video) ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Демонстрация</h3>
                      <div className="inline-flex rounded-lg border p-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={showMedia === "image" ? "default" : "ghost"}
                          onClick={() => setShowMedia("image")}
                          disabled={!currentExercise.image}
                          className="rounded-md"
                        >
                          Снимка
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={showMedia === "video" ? "default" : "ghost"}
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
                            e.currentTarget.src = "/placeholder.svg?height=320&width=400&text=Няма+изображение"
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
                  // No media fallback
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <RotateCcw className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{currentExercise.name}</h3>
                    <p className="text-muted-foreground">Няма налични медийни файлове за това упражнение</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button onClick={handlePreviousExercise} disabled={currentExerciseIndex === 0} variant="outline" size="lg">
              <ChevronLeft className="h-5 w-5 mr-2" />
              Предишно
            </Button>

            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Упражнение</div>
              <div className="text-lg font-semibold">
                {currentExerciseIndex + 1} / {exercises.length}
              </div>
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
              <Button onClick={handleNextExercise} size="lg">
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

