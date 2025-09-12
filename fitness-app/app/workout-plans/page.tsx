
"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Eye, Target } from "lucide-react"
import { apiService, type WorkoutPlan, type WorkoutPlanListParams } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { WorkoutPlanForm } from "@/components/workout-plans/workout-plan-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


// --- Local API type (snake_case from backend) and adapter to our camelCase UI type ---
type WorkoutPlanApi = {
  id: number | string
  title: string
  goal: "lose" | "gain" | "maintain" | string
  author_id?: number
  author_name?: string
  created_at: string // ISO 8601
  updated_at?: string // ISO 8601
}

const goals = [
  { value: "lose", label: "Отслабване" },
  { value: "gain", label: "Покачване на тегло" },
  { value: "maintain", label: "Поддържане" },
]

const GOAL_VALUES = goals.map(g => g.value) as readonly string[]

const normalizeGoal = (g: unknown): string => {
  const v = String(g ?? "").trim().toLowerCase()
  return GOAL_VALUES.includes(v) ? v : ""
}

const toWorkoutPlan = (p: WorkoutPlanApi): WorkoutPlan =>
  ({
    id: String(p.id),
    title: p.title,
    goal: normalizeGoal(p.goal) as any,
    createdAt: p.created_at,
    updatedAt: p.updated_at ?? p.created_at,
    authorId: p.author_id as any,
    authorName: p.author_name as any,
  } as unknown as WorkoutPlan)

export default function WorkoutPlansPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [rawPlans, setRawPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedGoal, setSelectedGoal] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<WorkoutPlan | null>(null)
  const [deleting, setDeleting] = useState(false)


  const canManagePlans = user?.role === "trainer" || user?.role === "admin"

  // Debounce search input so we don't refetch on every keypress
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(h)
  }, [searchTerm])

  const fetchWorkoutPlans = async () => {
    try {
      setLoading(true)
      const params: WorkoutPlanListParams = {
        pageSize: 1000,
      }

      // Оставяме филтъра по цел към бекенда (ако е поддържан)
      if (selectedGoal !== "all") params.goal = selectedGoal as any

      const response = await apiService.getWorkoutPlanList(params)

      // Поддържаме и масив, и форма { data: [...] }
      const rawList: unknown = (response as any)?.data
      const items: WorkoutPlanApi[] = Array.isArray(rawList)
        ? (rawList as WorkoutPlanApi[])
        : ((rawList as any)?.data as WorkoutPlanApi[]) ?? []

      setRawPlans(items.map(toWorkoutPlan))
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на тренировъчните планове",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Фечваме при mount и когато се смени целта (търсенето е клиентско)
  useEffect(() => {
    fetchWorkoutPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGoal])


  const confirmDelete = (plan: WorkoutPlan) => {
    setPlanToDelete(plan)
    setDeleteDialogOpen(true)
  }
  
  const handleConfirmDelete = async () => {
    if (!planToDelete) return
    try {
      setDeleting(true)
      await apiService.deleteWorkoutPlan(planToDelete.id)
      toast({ title: "Успех", description: "Тренировъчният план е изтрит успешно" })
      fetchWorkoutPlans()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно изтриване на тренировъчния план",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setPlanToDelete(null)
    }
  }
  

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingPlan(null)
    fetchWorkoutPlans()
  }

  const getGoalLabel = (goal: string) => goals.find((g) => g.value === goal)?.label || goal

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case "lose":
        return "bg-red-600 text-red-50"
      case "gain":
        return "bg-green-600 text-green-50"
      case "maintain":
        return "bg-blue-600 text-blue-50"
      default:
        return "bg-gray-600 text-gray-50"
    }
  }

  // Клиентско филтриране, за да работи търсенето независимо от бекенда
  const filteredPlans = useMemo(() => {
    let list = rawPlans
    if (selectedGoal !== "all") {
      list = list.filter((p) => String(p.goal) === selectedGoal)
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        String(p.goal).toLowerCase().includes(q) ||
        ("authorName" in p && (p as any).authorName?.toLowerCase?.().includes(q))
      )
    }
    return list
  }, [rawPlans, debouncedSearch, selectedGoal])

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 ">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-secondary font-bold">Тренировъчни планове</h1>
              <p className="text-secondary">Управление на тренировъчни планове и програми</p>
            </div>
            {canManagePlans && (
              <Button variant="white" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Нов план
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative  flex-1">
              <Search className="absolute  left-3 top-1/2 transform -translate-y-1/2 text-secondary h-4 w-4" />
              <Input
                placeholder="Търси планове..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-1 text-secondary border-gray-500"
              />
            </div>
            <Select value={selectedGoal} onValueChange={setSelectedGoal}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Цел" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички цели</SelectItem>
                {goals.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    {goal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional: резултат брояч */}
          {(debouncedSearch || selectedGoal !== "all") && !loading && (
            <p className="text-sm text-secondary">Намерени: {filteredPlans.length}</p>
          )}

          {/* Workout Plans Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded mb-4"></div>
                    <div className="h-8 bg-muted rounded w-20"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <Card key={plan.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{plan.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge className={getGoalColor(plan.goal as string)}>
                            <Target className="h-3 w-3 mr-1" />
                            {getGoalLabel(plan.goal as string)}
                          </Badge>
                        </CardDescription>
                      </div>
                      {canManagePlans && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingPlan(plan)
                              setShowForm(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => confirmDelete(plan)}>
  <Trash2 className="h-4 w-4" />
</Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-secondary">
                        Създаден на {new Date((plan as any).createdAt).toLocaleDateString("bg-BG")}
                      </div>
                      <div className="flex  gap-2">
                        <Link href={`/workout-plans/${plan.id}`}>
                          <Button size="sm" variant="white" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            Детайли
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredPlans.length === 0 && (
            <div className="text-center py-12">
              <p className="text-secondary">Няма намерени тренировъчни планове</p>
            </div>
          )}
        </div>

        {/* Workout Plan Form Dialog */}
        {/* <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Редактиране на план" : "Нов тренировъчен план"}</DialogTitle>
            </DialogHeader>
            <WorkoutPlanForm
              key={editingPlan?.id ?? "new"}
              workoutPlan={editingPlan}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false)
                setEditingPlan(null)
              }}
            />
          </DialogContent>
        </Dialog> */}
        <Dialog
  open={showForm}
  onOpenChange={(open) => {
    setShowForm(open)
    if (!open) setEditingPlan(null)   // ⬅️ важно, както при exercises
  }}
>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{editingPlan ? "Редактиране на план" : "Нов тренировъчен план"}</DialogTitle>
    </DialogHeader>

    <WorkoutPlanForm
      key={editingPlan?.id ?? "new"}     // ⬅️ принудителен ремоунт при смяна
      workoutPlan={editingPlan}
      onSuccess={handleFormSuccess}
      onCancel={() => {
        setShowForm(false)
        setEditingPlan(null)
      }}
    />
  </DialogContent>
</Dialog>

<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent
    onPointerDownCapture={(e) => e.stopPropagation()}
    onKeyDownCapture={(e) => {
      if ((e as React.KeyboardEvent).key === "Escape") e.stopPropagation()
    }}
  >
    <AlertDialogHeader>
      <AlertDialogTitle>Изтриване на тренировъчен план</AlertDialogTitle>
      <AlertDialogDescription>
        Сигурни ли сте, че искате да изтриете{" "}
        <strong>{planToDelete?.title}</strong>? Това действие не може да бъде отменено.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel
        onClick={() => {
          setPlanToDelete(null)
        }}
      >
        Отказ
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirmDelete}
        className="bg-destructive text-secondary hover:bg-destructive/90"
        disabled={deleting}
      >
        {deleting ? "Изтриване..." : "Изтрий"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

      </DashboardLayout>
    </ProtectedRoute>
  )
}
