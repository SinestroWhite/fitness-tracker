import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card className="bg-transperant backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-secondary">{title}</CardTitle>
        <Icon className="h-4 w-4 text-secondary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl text-secondary font-bold">{value}</div>
        {description && <p className="text-xs mt-1 text-secondary">{description}</p>}
        {trend && (
          <p className={`text-xs mt-1 ${trend.isPositive ? "text-green-300" : "text-red-600"}`}>
            {trend.isPositive ? "+" : ""}
            {trend.value}% от миналия месец
          </p>
        )}
      </CardContent>
    </Card>
  )
}