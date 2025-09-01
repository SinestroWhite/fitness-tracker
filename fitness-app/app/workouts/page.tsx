"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { WorkoutPlanner } from "@/components/trainer/workout-planner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, Dumbbell } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function WorkoutsPage() {
  const { user } = useAuth()

  const isTrainerOrAdmin = user?.role === "trainer" || user?.role === "admin"
  const isUser = user?.role === "user"

  // Make the default tab depend on the role (trainers/admins -> 'create', users -> 'my-workouts')
  const [activeTab, setActiveTab] = useState<string>(isTrainerOrAdmin ? "create" : "my-workouts")
  useEffect(() => {
    setActiveTab(isTrainerOrAdmin ? "create" : "my-workouts")
  }, [isTrainerOrAdmin])

  // Mock data for existing workouts
  const mockWorkouts = [
    {
      id: "1",
      name: "Тренировка за гърди и трицепс",
      difficulty: "intermediate",
      duration: 75,
      exercises: 8,
      targetMuscles: ["Гърди", "Трицепс"],
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Кардио и корем",
      difficulty: "beginner",
      duration: 45,
      exercises: 6,
      targetMuscles: ["Кардио", "Корем"],
      createdAt: "2024-01-10",
    },
  ]

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Тренировки</h1>
          <p className="text-muted-foreground">
            {isTrainerOrAdmin ? "Създавайте и управлявайте тренировъчни планове" : "Вашите тренировки и планове"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {isTrainerOrAdmin && (
              <TabsTrigger value="create">
                <Plus className="mr-2 h-4 w-4" />
                Създай тренировка
              </TabsTrigger>
            )}

            <TabsTrigger value="my-workouts">
              <Dumbbell className="mr-2 h-4 w-4" />
              Моите тренировки
            </TabsTrigger>

            {/* График — only for regular users */}
            {isUser && (
              <TabsTrigger value="schedule">
                <Calendar className="mr-2 h-4 w-4" />
                График
              </TabsTrigger>
            )}
          </TabsList>

          {isTrainerOrAdmin && (
            <TabsContent value="create">
              <WorkoutPlanner />
            </TabsContent>
          )}

          <TabsContent value="my-workouts">
            <div className="space-y-4">
              {mockWorkouts.map((workout) => (
                <Card key={workout.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{workout.name}</CardTitle>
                        <CardDescription>
                          {getDifficultyText(workout.difficulty)} • {workout.duration} мин • {workout.exercises} упражнения
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button className="cursor-pointer" variant="outline" size="sm">
                          Редактирай
                        </Button>
                        <Button className="cursor-pointer" size="sm">Започни</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {workout.targetMuscles.map((muscle) => (
                        <span
                          key={muscle}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                        >
                          {muscle}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* График — only rendered for users */}
          {isUser && (
            <TabsContent value="schedule">
              <Card>
                <CardHeader>
                  <CardTitle>Тренировъчен график</CardTitle>
                  <CardDescription>Планирайте и проследявайте вашите тренировки</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 mb-4" />
                    <p>Функционалността за график ще бъде добавена скоро</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
