"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Users, Check, ArrowLeft, User as UserIcon } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { apiService, type User } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function SelectTrainerPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [trainers, setTrainers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState("")

  // NEW: текущо избраният треньор (ако има)
  const [currentTrainer, setCurrentTrainer] = useState<User | null>(null)
  const [loadingCurrentTrainer, setLoadingCurrentTrainer] = useState(true)

  // Ползвай един и същ state, за да маркираме картата като избрана
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null)

  useEffect(() => {
    // Зареждаме паралелно списъка и текущия треньор
    void Promise.all([loadTrainers(), loadCurrentTrainer()])
  }, [])

  const loadTrainers = async () => {
    try {
      setLoading(true)
      const response = await apiService.getTrainers({ pageSize: 100 })
      setTrainers(response.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Грешка при зареждане на треньорите")
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentTrainer = async () => {
    try {
      setLoadingCurrentTrainer(true)
      const raw = await apiService.getCurrentTrainer()
      const data = raw && (raw as any).trainer ? (raw as any).trainer : raw

      if (data) {
        const normalized = {
          ...(data as any),
          id: String((data as any).id),
          createdAt: (data as any).createdAt ?? (data as any).created_at,
        } as unknown as User

        setCurrentTrainer(normalized)
        setSelectedTrainer(String((data as any).id))
      } else {
        setCurrentTrainer(null)
        setSelectedTrainer(null)
      }
    } catch (error) {
      toast({
        title: "Грешка",
        description: error instanceof Error ? error.message : "Грешка при зареждане на текущия треньор",
        variant: "destructive",
      })
      setCurrentTrainer(null)
    } finally {
      setLoadingCurrentTrainer(false)
    }
  }

  const handleSelectTrainer = async (trainerId: string) => {
    try {
      setSelecting(trainerId)
      await apiService.selectTrainer(trainerId)
      setSelectedTrainer(trainerId)
      // Ако имаме данните в списъка – обновяваме currentTrainer локално
      const justSelected = trainers.find((t) => String(t.id) === trainerId) || null
      setCurrentTrainer(justSelected)

      toast({
        title: "Успех",
        description: "Треньорът е избран успешно",
      })
    } catch (error) {
      toast({
        title: "Грешка",
        description: error instanceof Error ? error.message : "Грешка при избор на треньор",
        variant: "destructive",
      })
    } finally {
      setSelecting(null)
    }
  }

  if (!user || user.role !== "user") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert>
            <AlertDescription>Тази страница е достъпна само за потребители.</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          
          <div>
            <h1 className="text-3xl font-bold">Избор на треньор</h1>
            <p className="text-muted-foreground">Изберете треньор, който да ви помогне с вашите фитнес цели</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Зареждане на треньорите...</p>
            </div>
          </div>
        ) : trainers.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Няма налични треньори</h3>
                <p className="text-muted-foreground">В момента няма регистрирани треньори в системата.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => (
              <Card
                key={trainer.id}
                className={`transition-all hover:shadow-md ${selectedTrainer === String(trainer.id) ? "ring-2 ring-primary" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{trainer.name}</CardTitle>
                      <CardDescription>{trainer.email}</CardDescription>
                    </div>
                    {selectedTrainer === String(trainer.id) && <Check className="h-5 w-5 text-primary" />}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* <div className="text-sm text-muted-foreground">
                      <p>Треньор от: {new Date(trainer.created_at).toLocaleDateString("bg-BG")}</p>
                    </div> */}

                    <Button
                      onClick={() => handleSelectTrainer(String(trainer.id))}
                      disabled={selecting === String(trainer.id) || selectedTrainer === String(trainer.id)}
                      className="w-full cursor-pointer"
                      variant={selectedTrainer === String(trainer.id) ? "secondary" : "default"}
                    >
                      {selecting === String(trainer.id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Избиране...
                        </>
                      ) : selectedTrainer === String(trainer.id) ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Избран
                        </>
                      ) : (
                        "Избери треньор"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
