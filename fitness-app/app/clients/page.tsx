"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ClientList } from "@/components/trainer/client-list"

export default function ClientsPage() {
  return (
    <DashboardLayout requiredRole="trainer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Моите клиенти</h1>
          <p className="text-muted-foreground">Управлявайте и проследявайте прогреса на вашите клиенти</p>
        </div>

        <ClientList />
      </div>
    </DashboardLayout>
  )
}
