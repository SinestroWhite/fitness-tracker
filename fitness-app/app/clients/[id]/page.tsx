"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, TrendingUp, User, Mail, Ruler, Target, Weight, ImageIcon, Dumbbell, X } from "lucide-react"
import { apiService, type UpdateUserPersonalData, type Progress, type WorkoutPlan, type NutritionPlan} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ProgressChart } from "@/components/progress/progress-chart"
import { ImageViewer } from "@/components/progress/image-viewer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


interface ClientView {
  id: number
  name: string
  email: string
  createdAt: string
  personal?: PersonalView | null
}

type Goal = "lose" | "gain" | "keep" | undefined

interface PersonalView {
  sex?: "male" | "female"
  height?: number | null
  goal?: Goal
  nutritionPlanId?: number | null
  workoutPlanId?: number | null
}

const getGoalBadgeClass = (goal?: string) => {
  switch (goal) {
    case "lose":
      return "bg-red-600 text-red-50 dark:bg-red-900/30 dark:text-red-200 border-transparent"
    case "gain":
      return "bg-emerald-600 text-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-200 border-transparent"
    case "keep":
      return "bg-sky-600 text-sky-50 dark:bg-sky-900/30 dark:text-sky-200 border-transparent"
    default:
      return "bg-primary text-secondary"
  }
}


export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const [client, setClient] = useState<ClientView | null>(null)
  const [loading, setLoading] = useState(true)
  const [progressEntries, setProgressEntries] = useState<Progress[]>([])
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [currentWorkoutPlan, setCurrentWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [assigningWorkout, setAssigningWorkout] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const { toast } = useToast()

  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([])
  const [currentNutritionPlan, setCurrentNutritionPlan] = useState<NutritionPlan | null>(null)
  const [assigningNutrition, setAssigningNutrition] = useState(false)
  const [showNutritionAssignDialog, setShowNutritionAssignDialog] = useState(false)

// 👉 планове за показване в "Смени план" (без текущия)
const switchablePlans = useMemo(() => {
  if (!currentWorkoutPlan) return workoutPlans
  const curId = String(currentWorkoutPlan.id)
  return workoutPlans.filter(p => String(p.id) !== curId)
}, [workoutPlans, currentWorkoutPlan])

const switchableNutritionPlans = useMemo(() => {
  if (!currentNutritionPlan) return nutritionPlans
  const curId = String(currentNutritionPlan.id)
  return nutritionPlans.filter(p => String(p.id) !== curId)
}, [nutritionPlans, currentNutritionPlan])

  const loadClientDetails = async () => {
    try {
      setLoading(true)

      // FIX 1: unwrap .client from the API response
      const clientInfo = await apiService.getTrainerClient(clientId)
      const baseClient = clientInfo.client ?? clientInfo // fallback if already unwrapped

      // personal data (best-effort)
      const { client: apiClient } = await apiService.getTrainerClient(clientId)

       const mapped: ClientView = {
        id: apiClient.id,
        name: apiClient.name,
        email: apiClient.email,
        createdAt: apiClient.created_at,
        personal: apiClient.personalInfo
          ? {
              sex: apiClient.personalInfo.sex ?? undefined,
              height:
                apiClient.personalInfo.height != null
                  ? Number(apiClient.personalInfo.height)
                  : null,
              goal: apiClient.personalInfo.goal ?? undefined,
              nutritionPlanId: apiClient.personalInfo.nutrition_plan_id ?? null,
              workoutPlanId: apiClient.personalInfo.workout_plan_id ?? null,
            }
          : null,
      }

      setClient(mapped)


      if (mapped.personal?.workoutPlanId) {
        try {
          const workoutPlan = await apiService.getWorkoutPlan(mapped.personal.workoutPlanId, "sessions")
          setCurrentWorkoutPlan(workoutPlan)
        } catch (error) {
          setCurrentWorkoutPlan(null)
        }
      } else {
        setCurrentWorkoutPlan(null)
      }

      if (mapped.personal?.nutritionPlanId) {
        try {
          const nutritionPlan = await apiService.getNutritionPlan(mapped.personal.nutritionPlanId.toString(), "meals")
          setCurrentNutritionPlan(nutritionPlan)
        } catch (error) {
          setCurrentNutritionPlan(null)
        }
      } else {
        setCurrentNutritionPlan(null)
      }

      // FIX 2: do NOT wrap in [ ... ] — getProgress already returns Progress[]
      try {
        const progressData = await apiService.getProgress(clientId)
        setProgressEntries(progressData ?? [])
      } catch {
        setProgressEntries([])
      }
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на данните за клиента",
        variant: "destructive",
      })
      router.push("/clients")
    } finally {
      setLoading(false)
    }
  }

  const loadWorkoutPlans = async () => {
    try {
      const response = await apiService.getWorkoutPlanList({ pageSize: 100 })
      setWorkoutPlans(response.data)
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на тренировъчните планове",
        variant: "destructive",
      })
    }
  }

  const loadNutritionPlans = async () => {
    try {
      const response = await apiService.getNutritionPlans({ pageSize: 100 })
      setNutritionPlans(response.data)
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на плановете за хранене",
        variant: "destructive",
      })
    }
  }

  const handleAssignWorkoutPlan = async (workoutPlanId: string) => {
    try {
      setAssigningWorkout(true)
  
      const payload: UpdateUserPersonalData = {
        workoutPlanId: workoutPlanId,
      }
  
      const resp = await apiService.updateUserPersonalByUserId(clientId, payload)
      const updated = (resp as any)?.profile ?? resp // безопасно разопаковане
  
      toast({ title: "Успех", description: "Тренировъчният план е присвоен успешно" })
  
      setShowAssignDialog(false)
      await loadClientDetails()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно присвояване на тренировъчния план",
        variant: "destructive",
      })
    } finally {
      setAssigningWorkout(false)
    }
  }
  
  const handleRemoveWorkoutPlan = async () => {
    try {
      setAssigningWorkout(true)
  
      const payload: UpdateUserPersonalData = {
        workoutPlanId: null,
      }
  
      const resp = await apiService.updateUserPersonalByUserId(clientId, payload)
      const updated = (resp as any)?.profile ?? resp
  
      toast({ title: "Успех", description: "Тренировъчният план е премахнат успешно" })
  
      await loadClientDetails()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно премахване на тренировъчния план",
        variant: "destructive",
      })
    } finally {
      setAssigningWorkout(false)
    }
  }

  const handleAssignNutritionPlan = async (nutritionPlanId: string) => {
    try {
      setAssigningNutrition(true)
      await apiService.changeNutritionPlanToClient(clientId, nutritionPlanId)

      toast({
        title: "Успех",
        description: "Планът за хранене е присвоен успешно",
      })

      setShowNutritionAssignDialog(false)
      await loadClientDetails()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно присвояване на плана за хранене",
        variant: "destructive",
      })
    } finally {
      setAssigningNutrition(false)
    }
  }

  const handleRemoveNutritionPlan = async () => {
    try {
      setAssigningNutrition(true)

      const payload: UpdateUserPersonalData = {
        nutritionPlanId: null,
      }

      await apiService.updateUserPersonalByUserId(clientId, payload)

      toast({
        title: "Успех",
        description: "Планът за хранене е премахнат успешно",
      })

      await loadClientDetails()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно премахване на плана за хранене",
        variant: "destructive",
      })
    } finally {
      setAssigningNutrition(false)
    }
  }

  useEffect(() => {
    if (clientId) loadClientDetails()
      loadWorkoutPlans()
      loadNutritionPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const getGoalText = (goal?: string) => {
    switch (goal) {
      case "lose": return "Отслабване"
      case "gain": return "Качване на тегло"
      case "keep": return "Поддържане"
      default: return "Не е зададена"
    }
  }

  const getGoalBadgeVariant = (goal?: string) => {
    switch (goal) {
      case "lose": return "destructive"
      case "gain": return "default"
      case "keep": return "secondary"
      default: return "outline"
    }
  }

  const handleViewImages = (images: string[]) => {
    setSelectedImages(images)
    setShowImageViewer(true)
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="trainer">
        <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!client) {
    return (
      <ProtectedRoute requiredRole="trainer">
        <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p>Клиентът не е намерен</p>
        </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="trainer">
      <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center">
  <Button variant="outline" onClick={() => router.push("/clients")}>
    <ArrowLeft className="h-4 w-4 mr-2" />
    Назад към клиенти
  </Button>

  <div className="ml-4">
    <h1 className="text-2xl text-secondary font-bold">{client.name}</h1>
    <p className="text-secondary">Детайли за клиент</p>
  </div>

  {/* <Button
    variant="outline"
    className="ml-auto bg-transparent"
  >
    <Calendar className="mr-2 h-4 w-4" />
    Планирай тренировка
  </Button> */}
</div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Основна информация
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-secondary" />
                <div>
                  <Label className="text-xs text-secondary">Име</Label>
                  <p className="font-medium">{client.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-secondary" />
                <div>
                  <Label className="text-xs text-secondary">Имейл</Label>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-secondary" />
                <div>
                  <Label className="text-xs text-secondary">Регистриран</Label>
                  <p className="font-medium">
                    {new Date(client.createdAt).toLocaleDateString("bg-BG", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Фитнес данни
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.personal ? (
                <>
                  <div className="flex items-center space-x-3">
                    <Target className="h-4 w-4 text-secondary" />
                    <div>
                      <Label className="text-xs text-secondary">Цел</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getGoalBadgeVariant(client.personal.goal)}  className={getGoalBadgeClass(client.personal?.goal)}>
                          {getGoalText(client.personal.goal)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Ruler className="h-4 w-4 text-secondary" />
                    <div>
                      <Label className="text-xs text-secondary">Височина</Label>
                      <p className="font-medium">{client.personal.height} см</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-secondary" />
                    <div>
                      <Label className="text-xs text-secondary">Пол</Label>
                      <p className="font-medium">
                        {client.personal.sex === "male" ? "Мъж" : client.personal.sex === "female" ? "Жена" : "Не е зададен"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-secondary">Няма налични фитнес данни</p>
              )}
            </CardContent>
          </Card>
        </div>


        <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Dumbbell className="mr-2 h-5 w-5" />
                Тренировъчен план
              </CardTitle>
              <CardDescription>Управление на тренировъчен план</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentWorkoutPlan ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{currentWorkoutPlan.title}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-primary">
                        {currentWorkoutPlan.goal === "lose"
                          ? "Отслабване"
                          : currentWorkoutPlan.goal === "gain"
                            ? "Качване на тегло"
                            : "Поддържане"}
                      </Badge>
                      
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                      <DialogTrigger asChild>
                        <Button className="text-primary" variant="outline" size="sm">
                          Смени план
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-secondary">Избери тренировъчен план</DialogTitle>
                          <DialogDescription className="text-secondary">Изберете тренировъчен план за клиента</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid gap-2">
                          
                            {switchablePlans.map((plan) => (
  <div
    key={plan.id}
    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer"
    onClick={() => handleAssignWorkoutPlan(String(plan.id))}
  >
    <div>
      <p className="font-medium text-secondary">{plan.title}</p>
      <p className="text-sm text-secondary">
        {plan.goal === "lose" ? "Отслабване" : plan.goal === "gain" ? "Качване на тегло" : "Поддържане"}
      </p>
    </div>
    <Button  size="sm" disabled={assigningWorkout}>
    {assigningWorkout ? "Избиране..." : "Избери"}
    </Button>
  </div>
))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button className="text-primary" variant="outline" size="sm" onClick={handleRemoveWorkoutPlan} disabled={assigningWorkout}>
                      <X className="h-4 w-4 mr-1 text-primary" />
                      Премахни
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dumbbell className="mx-auto h-12 w-12 text-secondary" />
                  <h3 className="mt-2 text-sm font-semibold">Няма избран тренировъчен план</h3>
                  <p className="mt-1 text-sm text-secondary">Избери тренировъчен план на този клиент</p>
                  <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                    <DialogTrigger asChild>
                      <Button variant="white"  className="mt-4">
                        <Dumbbell className="mr-2 h-4 w-4" />
                        Избери тренировъчен план
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-secondary">Избери тренировъчен план</DialogTitle>
                        <DialogDescription className="text-secondary">Изберете тренировъчен план на клиента</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          {workoutPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className="flex items-center justify-between p-3 border rounded-lg cursor-pointer"
                              onClick={() => handleAssignWorkoutPlan(plan.id)}
                            >
                              <div>
                                <p className="font-medium text-secondary">{plan.title}</p>
                                <p className="text-sm text-secondary">
                                  {plan.goal === "lose"
                                    ? "Отслабване"
                                    : plan.goal === "gain"
                                      ? "Качване на тегло"
                                      : "Поддържане"}
                                </p>
                              </div>
                              <Button size="sm" disabled={assigningWorkout}>
                                {assigningWorkout ? "Избиране..." : "Избери"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                План за хранене
              </CardTitle>
              <CardDescription>Управление на план за хранене</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentNutritionPlan ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{currentNutritionPlan.title}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className="text-primary" variant="secondary">
                        {currentNutritionPlan.goal === "lose"
                          ? "Отслабване"
                          : currentNutritionPlan.goal === "gain"
                            ? "Качване на тегло"
                            : "Поддържане"}
                      </Badge>
                      {currentNutritionPlan.meals && (
                        <Badge className="text-secondary" variant="outline">{currentNutritionPlan.meals.length} ястия</Badge>
                      )}
                    </div>

                  </div>
                  <div className="flex items-center space-x-2">

                    <Dialog open={showNutritionAssignDialog} onOpenChange={setShowNutritionAssignDialog}>
  <DialogTrigger asChild>
    <Button className="text-primary" variant="outline" size="sm">Смени план</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="text-secondary">Избери план за хранене</DialogTitle>
      <DialogDescription className="text-secondary">Изберете план за хранене за на клиента</DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      <div className="grid gap-2">
        {switchableNutritionPlans.length === 0 ? (
          <p className="text-sm text-secondary">Няма други налични планове за смяна</p>
        ) : switchableNutritionPlans.map((plan) => (
          <div
            key={plan.id}
            className="flex items-center justify-between p-3 border rounded-lg cursor-pointer"
            onClick={() => handleAssignNutritionPlan(String(plan.id))}
          >
            <div>
              <p className="font-medium text-secondary">{plan.title}</p>
              <p className="text-sm text-secondary">
                {plan.goal === "lose" ? "Отслабване" : plan.goal === "gain" ? "Качване на тегло" : "Поддържане"}
              </p>
              {plan.description && (
                <p className="text-xs text-secondary mt-1">{plan.description}</p>
              )}
            </div>
            <Button size="sm" disabled={assigningNutrition}>
              {assigningNutrition ? "Избиране..." : "Избери"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  </DialogContent>
</Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveNutritionPlan}
                      disabled={assigningNutrition}
                      className="text-primary"
                    >
                      <X className="h-4 w-4 mr-1 text-primary" />
                      Премахни
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-secondary" />
                  <h3 className="mt-2 text-sm font-semibold">Няма избран план за хранене</h3>
                  <p className="mt-1 text-sm text-secondary">Избери план за хранене на този клиент</p>
                  <Dialog open={showNutritionAssignDialog} onOpenChange={setShowNutritionAssignDialog}>
                    <DialogTrigger asChild>
                      <Button variant="white" className="mt-4">
                        <Target className="mr-2 h-4 w-4" />
                        Избери план за хранене
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-secondary">Избери план за хранене</DialogTitle>
                        <DialogDescription className="text-secondary">Изберете план за хранене на клиента</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          {nutritionPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className="flex items-center justify-between p-3 border rounded-lg cursor-pointer"
                              onClick={() => handleAssignNutritionPlan(plan.id)}
                            >
                              <div>
                                <p className="font-medium text-secondary">{plan.title}</p>
                                <p className="text-sm text-secondary">
                                  {plan.goal === "lose"
                                    ? "Отслабване"
                                    : plan.goal === "gain"
                                      ? "Качване на тегло"
                                      : "Поддържане"}
                                </p>
                                {plan.description && (
                                  <p className="text-xs text-secondary mt-1">{plan.description}</p>
                                )}
                              </div>
                              <Button size="sm" disabled={assigningNutrition}>
                                {assigningNutrition ? "Избиране..." : "Избери"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

        {progressEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Графика на напредъка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressChart data={progressEntries} type="weight" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Прогрес на клиента</CardTitle>
            <CardDescription>
              {progressEntries.length > 0 ? `Общо ${progressEntries.length} записа` : "Няма записи за прогрес"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {progressEntries.length > 0 ? (
              <div className="space-y-4">
                {progressEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border-1 border-gray-500 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-secondary" />
                        <span className="text-sm text-secondary">
                          {new Date(entry.createdAt).toLocaleDateString("bg-BG")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Weight className="h-4 w-4 text-secondary" />
                        <span className="font-medium">{entry.weightKg} кг</span>
                      </div>
                      {!!entry.images?.length && (
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-muted text-secondary"
                          onClick={() => handleViewImages(entry.images!)}
                        >
                          <ImageIcon className="h-3 w-3 mr-1 text-secondary" />
                          {entry.images!.length} снимки
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-12 w-12 text-secondary" />
                <h3 className="mt-2 text-sm font-semibold">Няма записи за прогрес</h3>
                <p className="mt-1 text-sm text-secondary">
                  Клиентът все още не е добавил записи за своя прогрес.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Read-only viewer (no delete) */}
        {showImageViewer && (
          <ImageViewer
            isOpen={showImageViewer}
            onClose={() => setShowImageViewer(false)}
            images={selectedImages}
          />
        )}
      </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
