
"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiService, type Exercise } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

interface ExerciseFormProps {
  exercise?: Exercise | null
  onSuccess: () => void
  onCancel: () => void
}

const muscleGroups = [
  { value: "chest", label: "Гърди" },
  { value: "back", label: "Гръб" },
  { value: "legs", label: "Крака" },
  { value: "shoulders", label: "Рамене" },
  { value: "arms", label: "Ръце" },
  { value: "core", label: "Корем" },
  { value: "full_body", label: "Цяло тяло" },
]

// --- helpers за видео преглед ---
const getYouTubeEmbed = (url: string) => {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:(?:watch\?v=)|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/
  )
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

const getVimeoEmbed = (url: string) => {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? `https://player.vimeo.com/video/${m[1]}` : null
}

export function ExerciseForm({ exercise, onSuccess, onCancel }: ExerciseFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // текстови полета
  const [name, setName] = useState("")
  const [muscle, setMuscle] = useState("")

  // файлове
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)

  // флагове за премахване (в режим редакция)
  const [removeImage, setRemoveImage] = useState(false)
  const [removeVideo, setRemoveVideo] = useState(false)

  // опционално: видео по URL (оставено празно)
  const [videoUrl, setVideoUrl] = useState("")

  // hydrate от входящо упражнение
  useEffect(() => {
    if (exercise) {
      setName(exercise.name ?? "")
      setMuscle(exercise.muscle ?? "")
      setRemoveImage(false)
      setRemoveVideo(false)
      setImageFile(null)
      setVideoFile(null)
      setVideoUrl("")
    } else {
      setName("")
      setMuscle("")
      setRemoveImage(false)
      setRemoveVideo(false)
      setImageFile(null)
      setVideoFile(null)
      setVideoUrl("")
    }
  }, [exercise])

  // наличности от сървъра
  const hasExistingImage = !!exercise?.image
  const hasExistingVideo = !!exercise?.video

  // --- IMAGE preview с безопасно освобождаване на blob URL ---
  const [imageObjectUrl, setImageObjectUrl] = useState<string>("")
  useEffect(() => {
    if (imageFile) {
      const u = URL.createObjectURL(imageFile)
      setImageObjectUrl(u)
      return () => URL.revokeObjectURL(u)
    }
    setImageObjectUrl("")
  }, [imageFile])

  const imagePreview = useMemo(() => {
    if (removeImage) return ""
    if (imageFile && imageObjectUrl) return imageObjectUrl
    return exercise?.image ?? ""
  }, [removeImage, imageFile, imageObjectUrl, exercise])

  // --- VIDEO preview с безопасно освобождаване на blob URL ---
  const [videoObjectUrl, setVideoObjectUrl] = useState<string>("")
  useEffect(() => {
    if (videoFile) {
      const u = URL.createObjectURL(videoFile)
      setVideoObjectUrl(u)
      return () => URL.revokeObjectURL(u)
    }
    setVideoObjectUrl("")
  }, [videoFile])

  // източник за преглед (без зависимост от hasExistingVideo за TDZ устойчивост)
  const videoPreviewSrc = useMemo(() => {
    if (removeVideo) return ""
    if (videoFile && videoObjectUrl) return videoObjectUrl
    if (videoUrl.trim()) return videoUrl.trim()
    return exercise?.video ?? ""
  }, [removeVideo, videoFile, videoObjectUrl, videoUrl, exercise])

  // ако <video> не може да зареди/възпроизведе (напр. неподдържан кодек)
  const [videoLoadError, setVideoLoadError] = useState(false)
  useEffect(() => {
    setVideoLoadError(false)
  }, [videoPreviewSrc])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !muscle) {
      toast({
        title: "Грешка",
        description: "Моля попълнете всички задължителни полета",
        variant: "destructive",
      })
      return
    }

    const hasNewVideoUrl =
      !!videoUrl.trim() && videoUrl.trim() !== (exercise?.video ?? "")

    if (removeVideo && (videoFile || hasNewVideoUrl)) {
      toast({
        title: "Грешка",
        description:
          "Не може едновременно да премахвате видео и да добавяте ново.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const fd = new FormData()
      fd.append("name", name.trim())
      fd.append("muscle", muscle)

      // ---- IMAGE logic ----
      if (exercise) {
        if (removeImage) {
          fd.append("image_remove", "1")
        } else if (imageFile) {
          fd.append("image", imageFile)
        }
      } else {
        if (imageFile) fd.append("image", imageFile)
      }

      // ---- VIDEO logic ----
      if (exercise) {
        if (removeVideo) {
          fd.append("video_remove", "1")
        } else if (videoFile) {
          fd.append("video", videoFile)
        } else if (hasNewVideoUrl) {
          fd.append("video_url", videoUrl.trim())
        }
      } else {
        if (videoFile) {
          fd.append("video", videoFile)
        } else if (videoUrl.trim()) {
          fd.append("video_url", videoUrl.trim())
        }
      }

      if (exercise) {
        await apiService.updateExerciseWithFiles(exercise.id, fd)
        toast({ title: "Успех", description: "Упражнението е обновено успешно" })
      } else {
        await apiService.createExerciseWithFiles(fd)
        toast({ title: "Успех", description: "Упражнението е създадено успешно" })
      }

      onSuccess()
    } catch {
      toast({
        title: "Грешка",
        description: exercise ? "Неуспешно обновяване на упражнението" : "Неуспешно създаване на упражнението",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Име на упражнението *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Напр. Лицеви опори"
          required
        />
      </div>

      {/* Muscle */}
      <div className="space-y-2">
        <Label htmlFor="muscle">Мускулна група *</Label>
        <Select key={muscle || "empty"} value={muscle} onValueChange={setMuscle}>
          <SelectTrigger>
            <SelectValue placeholder="Изберете мускулна група" />
          </SelectTrigger>
          <SelectContent>
            {muscleGroups.map((group) => (
              <SelectItem key={group.value} value={group.value}>
                {group.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Image section */}
      <div className="space-y-2">
        <Label>Изображение</Label>

        {/* Преглед (скрит ако е маркирано за премахване) */}
        {imagePreview && (
          <div className="w-40 h-24 rounded-md overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="grid gap-2">
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => {
              setRemoveImage(false)
              setImageFile(e.target.files?.[0] || null)
            }}
          />

          {/* Бутонът е достъпен и при маркирано премахване */}
          {exercise && hasExistingImage && (!imageFile || removeImage) && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={removeImage ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  const next = !removeImage
                  setRemoveImage(next)
                  if (next) setImageFile(null)
                }}
              >
                {removeImage ? "Отмени премахването" : "Премахни изображението"}
              </Button>
            </div>
          )}

          {/* Инфо съобщение при маркирано премахване */}
          {exercise && hasExistingImage && removeImage && (
            <p className="text-sm text-amber-600">
              Текущото изображение ще бъде премахнато при запазване.
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Video section */}
      <div className="space-y-2">
        <Label>Видео</Label>

        {/* Преглед (скрит ако е маркирано за премахване) */}
        {videoPreviewSrc && (
          <div className="w-full md:w-[300px] rounded-md overflow-hidden bg-muted aspect-video">
            {(() => {
              const yt = getYouTubeEmbed(videoPreviewSrc)
              const vm = getVimeoEmbed(videoPreviewSrc)
              if (yt) {
                return (
                  <iframe
                    className="w-full h-full"
                    src={yt}
                    title="Видео преглед"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                )
              }
              if (vm) {
                return (
                  <iframe
                    className="w-full h-full"
                    src={vm}
                    title="Видео преглед"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                )
              }
              // всички останали URL-и: опитваме директно във <video>
              return (
                <video
                  key={videoPreviewSrc}
                  src={videoPreviewSrc}
                  controls
                  className="w-full h-full"
                  onError={() => setVideoLoadError(true)}
                />
              )
            })()}
          </div>
        )}

        {videoLoadError && (
          <p className="text-sm text-amber-600 break-all">
            Неподдържан линк или формат за преглед: {videoPreviewSrc}
          </p>
        )}

        <div className="grid gap-3">
          {/* Video file */}
          <Input
            id="video"
            type="file"
            accept="video/*"
            disabled={removeVideo}
            onChange={(e) => {
              setRemoveVideo(false)
              setVideoFile(e.target.files?.[0] || null)
              if (e.target.files?.[0]) setVideoUrl("")
            }}
          />
          {videoFile && (
            <p className="text-sm text-green-600">Избрано видео: {videoFile.name}</p>
          )}


          {/* Remove existing (edit mode) -> бутон */}
          {exercise && hasExistingVideo && !videoFile && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={removeVideo ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  const next = !removeVideo
                  setRemoveVideo(next)
                  if (next) {
                    setVideoFile(null)
                    setVideoUrl("")
                  }
                }}
              >
                {removeVideo ? "Отмени премахването" : "Премахни видеото"}
              </Button>
            </div>
          )}

          {/* Info rows */}
          {exercise?.video && removeVideo && (
            <p className="text-sm text-amber-600">
              Текущото видео ще бъде премахнато при запазване.
            </p>
          )}

        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Запазване..." : exercise ? "Обнови" : "Създай"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Отказ
        </Button>
      </div>
    </form>
  )
}
