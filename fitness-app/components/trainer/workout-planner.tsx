"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, Clock, Target, Dumbbell } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  weight?: string
  duration?: string
  notes?: string
}

interface WorkoutPlan {
  name: string
  description: string
  difficulty: "beginner" | "intermediate" | "advanced"
  duration: number
  exercises: Exercise[]
  targetMuscles: string[]
}

export function WorkoutPlanner() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan>({
    name: "",
    description: "",
    difficulty: "beginner",
    duration: 60,
    exercises: [],
    targetMuscles: [],
  })
  const [newExercise, setNewExercise] = useState<Omit<Exercise, "id">>({
    name: "",
    sets: 3,
    reps: "10-12",
    weight: "",
    duration: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const muscleGroups = ["Гърди", "Гръб", "Рамене", "Бицепс", "Трицепс", "Крака", "Корем", "Кардио"]

  const addExercise = () => {
    if (!newExercise.name.trim()) {
      setError("Името на упражнението е задължително")
      return
    }

    const exercise: Exercise = {
      ...newExercise,
      id: Date.now().toString(),
    }

    setWorkoutPlan({
      ...workoutPlan,
      exercises: [...workoutPlan.exercises, exercise],
    })

    setNewExercise({
      name: "",
      sets: 3,
      reps: "10-12",
      weight: "",
      duration: "",
      notes: "",
    })
    setError("")
  }

  const removeExercise = (id: string) => {
    setWorkoutPlan({
      ...workoutPlan,
      exercises: workoutPlan.exercises.filter((ex) => ex.id !== id),
    })
  }

  const toggleMuscleGroup = (muscle: string) => {
    const isSelected = workoutPlan.targetMuscles.includes(muscle)
    if (isSelected) {
      setWorkoutPlan({
        ...workoutPlan,
        targetMuscles: workoutPlan.targetMuscles.filter((m) => m !== muscle),
      })
    } else {
      setWorkoutPlan({
        ...workoutPlan,
        targetMuscles: [...workoutPlan.targetMuscles, muscle],
      })
    }
  }

  const saveWorkoutPlan = async () => {
    setError("")
    setLoading(true)

    try {
      if (!workoutPlan.name.trim()) {
        throw new Error("Името на тренировката е задължително")
      }

      if (workoutPlan.exercises.length === 0) {
        throw new Error("Добавете поне едно упражнение")
      }

      // Here you would typically save to your backend
      // await apiService.createWorkoutPlan(workoutPlan)

      toast({
        title: "Успех",
        description: "Тренировката е създадена успешно",
      })

      // Reset form
      setWorkoutPlan({
        name: "",
        description: "",
        difficulty: "beginner",
        duration: 60,
        exercises: [],
        targetMuscles: [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при създаване на тренировката")
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "Начинаещ"
      case "intermediate":
        return "Средно ниво"
      case "advanced":
        return "Напреднал"
      default:
        return difficulty
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Workout Plan Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Dumbbell className="mr-2 h-4 w-4" />
            Детайли на тренировката
          </CardTitle>
          <CardDescription>Основна информация за тренировъчния план</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workoutName">Име на тренировката *</Label>
              <Input
                id="workoutName"
                placeholder="Например: Тренировка за гърди и трицепс"
                value={workoutPlan.name}
                onChange={(e) => setWorkoutPlan({ ...workoutPlan, name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Продължителност (минути)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="180"
                value={workoutPlan.duration}
                onChange={(e) => setWorkoutPlan({ ...workoutPlan, duration: Number.parseInt(e.target.value) || 60 })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              placeholder="Кратко описание на тренировката..."
              value={workoutPlan.description}
              onChange={(e) => setWorkoutPlan({ ...workoutPlan, description: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Ниво на трудност</Label>
            <Select
              value={workoutPlan.difficulty}
              onValueChange={(value: "beginner" | "intermediate" | "advanced") =>
                setWorkoutPlan({ ...workoutPlan, difficulty: value })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Начинаещ</SelectItem>
                <SelectItem value="intermediate">Средно ниво</SelectItem>
                <SelectItem value="advanced">Напреднал</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Целеви мускулни групи</Label>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((muscle) => (
                <Badge
                  key={muscle}
                  variant={workoutPlan.targetMuscles.includes(muscle) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleMuscleGroup(muscle)}
                >
                  {muscle}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Exercise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Добави упражнение
          </CardTitle>
          <CardDescription>Добавете упражнения към тренировъчния план</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="exerciseName">Име на упражнението *</Label>
              <Input
                id="exerciseName"
                placeholder="Например: Лежанка с щанга"
                value={newExercise.name}
                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sets">Серии</Label>
              <Input
                id="sets"
                type="number"
                min="1"
                max="10"
                value={newExercise.sets}
                onChange={(e) => setNewExercise({ ...newExercise, sets: Number.parseInt(e.target.value) || 3 })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reps">Повторения</Label>
              <Input
                id="reps"
                placeholder="10-12 или 30 сек"
                value={newExercise.reps}
                onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Тегло (по избор)</Label>
              <Input
                id="weight"
                placeholder="20 кг"
                value={newExercise.weight}
                onChange={(e) => setNewExercise({ ...newExercise, weight: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Продължителност (по избор)</Label>
              <Input
                id="duration"
                placeholder="30 сек"
                value={newExercise.duration}
                onChange={(e) => setNewExercise({ ...newExercise, duration: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Бележки (по избор)</Label>
              <Input
                id="notes"
                placeholder="Допълнителни инструкции"
                value={newExercise.notes}
                onChange={(e) => setNewExercise({ ...newExercise, notes: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <Button className="cursor-pointer" onClick={addExercise} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            Добави упражнение
          </Button>
        </CardContent>
      </Card>

      {/* Exercise List */}
      {workoutPlan.exercises.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Упражнения ({workoutPlan.exercises.length})
            </CardTitle>
            <CardDescription>Преглед на добавените упражнения</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workoutPlan.exercises.map((exercise, index) => (
                <div key={exercise.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                        {index + 1}
                      </span>
                      <h4 className="font-medium">{exercise.name}</h4>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span>{exercise.sets} серии</span>
                      <span>{exercise.reps} повторения</span>
                      {exercise.weight && <span>{exercise.weight}</span>}
                      {exercise.duration && <span>{exercise.duration}</span>}
                    </div>
                    {exercise.notes && <p className="text-xs text-muted-foreground mt-1">{exercise.notes}</p>}
                  </div>
                  <Button className="cursor-pointer" variant="outline" size="sm" onClick={() => removeExercise(exercise.id)} disabled={loading}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout Summary */}
      {(workoutPlan.name || workoutPlan.exercises.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Обобщение на тренировката
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-xs text-muted-foreground">Име</Label>
                <p className="font-medium">{workoutPlan.name || "Без име"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ниво</Label>
                <Badge className={getDifficultyColor(workoutPlan.difficulty)}>
                  {getDifficultyText(workoutPlan.difficulty)}
                </Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Продължителност</Label>
                <p className="font-medium">{workoutPlan.duration} минути</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Упражнения</Label>
                <p className="font-medium">{workoutPlan.exercises.length}</p>
              </div>
            </div>

            {workoutPlan.targetMuscles.length > 0 && (
              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Целеви мускули</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {workoutPlan.targetMuscles.map((muscle) => (
                    <Badge key={muscle} variant="secondary" className="text-xs">
                      {muscle}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={saveWorkoutPlan} disabled={loading} className="w-full cursor-pointer mt-4">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary mr-2"></div>
                  Запазване...
                </>
              ) : (
                <>
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Запази тренировката
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
