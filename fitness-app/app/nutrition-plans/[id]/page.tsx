"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  Target,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  apiService,
  type NutritionPlan,
  type NutritionPlanMealPivot,
} from "@/lib/api";
import { NutritionPlanMealForm } from "@/components/nutrition-plans/nutrition-plan-meal-form";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const goalLabels = {
  lose: "Отслабване",
  gain: "Качване на тегло",
  maintain: "Поддържане",
};

const goalColors = {
  lose: "bg-red-600 text-red-50",
  gain: "bg-green-600 text-green-50",
  maintain: "bg-blue-600 text-blue-50",
};

const dayLabels = {
  Mon: "Понеделник",
  Tue: "Вторник",
  Wed: "Сряда",
  Thu: "Четвъртък",
  Fri: "Петък",
  Sat: "Събота",
  Sun: "Неделя",
};

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

export default function NutritionPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(
    null
  );
  const [meals, setMeals] = useState<NutritionPlanMealPivot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMealDialog, setShowAddMealDialog] = useState(false);
  const [editingMeal, setEditingMeal] = useState<NutritionPlanMealPivot | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canManage = user?.role === "trainer" || user?.role === "admin";
  const nutritionPlanId = params.id as string;

  const [addErrors, setAddErrors] = useState<Record<string, string[]>>({});
  const [addFormError, setAddFormError] = useState<string | null>(null);

  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [editFormError, setEditFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchNutritionPlan();
    fetchMeals();
  }, [nutritionPlanId]);

  const fetchNutritionPlan = async () => {
    try {
      const plan = await apiService.getNutritionPlan(nutritionPlanId, "author");
      setNutritionPlan(plan);
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на хранителния план",
        variant: "destructive",
      });
      router.push("/nutrition-plans");
    }
  };

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const mealsData = await apiService.getNutritionPlanMeals(nutritionPlanId);

      type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

      const mapDay = (raw: any): Day => {
        const d = String(raw ?? "").toLowerCase();
        if (d.startsWith("mon") || d.startsWith("пон")) return "Mon";
        if (d.startsWith("tue") || d.startsWith("вто")) return "Tue";
        if (d.startsWith("wed") || d.startsWith("сря")) return "Wed";
        if (d.startsWith("thu") || d.startsWith("чет")) return "Thu";
        if (d.startsWith("fri") || d.startsWith("пет")) return "Fri";
        if (d.startsWith("sat") || d.startsWith("съб")) return "Sat";
        if (d.startsWith("sun") || d.startsWith("нед")) return "Sun";
        // ако не разпознаем - по подразбиране:
        return "Mon";
      };

      const normalized: NutritionPlanMealPivot[] = mealsData.map((m: any) => {
        const schedule: NonNullable<NutritionPlanMealPivot["schedule"]> =
          Array.isArray(m.schedule)
            ? m.schedule
                .filter((s: any) => s && s.day && s.time)
                .map((s: any) => ({
                  day: mapDay(s.day),
                  time: String(s.time),
                }))
            : [];

        return {
          id: String(m.id),
          nutritionPlanId: String(m.nutrition_plan_id ?? nutritionPlanId),
          mealId: String(m.meal_id),
          meal: {
            id: String(m.meal_id),
            title: String(m.title ?? m.meal?.title ?? "Без име"),
            // ако в твоя тип image е задължително string, дай празен низ като fallback:
            image:
              typeof m.image === "string"
                ? m.image
                : typeof m.meal?.image === "string"
                ? m.meal.image
                : "",
            calories: Number(m.calories ?? m.meal?.calories ?? 0),
            protein: Number(m.protein ?? m.meal?.protein ?? 0),
            carbohydrates: Number(
              m.carbohydrates ?? m.meal?.carbohydrates ?? 0
            ),
            fat: Number(m.fat ?? m.meal?.fat ?? 0),
            // ако description в твоя тип е задължително string:
            description: String(m.description ?? m.meal?.description ?? ""),
          },
          quantity: m.quantity != null ? Number(m.quantity) : undefined,
          quantityKg: m.quantity_kg != null ? Number(m.quantity_kg) : undefined,
          schedule,
        };
      });

      setMeals(normalized);
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на храните",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // const handleAddMeal = async (data: any) => {
  //   try {
  //     setAddErrors({});
  //     setAddFormError(null);

  //     // (по желание – клиентска валидация преди submit)
  //     if (
  //       (data.quantity && data.quantityKg) ||
  //       (!data.quantity && !data.quantityKg)
  //     ) {
  //       setAddFormError(
  //         "Въведи точно едно от: Количество (порции) ИЛИ Количество (кг)."
  //       );
  //       return;
  //     }

  //     await apiService.attachMealToNutritionPlan(nutritionPlanId, data);
  //     toast({ title: "Успех", description: "Храната е добавена успешно" });
  //     setShowAddMealDialog(false);
  //     fetchMeals();
  //   } catch (err: any) {
  //     const status = err?.response?.status;
  //     const serverMsg =
  //       err?.response?.data?.error || // <-- това е твоят случай
  //       err?.response?.data?.message ||
  //       err?.message ||
  //       "Неуспешно добавяне на храната";

  //     // ако е валидационна/бизнес грешка без field errors -> покажи formError и НЕ затваряй диалога
  //     if ((status === 400 || status === 422) && !err?.response?.data?.errors) {
  //       setAddFormError(serverMsg);
  //       return;
  //     }

  //     // ако има field errors
  //     if (status === 422 && err?.response?.data?.errors) {
  //       setAddErrors(err.response.data.errors);
  //       setAddFormError(serverMsg);
  //       return;
  //     }

  //     // други грешки
  //     toast({
  //       title: "Грешка",
  //       description: serverMsg,
  //       variant: "destructive",
  //     });
  //   }
  // };

  const isProvided = (v: any) =>
    v !== undefined && v !== null && `${v}`.trim() !== '' && !Number.isNaN(Number(v));
  
  const isPositive = (v: any) => isProvided(v) && Number(v) > 0;
  
  const handleAddMeal = async (data: any) => {
    try {
      setAddErrors({});
      setAddFormError(null);
  
      // позволи: quantity, quantityKg, или и двете; забрани: и двете празни / невалидни
      if (!isPositive(data.quantity) && !isPositive(data.quantityKg)) {
        setAddFormError("Въведи поне едно от: Количество (порции) или Количество (кг).");
        return;
      }
  
      // нормализирай стойностите към числа; махни празните
      const payload = {
        ...data,
        quantity: isPositive(data.quantity) ? Number(data.quantity) : undefined,
        quantityKg: isPositive(data.quantityKg) ? Number(data.quantityKg) : undefined,
      };
  
      await apiService.attachMealToNutritionPlan(nutritionPlanId, payload);
      toast({ title: "Успех", description: "Храната е добавена успешно" });
      setShowAddMealDialog(false);
      fetchMeals();
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Неуспешно добавяне на храната";
  
      if ((status === 400 || status === 422) && !err?.response?.data?.errors) {
        setAddFormError(serverMsg);
        return;
      }
  
      if (status === 422 && err?.response?.data?.errors) {
        setAddErrors(err.response.data.errors);
        setAddFormError(serverMsg);
        return;
      }
  
      toast({
        title: "Грешка",
        description: serverMsg,
        variant: "destructive",
      });
    }
  };
  

  // EDIT
  const handleUpdateMeal = async (data: any) => {
    if (!editingMeal) return;
    try {
      setEditErrors({});
      setEditFormError(null);

      if (
        (data.quantity && data.quantityKg) ||
        (!data.quantity && !data.quantityKg)
      ) {
        setEditFormError(
          "Въведи точно едно от: Количество (порции) ИЛИ Количество (кг)."
        );
        return;
      }

      await apiService.updateNutritionPlanMeal(editingMeal.id, data);
      toast({ title: "Успех", description: "Храната е обновена успешно" });
      setEditingMeal(null);
      fetchMeals();
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Неуспешно обновяване на храната";

      if ((status === 400 || status === 422) && !err?.response?.data?.errors) {
        setEditFormError(serverMsg);
        return;
      }

      if (status === 422 && err?.response?.data?.errors) {
        setEditErrors(err.response.data.errors);
        setEditFormError(serverMsg);
        return;
      }

      toast({
        title: "Грешка",
        description: serverMsg,
        variant: "destructive",
      });
    }
  };
  const handleDeleteMeal = async (pivotId: string) => {
    try {
      await apiService.detachMealFromNutritionPlan(pivotId);
      toast({
        title: "Успех",
        description: "Храната е премахната успешно",
      });
      setDeleteConfirm(null);
      fetchMeals();
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно премахване на храната",
        variant: "destructive",
      });
    }
  };

  if (loading || !nutritionPlan) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Зареждане...</div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/nutrition-plans")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl text-secondary font-bold">{nutritionPlan.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={goalColors[nutritionPlan.goal]}>
              <Target className="h-3 w-3 mr-1" />
              {goalLabels[nutritionPlan.goal]}
            </Badge>
            {/* <span className="text-sm text-muted-foreground">Автор: {nutritionPlan.author?.name || "Неизвестен"}</span>
            <span className="text-sm text-muted-foreground">
              {new Date(nutritionPlan.createdAt).toLocaleDateString("bg-BG")}
            </span> */}
          </div>
        </div>
      </div>

      {/* Description */}
      {nutritionPlan.description && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Описание</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary">{nutritionPlan.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Meals Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Храни в плана ({meals.length})</CardTitle>
            {canManage && (
              <Dialog
                open={showAddMealDialog}
                onOpenChange={setShowAddMealDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="white">
                    <Plus className="h-4 w-4 mr-2" />
                    Добави храна
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Добави храна към плана</DialogTitle>
                  </DialogHeader>
                  <NutritionPlanMealForm
                    onSubmit={handleAddMeal}
                    serverErrors={addErrors}
                    formError={addFormError}
                    onClearServerErrors={() => {
                      setAddErrors({});
                      setAddFormError(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {meals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary mb-4">
                Няма добавени храни към този план
              </p>
              {canManage && (
                <Button onClick={() => setShowAddMealDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добави първата храна
                </Button>
              )}
            </div>
          ) : (
            // <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            //   {meals.map((mealPivot) => (
            //     <Card key={mealPivot.id} className="relative">
            //       {canManage && (
            //         <div className="absolute top-2 right-2 flex gap-1 z-10">
            //           <Button
            //             size="sm"
            //             variant="secondary"
            //             onClick={() => setEditingMeal(mealPivot)}
            //             className="h-8 w-8 p-0"
            //           >
            //             <Edit className="h-4 w-4 text-primary" />
            //           </Button>
            //           <Button
            //             size="sm"
            //             variant="destructive"
            //             onClick={() => setDeleteConfirm(mealPivot.id)}
            //             className="h-8 w-8 p-0"
            //           >
            //             <Trash2 className="h-4 w-4" />
            //           </Button>
            //         </div>
            //       )}

            //       <CardHeader className="pb-3">
            //         <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
            //           {mealPivot.meal?.image ? (
            //             <img
            //               src={
            //                 toImageUrl(mealPivot.meal.image) ||
            //                 "/placeholder.svg"
            //               }
            //               alt={mealPivot.meal.title}
            //               className="w-full h-full object-cover"
            //               onError={(e) => {
            //                 const target = e.target as HTMLImageElement;
            //                 target.style.display = "none";
            //                 target.nextElementSibling?.classList.remove(
            //                   "hidden"
            //                 );
            //               }}
            //             />
            //           ) : null}
            //           <div
            //             className={`w-full h-full flex items-center justify-center ${
            //               mealPivot.meal?.image ? "hidden" : ""
            //             }`}
            //           >
            //             <ImageIcon className="h-12 w-12 text-primary" />
            //           </div>
            //         </div>
            //         <CardTitle className="text-lg">
            //           {mealPivot.meal?.title}
            //         </CardTitle>
            //       </CardHeader>

            //       <CardContent>
            //         <div className="space-y-2">
            //           {/* Nutritional Info */}
            //           <div className="grid grid-cols-2 gap-2 text-sm">
            //             <div className="flex justify-between">
            //               <span>Калории:</span>
            //               <span className="font-medium">
            //                 {mealPivot.meal?.calories} kcal
            //               </span>
            //             </div>
            //             <div className="flex justify-between">
            //               <span>Протеини:</span>
            //               <span className="font-medium">
            //                 {mealPivot.meal?.protein}g
            //               </span>
            //             </div>
            //             <div className="flex justify-between">
            //               <span>Въглехидрати:</span>
            //               <span className="font-medium">
            //                 {mealPivot.meal?.carbohydrates}g
            //               </span>
            //             </div>
            //             <div className="flex justify-between">
            //               <span>Мазнини:</span>
            //               <span className="font-medium">
            //                 {mealPivot.meal?.fat}g
            //               </span>
            //             </div>
            //           </div>

            //           {/* Quantity */}
            //           {(mealPivot.quantity || mealPivot.quantityKg) && (
            //             <div className="pt-2 border-t">
            //               <div className="flex items-center gap-2 text-sm">
            //                 <span className="text-secondary">
            //                   Количество:
            //                 </span>
            //                 <Badge className="text-secondary" variant="outline">
            //                   {mealPivot.quantity &&
            //                     `${mealPivot.quantity} порции`}
            //                   {mealPivot.quantity &&
            //                     mealPivot.quantityKg &&
            //                     " • "}
            //                   {mealPivot.quantityKg &&
            //                     `${mealPivot.quantityKg} кг`}
            //                 </Badge>
            //               </div>
            //             </div>
            //           )}

            //           {/* Schedule */}
            //           {mealPivot.schedule && mealPivot.schedule.length > 0 && (
            //             <div className="pt-2 border-t">
            //               <div className="flex items-center gap-2 text-sm mb-2">
            //                 <Calendar className="h-4 w-4 text-secondary" />
            //                 <span className="text-secondary">
            //                   График:
            //                 </span>
            //               </div>
            //               <div className="space-y-1">
            //                 {mealPivot.schedule.map((scheduleItem, index) => (
            //                   <div
            //                     key={index}
            //                     className="flex items-center justify-between text-xs"
            //                   >
            //                     <span>{dayLabels[scheduleItem.day]}</span>
            //                     <Badge variant="secondary" className="text-xs text-secondary bg-transparent border-1 border-gray-500">
            //                       <Clock className="h-3 w-3 mr-1" />
            //                       {scheduleItem.time}
            //                     </Badge>
            //                   </div>
            //                 ))}
            //               </div>
            //             </div>
            //           )}
            //         </div>
            //       </CardContent>
            //     </Card>
            //   ))}
            // </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {meals.map((mealPivot) => (
    <Card key={mealPivot.id} className="group hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">
            {mealPivot.meal?.title}
          </CardTitle>

          {canManage && (
            <div className="flex gap-1 ">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingMeal(mealPivot)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteConfirm(mealPivot.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {/* Media with fallback icon */}
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden mb-3">
            {mealPivot.meal?.image ? (
              <>
                <img
                  src={toImageUrl(mealPivot.meal.image)}
                  alt={mealPivot.meal.title}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    e.currentTarget.nextElementSibling?.classList.remove("hidden")
                  }}
                />
                <div className="hidden items-center justify-center text-primary">
                  <ImageIcon className="h-12 w-12" aria-label="No image available" />
                </div>
              </>
            ) : (
              <ImageIcon className="h-12 w-12 text-primary" aria-label="No image available" />
            )}
          </div>

          {/* Nutritional Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span>Калории:</span>
              <span className="font-medium">
                {mealPivot.meal?.calories} kcal
              </span>
            </div>
            <div className="flex justify-between">
              <span>Протеини:</span>
              <span className="font-medium">
                {mealPivot.meal?.protein}g
              </span>
            </div>
            <div className="flex justify-between">
              <span>Въглехидрати:</span>
              <span className="font-medium">
                {mealPivot.meal?.carbohydrates}g
              </span>
            </div>
            <div className="flex justify-between">
              <span>Мазнини:</span>
              <span className="font-medium">
                {mealPivot.meal?.fat}g
              </span>
            </div>
          </div>

          {/* Quantity */}
          {(mealPivot.quantity || mealPivot.quantityKg) && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-secondary">Количество:</span>
                <Badge className="text-secondary" variant="outline">
                  {mealPivot.quantity && `${mealPivot.quantity} порции`}
                  {mealPivot.quantity && mealPivot.quantityKg && " • "}
                  {mealPivot.quantityKg && `${mealPivot.quantityKg} кг`}
                </Badge>
              </div>
            </div>
          )}

          {/* Schedule */}
          {mealPivot.schedule && mealPivot.schedule.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Calendar className="h-4 w-4 text-secondary" />
                <span className="text-secondary">График:</span>
              </div>
              <div className="space-y-1">
                {mealPivot.schedule.map((scheduleItem, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs"
                  >
                    <span>{dayLabels[scheduleItem.day]}</span>
                    <Badge
                      variant="secondary"
                      className="text-xs text-secondary bg-transparent border-1 border-gray-500"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {scheduleItem.time}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  ))}
</div>

          )}
        </CardContent>
      </Card>

      {/* Edit Meal Dialog */}
      <Dialog open={!!editingMeal} onOpenChange={() => setEditingMeal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактирай храна в плана</DialogTitle>
          </DialogHeader>
          {editingMeal && (
            <NutritionPlanMealForm
              mealPivot={editingMeal}
              onSubmit={handleUpdateMeal}
              serverErrors={editErrors}
              formError={editFormError}
              onClearServerErrors={() => {
                setEditErrors({});
                setEditFormError(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {/* <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Потвърди премахване</DialogTitle>
          </DialogHeader>
          <DialogDescription>Сигурни ли сте, че искате да премахнете тази храна от плана?</DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Отказ
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteMeal(deleteConfirm)}
            >
              Премахни
            </Button>
          </div>
        </DialogContent>
      </Dialog> */}

<AlertDialog
  open={!!deleteConfirm}
  onOpenChange={(open) => !open && setDeleteConfirm(null)}
>
  <AlertDialogContent
    onPointerDownCapture={(e) => e.stopPropagation()}
    onKeyDownCapture={(e) => {
      if ((e as React.KeyboardEvent).key === "Escape") e.stopPropagation();
    }}
  >
    <AlertDialogHeader>
      <AlertDialogTitle>Потвърди премахване</AlertDialogTitle>
      <AlertDialogDescription>
        Сигурни ли сте, че искате да премахнете тази храна от плана?
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
        Отказ
      </AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-secondary hover:bg-destructive/90"
        onClick={() => deleteConfirm && handleDeleteMeal(deleteConfirm)}
      >
        Премахни
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

    </div>
    </DashboardLayout>
  );
}
