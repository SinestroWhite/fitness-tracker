"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { SystemStats } from "@/components/admin/system-stats"
import { UserManagement } from "@/components/admin/user-management"

export default function UsersPage() {
  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl text-secondary font-bold">Управление на потребители</h1>
          <p className="text-secondary">Администриране на всички потребители в системата</p>
        </div>

        <SystemStats />
        <UserManagement />
      </div>
    </DashboardLayout>
  )
}
