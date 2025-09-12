"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Edit, ImageIcon } from "lucide-react"
import type { Progress } from "@/lib/api"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ImageViewer } from "./image-viewer"

interface ProgressListProps {
  data: Progress[]
  onUpdate: () => void
  onEdit: (entry: Progress) => void
}

export function ProgressList({ data, onUpdate, onEdit }: ProgressListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<Progress | null>(null)
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await apiService.deleteProgress(id)
      toast({
        title: "Успех",
        description: "Записът е изтрит успешно",
      })
      onUpdate()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно изтриване на записа",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewImages = (entry: Progress) => {
    setSelectedEntry(entry)
    setImageViewerOpen(true)
  }

  const handleImageDeleted = () => {
    onUpdate() // Refresh the progress list to reflect updated image counts
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>История на прогреса</CardTitle>
          <CardDescription>Вашите записи на прогреса</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-secondary">
            <p>Няма записи на прогрес</p>
            <p className="text-sm mt-1">Добавете първия си запис за да започнете проследяването</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>История на прогреса</CardTitle>
        <CardDescription >Вашите записи на прогреса ({data.length} общо)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-4 border-1 border-gray-500 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="font-medium">{entry.weightKg} кг</p>
                    <p className="text-sm text-secondary">
                      {new Date(entry.createdAt).toLocaleDateString("bg-BG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {entry.images && entry.images.length > 0 && (
                       <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewImages(entry)}
                        className="h-auto cursor-pointer px-2 py-1 bg-transparent border-1 border-gray-500 text-secondary"
                      >
                      <ImageIcon className="w-3 h-3 mr-1 text-secondary" />
                      {entry.images.length} снимки
                      </Button>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button className="cursor-pointer bg-transparent border-1 border-gray-500" variant="outline" size="sm" onClick={() => onEdit(entry)}>
                  <Edit className="w-4 h-4 text-secondary" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="cursor-pointer bg-transparent border-1 border-gray-500" variant="outline" size="sm" disabled={deletingId === entry.id}>
                      <Trash2 className="w-4 h-4 text-secondary" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Изтриване на запис</AlertDialogTitle>
                      <AlertDialogDescription>
                        Сигурни ли сте, че искате да изтриете този запис? Това действие не може да бъде отменено.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отказ</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(entry.id)}
                        className="bg-destructive text-secondary  hover:bg-destructive/90"
                      >
                        Изтрий
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {selectedEntry && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onClose={() => {
            setImageViewerOpen(false)
            setSelectedEntry(null)
          }}
          images={selectedEntry.images || []}
          progressId={selectedEntry.id}
          onImageDeleted={handleImageDeleted}
        />
      )}
      
    </>
  )
}
