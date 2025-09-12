"use client"

import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, Dumbbell, Target, Plus, Calendar } from "lucide-react"
import Link from "next/link"
import { apiService } from "@/lib/api"
import { useEffect, useState } from "react"
import { GradientStatCard } from "@/components/dashboard/gradient-stat-card"

interface DashboardStats {
  currentWeight?: string
  weightChange?: { value: number; isPositive: boolean }
  workoutsThisMonth?: number
  workoutChange?: { value: number; isPositive: boolean }
  goalProgress?: string
  goalChange?: { value: number; isPositive: boolean }
  activeClients?: number
  clientChange?: { value: number; isPositive: boolean }
  workoutsCreated?: number
  completionRate?: string
  completionChange?: { value: number; isPositive: boolean }
  totalUsers?: number
  userChange?: { value: number; isPositive: boolean }
  activeTrainers?: number
  trainerChange?: { value: number; isPositive: boolean }
  systemHealth?: string
  healthChange?: { value: number; isPositive: boolean }
    streakDays?: number
  totalCompleted?: number
  thisWeekCompleted?: number
}

interface Activity {
  id: string
  type: "progress" | "workout" | "goal"
  title: string
  description: string
  timestamp: string
  status: "completed" | "in-progress" | "missed"
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({})
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const toArray = <T,>(maybeArrayOrObj: any): T[] => {
    if (Array.isArray(maybeArrayOrObj)) return maybeArrayOrObj as T[]
    if (Array.isArray(maybeArrayOrObj?.data)) return maybeArrayOrObj.data as T[]
    return []
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      try {
        setLoading(true)

        if (user.role === "user") {
          // Fetch user-specific data
          const [progressData, personalData] = await Promise.all([
            apiService.getProgressList({ pageSize: 10, sort: "-created_at" }),
            apiService.getUserPersonal(),
          ])

          const latestProgress = progressData.data[0]
          const previousProgress = progressData.data[1]

          let weightChange = undefined
          if (latestProgress && previousProgress) {
            const change = latestProgress.weightKg - previousProgress.weightKg
            weightChange = {
              value: Math.abs(change),
              isPositive: personalData?.goal === "gain" ? change > 0 : change < 0,
            }
          }

          setStats({
            currentWeight: latestProgress ? `${latestProgress.weightKg} кг` : "Няма данни",
            weightChange,
            workoutsThisMonth: 0, // Would need workout tracking API
            workoutChange: { value: 0, isPositive: true },
            goalProgress: personalData ? "В процес" : "Не е зададена",
            goalChange: { value: 0, isPositive: true },
          })

          // Convert progress data to activities
          const progressActivities: Activity[] = progressData.data.slice(0, 5).map((progress, index) => ({
            id: progress.id,
            type: "progress" as const,
            title: "Нов запис на тегло",
            description: `Записахте тегло ${progress.weightKg} кг`,
            timestamp: new Date(progress.createdAt).toLocaleDateString("bg-BG"),
            status: "completed" as const,
          }))

          setActivities(progressActivities)
        } else if (user.role === "trainer") {

      const { clients, pagination } = await apiService.getTrainerClients()
      const totalClients = pagination?.total ?? clients.length
    
      setStats({
        activeClients: totalClients,
        clientChange: { value: 0, isPositive: true },
        workoutsCreated: 0,
        workoutChange: { value: 0, isPositive: true },
        completionRate: "0%",
        completionChange: { value: 0, isPositive: true },
      })
    
      const clientActivities: Activity[] = clients.slice(0, 3).map((client: any) => ({
        id: String(client.id ?? crypto.randomUUID()),
        type: "goal",
        title: "Клиент",
        description: `${client.name ?? "Без име"} - ${client.email ?? "няма email"}`,
        timestamp: "активен",
        status: "in-progress",
      }))
    
      setActivities([
        {
          id: "trainer-summary",
          type: "goal",
          title: "Управление на клиенти",
          description: `Имате ${totalClients} активни клиенти`,
          timestamp: "днес",
          status: "in-progress",
        },
        ...clientActivities,
      ])
    } else if (user.role === "admin") {
      const [allUsers, trainers] = await Promise.all([
              apiService.getUserList({ pageSize: 1000 }),
              apiService.getUserList({ role: "trainer", pageSize: 100 }),
            ]);
  
            setStats({
              totalUsers: allUsers.pagination.total,
              userChange: { value: 0, isPositive: true }, // Would need historical data
              activeTrainers: trainers.pagination.total,
              trainerChange: { value: 0, isPositive: true },
              systemHealth: "99.8%", // Would need system monitoring
              healthChange: { value: 0.2, isPositive: true },
            })
  
            setActivities([
              {
                id: "1",
                type: "goal",
                title: "Системна статистика",
                description: `${allUsers.pagination.total} потребители, ${trainers.pagination.total} треньори`,
                timestamp: "днес",
                status: "completed",
              },
            ])
          }
    
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    setActivities([])
  } finally {
    setLoading(false)
  }
    }

    fetchDashboardData()
  }, [user])

  if (!user) return null

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Добре дошли, {user.name}!</h1>
            <p className="text-muted-foreground">Зареждане на данни...</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const renderUserDashboard = () => (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <GradientStatCard
          title="Текущо тегло"
          value={stats.currentWeight || "Няма данни"}
          icon={TrendingUp}
          trend={stats.weightChange}
        />
        <GradientStatCard
          title="Тренировки този месец"
          value={stats.workoutsThisMonth || 0}
          icon={Dumbbell}
          trend={stats.workoutChange}
        />
        <GradientStatCard
          title="Прогрес към целта"
          value={stats.goalProgress || "Не е зададена"}
          icon={Target}
          trend={stats.goalChange}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RecentActivity activities={activities} />
        <Card>
          <CardHeader>
            <CardTitle className="text-secondary">Бързи действия</CardTitle>
            <CardDescription >Често използвани функции</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="new" asChild>
              <Link href="/progress">
                <Plus className="mr-2 h-4 w-4" />
                Добави прогрес
              </Link>
            </Button>
            <Button variant="new" asChild >
              <Link className="text-secondary" href="/profile">
                <Target className="mr-2 h-4 w-4 text-secondary" />
                Обнови цели
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )

  const renderTrainerDashboard = () => (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Активни клиенти" value={stats.activeClients || 0} icon={Users} trend={stats.clientChange} />
        <StatsCard
          title="Създадени тренировки"
          value={stats.workoutsCreated || 0}
          icon={Dumbbell}
          trend={stats.workoutChange}
        />
        <StatsCard
          title="Процент завършване"
          value={stats.completionRate || "0%"}
          icon={Target}
          trend={stats.completionChange}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RecentActivity activities={activities} />
        <Card>
          <CardHeader>
            <CardTitle>Треньорски инструменти</CardTitle>
            <CardDescription>Управление на клиенти и тренировки</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="new" asChild className="w-full cursor-pointer justify-start">
              <Link href="/clients">
                <Users className="mr-2 h-4 w-4" />
                Управление на клиенти
              </Link>
            </Button>
            <Button variant="new" asChild  className="w-full cursor-pointer justify-start bg-transparent">
              <Link href="/workouts">
                <Plus className="mr-2 h-4 w-4" />
                Създай тренировка
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )

  const renderAdminDashboard = () => (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Общо потребители" value={stats.totalUsers || 0} icon={Users} trend={stats.userChange} />
        <StatsCard
          title="Активни треньори"
          value={stats.activeTrainers || 0}
          icon={Dumbbell}
          trend={stats.trainerChange}
        />
        <StatsCard
          title="Здраве на системата"
          value={stats.systemHealth || "Няма данни"}
          icon={Target}
          trend={stats.healthChange}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RecentActivity activities={activities} />
        <Card>
          <CardHeader>
            <CardTitle>Администрация</CardTitle>
            <CardDescription>Системно управление</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="new">
              <Link href="/users">
                <Users className="mr-2 h-4 w-4" />
                Управление на потребители
              </Link>
            </Button>
            <Button variant="new" asChild >
              <Link href="/settings">
                <Target className="mr-2 h-4 w-4" />
                Системни настройки
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Добре дошли, {user.name}! 👋</h1>
          <p className="text-secondary">Ето преглед на вашата активност и прогрес</p>
        </div>

        {user.role === "user" && renderUserDashboard()}
        {user.role === "trainer" && renderTrainerDashboard()}
        {user.role === "admin" && renderAdminDashboard()}
      </div>
    </DashboardLayout>
  )
}
