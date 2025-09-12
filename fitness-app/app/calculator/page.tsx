"use client";

import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

type Sex = "male" | "female";

type ActivityKey =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive"
  | "athlete";

const ACTIVITY: Record<
  ActivityKey,
  { label: string; factor: number; hint: string }
> = {
  sedentary: {
    label: "Седящ начин (малко/без тренировки)",
    factor: 1.2,
    hint: "Офис работа, без редовно движение",
  },
  light: {
    label: "Лека активност (1–3 тренировки/седмица)",
    factor: 1.375,
    hint: "Разходки, леки тренировки",
  },
  moderate: {
    label: "Умерена активност (3–5 тренировки/седмица)",
    factor: 1.55,
    hint: "Редовни тренировки",
  },
  active: {
    label: "Висока активност (6–7 пъти/седмица)",
    factor: 1.725,
    hint: "Интензивни тренировки",
  },
  veryActive: {
    label: "Много висока активност (тежък физически труд)",
    factor: 1.9,
    hint: "Физически труд/двуразови тренировки",
  },
  athlete: {
    label: "Състезател/много натоварен график",
    factor: 2.1,
    hint: "Спорт на високо ниво",
  },
};

const GOALS = [
  { key: "cut_mild", label: "Отслабване – леко (-10%)", pct: -0.1 },
  { key: "cut_mod", label: "Отслабване – умерено (-15%)", pct: -0.15 },
  { key: "cut_agg", label: "Отслабване – агресивно (-20%)", pct: -0.2 },
  { key: "recomp", label: "Поддържане/Ри-комп (±0%)", pct: 0 },
  { key: "gain_mild", label: "Качване – леко (+10%)", pct: 0.1 },
  { key: "gain_mod", label: "Качване – умерено (+15%)", pct: 0.15 },
  { key: "gain_agg", label: "Качване – агресивно (+20%)", pct: 0.2 },
] as const;

type GoalKey = (typeof GOALS)[number]["key"];

export default function HB_TDEE_Calculator() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState<number | "">("");
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [activity, setActivity] = useState<ActivityKey>("moderate");
  const [goal, setGoal] = useState<GoalKey>("recomp");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [proteinPerKg, setProteinPerKg] = useState<number>(1.8);
  const [fatPercent, setFatPercent] = useState<number>(30);

  const bmr = useMemo(() => {
    if (age === "" || heightCm === "" || weightKg === "") return 0;
    if (sex === "male") {
      return (
        88.362 +
        13.397 * Number(weightKg) +
        4.799 * Number(heightCm) -
        5.677 * Number(age)
      );
    }
    return (
      447.593 +
      9.247 * Number(weightKg) +
      3.098 * Number(heightCm) -
      4.33 * Number(age)
    );
  }, [sex, weightKg, heightCm, age]);

  const tdee = useMemo(
    () => (bmr ? bmr * ACTIVITY[activity].factor : 0),
    [bmr, activity]
  );

  const goalPct = useMemo(() => GOALS.find((g) => g.key === goal)!.pct, [goal]);

  const targetCalories = useMemo(
    () => (tdee ? Math.round(tdee * (1 + goalPct)) : 0),
    [tdee, goalPct]
  );

  const macros = useMemo(() => {
    if (!targetCalories || weightKg === "")
      return { proteinG: 0, fatG: 0, carbsG: 0 };
    const proteinG = Math.round(proteinPerKg * Number(weightKg));
    const fatG = Math.round((targetCalories * (fatPercent / 100)) / 9);
    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;
    const carbsKcal = Math.max(targetCalories - proteinKcal - fatKcal, 0);
    const carbsG = Math.round(carbsKcal / 4);
    return { proteinG, fatG, carbsG };
  }, [proteinPerKg, weightKg, targetCalories, fatPercent]);

  const numberFmt = (n: number) => n.toLocaleString("bg-BG");

  return (
    <DashboardLayout>
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl text-secondary sm:text-3xl font-semibold tracking-tight text-center">
          Harris–Benedict TDEE Калкулатор
        </h1>

        <p className="text-center text-sm text-secondary mt-2">
          Изчислява BMR (Harris–Benedict), TDEE и автоматично задава калориен
          таргет според целта.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Card className="shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle>Входни данни</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sex">Пол</Label>
                  <Select value={sex} onValueChange={(v) => setSex(v as Sex)}>
                    <SelectTrigger id="sex" className="mt-1">
                      <SelectValue placeholder="Изберете" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Мъж</SelectItem>
                      <SelectItem value="female">Жена</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="age">Възраст</Label>
                  <Input
                    id="age"
                    type="number"
                    className="mt-1 border-1 border-gray-500"
                    value={age}
                    placeholder="напр. 25"
                    onChange={(e) =>
                      setAge(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="height">Ръст (см)</Label>
                  <Input
                    id="height"
                    type="number"
                    className="mt-1 border-1 border-gray-500"
                    value={heightCm}
                    placeholder="напр. 175"
                    onChange={(e) =>
                      setHeightCm(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Тегло (кг)</Label>
                  <Input
                    id="weight"
                    type="number"
                    className="mt-1 border-1 border-gray-500"
                    value={weightKg}
                    placeholder="напр. 70"
                    onChange={(e) =>
                      setWeightKg(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Активност</Label>
                <Select
                  value={activity}
                  onValueChange={(v) => setActivity(v as ActivityKey)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Ниво на активност" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY).map(([key, v]) => (
                      <SelectItem key={key} value={key}>
                        {v.label} · x{v.factor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {ACTIVITY[activity].hint}
                </p>
              </div>

              <div>
                <Label>Цел</Label>
                <Select
                  value={goal}
                  onValueChange={(v) => setGoal(v as GoalKey)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Изберете цел" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g.key} value={g.key}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Процент: {(goalPct * 100).toFixed(0)}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle>Резултати</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatBox
                  label="BMR (kcal)"
                  value={bmr ? numberFmt(Math.round(bmr)) : "–"}
                />
                <StatBox
                  label="TDEE (kcal)"
                  value={tdee ? numberFmt(Math.round(tdee)) : "–"}
                />
              </div>
              <div>
                <StatBig
                  label="Калориен таргет (kcal/ден)"
                  value={targetCalories ? numberFmt(targetCalories) : "–"}
                />
              </div>

              <Tabs defaultValue="macros" className="mt-2">
                <Label>Хранителни вещества</Label>

                <TabsContent value="macros" >
                  <div className="grid grid-cols-3 gap-3">
                    <MacroBox
                      label="Белтъчини"
                      value={macros.proteinG ? `${macros.proteinG} g` : "–"}
                    />
                    <MacroBox
                      label="Мазнини"
                      value={macros.fatG ? `${macros.fatG} g` : "–"}
                    />
                    <MacroBox
                      label="Въглехидрати"
                      value={macros.carbsG ? `${macros.carbsG} g` : "–"}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-1 border-gray-500 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function StatBig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-1 border-gray-500 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function MacroBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-1 border-gray-500 p-3">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function WeeklyBox({
  tdee,
  targetCalories,
}: {
  tdee: number;
  targetCalories: number;
}) {
  const diffPerDay = Math.round(targetCalories - tdee);
  const diffPerWeek = diffPerDay * 7;
  const kgPerWeek = diffPerWeek / 7700;

  const fmt = (n: number) =>
    n.toLocaleString("bg-BG", { maximumFractionDigits: 2 });

  return (
    <div className="rounded-xl border p-3 space-y-1">
      <div className="text-sm">
        Дневен калориен баланс:{" "}
        <span className="font-semibold">
          {diffPerDay > 0 ? "+" : ""}
          {diffPerDay} kcal
        </span>
      </div>
      <div className="text-sm">
        Седмична разлика:{" "}
        <span className="font-semibold">
          {diffPerWeek > 0 ? "+" : ""}
          {diffPerWeek} kcal
        </span>
      </div>
      <div className="text-sm">
        Ориентировъчна промяна в теглото/седмица:{" "}
        <span className="font-semibold">{fmt(kgPerWeek)} кг</span>
      </div>
    </div>
  );
}
