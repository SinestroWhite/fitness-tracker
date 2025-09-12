"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Clock, Target, ArrowLeft, CheckCircle } from "lucide-react";
import { apiService, type Session, type SessionExercise } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ---- PIVOT HELPERS ----
const getPivotId = (row: any): string | null => {
  const pid =
    row?.pivot_id ??
    row?.pivotId ??
    row?.session_exercise_id ??
    row?.sessionExerciseId ??
    row?.se_id ??
    null;
  return pid != null ? String(pid) : null;
};

const sortByPivotId = (list: any[] = []) => {
  return [...list].sort((a, b) => {
    const pa = Number(getPivotId(a));
    const pb = Number(getPivotId(b));

    if (Number.isFinite(pa) && Number.isFinite(pb)) return pa - pb; // възходящо
    if (Number.isFinite(pa)) return -1;
    if (Number.isFinite(pb)) return 1;

    // лексикографски с numeric за случаи "2", "10", ...
    return String(getPivotId(a) ?? "").localeCompare(
      String(getPivotId(b) ?? ""),
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      }
    );
  });
};

// ---- MEDIA URL HELPERS (същите както в предишния файл) ----
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  ""
).replace(/\/$/, "");

const toMediaUrl = (u?: string): string => {
  if (!u) return "/placeholder.svg";
  const s = u.trim();
  if (/^https?:\/\//i.test(s) || s.startsWith("blob:") || s.startsWith("data:"))
    return s;
  if (s.startsWith("/uploads/")) return `${API_BASE}${s}`;
  const name = s.split(/[\\/]/).pop() || s;
  return `${API_BASE}/uploads/${name}`;
};

// ---- ЛЕЙБЪЛИ / ПРЕВОДИ ----
type BodyAreaKey = "full_body" | "upper_body" | "lower_body" | "core";

const BODY_AREA_BG: Record<BodyAreaKey, string> = {
  full_body: "Цяло тяло",
  upper_body: "Горна част",
  lower_body: "Долна част",
  core: "Корем",
};

const tBodyArea = (v?: string) =>
  v ? BODY_AREA_BG[v as BodyAreaKey] ?? v.replace("_", " ") : "";

type MuscleKey =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "full_body";

const MUSCLE_BG: Record<MuscleKey, string> = {
  chest: "Гърди",
  back: "Гръб",
  legs: "Крака",
  shoulders: "Рамене",
  arms: "Ръце",
  core: "Корем",
  full_body: "Цяло тяло",
};

const tMuscle = (v?: string) =>
  v ? MUSCLE_BG[v as MuscleKey] ?? v.replace("_", " ") : "";

// ---- НОРМАЛИЗАТОРИ (идентични по идея с предишния файл) ----
type RawSession = {
  id: number | string;
  title: string;
  body_area?: BodyAreaKey;
  bodyArea?: BodyAreaKey;
  duration_mins?: number;
  durationMins?: number;
  description?: string | null;
  author_id?: number | string;
  authorId?: number | string;
  created_at?: string;
  createdAt?: string;
};

const toSession = (r: RawSession): Session => ({
  id: String(r.id),
  title: r.title,
  bodyArea: (r.bodyArea ?? r.body_area) as BodyAreaKey,
  durationMins: (r as any).durationMins ?? (r as any).duration_mins ?? 0,
  description: r.description ?? undefined,
  authorId: String((r as any).authorId ?? (r as any).author_id ?? ""),
  createdAt: (r as any).createdAt ?? (r as any).created_at ?? "",
});

const toSessionExercise = (e: any): SessionExercise => {
  const exercise = e.exercise ?? {
    id: String(e.exercise_id ?? e.exerciseId ?? e.id ?? ""),
    name: e.name,
    muscle: e.muscle,
    image: e.image,
    video: e.video,
  };

  return {
    id: String(e.id),
    name: e.name ?? exercise.name,
    muscle: e.muscle ?? exercise.muscle,
    exerciseId: String(e.exercise_id ?? e.exerciseId ?? exercise.id ?? ""),
    image: e.image ?? exercise.image,
    video: e.video ?? exercise.video,
    pivot_id: String(e.pivot_id ?? e.pivotId ?? ""),
    repetitions: e.repetitions ?? undefined,
    time: e.time ?? undefined,
    exercise,
  } as SessionExercise;
};

// Add this helper near the top (below other functions)
// Put near top (if not already there)
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// Find the pivot id (workout_plan_sessions.id) for (planId, baseSessionId)
async function resolveWpsId(
  planId: string,
  baseSessionId: string
): Promise<string | undefined> {
  try {
    const wps = await apiService.getWorkoutPlanSessions(String(planId));
    const match = Array.isArray(wps)
      ? wps.find(
          (s: any) =>
            String(s.session_id ?? s.sessionId ?? s.session?.id ?? "") ===
            String(baseSessionId)
        )
      : undefined;
    return match ? String(match.id) : undefined;
  } catch {
    return undefined;
  }
}

// (Optional) if planId missing, discover a plan that contains this session
async function resolvePlanIdForSession(
  baseSessionId: string
): Promise<string | undefined> {
  try {
    const res = await apiService.getWorkoutPlanList({ pageSize: 100 });
    for (const plan of res.data ?? []) {
      try {
        const wps = await apiService.getWorkoutPlanSessions(String(plan.id));
        const has = Array.isArray(wps)
          ? wps.some(
              (s: any) =>
                String(s.session_id ?? s.sessionId ?? s.session?.id ?? "") ===
                String(baseSessionId)
            )
          : false;
        if (has) return String(plan.id);
      } catch {}
    }
  } catch {}
  return undefined;
}

export default function WorkoutDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  // най-горе при другите useState
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  // helper за дата (вече го имаш)
  const performedOn = ((): string => {
    const dateParam = searchParams.get("date");
    return dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : toYMD(new Date());
  })();

  useEffect(() => {
    const fetchWorkoutDetails = async () => {
      try {
        setLoading(true);

        // 1) Взимаме сесията (може да е raw) и я нормализираме
        const rawSession = await apiService.getSession(sessionId);
        setSession(toSession(rawSession as RawSession));

        // 2) Взимаме упражненията и ги нормализираме (същата логика като в предишния файл)
        const exRaw = await apiService.getSessionExercises(sessionId);
        const normalized = Array.isArray(exRaw)
          ? exRaw.map(toSessionExercise)
          : [];
        //setExercises(normalized)
        setExercises(sortByPivotId(normalized));

        // след като заредиш упражненията (в края на fetchWorkoutDetails, след setExercises):
        try {
          // открий planId (както е в handleStartWorkout)
          let planId =
            searchParams.get("planId") ??
            (rawSession as any)?.workoutPlanId ??
            undefined;
          if (!planId) planId = await resolvePlanIdForSession(sessionId);

          // открий wpsId
          let wpsId =
            searchParams.get("wpsId") ??
            searchParams.get("workoutPlanSessionId") ??
            undefined;
          if (!wpsId && planId)
            wpsId = await resolveWpsId(String(planId), sessionId);

          if (planId && wpsId) {
            const res = await apiService.getExerciseChecklist({
              workoutPlanId: String(planId),
              sessionId: String(wpsId), // workout_plan_sessions.id
              performedOn, // YYYY-MM-DD
            });
            const map: Record<string, boolean> = {};
            for (const it of res.items ?? []) {
              map[String(it.session_exercise_id)] = !!it.completed;
            }
            setCompletedMap(map);
          } else {
            setCompletedMap({});
          }
        } catch (e) {
          console.warn("Не успях да взема чеклист", e);
          setCompletedMap({});
        }
      } catch (error) {
        console.error("Error fetching workout details:", error);
        toast({
          title: "Грешка",
          description: "Неуспешно зареждане на детайлите за тренировката",
          variant: "destructive",
        });
        setSession(null);
        setExercises([]);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchWorkoutDetails();
    }
  }, [sessionId, toast]);

  const handleStartWorkout = async () => {
    const sp = new URLSearchParams();
    const baseSessionId = String(sessionId);

    // 1) planId: URL → normalized session → discover
    let planId =
      searchParams.get("planId") ??
      (session as any)?.workoutPlanId ??
      undefined;

    if (!planId) {
      planId = await resolvePlanIdForSession(baseSessionId);
    }
    if (!planId) {
      toast({
        title: "Липсва план",
        description:
          "Отвори тренировката с ?planId=... или свържи сесията към план.",
        variant: "destructive",
      });
      return;
    }

    // 2) date: URL → today
    const dateParam = searchParams.get("date");
    const date =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : toYMD(new Date());

    // 3) wpsId: URL → resolve from (planId, sessionId)
    let wpsId =
      searchParams.get("wpsId") ??
      searchParams.get("workoutPlanSessionId") ??
      undefined;

    if (!wpsId) {
      wpsId = await resolveWpsId(String(planId), baseSessionId);
    }
    if (!wpsId) {
      toast({
        title: "Липсва сесия в плана",
        description:
          "Не успях да намеря идентификатор на сесията (workout_plan_sessions) за този план.",
        variant: "destructive",
      });
      return;
    }

    sp.set("planId", String(planId));
    sp.set("date", String(date));
    sp.set("wpsId", String(wpsId));

    router.push(`/workout-player/${baseSessionId}?${sp.toString()}`);
  };

  const handleGoBack = () => {
    router.push(`/schedule`);
  };

  const completedCount = exercises.filter(
    (sx) => completedMap[getPivotId(sx) ?? ""]
  ).length;
  const totalCount = exercises.length;
  const hasProgress = completedCount > 0 && completedCount < totalCount;
  const allDone = totalCount > 0 && completedCount === totalCount;

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Зареждане на тренировката...
              </p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!session) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-primary mb-4">
                Тренировката не е намерена
              </p>
              <Button onClick={handleGoBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={handleGoBack} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-secondary">{session.title}</h1>
                {session.description && (
                  <p className="text-muted-foreground">{session.description}</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleStartWorkout}
              size="lg"
              className={
                allDone
                  ? "bg-slate-600 hover:bg-slate-700"
                  : hasProgress
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {allDone ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Всичко изпълнено – Преглед/Повтори
                </>
              ) : hasProgress ? (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Продължи тренировката ({completedCount}/{totalCount})
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Започни тренировка ({totalCount} упражнения)
                </>
              )}
            </Button>
          </div>

          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Информация за тренировката
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-secondary" />
                  <span className="text-sm text-secondary">
                    Продължителност:
                  </span>
                  <Badge className="text-primary" variant="secondary">{session.durationMins} мин</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-secondary" />
                  <span className="text-sm text-secondary">Област:</span>
                  <Badge className="text-secondary" variant="outline">{tBodyArea(session.bodyArea)}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-secondary">
                    Упражнения:
                  </span>
                  <Badge variant="white">{exercises.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercises List */}
          <Card>
            <CardHeader>
              <CardTitle>Упражнения ({exercises.length})</CardTitle>
              <CardDescription>
                Преглед на всички упражнения в тази тренировка
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exercises.map((sx, index) => {
                  const ex = sx.exercise ?? ({} as any);
                  const imageSrc = ex.image ?? sx.image;
                  const videoSrc = ex.video ?? sx.video;
                  const displayName = ex.name ?? sx.name;
                  const displayMuscle = ex.muscle ?? sx.muscle;
                  const pid = getPivotId(sx) ?? "";
                  const isDone = !!completedMap[pid];

                  return (
                    <div key={pid || sx.id}>
                      <div
                        className={`flex items-start gap-4 p-4 rounded-lg  border-1 border-gray-500 bg-card ${
                          isDone ? "border-green-600 bg-green-900/25" : "bg-transparent"
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
  <div>
    <h3 className="font-semibold text-lg text-secondary">{displayName}</h3>
    {displayMuscle && (
      <Badge variant="white" className="mt-1">
        {tMuscle(String(displayMuscle))}
      </Badge>
    )}
  </div>

  <div className="text-right space-y-1">
    {isDone && (
      <Badge className="bg-green-600 text-secondary">Изпълнено</Badge>
    )}
    {sx.repetitions && (
      <div className="text-sm">
        <span className="text-secondary">Повторения: </span>
        <span className="font-medium text-secondary">{sx.repetitions}</span>
      </div>
    )}
    {sx.time && (
      <div className="text-sm">
        <span className="text-secondary">Време: </span>
        <span className="font-medium text-secondary">{sx.time}с</span>
      </div>
    )}
  </div>
</div>


                          {/* Exercise Media */}
                          {(imageSrc || videoSrc) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {imageSrc && (
                                <div>
                                  <p className="text-sm text-secondary mb-2">
                                    Изображение:
                                  </p>

                                  <button
                                    type="button"
                                    className="block w-full"
                                    onClick={() =>
                                      setImagePreview({
                                        src: toMediaUrl(imageSrc),
                                        alt: displayName || "Exercise",
                                      })
                                    }
                                    aria-label="Преглед на изображението в по-голям размер"
                                  >
                                    <img
                                      src={toMediaUrl(imageSrc)}
                                      alt={displayName || "Exercise"}
                                      className="w-full h-48 object-cover rounded-lg border cursor-zoom-in"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "/placeholder.svg?height=192&width=300&text=Няма+изображение";
                                      }}
                                    />
                                  </button>
                                </div>
                              )}

                              {videoSrc && (
                                <div>
                                  <p className="text-sm text-secondary mb-2">
                                    Видео:
                                  </p>
                                  <video
                                    controls
                                    className="w-full h-48 rounded-lg border"
                                    poster="/placeholder.svg?height=192&width=300&text=Видео"
                                  >
                                    <source
                                      src={toMediaUrl(videoSrc)}
                                      type="video/mp4"
                                    />
                                    Вашият браузър не поддържа видео елемента.
                                  </video>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {index < exercises.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  );
                })}

                {exercises.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Няма добавени упражнения в тази тренировка</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={!!imagePreview}
            onOpenChange={(open) => {
              if (!open) setImagePreview(null);
            }}
          >
            <DialogContent className="max-w-3xl p-0">
              {imagePreview && (
                <img
                  src={imagePreview.src}
                  alt={imagePreview.alt}
                  className="w-full max-h-[80vh] object-contain rounded-md"
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Start Workout Button (Bottom) */}
          {exercises.length > 0 && (
            <div className="flex justify-center pb-6">
              <Button
                onClick={handleStartWorkout}
                size="lg"
                className={
                  allDone
                    ? "bg-slate-600 hover:bg-slate-700"
                    : hasProgress
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-green-600 hover:bg-green-700"
                }
              >
                {allDone ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Всичко изпълнено – Преглед/Повтори
                  </>
                ) : hasProgress ? (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Продължи тренировката ({completedCount}/{totalCount})
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Започни тренировка
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
