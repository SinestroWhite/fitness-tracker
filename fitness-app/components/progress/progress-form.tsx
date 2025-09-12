"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, X, Save } from "lucide-react"
import { apiService, type CreateProgressData, type Progress } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ProgressFormProps {
  editingEntry?: Progress | null
  onSuccess: (progress: Progress) => void
  onCancel?: () => void
}

export function ProgressForm({ editingEntry, onSuccess, onCancel }: ProgressFormProps) {
  const [formData, setFormData] = useState<CreateProgressData>({
    weightKg: 0,
    images: [],
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (editingEntry) {
      setFormData({
        weightKg: editingEntry.weightKg,
        images: editingEntry.images || [],
      })
      setSelectedFiles([]) // Clear selected files when editing
    } else {
      setFormData({
        weightKg: 0,
        images: [],
      })
      setSelectedFiles([])
    }
  }, [editingEntry])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))

    if (imageFiles.length !== files.length) {
      toast({
        title: "Внимание",
        description: "Само изображения са разрешени",
        variant: "destructive",
      })
    }

    setSelectedFiles((prev) => [...prev, ...imageFiles].slice(0, 5)) // Max 5 images
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   setError("")
  //   setLoading(true)

  //   try {
  //     if (formData.weightKg <= 0) {
  //       throw new Error("Теглото трябва да е положително число")
  //     }

  //     let result: Progress

  //     if (editingEntry) {
  //       if (selectedFiles.length > 0) {
  //         // Create FormData with both progress data and new images
  //         const formDataWithFiles = new FormData()
  //         formDataWithFiles.append("weightKg", formData.weightKg.toString())

  //         selectedFiles.forEach((file) => {
  //           formDataWithFiles.append("images", file)
  //         })

  //         result = await apiService.updateProgressWithImages(editingEntry.id, formDataWithFiles)

  //         toast({
  //           title: "Успех",
  //           description: `Прогресът е обновен и ${selectedFiles.length} нови снимки са добавени`,
  //         })
  //       } else {
  //         // Update only basic data without images
  //         result = await apiService.updateProgress(editingEntry.id, {
  //           weightKg: formData.weightKg,
  //         })

  //         toast({
  //           title: "Успех",
  //           description: "Прогресът е обновен успешно",
  //         })
  //       }
  //     } else {
  //       // Create new entry
  //       if (selectedFiles.length > 0) {
  //         // Use FormData for file upload
  //         const formDataWithFiles = new FormData()
  //         formDataWithFiles.append("weightKg", formData.weightKg.toString())

  //         selectedFiles.forEach((file) => {
  //           formDataWithFiles.append("images", file)
  //         })

  //         result = await apiService.uploadProgressImages(formDataWithFiles)
  //       } else {
  //         // Use JSON for data without files
  //         result = await apiService.createProgress(formData)
  //       }

  //       toast({
  //         title: "Успех",
  //         description: "Прогресът е записан успешно",
  //       })
  //     }

  //     onSuccess(result)

  //     // Reset form only if not editing
  //     if (!editingEntry) {
  //       setFormData({
  //         weightKg: 0,
  //         images: [],
  //       })
  //       setSelectedFiles([])
  //     }
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : "Грешка при записване на прогреса")
  //   } finally {
  //     setLoading(false)
  //   }
  // }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
  
    try {
      if (formData.weightKg <= 0) {
        throw new Error("Теглото трябва да е положително число")
      }
  
      let result: Progress
  
      if (editingEntry) {
        if (selectedFiles.length > 0) {
          const fd = new FormData()
          fd.append("weightKg", formData.weightKg.toString())
          selectedFiles.forEach((file) => fd.append("images", file))
  
          result = await apiService.updateProgressWithImages(editingEntry.id, fd)
  
          toast({
            title: "Успех",
            description: `Прогресът е обновен и ${selectedFiles.length} нови снимки са добавени`,
          })
          // по желание: onImagesUploaded?.()
        } else {
          result = await apiService.updateProgress(editingEntry.id, {
            weightKg: formData.weightKg,
          })
          toast({ title: "Успех", description: "Прогресът е обновен успешно" })
        }
      } else {
        if (selectedFiles.length > 0) {
          const fd = new FormData()
          fd.append("weightKg", formData.weightKg.toString())
          selectedFiles.forEach((file) => fd.append("images", file))
  
          result = await apiService.uploadProgressImages(fd)
        } else {
          result = await apiService.createProgress({ weightKg: formData.weightKg })
        }
        toast({ title: "Успех", description: "Прогресът е записан успешно" })
      }
  
      // 🔑 ВИНАГИ уведомявай родителя, за да рефрешне списъка
      onSuccess(result)
  
      // reset само при добавяне
      if (!editingEntry) {
        setFormData({ weightKg: 0, images: [] })
        setSelectedFiles([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при записване на прогреса")
    } finally {
      setLoading(false)
    }
  }
  

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingEntry ? "Редактирай запис" : "Добави нов запис"}</CardTitle>
        <CardDescription>
          {editingEntry ? "Обновете данните за вашия прогрес" : "Запишете вашия текущ прогрес"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight">Тегло (кг) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="1"
                className="border-1 border-gray-500 text-secondary"
                max="300"
                value={formData.weightKg || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weightKg: Number.parseFloat(e.target.value) || 0,
                  })
                }
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">
              {editingEntry ? "Добави нови снимки (до 5) - по избор" : "Снимки (до 5) - по избор"}
            </Label>
            <div className="space-y-2">
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={loading}
                className="cursor-pointer border-1 border-gray-500"
              />
              <p className="text-xs text-secondary">
                💡 Можете да изберете няколко снимки наведнъж (Ctrl+Click или Cmd+Click)
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Избрани снимки ({selectedFiles.length}/5):</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="flex items-center space-x-2 bg-secondary rounded-md px-3 py-2 pr-8">
                        <span className="text-sm truncate text-primary">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute cursor-pointer right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {selectedFiles.length >= 5 && (
                  <p className="text-xs text-amber-600">⚠️ Достигнат е максималният брой снимки (5)</p>
                )}
              </div>
            )}

            {editingEntry && editingEntry.images && editingEntry.images.length > 0 && (
              <div className="mt-2 p-3 bg-blue-950 rounded-md">
                <p className="text-sm text-blue-100">
                  📸 Текущи снимки: {editingEntry.images.length}
                  <br />
                  <span className="text-xs">Новите снимки ще се добавят към съществуващите</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button variant="white" className="cursor-pointer" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingEntry ? "Обновяване..." : "Записване..."}
                </>
              ) : (
                <>
                  {editingEntry ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingEntry ? "Обнови прогрес" : "Запиши прогрес"}
                </>
              )}
            </Button>
            {onCancel && (
              <Button className="cursor-pointer" type="button"  onClick={onCancel} disabled={loading}>
                Отказ
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
