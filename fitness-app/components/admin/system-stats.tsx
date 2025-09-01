"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Shield, TrendingUp } from "lucide-react"
import { apiService } from "@/lib/api"

interface SystemStats {
  totalUsers: number
  totalTrainers: number
  totalAdmins: number
  recentUsers: number
}

export function SystemStats() {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalTrainers: 0,
    totalAdmins: 0,
    recentUsers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)

        // Load users by role
        const [usersResult, trainersResult, adminsResult] = await Promise.all([
          apiService.getUserList({ role: "user", pageSize: 1000 }),
          apiService.getUserList({ role: "trainer", pageSize: 1000 }),
          apiService.getUserList({ role: "admin", pageSize: 1000 }),
        ])

        // Calculate recent users (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const allUsers = [...usersResult.users, ...trainersResult.users, ...adminsResult.users]
        const recentUsers = allUsers.filter((user) => new Date(user.created_at) > thirtyDaysAgo).length

        setStats({
          totalUsers: usersResult.pagination.total,
          totalTrainers: trainersResult.pagination.total,
          totalAdmins: adminsResult.pagination.total,
          recentUsers,
        })
      } catch (error) {
        console.error("Error loading system stats:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Общо потребители</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">Активни потребители</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Треньори</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTrainers}</div>
          <p className="text-xs text-muted-foreground">Регистрирани треньори</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Администратори</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAdmins}</div>
          <p className="text-xs text-muted-foreground">Системни администратори</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Нови потребители</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.recentUsers}</div>
          <p className="text-xs text-muted-foreground">Последните 30 дни</p>
        </CardContent>
      </Card>
    </div>
  )
}
