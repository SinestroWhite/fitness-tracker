"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserManagement } from "@/components/admin/user-management"
import { SystemStats } from "@/components/admin/system-stats"

export default function UsersPage() {
  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Управление на потребители</h1>
          <p className="text-muted-foreground">Администриране на всички потребители в системата</p>
        </div>

        <SystemStats />
        <UserManagement />
      </div>
    </DashboardLayout>
  )
}
