"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import type { Meal } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MealFormProps {
  meal?: Meal;
  onSubmit: (data: any) => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined" ? `${window.location.origin}` : "");

const toImageUrl = (u?: string): string => {
  if (!u) return "/placeholder.svg";
  if (/^(data:|blob:)/i.test(u)) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/uploads/")) return `${API_BASE_URL}${u}`;
  const name = u.split(/[\\/]/).pop() || u;
  return `${API_BASE_URL}/uploads/${name}`;
};

type FieldErrors = {
  title?: string;
  calories?: string;
  protein?: string;
  carbohydrates?: string;
  fat?: string;
};

export function MealForm({ meal, onSubmit }: MealFormProps) {
  const { toast } = useToast();

  // keep numbers as strings for easier validation
  const [formData, setFormData] = useState({
    title: meal?.title || "",
    description: meal?.description || "",
    calories: meal?.calories != null ? String(meal.calories) : "",
    protein: meal?.protein != null ? String(meal.protein) : "",
    carbohydrates: meal?.carbohydrates != null ? String(meal.carbohydrates) : "",
    fat: meal?.fat != null ? String(meal.fat) : "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState({
    title: false,
    calories: false,
    protein: false,
    carbohydrates: false,
    fat: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(meal?.image || "");
  const [loading, setLoading] = useState(false);
  const [imageRemoved, setImageRemoved] = useState(false);

  // revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // re-hydrate on meal change
  useEffect(() => {
    setFormData({
      title: meal?.title || "",
      description: meal?.description || "",
      calories: meal?.calories != null ? String(meal.calories) : "",
      protein: meal?.protein != null ? String(meal.protein) : "",
      carbohydrates: meal?.carbohydrates != null ? String(meal.carbohydrates) : "",
      fat: meal?.fat != null ? String(meal.fat) : "",
    });
    setImageFile(null);
    setImagePreview(meal?.image || "");
    setImageRemoved(false);
    setErrors({});
    setTouched({ title: false, calories: false, protein: false, carbohydrates: false, fat: false });
    setSubmitAttempted(false);
  }, [meal?.title, meal?.description, meal?.calories, meal?.protein, meal?.carbohydrates, meal?.fat, meal?.image]);

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setImageRemoved(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageRemoved(false);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // validation helpers
  const validateNumber = (s: string, { integer = false, min = 0 }: { integer?: boolean; min?: number }) => {
    if (s.trim() === "") return { ok: false, n: NaN };
    const n = integer ? Number.parseInt(s, 10) : Number.parseFloat(s);
    if (!Number.isFinite(n)) return { ok: false, n };
    if (integer && !Number.isInteger(n)) return { ok: false, n };
    if (n < min) return { ok: false, n };
    return { ok: true, n };
  };

  const validate = () => {
    const e: FieldErrors = {};
    const title = formData.title.trim();

    if (!title) e.title = "Моля, въведете име.";
    else if (title.length > 120) e.title = "Името може да е най-много 120 символа.";

    const kc = validateNumber(formData.calories, { integer: true, min: 0 });
    if (!kc.ok) e.calories = "Калориите трябва да са цяло число ≥ 0.";

    const pr = validateNumber(formData.protein, { integer: false, min: 0 });
    if (!pr.ok) e.protein = "Протеинът трябва да е число ≥ 0.";

    const cb = validateNumber(formData.carbohydrates, { integer: false, min: 0 });
    if (!cb.ok) e.carbohydrates = "Въглехидратите трябва да са число ≥ 0.";

    const ft = validateNumber(formData.fat, { integer: false, min: 0 });
    if (!ft.ok) e.fat = "Мазнините трябва да са число ≥ 0.";

    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast({
        title: "Има грешки във формата",
        description: "Моля, коригирайте полетата, отбелязани в червено.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        calories: Number.parseInt(formData.calories, 10),
        protein: Number.parseFloat(formData.protein),
        carbohydrates: Number.parseFloat(formData.carbohydrates),
        fat: Number.parseFloat(formData.fat),
      };

      if (imageRemoved) {
        payload.removeImage = true;
      } else if (imageFile) {
        payload.imageFile = imageFile;
      }

      await onSubmit(payload);
    } finally {
      setLoading(false);
    }
  };

  const showTitleError = !!errors.title && (touched.title || submitAttempted);
  const showCalError = !!errors.calories && (touched.calories || submitAttempted);
  const showProtError = !!errors.protein && (touched.protein || submitAttempted);
  const showCarbError = !!errors.carbohydrates && (touched.carbohydrates || submitAttempted);
  const showFatError = !!errors.fat && (touched.fat || submitAttempted);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label className="text-secondary">Снимка на храната</Label>
        {imagePreview ? (
          <div className="relative">
            <img
              src={
                imagePreview.startsWith("data:") || imagePreview.startsWith("blob:")
                  ? imagePreview
                  : toImageUrl(imagePreview)
              }
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative rounded-lg border-2 border-dashed border-secondary/50 p-8 text-center">
            <div className="pointer-events-none flex flex-col items-center justify-center">
              <Upload className="h-12 w-12 text-secondary" />
              <span className="mt-4 text-sm font-medium text-secondary">Качи снимка</span>
              <p className="mt-1 text-xs text-secondary">PNG, JPG, GIF до 10MB</p>
            </div>

            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              aria-label="Качи снимка"
            />
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label className="text-secondary" htmlFor="title">
            Име на храната *
          </Label>
          <Input
            id="title"
            value={formData.title}
            className={`text-secondary ${showTitleError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, title: true }))}
            placeholder="Напр. Пилешко филе на скара"
            aria-required="true"
            aria-invalid={showTitleError}
            aria-errormessage={showTitleError ? "title-error" : undefined}
          />
          {showTitleError && (
            <p id="title-error" className="text-sm text-destructive">
              {errors.title}
            </p>
          )}
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label className="text-secondary" htmlFor="description">
            Описание
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            className="text-secondary"
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Кратко описание на храната..."
            rows={3}
          />
        </div>
      </div>

      {/* Nutritional Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Хранителни стойности (на 100г)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-secondary" htmlFor="calories">
                Калории (kcal) *
              </Label>
              <Input
                id="calories"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                className={`text-secondary ${showCalError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="0"
                value={formData.calories}
                onChange={(e) => setFormData((prev) => ({ ...prev, calories: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, calories: true }))}
                aria-required="true"
                aria-invalid={showCalError}
                aria-errormessage={showCalError ? "calories-error" : undefined}
              />
              {showCalError && (
                <p id="calories-error" className="text-sm text-destructive">
                  {errors.calories}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-secondary" htmlFor="protein">
                Протеини (g) *
              </Label>
              <Input
                id="protein"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                className={`text-secondary ${showProtError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="0"
                value={formData.protein}
                onChange={(e) => setFormData((prev) => ({ ...prev, protein: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, protein: true }))}
                aria-required="true"
                aria-invalid={showProtError}
                aria-errormessage={showProtError ? "protein-error" : undefined}
              />
              {showProtError && (
                <p id="protein-error" className="text-sm text-destructive">
                  {errors.protein}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-secondary" htmlFor="carbohydrates">
                Въглехидрати (g) *
              </Label>
              <Input
                id="carbohydrates"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                className={`text-secondary ${showCarbError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="0"
                value={formData.carbohydrates}
                onChange={(e) => setFormData((prev) => ({ ...prev, carbohydrates: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, carbohydrates: true }))}
                aria-required="true"
                aria-invalid={showCarbError}
                aria-errormessage={showCarbError ? "carbohydrates-error" : undefined}
              />
              {showCarbError && (
                <p id="carbohydrates-error" className="text-sm text-destructive">
                  {errors.carbohydrates}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-secondary" htmlFor="fat">
                Мазнини (g) *
              </Label>
              <Input
                id="fat"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                className={`text-secondary ${showFatError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="0"
                value={formData.fat}
                onChange={(e) => setFormData((prev) => ({ ...prev, fat: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, fat: true }))}
                aria-required="true"
                aria-invalid={showFatError}
                aria-errormessage={showFatError ? "fat-error" : undefined}
              />
              {showFatError && (
                <p id="fat-error" className="text-sm text-destructive">
                  {errors.fat}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Запазване..." : meal ? "Обнови храна" : "Създай храна"}
        </Button>
      </div>
    </form>
  );
}
