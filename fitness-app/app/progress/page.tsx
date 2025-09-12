"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ProgressChart } from "@/components/progress/progress-chart"
import { ProgressForm } from "@/components/progress/progress-form"
import { ProgressList } from "@/components/progress/progress-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Filter, TrendingUp, Image as ImageIcon } from "lucide-react"
import { apiService, type Progress, type ProgressListParams } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ImageViewer } from "@/components/progress/image-viewer"

type ProgressWithImages = Progress & {
  images?: string[]
  createdAt: string
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

export default function ProgressPage() {
  const [progressData, setProgressData] = useState<ProgressWithImages[]>([])
  const [loading, setLoading] = useState(true)

  // Inline create form (add)
  const [showForm, setShowForm] = useState(false)

  // Edit dialog
  const [editingEntry, setEditingEntry] = useState<ProgressWithImages | null>(null)

  // Filters
  const [filters, setFilters] = useState<ProgressListParams>({
    page: 1,
    pageSize: 50,
    sort: "createdAt:desc",
  })
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { toast } = useToast()

  // ImageViewer
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerProgressId, setViewerProgressId] = useState<string>("")

  const loadProgress = async () => {
    try {
      setLoading(true)
      const result = await apiService.getProgressList(filters)
      setProgressData(result.data as ProgressWithImages[])
      return result.data as ProgressWithImages[]
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на данните",
        variant: "destructive",
      })
      return []
    } finally {
      setLoading(false)
    }
  }



  const refreshEntry = async (progressId: string) => {
    const list = await loadProgress()
    const fresh = list.find((x) => x.id === progressId) || null
    if (fresh) setEditingEntry(fresh) // keeps dialog open and updates thumbnails
  }

  const handleFilterChange = () => {
    setFilters({
      ...filters,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1,
    })
  }

  // ========= CREATE / UPDATE HANDLERS =========

  // After creating a new progress (inline form)
  // const handleProgressAdded = (newProgress: ProgressWithImages) => {
  //   loadProgress()
  //   setProgressData((prev) => [newProgress, ...prev])
  //   setShowForm(false)
  // }
  const handleProgressAdded = async (_newProgress: ProgressWithImages) => {
    // Just reload from server; don't push locally
    await loadProgress()
    setShowForm(false)
  }
  
  // After FULL submit while editing: refresh and auto-close
  const handleProgressUpdated = async (_updatedProgress: ProgressWithImages) => {
    await loadProgress()
    setEditingEntry(null)
  }

  useEffect(() => {
    loadProgress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  // After FULL submit while editing: refresh and AUTO-CLOSE the dialog
  // const handleProgressUpdated = async (updatedProgress: ProgressWithImages) => {
  //   await loadProgress()
  //   setEditingEntry(null) // ✅ auto-close the edit dialog on submit
  // }

  // Edit
  const handleEditEntry = (entry: ProgressWithImages) => setEditingEntry(entry)
  const closeEdit = () => setEditingEntry(null)

  // Add new
  const handleAddNew = () => {
    setEditingEntry(null)
    setShowForm(true)
  }

  const getPics = (p?: ProgressWithImages) => (p?.images ?? []) as string[]

  const latestWeight = progressData.length > 0 ? progressData[0].weightKg : null

  // Global gallery: flatten all images with metadata
  const galleryItems = useMemo(() => {
    const items = progressData.flatMap((p) =>
      getPics(p).map((url, idx) => ({
        id: p.id,
        createdAt: p.createdAt,
        url,
        indexInProgress: idx,
      })),
    )
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return items
  }, [progressData])

  // Open viewer for a specific progress
  const openViewerForProgress = (progressId: string, startIndex = 0) => {
    const p = progressData.find((x) => x.id === progressId)
    if (!p) return
    const imgs = getPics(p)
    if (imgs.length === 0) return
    setViewerProgressId(progressId)
    if (startIndex > 0 && startIndex < imgs.length) {
      const rotated = [...imgs.slice(startIndex), ...imgs.slice(0, startIndex)]
      setViewerImages(rotated)
    } else {
      setViewerImages(imgs)
    }
    setViewerOpen(true)
  }

  const handleImageDeleted = async () => {
    if (!viewerProgressId) return
    await refreshEntry(viewerProgressId)
    // keep the viewer images in sync too
    const fresh = (await apiService.getProgressList(filters)).data.find((x: any) => x.id === viewerProgressId)
    if (fresh) setViewerImages(getPics(fresh))
  }

  // ——— Safe cast to allow passing the new optional prop before you type it in ProgressForm
  const ProgressFormAny = ProgressForm as any

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + Add button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-secondary font-bold">Прогрес</h1>
            <p className="text-secondary">Проследявайте вашия фитнес прогрес във времето</p>
          </div>
          <Button variant="white" className="cursor-pointer" onClick={showForm ? () => setShowForm(false) : handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? "Скрий формата" : "Добави запис"}
          </Button>
        </div>

        {/* Current Stats */}
        {(latestWeight) && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latestWeight && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Текущо тегло</CardTitle>
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestWeight} кг</div>
                  <p className="text-xs text-secondary">
                    Последно обновено: {new Date(progressData[0].createdAt).toLocaleDateString("bg-BG")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Inline Create Form (only when not editing) */}
        {showForm && !editingEntry && (
          <ProgressForm
            editingEntry={null}
            onSuccess={handleProgressAdded}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* EDIT DIALOG — closes on submit; refreshes images on upload */}
        <Dialog open={!!editingEntry} onOpenChange={(open) => { if (!open) closeEdit() }}>
          <DialogContent
            className="sm:max-w-3xl"
            // Don't allow outside/esc to avoid conflicts with nested dialogs
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Редакция на прогрес</DialogTitle>
              <DialogDescription className="text-secondary">Променете стойностите и управлявайте снимките за този запис.</DialogDescription>
            </DialogHeader>

            {/* Form */}
            <ProgressFormAny
              editingEntry={editingEntry}
              onSuccess={handleProgressUpdated}       // ✅ auto-close on submit
              onCancel={closeEdit}
              // ⬇️ NEW: when images get uploaded from within the form, refresh this entry
              // onImagesUploaded={async () => {
              //   if (editingEntry) await refreshEntry(editingEntry.id)
              // }}
              onImagesUploaded={async () => {
                if (editingEntry) await refreshEntry(editingEntry.id)
              }}
            />

            {/* Images for the editing entry (auto-updates via refreshEntry) */}
            {editingEntry && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-medium text-secondary">Снимки към този запис</span>
                  <span className="text-xs text-secondary">({getPics(editingEntry).length})</span>
                </div>

                {getPics(editingEntry).length === 0 ? (
                  <p className="text-sm text-secondary">Все още няма качени снимки към този запис.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {getPics(editingEntry).map((url, idx) => (
                      <button
                        key={`${editingEntry.id}-${idx}-${url}`}
                        className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                        onClick={() => openViewerForProgress(editingEntry.id, idx)}
                        title={`Отвори снимка #${idx + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toImageUrl(url)}
                          alt={`Снимка ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Charts */}
        {progressData.length > 0 && (
          <div className="grid gap-6">
            <ProgressChart data={progressData} type="weight" />
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Филтри
            </CardTitle>
            <CardDescription>Филтрирайте данните по период</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">От дата</Label>
                <Input id="dateFrom" className="border-1 border-gray-500" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">До дата</Label>
                <Input id="dateTo" className="border-1 border-gray-500" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort">Сортиране</Label>
                <Select value={filters.sort} onValueChange={(value) => setFilters({ ...filters, sort: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt:desc">Най-нови първо</SelectItem>
                    <SelectItem value="createdAt:asc">Най-стари първо</SelectItem>
                    <SelectItem value="weightKg:desc">Тегло (намаляващо)</SelectItem>
                    <SelectItem value="weightKg:asc">Тегло (нарастващо)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="white" onClick={handleFilterChange} className="cursor-pointer w-full">
                  Приложи филтри
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Photos Gallery (all progress photos) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-secondary" /> Снимки
            </CardTitle>
            <CardDescription >Кликнете, за да отворите визуализатора и да прелиствате или изтривате.</CardDescription>
          </CardHeader>
          <CardContent>
            {galleryItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Няма качени снимки към прогреса.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {galleryItems.map((g, i) => (
                  <button
                    key={`${g.id}-${i}-${g.url}`}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    onClick={() => openViewerForProgress(g.id, g.indexInProgress)}
                    title={new Date(g.createdAt).toLocaleString("bg-BG")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toImageUrl(g.url)}
                      alt="Прогрес снимка"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                    />
                    <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/60 text-secondary">
                      {new Date(g.createdAt).toLocaleDateString("bg-BG")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress List */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : (
          <ProgressList data={progressData} onUpdate={loadProgress} onEdit={handleEditEntry} />
        )}
      </div>

      {/* Image Viewer */}
      <ImageViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        images={viewerImages}
        canDelete
        progressId={viewerProgressId}
        onImageDeleted={handleImageDeleted}
      />
    </DashboardLayout>
  )
}
