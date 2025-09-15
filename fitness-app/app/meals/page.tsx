"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, Edit, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiService, type Meal, type MealListParams } from "@/lib/api";
import { MealForm } from "@/components/meals/meal-form";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
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

// /lib/images.ts
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

const DEFAULT_FILTERS: MealListParams = { pageSize: 1000 };

export default function MealsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rawMeals, setRawMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔍 Дебоунснато търсене – клиентско
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // 🧰 Филтри: разделяме „чернова“ (UI) и „приложени“ (към бекенда)
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] =
    useState<MealListParams>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<MealListParams>(DEFAULT_FILTERS);

  // Диалози/състояния
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const canManage = user?.role === "trainer" || user?.role === "admin";

  const getRangeErrors = (f: MealListParams) => ({
    kcal:
      f.kcalMin !== undefined &&
      f.kcalMax !== undefined &&
      f.kcalMin > f.kcalMax,
    protein:
      f.proteinMin !== undefined &&
      f.proteinMax !== undefined &&
      f.proteinMin > f.proteinMax,
    carbs:
      f.carbsMin !== undefined &&
      f.carbsMax !== undefined &&
      f.carbsMin > f.carbsMax,
    fat:
      f.fatMin !== undefined && f.fatMax !== undefined && f.fatMin > f.fatMax,
  });

  const rangeErrors = useMemo(
    () => getRangeErrors(draftFilters),
    [draftFilters]
  );

  // ⏱️ Debounce на търсенето
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // Феч само при mount и при промяна на приложените филтри
  useEffect(() => {
    fetchMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const params: MealListParams = { ...appliedFilters }; // 🔸 Няма search тук; търсим на клиента
      const response = await apiService.getMeals(params);
      setRawMeals(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на храните",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // const handleApplyFilters = () => {
  //   setAppliedFilters((prev) => ({ ...prev, ...draftFilters }))
  // }
  const handleApplyFilters = () => {
    const errs = getRangeErrors(draftFilters);
    if (Object.values(errs).some(Boolean)) {
      toast({
        title: "Невалидни филтри",
        description:
          "Минималната стойност не може да е по-голяма от максималната.",
        variant: "destructive",
      });
      return;
    }
    setAppliedFilters((prev) => ({ ...prev, ...draftFilters }));
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setSearchTerm("");
  };

  const handleCreateMeal = async (data: any) => {
    try {
      if (data.imageFile) {
        await apiService.createMealWithImage(data);
      } else {
        await apiService.createMeal(data);
      }
      toast({ title: "Успех", description: "Храната е създадена успешно" });
      setShowCreateDialog(false);
      fetchMeals();
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно създаване на храната",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMeal = async (data: any) => {
    if (!editingMeal) return;
    try {
      if (data.imageFile) {
        await apiService.updateMealWithImage(editingMeal.id, data);
      } else {
        await apiService.updateMeal(editingMeal.id, data);
      }
      toast({ title: "Успех", description: "Храната е обновена успешно" });
      setEditingMeal(null);
      fetchMeals();
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно обновяване на храната",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteMeal(id);
      toast({ title: "Успех", description: "Храната е изтрита успешно" });
      setDeleteConfirmId(null);
      fetchMeals();
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно изтриване на храната",
        variant: "destructive",
      });
    }
  };

  const hasActiveFilters = useMemo(() => {
    const { pageSize, ...rest } = appliedFilters || {};
    return Object.values(rest).some(
      (v) => v !== undefined && v !== null && v !== ""
    );
  }, [appliedFilters]);

  // 🧠 Клиентско филтриране по търсене
  const filteredMeals = useMemo(() => {
    if (!debouncedSearch) return rawMeals;
    const q = debouncedSearch.toLowerCase();
    return rawMeals.filter(
      (m) =>
        m.title?.toLowerCase?.().includes(q) ||
        m.description?.toLowerCase?.().includes(q)
    );
  }, [rawMeals, debouncedSearch]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-secondary font-bold">Храни</h1>
              <p className="text-secondary">
                Управление на храни и хранителни стойности
              </p>
            </div>

            {canManage && (
              <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="white">
                    <Plus className="h-4 w-4 mr-2" />
                    Добави храна
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Създай нова храна</DialogTitle>
                  </DialogHeader>
                  <MealForm
                    key={showCreateDialog ? "create-open" : "create-closed"}
                    onSubmit={handleCreateMeal}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Търсене и Филтри */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
              <Input
                placeholder="Търси храни..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-1 border-gray-500 text-secondary"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters((s) => !s)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4 mr-2" />
              Филтри
            </Button>
          </div>

          {/* Опционално: брояч на резултата */}
          {(debouncedSearch || hasActiveFilters) && !loading && (
            <p className="text-sm text-secondary">
              Намерени: {filteredMeals.length}
            </p>
          )}

          {/* Панел с филтри */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Филтри по хранителни стойности
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Калории (kcal)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Мин"
                        value={draftFilters.kcalMin ?? ""}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            kcalMin: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                        aria-invalid={rangeErrors.kcal || undefined}
                        className={`${
                          rangeErrors.kcal
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                      <Input
                        type="number"
                        placeholder="Макс"
                        value={draftFilters.kcalMax ?? ""}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            kcalMax: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                        aria-invalid={rangeErrors.kcal || undefined}
                        className={`${
                          rangeErrors.kcal
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                    </div>
                    {rangeErrors.kcal && (
                      <p className="text-xs text-destructive mt-1">
                        Мин не може да е по-голям от Макс.
                      </p>
                    )}
                  </div>

                  {/* Протеини */}
                  <div className="space-y-2">
                    <Label>Протеини (g)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Мин"
                        value={draftFilters.proteinMin ?? ""}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            proteinMin: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                        aria-invalid={rangeErrors.protein || undefined}
                        className={`${
                          rangeErrors.protein
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                      <Input
                        type="number"
                        placeholder="Макс"
                        value={draftFilters.proteinMax ?? ""}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            proteinMax: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                        aria-invalid={rangeErrors.protein || undefined}
                        className={`${
                          rangeErrors.protein
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                    </div>
                    {rangeErrors.protein && (
                      <p className="text-xs text-destructive mt-1">
                        Мин не може да е по-голям от Макс.
                      </p>
                    )}
                  </div>

                  {/* Въглехидрати */}
                  <div className="space-y-2">
                    <Label>Въглехидрати (g)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Мин"
                        value={draftFilters.carbsMin ?? ""}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            carbsMin: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                        aria-invalid={rangeErrors.carbs || undefined}
                        className={`${
                          rangeErrors.carbs
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                      <Input
                        type="number"
                        placeholder="Макс"
                        value={draftFilters.carbsMax ?? ""}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            carbsMax: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                        aria-invalid={rangeErrors.carbs || undefined}
                        className={`${
                          rangeErrors.carbs
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                    </div>
                    {rangeErrors.carbs && (
                      <p className="text-xs text-destructive mt-1">
                        Мин не може да е по-голям от Макс.
                      </p>
                    )}
                  </div>

                  {/* Мазнини */}
                  <div className="space-y-2">
                    <Label>Мазнини (g)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Мин"
                        value={draftFilters.fatMin ?? ""}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            fatMin: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                        aria-invalid={rangeErrors.fat || undefined}
                        className={`${
                          rangeErrors.fat
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                      <Input
                        type="number"
                        placeholder="Макс"
                        value={draftFilters.fatMax ?? ""}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            fatMax: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                        aria-invalid={rangeErrors.fat || undefined}
                        className={`${
                          rangeErrors.fat
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                    </div>
                    {rangeErrors.fat && (
                      <p className="text-xs text-destructive mt-1">
                        Мин не може да е по-голям от Макс.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button onClick={handleApplyFilters}>Приложи филтри</Button>
                  <Button className="text-primary" variant="outline" onClick={resetFilters}>
                    Изчисти филтри
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meals Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="aspect-square bg-muted rounded-lg mb-3" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-4 bg-muted rounded w-5/6 mb-2" />
                    <div className="h-4 bg-muted rounded w-4/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMeals.map((meal) => (
                  <Card
                    key={meal.id}
                    className="relative group hover:shadow-lg transition-shadow"
                  >
                    {canManage && (
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingMeal(meal)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteConfirmId(meal.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                        {meal.image ? (
                          <img
                            src={toImageUrl(meal.image)}
                            alt={meal.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.nextElementSibling?.classList.remove(
                                "hidden"
                              );
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-full h-full flex items-center justify-center ${
                            meal.image ? "hidden" : ""
                          }`}
                        >
                          <ImageIcon className="h-12 w-12 text-primary" />
                        </div>
                      </div>
                      <CardTitle className="text-lg">{meal.title}</CardTitle>
                      {meal.description && (
                        <p className="text-sm text-secondary line-clamp-2">
                          {meal.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Калории:</span>
                          <Badge className="text-secondary" variant="outline">
                            {meal.calories} kcal
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Протеини:</span>
                          <Badge className="text-secondary" variant="outline">{meal.protein}g</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Въглехидрати:
                          </span>
                          <Badge className="text-secondary" variant="outline">{meal.carbohydrates}g</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Мазнини:</span>
                          <Badge className="text-secondary" variant="outline">{meal.fat}g</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div> */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredMeals.map((meal) => (
    <Card key={meal.id} className="group hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{meal.title}</CardTitle>
            {meal.description && (
              <CardDescription className="mt-1 text-secondary line-clamp-2">
                {meal.description}
              </CardDescription>
            )}
          </div>

          {canManage && (
            <div className="flex gap-1 ">
              <Button size="sm" variant="ghost" onClick={() => setEditingMeal(meal)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(meal.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Media with fallback icon */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {meal.image ? (
              <>
                <img
                  src={toImageUrl(meal.image)}
                  alt={meal.title}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    e.currentTarget.nextElementSibling?.classList.remove("hidden")
                  }}
                />
                <div className="hidden items-center justify-center text-primary">
                  <ImageIcon className="h-8 w-8" aria-label="No image available" />
                </div>
              </>
            ) : (
              <ImageIcon className="h-8 w-8 text-primary" aria-label="No image available" />
            )}
          </div>

          {/* Nutrition */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Калории:</span>
              <Badge className="text-secondary" variant="outline">{meal.calories} kcal</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Протеини:</span>
              <Badge className="text-secondary" variant="outline">{meal.protein}g</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Въглехидрати:</span>
              <Badge className="text-secondary" variant="outline">{meal.carbohydrates}g</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Мазнини:</span>
              <Badge className="text-secondary" variant="outline">{meal.fat}g</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>



              {filteredMeals.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-secondary">Няма намерени храни</p>
                </div>
              )}
            </>
          )}

          {/* Edit Dialog */}
          <Dialog
            open={!!editingMeal}
            onOpenChange={(open) => {
              if (!open) setEditingMeal(null);
              else if (editingMeal) setEditingMeal({ ...editingMeal }); // no-op, just to keep state
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Редактирай храна</DialogTitle>
              </DialogHeader>
              {editingMeal && (
                <MealForm
                  key={editingMeal.id} // ⬅️ принудителен ремоунт при смяна на елемента
                  meal={editingMeal}
                  onSubmit={handleUpdateMeal}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog
            open={!!deleteConfirmId}
            onOpenChange={(open) => !open && setDeleteConfirmId(null)}
          >
            <AlertDialogContent
              onPointerDownCapture={(e) => e.stopPropagation()}
              onKeyDownCapture={(e) => {
                if ((e as React.KeyboardEvent).key === "Escape")
                  e.stopPropagation();
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>Потвърди изтриване</AlertDialogTitle>
                <AlertDialogDescription>
                  Сигурни ли сте, че искате да изтриете тази храна? Това
                  действие не може да бъде отменено.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmId(null)}>
                  Отказ
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-secondary hover:bg-destructive/90"
                  onClick={() =>
                    deleteConfirmId && handleDelete(deleteConfirmId)
                  }
                >
                  Изтрий
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
