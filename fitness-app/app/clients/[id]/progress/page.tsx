"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, TrendingUp, Weight, ImageIcon } from "lucide-react"
import { apiService, type Progress } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ProgressChart } from "@/components/progress/progress-chart"
import { ImageViewer } from "@/components/progress/image-viewer"

export default function ClientProgressPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const [progressEntries, setProgressEntries] = useState<Progress[]>([])
  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState<string>("")
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [showImageViewer, setShowImageViewer] = useState(false)
  const { toast } = useToast()

  const loadClientProgress = async () => {
    try {
      setLoading(true)

      const clientInfo = await apiService.getTrainerClient(clientId)
      setClientName(clientInfo.client.name)

      const progressData = await apiService.getProgress(clientId)
      
      if(progressData){
        setProgressEntries(progressData)
      }

    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на прогреса на клиента",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clientId) {
      loadClientProgress()
    }
  }, [clientId])

  const handleViewImages = (images: string[]) => {
    setSelectedImages(images)
    setShowImageViewer(true)
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="trainer">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="trainer">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push(`/clients/${clientId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад към клиент
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Прогрес на {clientName}</h1>
            <p className="text-primary">Преглед на напредъка на клиента</p>
          </div>
        </div>

        {progressEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Графика на напредъка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressChart data={progressEntries} type="weight" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>История на записите</CardTitle>
            <CardDescription>
              {progressEntries.length > 0 ? `Общо ${progressEntries.length} записа` : "Няма записи за прогрес"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {progressEntries.length > 0 ? (
              <div className="space-y-4">
                {progressEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString("bg-BG")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Weight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entry.weightKg} кг</span>
                      </div>
                      {entry.bodyFat && <Badge variant="secondary">{entry.bodyFat}% мазнини</Badge>}
                      {entry.images && entry.images.length > 0 && (
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleViewImages(entry.images || [])}
                        >
                          <ImageIcon className="h-3 w-3 mr-1 text-secondary" />
                          {entry.images.length} снимки
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Няма записи за прогрес</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Клиентът все още не е добавил записи за своя прогрес.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {showImageViewer && (
          <ImageViewer
            isOpen={showImageViewer}
            onClose={() => setShowImageViewer(false)}
            images={selectedImages}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
