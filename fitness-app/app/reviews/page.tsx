"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Star, TrendingUp, MessageSquare, Filter } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { apiService, type Review } from "@/lib/api"
import { ReviewCard } from "@/components/reviews/review-card"
import { StarRating } from "@/components/reviews/star-rating"

/* -------------------- helpers -------------------- */
function normalizeDateString(v: any) {
  if (!v) return undefined
  const s = String(v)
  return s.includes("T") ? s : s.replace(" ", "T") // Safari fix
}

function mapOneReview(r: any): Review {
  return {
    ...r,
    id: r.id,
    rating: Number(r.rating),
    text: r.text ?? "",
    images: Array.isArray(r.images) ? r.images : [],
    createdAt: normalizeDateString(r.createdAt ?? r.created_at ?? r.created),
    updatedAt: normalizeDateString(r.updatedAt ?? r.updated_at ?? r.updated),
    name: r.name ?? r.user?.name,
    email: r.email ?? r.user?.email,
  }
}

interface ReviewStats {
  totalReviews: number
  averageRating: number
  ratingDistribution: { [key: number]: number }
  recentReviews: number
}

function fillDistribution(dist: Record<number, number>): Record<number, number> {
  const out: Record<number, number> = { ...dist }
  for (let k = 1 as 1 | 2 | 3 | 4 | 5; k <= 5; k++) out[k] = out[k] || 0
  return out
}
function calcAverage(revs: Review[]) {
  if (!revs?.length) return 0
  return revs.reduce((s, r) => s + (Number(r.rating) || 0), 0) / revs.length
}
function calcDistribution(revs: Review[]) {
  const dist: Record<number, number> = {}
  for (const r of revs) {
    const k = Number(r.rating) || 0
    if (k >= 1 && k <= 5) dist[k] = (dist[k] || 0) + 1
  }
  return fillDistribution(dist)
}
function calcRecent30d(revs: Review[]) {
  const now = Date.now()
  const THIRTY_D = 30 * 24 * 60 * 60 * 1000
  return revs.filter((r) => {
    const t = r.createdAt ? new Date(r.createdAt).getTime() : NaN
    return Number.isFinite(t) && now - t <= THIRTY_D
  }).length
}

type NormalizedResponse = {
  data: Review[]
  page: number
  pageSize: number
  total: number
}
function normalizeReviewsResponse(res: any): NormalizedResponse {
  if (res && Array.isArray(res.reviews)) {
    const data = res.reviews.map(mapOneReview)
    const page = Number(res?.pagination?.page) || 1
    const pageSize = Number(res?.pagination?.limit ?? res?.pagination?.pageSize) || data.length || 10
    const total = Number(res?.pagination?.total)
    return { data, page, pageSize, total: Number.isFinite(total) ? total : data.length }
  }
  const raw: any[] = Array.isArray(res?.data) ? res.data
    : Array.isArray(res?.items) ? res.items
    : Array.isArray(res) ? res : []
  const data = raw.map(mapOneReview)
  const meta = res?.meta ?? res ?? {}
  const page = Number.isFinite(meta.page) ? Number(meta.page) : 1
  const pageSize = Number.isFinite(meta.pageSize) ? Number(meta.pageSize) : data.length || 10
  const total = Number.isFinite(meta.total) ? Number(meta.total) : data.length || 0
  return { data, page, pageSize, total }
}

/* -------------------- component -------------------- */
export default function ReviewsManagementPage() {
  const { user } = useAuth()

  // държим целия набор от ревюта
  const [allReviews, setAllReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    recentReviews: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // клиентски филтри + пагинация
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    sort: "createdAt:desc" as "createdAt:desc" | "createdAt:asc" | "rating:desc" | "rating:asc",
    ratingEq: undefined as 1 | 2 | 3 | 4 | 5 | undefined,
  })

  // дърпаме ВСИЧКИ страници и после филтрираме локално
  const fetchAllReviews = useCallback(async () => {
    try {
      if (!user?.id) return
      setLoading(true)
      setError(null)

      // 1) първа страница за мета
      const firstRes = await apiService.getTrainerReviews(user.id, {
        page: 1,
        pageSize: 50,
        sort: "createdAt:desc", // стабилен ред; реалното сортиране е клиентско
      })
      const { data: firstData, pageSize, total } = normalizeReviewsResponse(firstRes)

      // 2) ако знаем total => паралелно, иначе – последователно до празна/по-къса страница
      const MAX_PAGES = 20
      let combined: Review[] = [...firstData]

      if (Number.isFinite(total) && total > firstData.length) {
        const totalPages = Math.max(1, Math.ceil((total as number) / (pageSize || 50)))
        const reqs: Promise<any>[] = []
        for (let p = 2; p <= totalPages && p <= MAX_PAGES; p++) {
          reqs.push(apiService.getTrainerReviews(user.id, { page: p, pageSize, sort: "createdAt:desc" }))
        }
        const results = await Promise.all(reqs)
        combined = combined.concat(...results.map((r) => normalizeReviewsResponse(r).data))
      } else {
        // неизвестен total – последователно
        let p = 2
        while (p <= MAX_PAGES) {
          const res = await apiService.getTrainerReviews(user.id, { page: p, pageSize, sort: "createdAt:desc" })
          const { data } = normalizeReviewsResponse(res)
          if (!data.length) break
          combined = combined.concat(data)
          if (data.length < (pageSize || 50)) break
          p++
        }
      }

      setAllReviews(combined)

      // локални статистики (върху целия набор)
      setStats({
        totalReviews: combined.length,
        averageRating: calcAverage(combined),
        ratingDistribution: calcDistribution(combined),
        recentReviews: calcRecent30d(combined),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при зареждане на ревютата")
      setAllReviews([])
      setStats({
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentReviews: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.role === "trainer") void fetchAllReviews()
  }, [user?.role, fetchAllReviews])

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  // клиентско филтриране + сортиране
  const filtered = useMemo(() => {
    let arr = allReviews

    if (filters.ratingEq != null) {
      arr = arr.filter((r) => Number(r.rating) === Number(filters.ratingEq))
    }

    const getDate = (r: Review) => {
      const s = normalizeDateString(r.createdAt) ?? normalizeDateString(r.updatedAt)
      return s ? new Date(s).getTime() : 0
    }

    arr = [...arr].sort((a, b) => {
      switch (filters.sort) {
        case "createdAt:asc": return getDate(a) - getDate(b)
        case "createdAt:desc": return getDate(b) - getDate(a)
        case "rating:asc": return Number(a.rating) - Number(b.rating)
        case "rating:desc": return Number(b.rating) - Number(a.rating)
        default: return 0
      }
    })

    return arr
  }, [allReviews, filters.ratingEq, filters.sort])

  // клиентска пагинация
  const total = filtered.length
  const pageSize = filters.pageSize || 10
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(filters.page || 1, totalPages)
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const pageItems = filtered.slice(start, end)

  if (!user || user.role !== "trainer") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert>
            <AlertDescription>Тази страница е достъпна само за треньори.</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl text-secondary font-bold">Моите ревюта</h1>
          <p className="text-secondary">Преглед и управление на ревютата от вашите клиенти</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm text-secondary font-medium">Общо ревюта</CardTitle>
              <MessageSquare className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReviews}</div>
              <p className="text-xs text-secondary">Всички получени ревюта</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Средна оценка</CardTitle>
              <Star className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
                <StarRating rating={stats.averageRating} size="sm" />
              </div>
              <p className="text-xs text-secondary">От 5 възможни звезди</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Нови ревюта</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentReviews}</div>
              <p className="text-xs text-secondary">За последните 30 дни</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        {stats.totalReviews > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Разпределение на оценките</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.ratingDistribution[rating] || 0
                  const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0
                  return (
                    <div key={rating} className="flex items-center gap-4">
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1 bg-gray-400 rounded-full h-2">
                        <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="text-sm text-secondary w-16 text-right">
                        {count} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-secondary" />
              <div className="flex items-center gap-2">
                <Select
                  value={filters.ratingEq?.toString() || "all"}
                  onValueChange={(value) =>
                    handleFilterChange(
                      "ratingEq",
                      value === "all" ? undefined : (Number.parseInt(value, 10) as 1 | 2 | 3 | 4 | 5)
                    )
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Точна оценка" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всички оценки</SelectItem>
                    <SelectItem value="5">Само 5 звезди</SelectItem>
                    <SelectItem value="4">Само 4 звезди</SelectItem>
                    <SelectItem value="3">Само 3 звезди</SelectItem>
                    <SelectItem value="2">Само 2 звезди</SelectItem>
                    <SelectItem value="1">Само 1 звезда</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.sort} onValueChange={(value) => handleFilterChange("sort", value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Сортиране" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt:desc">Най-нови първо</SelectItem>
                    <SelectItem value="createdAt:asc">Най-стари първо</SelectItem>
                    <SelectItem value="rating:desc">Най-високи оценки</SelectItem>
                    <SelectItem value="rating:asc">Най-ниски оценки</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-secondary">Зареждане на ревютата...</p>
            </div>
          </div>
        ) : pageItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Няма ревюта</h3>
              <p className="text-secondary">
                {filters.ratingEq
                  ? `Няма ревюта с оценка точно ${filters.ratingEq} звезди.`
                  : "Няма ревюта за избраните критерии."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pageItems.map((review) => (
              <ReviewCard key={review.id ?? `${review.createdAt}`} review={review} />
            ))}
          </div>
        )}

        {/* Pagination (client-side) */}
        {total > pageSize && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => handlePageChange(page - 1)} disabled={page === 1 || loading}>
              Предишна
            </Button>

            <span className="text-sm text-secondary px-4">
              Страница {page} от {totalPages}
            </span>

            <Button
              variant="outline"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Следваща
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
