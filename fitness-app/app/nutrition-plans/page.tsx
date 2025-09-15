"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Target, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import {
  apiService,
  type NutritionPlan,
  type NutritionPlanListParams,
} from "@/lib/api";
import { NutritionPlanForm } from "@/components/nutrition-plans/nutrition-plan-form";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";

const goalLabels: Record<"lose" | "gain" | "maintain", string> = {
  lose: "Отслабване",
  gain: "Качване на тегло",
  maintain: "Поддържане",
};

const goalColors: Record<"lose" | "gain" | "maintain", string> = {
  lose: "bg-red-600 text-red-50",
  gain: "bg-green-600 text-green-50",
  maintain: "bg-blue-600 text-blue-50",
};

export default function NutritionPlansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [rawPlans, setRawPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔍 Дебоунснато търсене (клиентско)
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // 🎯 Филтър по цел (към бекенда, ако е поддържан)
  const [goalFilter, setGoalFilter] = useState<string>("all");

  // Диалози
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = user?.role === "trainer" || user?.role === "admin";

  // ⏱️ Debounce
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // Феч при mount и при смяна на целта
  useEffect(() => {
    fetchNutritionPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalFilter]);

  const fetchNutritionPlans = async () => {
    try {
      setLoading(true);
      const params: NutritionPlanListParams = {
        pageSize: 1000,
        include: "author",
      };
      if (goalFilter !== "all") {
        params.goal = goalFilter as "lose" | "gain" | "maintain";
      }
      const response = await apiService.getNutritionPlans(params);
      setRawPlans(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на хранителните планове",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (data: any) => {
    try {
      await apiService.createNutritionPlan(data);
      toast({
        title: "Успех",
        description: "Хранителният план е създаден успешно",
      });
      setShowCreateDialog(false);
      fetchNutritionPlans();
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно създаване на хранителния план",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePlan = async (data: any) => {
    if (!editingPlan) return;
    try {
      await apiService.updateNutritionPlan(editingPlan.id, data);
      toast({
        title: "Успех",
        description: "Хранителният план е обновен успешно",
      });
      setEditingPlan(null);
      fetchNutritionPlans();
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно обновяване на хранителния план",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePlanId) return;
    try {
      setDeleting(true);
      await apiService.deleteNutritionPlan(deletePlanId);
      toast({
        title: "Успех",
        description: "Хранителният план е изтрит успешно",
      });
      setDeletePlanId(null);
      fetchNutritionPlans();
    } catch {
      toast({
        title: "Грешка",
        description: "Неуспешно изтриване на хранителния план",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setGoalFilter("all");
  };

  // 🧠 Клиентско филтриране (търсене + безопасен дублаж на филтъра по цел)
  const filteredPlans = useMemo(() => {
    let list = rawPlans;
    if (goalFilter !== "all") {
      list = list.filter((p) => p.goal === goalFilter);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase?.().includes(q) ||
          p.goal?.toLowerCase?.().includes(q) ||
          p.description?.toLowerCase?.().includes(q) ||
          (p as any)?.author?.name?.toLowerCase?.().includes(q)
      );
    }
    return list;
  }, [rawPlans, goalFilter, debouncedSearch]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-secondary font-bold">Хранителни планове</h1>
              <p className="text-secondary">
                Управление на хранителни планове и хранене
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
                    Създай план
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Създай нов хранителен план</DialogTitle>
                  </DialogHeader>
                  <NutritionPlanForm
                    key={showCreateDialog ? "create-open" : "create-closed"}
                    onSubmit={handleCreatePlan}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Търсене и филтър по цел */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
              <Input
                placeholder="Търси хранителни планове..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-1 border-gray-500 text-secondary"
              />
            </div>
            <Select value={goalFilter} onValueChange={setGoalFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Филтрирай по цел" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички цели</SelectItem>
                <SelectItem value="lose">Отслабване</SelectItem>
                <SelectItem value="gain">Качване на тегло</SelectItem>
                <SelectItem value="maintain">Поддържане</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || goalFilter !== "all") && (
              <Button variant="outline" onClick={resetFilters}>
                Изчисти филтри
              </Button>
            )}
          </div>

          {/* Опционално: брояч */}
          {(debouncedSearch || goalFilter !== "all") && !loading && (
            <p className="text-sm text-secondary">
              Намерени: {filteredPlans.length}
            </p>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="relative group hover:shadow-lg transition-shadow"
                  >
                    {canManage && (
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingPlan(plan)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletePlanId(plan.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {plan.title}
                          </CardTitle>
                          <Badge
                            className={`border ${
                              goalColors[plan.goal as keyof typeof goalColors]
                            }`}
                          >
                            <Target className="h-3 w-3 mr-1" />
                            {goalLabels[plan.goal as keyof typeof goalLabels] ??
                              plan.goal}
                          </Badge>
                        </div>
                      </div>
                      {plan.description && (
                        <p className="text-sm text-secondary mt-2 line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="white"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            router.push(`/nutrition-plans/${plan.id}`)
                          }
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Детайли
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {!loading &&
                (rawPlans.length === 0 ? (
                  // Няма никакви планове в системата
                  <div className="text-center py-12">
                    <p className="text-secondary">
                      Все още няма хранителни планове.
                    </p>
                    {canManage && (
                      <Button
                        className="mt-4"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Създай първия план
                      </Button>
                    )}
                  </div>
                ) : (
                  // Има планове, но текущите филтри/търсене не намират нищо
                  filteredPlans.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-secondary">
                        Няма резултати за текущото търсене.
                      </p>
                    </div>
                  )
                ))}
            </>
          )}

          {/* Edit Dialog */}
          <Dialog
            open={!!editingPlan}
            onOpenChange={(open) => {
              setEditingPlan(open ? editingPlan : null);
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Редактирай хранителен план</DialogTitle>
              </DialogHeader>
              {editingPlan && (
                <NutritionPlanForm
                  key={editingPlan.id} // ⬅️ принудителен ремоунт при смяна
                  plan={editingPlan}
                  onSubmit={handleUpdatePlan}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog
            open={!!deletePlanId}
            onOpenChange={(open) => !open && setDeletePlanId(null)}
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
                  Сигурни ли сте, че искате да изтриете този хранителен план?
                  Това действие не може да бъде отменено.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletePlanId(null)}>
                  Отказ
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-secondary hover:bg-destructive/90"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? "Изтриване..." : "Изтрий"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
