"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Play, ImageIcon } from "lucide-react"
import { apiService, type Exercise, type ExerciseListParams } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { ExerciseForm } from "@/components/exercises/exercise-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const muscleGroups = [
  { value: "chest", label: "Гърди" },
  { value: "back", label: "Гръб" },
  { value: "legs", label: "Крака" },
  { value: "shoulders", label: "Рамене" },
  { value: "arms", label: "Ръце" },
  { value: "core", label: "Корем" },
  { value: "full_body", label: "Цяло тяло" },
]

// 🎯 Нормализираме евентуални snake_case ключове към нашите
const normalizeExercise = (e: any): Exercise => ({
  ...e,
  name: e.name ?? e.title ?? "",
  muscle: e.muscle ?? e.muscle_group ?? e.group ?? "",
  image: e.image ?? e.image_url ?? e.thumbnail ?? "",
  video: e.video ?? e.video_url ?? "",
  description: e.description ?? e.notes ?? "", // ако имате поле за описание
})

const getYouTubeEmbed = (url: string) => {
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_\-]{6,})/.exec(url)
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : null
}

const getVimeoEmbed = (url: string) => {
  const vm = /vimeo\.com\/(\d+)/.exec(url)
  return vm ? `https://player.vimeo.com/video/${vm[1]}` : null
}

const isLikelyVideoFile = (url: string) => /\.(mp4|webm|ogg|mov|m4v)$/i.test(url.split("?")[0] ?? "")

export default function ExercisesPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [rawExercises, setRawExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  // 🔍 Дебоунснато търсене + локален филтър по мускулна група
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedMuscle, setSelectedMuscle] = useState<string>("all")

  const [showForm, setShowForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null)
  const [videoExercise, setVideoExercise] = useState<Exercise | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canManageExercises = user?.role === "trainer" || user?.role === "admin"

  // ⏱️ Debounce на търсенето
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(h)
  }, [searchTerm])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const params: ExerciseListParams & Record<string, any> = { pageSize: 1000 }
      // Оставяме филтъра по мускулна група към бекенда (ако е поддържан).
      if (selectedMuscle !== "all") params.muscle = selectedMuscle as any

      const response = await apiService.getExerciseList(params)
      const list = Array.isArray(response.data) ? response.data : []
      setRawExercises(list.map(normalizeExercise))
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на упражненията",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Фечваме при mount и при смяна на мускулната група (търсенето е клиентско)
  useEffect(() => {
    fetchExercises()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMuscle])

  const confirmDelete = (exercise: Exercise) => {
    setExerciseToDelete(exercise)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!exerciseToDelete) return
    try {
      setDeleting(true)
      await apiService.deleteExercise(exerciseToDelete.id)
      toast({ title: "Успех", description: "Упражнението е изтрито успешно" })
      fetchExercises()
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно изтриване на упражнението",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setExerciseToDelete(null)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingExercise(null)
    fetchExercises()
  }

  const getMuscleLabel = (muscle: string) =>
    muscleGroups.find((m) => m.value === muscle)?.label || muscle

  // 🧠 Клиентско филтриране – работи независимо от бекенда
  const filteredExercises = useMemo(() => {
    let list = rawExercises

    if (selectedMuscle !== "all") {
      list = list.filter((e) => (e.muscle ?? "").toLowerCase() === selectedMuscle)
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (e) =>
          e.name?.toLowerCase?.().includes(q) ||
          e.muscle?.toLowerCase?.().includes(q) ||
          e.description?.toLowerCase?.().includes(q)
      )
    }

    return list
  }, [rawExercises, debouncedSearch, selectedMuscle])

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-secondary font-bold">Упражнения</h1>
              <p className="text-secondary">Упражнения за тренировки</p>
            </div>
            {canManageExercises && (
              <Button variant="white" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добави упражнение
              </Button>
            )}
          </div>

          {/* Филтри */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute  left-3 top-1/2 -translate-y-1/2 text-secondary h-4 w-4" />
              <Input
                placeholder="Търси упражнения..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-1 border-gray-500"
              />
            </div>
            <Select value={selectedMuscle} onValueChange={setSelectedMuscle}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Мускулна група" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички групи</SelectItem>
                {muscleGroups.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Опционално: брояч на резултата */}
          {(debouncedSearch || selectedMuscle !== "all") && !loading && (
            <p className="text-sm text-secondary">Намерени: {filteredExercises.length}</p>
          )}

          {/* Exercise Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-muted rounded mb-4"></div>
                    <div className="h-8 bg-muted rounded w-20"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExercises.map((exercise) => (
                <Card key={exercise.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{exercise.name}</CardTitle>
                        <CardDescription>
                          <Badge variant="secondary" className="mt-1 text-secondary bg-transparent border-1 border-gray-500">
                            {getMuscleLabel(exercise.muscle)}
                          </Badge>
                        </CardDescription>
                      </div>
                      {canManageExercises && (
                        <div className="flex gap-1 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingExercise(exercise)
                              setShowForm(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => confirmDelete(exercise)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {exercise.image && (
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          <img
                            src={exercise.image || "/placeholder.svg"}
                            alt={exercise.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                              e.currentTarget.nextElementSibling?.classList.remove("hidden")
                            }}
                          />
                          <div className="hidden flex items-center justify-center text-primary">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        </div>
                      )}

                      {exercise.video && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent border-1 border-gray-500"
                          onClick={() => setVideoExercise(exercise)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Видео демонстрация
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredExercises.length === 0 && (
            <div className="text-center py-12">
              <p className="text-secondary">Няма намерени упражнения</p>
            </div>
          )}
        </div>

        {/* Exercise Form Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open)
            if (!open) setEditingExercise(null)
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingExercise ? "Редактиране на упражнение" : "Ново упражнение"}</DialogTitle>
            </DialogHeader>
            <ExerciseForm
              key={editingExercise?.id ?? "new"}   // ⬅️ принудителен ремоунт при смяна
              exercise={editingExercise}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false)
                setEditingExercise(null)
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent
            onPointerDownCapture={(e) => e.stopPropagation()}
            onKeyDownCapture={(e) => {
              if ((e as React.KeyboardEvent).key === "Escape") e.stopPropagation()
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Изтриване на упражнение</AlertDialogTitle>
              <AlertDialogDescription>
                Сигурни ли сте, че искате да изтриете{" "}
                <strong>{exerciseToDelete?.name}</strong>? Това действие не може да бъде отменено.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setExerciseToDelete(null)}>
                Отказ
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive"
                disabled={deleting}
              >
                {deleting ? "Изтриване..." : "Изтрий"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Видео диалог */}
        <Dialog
          open={!!videoExercise}
          onOpenChange={(open) => {
            if (!open) setVideoExercise(null)
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{videoExercise?.name ?? "Видео демонстрация"}</DialogTitle>
            </DialogHeader>

            {videoExercise?.video && (() => {
              const url = videoExercise.video
              const yt = getYouTubeEmbed(url)
              const vm = getVimeoEmbed(url)

              if (yt) {
                return (
                  <div className="aspect-video w-full overflow-hidden rounded-lg">
                    <iframe
                      src={yt}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title={`${videoExercise.name} video`}
                    />
                  </div>
                )
              }

              if (vm) {
                return (
                  <div className="aspect-video w-full overflow-hidden rounded-lg">
                    <iframe
                      src={vm}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title={`${videoExercise.name} video`}
                    />
                  </div>
                )
              }

              if (isLikelyVideoFile(url)) {
                return (
                  <video controls className="w-full rounded-lg" src={url} />
                )
              }

              return (
                <div className="text-sm">
                  Неуспешно вграждане на видеото.
                  <a href={url} target="_blank" rel="noreferrer" className="underline ml-1">
                    Отвори видеото в нов таб
                  </a>
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
