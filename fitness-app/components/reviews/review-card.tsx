"use client"

import type { Review } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star } from "lucide-react"
import { format } from "date-fns"
import { bg } from "date-fns/locale"

interface ReviewCardProps {
  review: Review
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined" ? `${window.location.origin}` : "")

const toImageUrl = (u?: string): string => {
  if (!u) return "/placeholder.svg"
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith("/uploads/")) return `${API_BASE_URL}${u}`
  const name = u.split(/[\\/]/).pop() || u
  return `${API_BASE_URL}/uploads/${name}`
}


export function ReviewCard({ review }: ReviewCardProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
    ))
  }

  const getUserInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`
    }
    return user?.email?.[0]?.toUpperCase() || "U"
  }

  // const getUserName = (review: any) => {

  //   if (user?.name && user?.lastName) {
  //     return `${user.firstName} ${user.lastName}`
  //   }
  //   return user?.email || "Потребител"
  // }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">

          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{(review.name)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {renderStars(review.rating)}
                  <span className="text-sm text-secondary ml-2">{review.rating}/5</span>
                </div>
              </div>
              <time className="text-sm text-secondary">
                {format(new Date(review.createdAt), "dd.MM.yyyy", { locale: bg })}
              </time>
            </div>

            <p className="text-sm text-secondary leading-relaxed">{review.text}</p>

            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {review.images.map((image, index) => (
                  <img
                    key={index}
                    src={toImageUrl(image) || "/placeholder.svg"}
                    alt={`Ревю изображение ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-md border"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
