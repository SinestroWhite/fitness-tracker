"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, TrendingUp, User, Mail, Ruler, Target, Weight, ImageIcon, Dumbbell, X } from "lucide-react"
import { apiService, type UpdateUserPersonalData, type Progress, type WorkoutPlan } from "@/lib/api"
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


// 👉 планове за показване в "Смени план" (без текущия)
const switchablePlans = useMemo(() => {
  if (!currentWorkoutPlan) return workoutPlans
  const curId = String(currentWorkoutPlan.id)
  return workoutPlans.filter(p => String(p.id) !== curId)
}, [workoutPlans, currentWorkoutPlan])

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

  useEffect(() => {
    if (clientId) loadClientDetails()
      loadWorkoutPlans()
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
    <h1 className="text-2xl font-bold">{client.name}</h1>
    <p className="text-muted-foreground">Детайли за клиент</p>
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
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs text-muted-foreground">Име</Label>
                  <p className="font-medium">{client.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs text-muted-foreground">Имейл</Label>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs text-muted-foreground">Регистриран</Label>
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
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Цел</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getGoalBadgeVariant(client.personal.goal)}>
                          {getGoalText(client.personal.goal)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Височина</Label>
                      <p className="font-medium">{client.personal.height} см</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Пол</Label>
                      <p className="font-medium">
                        {client.personal.sex === "male" ? "Мъж" : client.personal.sex === "female" ? "Жена" : "Не е зададен"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Няма налични фитнес данни</p>
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
                      <Badge variant="secondary">
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
                        <Button variant="outline" size="sm">
                          Смени план
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Избери тренировъчен план</DialogTitle>
                          <DialogDescription>Изберете тренировъчен план за клиента</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid gap-2">
                          
                            {switchablePlans.map((plan) => (
  <div
    key={plan.id}
    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
    onClick={() => handleAssignWorkoutPlan(String(plan.id))}
  >
    <div>
      <p className="font-medium">{plan.title}</p>
      <p className="text-sm text-muted-foreground">
        {plan.goal === "lose" ? "Отслабване" : plan.goal === "gain" ? "Качване на тегло" : "Поддържане"}
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
                    <Button variant="outline" size="sm" onClick={handleRemoveWorkoutPlan} disabled={assigningWorkout}>
                      <X className="h-4 w-4 mr-1" />
                      Премахни
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">Няма избран тренировъчен план</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Избери тренировъчен план на този клиент</p>
                  <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                    <DialogTrigger asChild>
                      <Button className="mt-4">
                        <Dumbbell className="mr-2 h-4 w-4" />
                        Избери тренировъчен план
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Избери тренировъчен план</DialogTitle>
                        <DialogDescription>Изберете тренировъчен план на клиента</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          {workoutPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                              onClick={() => handleAssignWorkoutPlan(plan.id)}
                            >
                              <div>
                                <p className="font-medium">{plan.title}</p>
                                <p className="text-sm text-muted-foreground">
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
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString("bg-BG")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Weight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entry.weightKg} кг</span>
                      </div>
                      {entry.bodyFat != null && <Badge variant="secondary">{entry.bodyFat}% мазнини</Badge>}
                      {!!entry.images?.length && (
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleViewImages(entry.images!)}
                        >
                          <ImageIcon className="h-3 w-3 mr-1" />
                          {entry.images!.length} снимки
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Няма записи за прогрес</h3>
                <p className="mt-1 text-sm text-muted-foreground">
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
