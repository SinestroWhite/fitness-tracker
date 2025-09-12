import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Activity {
  id: string
  type: "progress" | "workout" | "goal"
  title: string
  description: string
  timestamp: string
  status?: "completed" | "in-progress" | "missed"
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-300 text-green-800"
      case "in-progress":
        return "bg-blue-300 text-blue-800"
      case "missed":
        return "bg-red-300 text-red-800"
      default:
        return "bg-gray-300 text-gray-800"
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case "completed":
        return "Завършено"
      case "in-progress":
        return "В процес"
      case "missed":
        return "Пропуснато"
      default:
        return ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-secondary">Последна активност</CardTitle>
        <CardDescription>Вашите последни действия и прогрес</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-secondary text-center py-4">Няма записана активност</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-secondary">{activity.title}</p>
                    {activity.status && (
                      <Badge variant="secondary" className={getStatusColor(activity.status)}>
                        {getStatusText(activity.status)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-secondary">{activity.description}</p>
                  <p className="text-xs text-secondary">{activity.timestamp}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
