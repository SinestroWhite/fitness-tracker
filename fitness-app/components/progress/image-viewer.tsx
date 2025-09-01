"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  /** When true, show delete UI and enable deletion flow */
  canDelete?: boolean;
  /** Only required when canDelete is true */
  progressId?: string;
  /** Called after a successful deletion (e.g., to reload list) */
  onImageDeleted?: () => void;
}

export function ImageViewer({
  isOpen,
  onClose,
  images,
  canDelete = false,
  progressId,
  onImageDeleted,
}: ImageViewerProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ??
    (typeof window !== "undefined" ? `${window.location.origin}` : "");

  const toImageUrl = (u?: string): string => {
    if (!u) return "/placeholder.svg";
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("/uploads/")) return `${API_BASE_URL}${u}`;
    const name = u.split(/[\\/]/).pop() || u;
    return `${API_BASE_URL}/uploads/${name}`;
  };

  // send only path/filename to API (in case you store full URLs in images[])
  const toServerImagePath = (u: string): string => {
    try {
      const url = new URL(u, API_BASE_URL);
      // If your API expects `/uploads/xxx.jpg`, return pathname; else just the filename:
      return url.pathname.startsWith("/uploads/") ? url.pathname : url.pathname.split("/").pop() || url.pathname;
    } catch {
      // fallback: likely relative/filename already
      return u.startsWith("/uploads/") ? u : u.split(/[\\/]/).pop() || u;
    }
  };

  const currentRaw = images[currentImageIndex];
  const currentImage = currentRaw ? toImageUrl(currentRaw) : "/placeholder.svg";

  const handlePrevious = () =>
    setCurrentImageIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  const handleNext = () =>
    setCurrentImageIndex((i) => (i < images.length - 1 ? i + 1 : 0));

  const handleDeleteImage = async () => {
    if (!canDelete || !progressId || !currentRaw) return;
    setDeleting(true);
    try {
      await apiService.deleteProgressImage(progressId, toServerImagePath(currentRaw));
      toast({ title: "Успех", description: "Снимката е изтрита успешно" });
      // Move index safely
      const nextIndex = currentImageIndex >= images.length - 1 ? 0 : currentImageIndex;
      if (images.length === 1) onClose();
      else setCurrentImageIndex(nextIndex);
      onImageDeleted?.();
    } catch {
      toast({ title: "Грешка", description: "Неуспешно изтриване на снимката", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [images]);

  if (!isOpen || images.length === 0) return null;

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        modal
      >
        <DialogContent
          className="max-w-4xl max-h-[90vh]"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Снимки от прогреса</span>
              <div className="flex items-center space-x-2 pr-5">
                <Badge variant="secondary">
                  {currentImageIndex + 1} от {images.length}
                </Badge>

                {canDelete && (
                  <Button
                    className="cursor-pointer"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={deleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage}
                alt={`Прогрес снимка ${currentImageIndex + 1}`}
                className="max-w-full max-h-[60vh] object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
            </div>

            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute cursor-pointer left-2 top-1/2 -translate-y-1/2 bg-transparent"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 bg-transparent"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex justify-center space-x-2 mt-4">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 cursor-pointer rounded-full ${
                    index === currentImageIndex ? "bg-primary" : "bg-muted"
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {canDelete && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent
            onPointerDownCapture={(e) => e.stopPropagation()}
            onKeyDownCapture={(e) => {
              if ((e as React.KeyboardEvent).key === "Escape") e.stopPropagation();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Изтриване на снимка</AlertDialogTitle>
              <AlertDialogDescription>
                Сигурни ли сте, че искате да изтриете тази снимка? Това действие не може да бъде отменено.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отказ</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteImage}
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={deleting}
              >
                {deleting ? "Изтриване..." : "Изтрий"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
