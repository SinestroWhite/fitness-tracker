
"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Users, Check, ArrowLeft, User as UserIcon, Eye, MessageSquare } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { apiService, type User } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ReviewList } from "@/components/reviews/review-list"
import { ReviewForm } from "@/components/reviews/review-form"
import { StarRating } from "@/components/reviews/star-rating"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  } from "@/components/ui/dialog";

interface TrainerWithReviews extends User {
  averageRating?: number
  reviewCount?: number
}

// 1) Авторът на ревюто спрямо auth user.id
function isReviewByUser(r: any, uid: string | number): boolean {
  const author =
    r?.user_id ?? r?.userId ?? r?.user?.id ??
    r?.author_id ?? r?.authorId ?? r?.author?.id ?? null
  return author != null && String(author) === String(uid)
}

// Помощни функции – същата идея като в ReviewList
function normalizeDateString(v: any) {
  if (!v) return undefined
  const s = String(v)
  return s.includes("T") ? s : s.replace(" ", "T")
}

type MinimalReview = { rating: number; createdAt?: string; updatedAt?: string }

function mapOneReview(r: any): MinimalReview {
  return {
    rating: Number(r?.rating ?? 0),
    createdAt: normalizeDateString(r?.createdAt ?? r?.created_at ?? r?.created),
    updatedAt: normalizeDateString(r?.updatedAt ?? r?.updated_at ?? r?.updated),
  }
}

/** Нормализира { reviews, pagination, stats } + fallbacks към други формати */
function normalizeReviewsResponse(res: any) {
  if (res && Array.isArray(res.reviews)) {
    const data = res.reviews.map(mapOneReview)
    const page = Number(res?.pagination?.page) || 1
    const pageSize = Number(res?.pagination?.limit ?? res?.pagination?.pageSize) || data.length || 10
    const total = Number(res?.pagination?.total) || data.length || 0
    const stats = res?.stats ?? null
    return { data, page, pageSize, total, stats }
  }

  // Fallback-и
  const raw: any[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res)
        ? res
        : []
  const data = raw.map(mapOneReview)
  const meta = res?.meta ?? res ?? {}
  const page = Number.isFinite(meta.page) ? Number(meta.page) : 1
  const pageSize = Number.isFinite(meta.pageSize) ? Number(meta.pageSize) : (data.length || 10)
  const total = Number.isFinite(meta.total) ? Number(meta.total) : (data.length || 0)
  const stats = res?.stats ?? null
  return { data, page, pageSize, total, stats }
}

// точно под normalize* функциите
function extractReviewsArray(res: any): any[] {
  if (Array.isArray(res?.reviews)) return res.reviews
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.items)) return res.items
  if (Array.isArray(res)) return res
  return []
}


export default function SelectTrainerPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [trainers, setTrainers] = useState<TrainerWithReviews[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState("")

  // NEW: текущо избраният треньор (ако има)
  const [currentTrainer, setCurrentTrainer] = useState<User | null>(null)
  const [loadingCurrentTrainer, setLoadingCurrentTrainer] = useState(true)

  // Ползвай един и същ state, за да маркираме картата като избрана
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null)

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedTrainerForReview, setSelectedTrainerForReview] = useState<string | null>(null)
  const [submittingReview, setSubmittingReview] = useState(false)

  // най-горе при другите useState
const [alreadyReviewedDialogOpen, setAlreadyReviewedDialogOpen] = useState(false)
const [alreadyReviewedTrainerName, setAlreadyReviewedTrainerName] = useState<string | null>(null)


  useEffect(() => {
    // Зареждаме паралелно списъка и текущия треньор
    void Promise.all([loadTrainers(), loadCurrentTrainer()])
  }, [])


  const loadTrainers = async () => {
    try {
      setLoading(true)
      const response = await apiService.getTrainers({ pageSize: 100 })
  
      const trainersWithReviews = await Promise.all(
        response.data.map(async (trainer) => {
          try {
            // Взимаме 10 ревюта за страница (само за fallback), но основно ползваме stats
            const res = await apiService.getTrainerReviews(trainer.id, {
              page: 1,
              pageSize: 10,
              sort: "createdAt:desc",
            })
  
            const { data, total, stats } = normalizeReviewsResponse(res)
  
            const avgFromStats =
              typeof stats?.average_rating === "number" ? stats.average_rating : null
  
              const avgFromPage =
              data.length > 0
                ? data.reduce((sum: number, r: MinimalReview) => sum + (Number(r.rating) || 0), 0) / data.length
                : 0
            
  
            const reviewCount =
              typeof stats?.total_reviews === "number" ? stats.total_reviews : total
  
            return {
              ...trainer,
              averageRating: avgFromStats ?? avgFromPage ?? 0,
              reviewCount,
            }
          } catch {
            return {
              ...trainer,
              averageRating: 0,
              reviewCount: 0,
            }
          }
        }),
      )
  
      setTrainers(trainersWithReviews)
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

  const handleSubmitReview = async (reviewData: any) => {
    if (!selectedTrainerForReview) return

    try {
      setSubmittingReview(true)
      await apiService.createTrainerReview(selectedTrainerForReview, reviewData)

      toast({
        title: "Успех",
        description: "Ревюто е публикувано успешно",
      })

      setReviewDialogOpen(false)
      setSelectedTrainerForReview(null)

      loadTrainers()
    } catch (error) {
      toast({
        title: "Грешка",
        description: error instanceof Error ? error.message : "Грешка при публикуване на ревюто",
        variant: "destructive",
      })
    } finally {
      setSubmittingReview(false)
    }
  }

  const openReviewDialog = async (trainerId: string) => {
    try {
      if (!user?.id) {
        // Няма логнат user – дозволяваме форма (или редирект към логин, ако решиш)
        setSelectedTrainerForReview(trainerId)
        setReviewDialogOpen(true)
        return
      }
  
      // 1) Първа страница – за да вземем pagination + бърза проверка
      const first = await apiService.getTrainerReviews(trainerId, {
        page: 1,
        pageSize: 20, // можеш да увеличиш при нужда
        sort: "createdAt:desc",
      })
  
      const { pageSize, total } = normalizeReviewsResponse(first)
      const hasMineOnFirstPage = extractReviewsArray(first).some((r) =>
        isReviewByUser(r, user.id),
      )
  
      if (hasMineOnFirstPage) {
        setAlreadyReviewedTrainerName(
          trainers.find((t) => String(t.id) === String(trainerId))?.name ?? null,
        )
        setAlreadyReviewedDialogOpen(true)
        return
      }
  
      // 2) Ако има още страници – обхождаме, докато намерим мое ревю или свършат
      const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 20)))
      let alreadyReviewed = false
  
      for (let p = 2; p <= totalPages; p++) {
        const res = await apiService.getTrainerReviews(trainerId, {
          page: p,
          pageSize,
          sort: "createdAt:desc",
        })
        const pageHasMine = extractReviewsArray(res).some((r) =>
          isReviewByUser(r, user.id),
        )
        if (pageHasMine) {
          alreadyReviewed = true
          break
        }
      }
  
      if (alreadyReviewed) {
        setAlreadyReviewedTrainerName(
          trainers.find((t) => String(t.id) === String(trainerId))?.name ?? null,
        )
        setAlreadyReviewedDialogOpen(true)
        return
      }
  
      // 3) Нямам свое ревю – показваме формата
      setSelectedTrainerForReview(trainerId)
      setReviewDialogOpen(true)
    } catch {
      // При грешка не блокираме UX – позволяваме писане на ревю
      setSelectedTrainerForReview(trainerId)
      setReviewDialogOpen(true)
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
            <h1 className="text-3xl font-bold text-secondary">Избор на треньор</h1>
            <p className="text-secondary">
              {selectedTrainer
                ? "Изберете нов треньор или запазете текущия"
                : "Изберете треньор, който да ви помогне с вашите фитнес цели"}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading || loadingCurrentTrainer ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-primary">Зареждане на треньорите...</p>
            </div>
          </div>
        ) : trainers.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Няма налични треньори</h3>
                <p className="text-primary">
                  В момента няма регистрирани треньори в системата.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => {
              const isSelected = String(selectedTrainer ?? "") === String(trainer.id);
              const isSelecting = String(selecting ?? "") === String(trainer.id);
              const createdRaw = trainer.created_at ?? trainer.created_at;
              const created = createdRaw
                ? new Date(String(createdRaw)).toLocaleDateString("bg-BG")
                : null;

              return (
                <Card
                  key={trainer.id}
                  className={`transition-all hover:shadow-md ${
                    isSelected ? "ring-2 ring-primary bg-transparent border-1 border-gray-500" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {trainer.name}
                          {isSelected && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                              Избран
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>{trainer.email}</CardDescription>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* --- Рейтинг и брой ревюта --- */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <StarRating rating={trainer.averageRating || 0} size="sm" />
                          <span className="text-primary">
                            {trainer.averageRating ? Number(trainer.averageRating).toFixed(1) : "0.0"}
                          </span>
                        </div>
                        <span className="text-primary">
                          {trainer.reviewCount || 0} {trainer.reviewCount === 1 ? "ревю" : "ревюта"}
                        </span>
                      </div>

                      {/* --- Дата на присъединяване (по избор) --- */}
                      {created && (
                        <div className="text-sm text-primary">
                          <p>Треньор от: {created}</p>
                        </div>
                      )}

                      {/* --- Бутони за ревюта --- */}
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 bg-transparent border-1 border-gray-500">
                              <Eye className="h-4 w-4 mr-2" />
                              Ревюта
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Ревюта за {trainer.name}</DialogTitle>
                            </DialogHeader>
                            <ReviewList trainerId={trainer.id} />
                          </DialogContent>
                        </Dialog>

                        {isSelected && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReviewDialog(trainer.id)}
                            className="flex-1 text-primary"
                          >
                            <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                            Ревю
                          </Button>
                        )}
                      </div>

                      {/* --- Бутон за избор на треньор --- */}
                      <Button
                        onClick={() => handleSelectTrainer(trainer.id)}
                        disabled={isSelecting || isSelected}
                        className="w-full"
                      >
                        {isSelecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Избиране...
                          </>
                        ) : isSelected ? (
                          <>
                            <Check className="mr-2 h-4 w-4 " />
                            Текущ треньор
                          </>
                        ) : (
                          "Избери треньор"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* --- POPUP: вече имате ревю --- */}
<Dialog open={alreadyReviewedDialogOpen} onOpenChange={setAlreadyReviewedDialogOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Вече имате оставено ревю</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-secondary">
      Вече сте оставили ревю за {alreadyReviewedTrainerName ?? "този треньор"}.
    </p>
    <div className="flex justify-end gap-2 pt-4">
      <Button variant="outline" onClick={() => setAlreadyReviewedDialogOpen(false)}>
        Затвори
      </Button>
      {/* По желание: бутон „Виж ревюта“ */}
      {/* <Button onClick={() => { setAlreadyReviewedDialogOpen(false); /* отвори диалога с ReviewList ако искаш */ /* }}>
        Виж ревютата
      </Button> */}
    </div>
  </DialogContent>
</Dialog>


        {/* --- Глобален диалог за писане на ревю --- */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Напишете ревю за {
                  trainers.find((t) => String(t.id) === String(selectedTrainerForReview))?.name
                }
              </DialogTitle>
            </DialogHeader>
            {selectedTrainerForReview && (
              <ReviewForm onSubmit={handleSubmitReview} isLoading={submittingReview} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

