"use client";

import { useState, useEffect, useMemo } from "react";
import { type Review, type ReviewListParams, apiService } from "@/lib/api";
import { ReviewCard } from "./review-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewListProps {
  trainerId: string;
  showFilters?: boolean;
}

/** Локален тип за UI филтрите – добавяме точен филтър по оценка. */
type UIReviewListParams = ReviewListParams & {
  ratingEq?: 1 | 2 | 3 | 4 | 5;
};

/* -------------------- Helpers: нормализация на API отговор -------------------- */
function normalizeDateString(v: any) {
  if (!v) return undefined;
  const s = String(v);
  // Safari иска 'T' между дата и час
  return s.includes("T") ? s : s.replace(" ", "T");
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
    // Ако ReviewCard очаква име/имейл:
    name: r.name ?? r.user?.name ?? r.reviewer_name,
    email: r.email ?? r.user?.email,
  };
}

function normalizeReviewsResponse(res: any) {
  if (res && Array.isArray(res.reviews)) {
    const data = res.reviews.map(mapOneReview);
    const page = Number(res?.pagination?.page) || 1;
    const pageSize = Number(res?.pagination?.limit ?? res?.pagination?.pageSize) || data.length || 10;
    const total = Number(res?.pagination?.total) || data.length || 0;
    return { data, page, pageSize, total };
  }

  // Fallback-и за други формати
  const raw: any[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.items)
    ? res.items
    : Array.isArray(res)
    ? res
    : [];
  const data = raw.map(mapOneReview);

  const meta = res?.meta ?? res ?? {};
  const page = Number.isFinite(meta.page) ? Number(meta.page) : 1;
  const pageSize = Number.isFinite(meta.pageSize) ? Number(meta.pageSize) : data.length || 10;
  const total = Number.isFinite(meta.total) ? Number(meta.total) : data.length || 0;

  return { data, page, pageSize, total };
}

/* --------------------------------- Component --------------------------------- */
export function ReviewList({ trainerId, showFilters = true }: ReviewListProps) {
  // Държим целия списък тук
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI филтри + клиентска пагинация
  const [filters, setFilters] = useState<UIReviewListParams>({
    page: 1,
    pageSize: 10,
    sort: "createdAt:desc",
    ratingEq: undefined,
  });

  // ---- Дърпаме ВСИЧКИ страници, после филтрираме локално
  const fetchAllReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Първа страница за мета
      const firstRes = await apiService.getTrainerReviews(trainerId, {
        page: 1,
        pageSize: 50,
        sort: "createdAt:desc", // само за стабилен ред; реалното сортиране е клиентско
      });
      const { data: firstData, pageSize, total } = normalizeReviewsResponse(firstRes);

      // 2) Останалите страници (ако има)
      const totalPages = Math.max(1, Math.ceil((total || firstData.length) / (pageSize || 50)));
      let rest: Review[] = [];

      if (totalPages > 1) {
        const reqs: Promise<any>[] = [];
        for (let p = 2; p <= totalPages; p++) {
          reqs.push(
            apiService.getTrainerReviews(trainerId, {
              page: p,
              pageSize,
              sort: "createdAt:desc",
            })
          );
        }
        const results = await Promise.all(reqs);
        rest = results.flatMap((r) => normalizeReviewsResponse(r).data);
      }

      setAllReviews([...firstData, ...rest]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при зареждане на ревютата");
      setAllReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainerId]);

  const handleFilterChange = <K extends keyof UIReviewListParams>(key: K, value: UIReviewListParams[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // reset при промяна на филтър/сортиране
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // ---- Фронтенд филтриране + сортиране
  const filtered = useMemo(() => {
    let arr = allReviews;

    // точна оценка (ако е избрана)
    if (filters.ratingEq) {
      arr = arr.filter((r) => Number(r.rating) === Number(filters.ratingEq));
    }

    // сортиране (клиентско)
    const getDate = (r: Review) => {
      const s =
        normalizeDateString(r.createdAt) ??
        normalizeDateString(r.updatedAt);
      return s ? new Date(s).getTime() : 0;
    };

    arr = [...arr].sort((a, b) => {
      switch (filters.sort) {
        case "createdAt:asc":
          return getDate(a) - getDate(b);
        case "createdAt:desc":
          return getDate(b) - getDate(a);
        case "rating:asc":
          return Number(a.rating) - Number(b.rating);
        case "rating:desc":
          return Number(b.rating) - Number(a.rating);
        default:
          return 0;
      }
    });

    return arr;
  }, [allReviews, filters.ratingEq, filters.sort]);

  // ---- Клиентска пагинация върху филтрирания масив
  const total = filtered.length;
  const pageSize = filters.pageSize || 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page || 1, totalPages);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filtered.slice(start, end);

  const averageRating = useMemo(() => {
    if (!filtered.length) return 0;
    const sum = filtered.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return sum / filtered.length;
  }, [filtered]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      />
    ));
  };

  const hasAny = Array.isArray(allReviews) && allReviews.length > 0;
  const hasPageItems = Array.isArray(pageItems) && pageItems.length > 0;

  if (loading && !hasAny) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchAllReviews} variant="outline" className="mt-4 bg-transparent">
            Опитай отново
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {hasAny && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {renderStars(averageRating)}
                  <span className="font-medium">{averageRating.toFixed(1)} от 5</span>
                </div>
                <span className="text-muted-foreground">
                  ({total} {total === 1 ? "ревю" : "ревюта"})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
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

                <Select
                  value={filters.sort || "createdAt:desc"}
                  onValueChange={(value) => handleFilterChange("sort", value)}
                >
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
      )}

      {/* Reviews */}
      {!hasPageItems ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Няма ревюта</h3>
            <p className="text-muted-foreground">Няма ревюта за избраните критерии.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pageItems.map((review) => (
            <ReviewCard key={review.id ?? `${review.createdAt}`} review={review} />
          ))}
        </div>
      )}

      {/* Pagination (клиентска) */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || loading}
          >
            Предишна
          </Button>

          <span className="text-sm text-muted-foreground px-4">
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
  );
}
