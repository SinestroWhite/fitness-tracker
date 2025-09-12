"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Star, X } from "lucide-react"
import type { CreateReviewData, UpdateReviewData } from "@/lib/api"

interface ReviewFormProps {
  onSubmit: (data: CreateReviewData | UpdateReviewData) => Promise<void>
  initialData?: {
    rating: number
    text: string
    images?: string[]
  }
  isEditing?: boolean
  isLoading?: boolean
}

export function ReviewForm({ onSubmit, initialData, isEditing = false, isLoading = false }: ReviewFormProps) {
  const [rating, setRating] = useState(initialData?.rating || 0)
  const [text, setText] = useState(initialData?.text || "")
  const [images, setImages] = useState<File[]>([])
  const [hoveredRating, setHoveredRating] = useState(0)

  // ново: състояние за грешки
  const [errors, setErrors] = useState<{ rating?: string; text?: string }>({})

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImages((prev) => [...prev, ...files].slice(0, 3)) // Max 3 images
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: { rating?: string; text?: string } = {}
    if (rating === 0) nextErrors.rating = "Моля, изберете оценка."
    if (!text.trim()) nextErrors.text = "Моля, напишете ревю."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    await onSubmit({
      rating,
      text: text.trim(),
      images: images.length > 0 ? images : undefined,
    })
  }

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1
      const isActive = starValue <= (hoveredRating || rating)

      return (
        <button
          key={i}
          type="button"
          className="p-1 hover:scale-110 transition-transform"
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => {
            setRating(starValue)
            // изчистваме грешката при интеракция
            setErrors((prev) => ({ ...prev, rating: undefined }))
          }}
          aria-label={`${starValue} звезди`}
        >
          <Star className={`h-6 w-6 ${isActive ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
        </button>
      )
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Редактиране на ревю" : "Напишете ревю"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Оценка */}
          <div className="space-y-2">
            <Label>Оценка</Label>
            <div className="flex items-center gap-1">
              {renderStars()}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 ? `${rating}/5` : "Изберете оценка"}
              </span>
            </div>
            {errors.rating && (
              <p role="alert" className="text-sm text-red-600">
                {errors.rating}
              </p>
            )}
          </div>

          {/* Ревю */}
          <div className="space-y-2">
            <Label htmlFor="review-text">Ревю</Label>
            <Textarea
              id="review-text"
              placeholder="Споделете вашето мнение за треньора..."
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (errors.text) setErrors((prev) => ({ ...prev, text: undefined }))
              }}
              rows={4}
              aria-invalid={!!errors.text}
              aria-describedby={errors.text ? "review-text-error" : undefined}
              className={errors.text ? "border-red-500 focus-visible:ring-red-500" : undefined}
            />
            {errors.text && (
              <p id="review-text-error" role="alert" className="text-sm text-red-600">
                {errors.text}
              </p>
            )}
          </div>

          {/* Изображения */}
          <div className="space-y-2">
            <Label htmlFor="review-images">Изображения (по избор)</Label>
            <div className="space-y-3">
              <Input
                id="review-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                disabled={images.length >= 3}
              />

              {images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image) || "/placeholder.svg"}
                        alt={`Изображение ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-secondary rounded-full flex items-center justify-center hover:bg-red-600"
                        aria-label="Премахни изображението"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">Максимум 3 изображения. Поддържани формати: JPG, PNG, GIF</p>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Запазване..." : isEditing ? "Запази промените" : "Публикувай ревю"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
