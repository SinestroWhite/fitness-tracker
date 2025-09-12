import { authService } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_PAGE_SIZE = 25; // синхронизирай със сървъра
const MAX_PAGE_SIZE = 100; // <- смени на реалната горна граница

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
type UsersResponse = { users: User[]; pagination: Pagination };

const stripOrigin = (u: string) => u.replace(/^https?:\/\/[^/]+/i, "");

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "trainer" | "admin";
  created_at: string;
}

export interface UserPersonal {
  id: string;
  userId: string;
  sex: "male" | "female";
  height: number;
  goal: "lose" | "gain" | "keep";
  nutritionPlanId?: string;
  workoutPlanId?: string;
}

export interface UpdateUserPersonalData {
  sex?: "male" | "female";
  height?: number;
  goal?: "lose" | "gain" | "keep";
  nutritionPlanId?: string | null;
  workoutPlanId?: string | null;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: "user" | "trainer" | "admin";
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: "user" | "trainer" | "admin";
}

export type ProgressRowApi = {
  id: number;
  weight_kg: string;
  body_fat: string;
  images: string[];
  created_at: string;
};

export type ProgressApiResponse = {
  progress: ProgressRowApi[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type TrainerClientResponse = {
  client: {
    id: number;
    email: string;
    name: string;
    role: "user" | "trainer" | "admin";
    trainer_id: number | null;
    created_at: string;
    personalInfo?: {
      id: number;
      user_id: number;
      sex?: "male" | "female" | null;
      height?: number | string | null;
      goal?: "lose" | "gain" | "keep" | null;
      nutrition_plan_id?: number | null;
      workout_plan_id?: number | null;
    } | null;
    latestProgress?: {
      id: number;
      user_id: number;
      weight_kg: number;
      body_fat?: number | null;
      images?: unknown;
      created_at: string;
    } | null;
  };
};

export type Client = {
  id: string | number;
  name?: string;
  email?: string;
  role?: string;
  created_at?: string;
};

export type TrainerClientsResponse = {
  clients: Client[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export interface UserListParams {
  page?: number;
  pageSize?: number;
  role?: "user" | "trainer" | "admin";
  email?: string;
}

export interface Progress {
  id: string;
  weightKg: number;
  bodyFat?: number;
  images?: string[];
  createdAt: string;
}

type GetProgressResponse = {
  progress: any[]; // note: raw from server
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export interface TrainerListParams {
  page?: number;
  pageSize?: number;
}

export interface CreateProgressData {
  weightKg: number;
  bodyFat?: number;
  images?: string[];
}

export interface UpdateProgressData {
  weightKg?: number;
  bodyFat?: number;
  images?: string[];
}

export interface ProgressListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
}

function toISODate(input: any): string {
  // handles ISO string, epoch seconds, epoch ms
  if (typeof input === "string") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (typeof input === "number") {
    // heuristic: seconds vs ms
    const ms = input < 10_000_000_000 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return new Date().toISOString();
}

function toNumberOrUndef(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

class ApiService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = authService.getAccessToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Try to refresh token
      try {
        await authService.refreshTokens();
        const newToken = authService.getAccessToken();

        // Retry the request with new token
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.error || "API грешка");
        }

        return retryResponse;
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = "/login";
        throw new Error("Сесията е изтекла");
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API грешка");
    }

    return response;
  }

  private async makeRequestMeal(endpoint: string, options: RequestInit = {}) {
    const token = authService.getAccessToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Try to refresh token
      try {
        await authService.refreshTokens();
        const newToken = authService.getAccessToken();

        // Retry the request with new token
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.error || "API грешка");
        }

        return retryResponse;
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = "/login";
        throw new Error("Сесията е изтекла");
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API грешка");
    }

    return response;
  }

  // User profile methods
  async getCurrentUser() {
    const response = await this.makeRequest("/users/me");
    return response.json();
  }

  async updateCurrentUser(data: UpdateUserData) {
    // const response = await this.makeRequest("/users/me", {
    //   method: "PUT",
    //   body: JSON.stringify(data),
    // })
    // return response.json()
    const res = await this.makeRequest("/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const j = await res.json();
    // normalize if your API uses snake_case
    const updated = j?.user ?? j;
    return {
      id: String(updated.id),
      email: updated.email,
      name: updated.name ?? "",
      role: updated.role,
      createdAt: updated.createdAt ?? updated.created_at ?? "",
    };
  }

  // User personal methods
  // async getUserPersonal(): Promise<UserPersonal | null> {
  //   try {
  //     const response = await this.makeRequest("/user-personal/me")
  //     return response.json()
  //   } catch (error) {
  //     // If no personal data exists yet, return null
  //     if (error instanceof Error && error.message.includes("404")) {
  //       return null
  //     }
  //     throw error
  //   }
  // }

  async updateUserPersonal(
    data: UpdateUserPersonalData
  ): Promise<UserPersonal> {
    const response = await this.makeRequest("/user-personal/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getUserPersonal(): Promise<UserPersonal | null> {
    try {
      const res = await this.makeRequest("/user-personal/me");
      const j = await res.json();

      const p = j?.profile; // <-- backend puts data here
      if (!p) return null;

      const heightNum =
        p.height != null && p.height !== ""
          ? Number.parseFloat(String(p.height))
          : undefined;

      return {
        id: String(p.id),
        userId: String(p.user_id),
        sex: p.sex === "female" ? "female" : "male", // backend sends "female"/"male"
        height: heightNum as number, // your type expects number
        goal: p.goal as "lose" | "gain" | "keep",
        nutritionPlanId:
          p.nutrition_plan_id != null ? String(p.nutrition_plan_id) : undefined,
        workoutPlanId:
          p.workout_plan_id != null ? String(p.workout_plan_id) : undefined,
      };
    } catch (err: any) {
      // if server uses 404 when no profile exists
      if (err?.message?.includes("HTTP 404")) return null;
      throw err;
    }
  }

  async getProgressList(
    params: ProgressListParams = {}
  ): Promise<{
    data: Progress[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const sp = new URLSearchParams();

    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    if (params.sort)
      sp.set("sort", params.sort.replace("createdAt", "created_at"));
    if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
    if (params.dateTo) sp.set("dateTo", params.dateTo);

    const qs = sp.toString();
    const res = await this.makeRequest(`/progress/me${qs ? `?${qs}` : ""}`);

    // Read ONCE
    const json = await res.json();
    console.debug("progress raw:", json);

    // Accept either { progress, pagination } or { data, ... }
    const items = Array.isArray(json?.progress)
      ? json.progress
      : Array.isArray(json?.data)
      ? json.data
      : [];

    // Normalize to your Progress interface
    const mapped: Progress[] = items.map((p: any) =>
      "weightKg" in p
        ? p // already normalized
        : {
            id: String(p.id),
            weightKg: parseFloat(p.weight_kg ?? "0"), // ensure number
            bodyFat: p.body_fat != null ? parseFloat(p.body_fat) : undefined,
            images: Array.isArray(p.images) ? p.images : [],
            createdAt: p.created_at ?? p.createdAt,
          }
    );

    const pg = json?.pagination ?? {};
    return {
      data: mapped,
      total: Number(pg.total ?? mapped.length),
      page: Number(pg.page ?? params.page ?? 1),
      pageSize: Number(pg.pageSize ?? params.pageSize ?? mapped.length),
    };
  }

  // async getProgress(id: string): Promise<Progress[]> {
  //   const response = await this.makeRequest(`/progress/${id}`)
  //   const data = (await response.json()) as GetProgressResponse
  //   return data.progress
  // }

  async getProgress(id: string): Promise<Progress[]> {
    const response = await apiService.makeRequest(`/progress/${id}`);
    const data = (await response.json()) as GetProgressResponse;

    const normalized: Progress[] = (data?.progress ?? []).map((p: any) => {
      const weightKg =
        toNumberOrUndef(p.weightKg) ??
        toNumberOrUndef(p.weight_kg) ??
        toNumberOrUndef(p.weight);

      const bodyFat =
        toNumberOrUndef(p.bodyFat) ??
        toNumberOrUndef(p.body_fat) ??
        toNumberOrUndef(p.bodyFatPercent) ??
        toNumberOrUndef(p.body_fat_percent);

      return {
        id: p.id ?? p._id ?? crypto.randomUUID(),
        weightKg: weightKg ?? 0, // or throw if you require it
        bodyFat: bodyFat,
        images: Array.isArray(p.images) ? p.images : [],
        createdAt: toISODate(p.createdAt ?? p.created_at ?? p.date),
      };
    });

    return normalized;
  }

  async createProgress(data: CreateProgressData): Promise<Progress> {
    const response = await this.makeRequest("/progress/me", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async updateProgress(
    id: string,
    data: UpdateProgressData
  ): Promise<Progress> {
    const response = await this.makeRequest(`/progress/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async addProgressImages(id: string, data: FormData): Promise<Progress> {
    const token = authService.getAccessToken();

    const response = await fetch(`${API_BASE_URL}/progress/${id}/images`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data,
    });

    if (response.status === 401) {
      try {
        await authService.refreshTokens();
        const newToken = authService.getAccessToken();

        const retryResponse = await fetch(
          `${API_BASE_URL}/progress/${id}/images`,
          {
            method: "POST",
            headers: {
              ...(newToken && { Authorization: `Bearer ${newToken}` }),
            },
            body: data,
          }
        );

        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.error || "API грешка");
        }

        const result = await retryResponse.json();
        return result;
      } catch (refreshError) {
        window.location.href = "/login";
        throw new Error("Сесията е изтекла");
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API грешка");
    }

    const result = await response.json();
    return result;
  }

  async deleteProgressImage(progressId: string, imageUrlOrPath: string) {
    const token = authService.getAccessToken();
    const image = stripOrigin(imageUrlOrPath); // ensure "/uploads/xxx.png"

    const res = await fetch(`${API_BASE_URL}/progress/${progressId}/images`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ image }),
    });

    if (res.status === 401) {
      await authService.refreshTokens();
      const newToken = authService.getAccessToken();
      const retry = await fetch(
        `${API_BASE_URL}/progress/${progressId}/images`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
          },
          body: JSON.stringify({ image }),
        }
      );
      if (!retry.ok)
        throw new Error((await retry.json()).error || "API грешка");
      return retry.json(); // { progress: {...} }
    }

    if (!res.ok) throw new Error((await res.json()).error || "API грешка");
    return res.json(); // { progress: {...} }
  }

  async updateProgressWithImages(
    id: string,
    data: FormData
  ): Promise<Progress> {
    const token = authService.getAccessToken();

    const response = await fetch(`${API_BASE_URL}/progress/${id}`, {
      method: "PUT",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data,
    });

    if (response.status === 401) {
      try {
        await authService.refreshTokens();
        const newToken = authService.getAccessToken();

        const retryResponse = await fetch(`${API_BASE_URL}/progress/${id}`, {
          method: "PUT",
          headers: {
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
          },
          body: data,
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.error || "API грешка");
        }

        return retryResponse.json();
      } catch (refreshError) {
        window.location.href = "/login";
        throw new Error("Сесията е изтекла");
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API грешка");
    }

    return response.json();
  }

  async deleteProgress(id: string): Promise<void> {
    await this.makeRequest(`/progress/${id}`, {
      method: "DELETE",
    });
  }

  // Image upload method (for multipart/form-data)
  async uploadProgressImages(data: FormData): Promise<Progress> {
    const token = authService.getAccessToken();

    const response = await fetch(`${API_BASE_URL}/progress/me`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data,
    });

    if (response.status === 401) {
      try {
        await authService.refreshTokens();
        const newToken = authService.getAccessToken();

        const retryResponse = await fetch(`${API_BASE_URL}/progress`, {
          method: "POST",
          headers: {
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
          },
          body: data,
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.error || "API грешка");
        }

        return retryResponse.json();
      } catch (refreshError) {
        window.location.href = "/login";
        throw new Error("Сесията е изтекла");
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API грешка");
    }

    return response.json();
  }

  async getUserList(params: UserListParams = {}): Promise<UsersResponse> {
    const searchParams = new URLSearchParams();

    // backend appears 1-based (you showed page: 1)
    if (params.page != null)
      searchParams.set("page", String(Math.max(1, params.page)));

    if (params.pageSize != null) {
      const ps = Math.max(1, Math.min(params.pageSize, MAX_PAGE_SIZE));
      if (ps !== params.pageSize)
        console.warn(`pageSize ${params.pageSize} too large; sending ${ps}`);
      searchParams.set("pageSize", String(ps));
    }

    if (params.role) searchParams.set("role", params.role);
    if (params.email) searchParams.set("email", params.email);

    const qs = searchParams.toString();
    const url = qs ? `/users?${qs}` : "/users";

    const res = await this.makeRequest(url);
    const text = await res.text();
    const body = text
      ? (() => {
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        })()
      : null;

    if (!res.ok) {
      const details =
        typeof body === "object" && body?.details
          ? ` | ${JSON.stringify(body.details)}`
          : "";
      throw new Error(`${(body as any)?.error || res.statusText}${details}`);
    }

    return body as UsersResponse;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.makeRequest(`/users/${id}`);
    return response.json();
  }

  async createUser(data: CreateUserData): Promise<User> {
    const response = await this.makeRequest("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const response = await this.makeRequest(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteUser(id: string): Promise<void> {
    await this.makeRequest(`/users/${id}`, {
      method: "DELETE",
    });
  }

  // async getTrainers(params: TrainerListParams = {}): Promise<{
  //   data: User[]
  //   total: number
  //   page: number
  //   pageSize: number
  // }> {
  //   const searchParams = new URLSearchParams()

  //   if (params.page) searchParams.append("page", params.page.toString())
  //   if (params.pageSize) searchParams.append("pageSize", params.pageSize.toString())

  //   const response = await this.makeRequest(`/users/trainers?${searchParams.toString()}`)

  //   return response.json()
  // }
  // в "@/lib/api"
  async getTrainers(params: TrainerListParams = {}): Promise<{
    data: User[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.pageSize)
      searchParams.append("pageSize", params.pageSize.toString());

    const res = await this.makeRequest(
      `/users/trainers?${searchParams.toString()}`
    );
    const json = await res.json();

    // Поддържаме и двата варианта: { data, ... } ИЛИ { trainers, pagination }
    const raw = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.trainers)
      ? json.trainers
      : [];

    const pagination = json?.pagination ?? {};

    // Нормализация към User (camelCase полета)
    const data: User[] = raw.map((t: any) => ({
      id: String(t.id ?? t.uuid ?? t.user_id),
      name: t.name ?? t.full_name ?? "",
      email: t.email ?? "",
      createdAt: t.createdAt ?? t.created_at ?? new Date().toISOString(),
      clientCount: t.client_count ?? t.clientCount ?? 0,
    }));

    return {
      data,
      total: json?.total ?? pagination?.total ?? data.length,
      page: json?.page ?? pagination?.page ?? params.page ?? 1,
      pageSize:
        json?.pageSize ??
        pagination?.pageSize ??
        params.pageSize ??
        data.length,
    };
  }

  async selectTrainer(trainerId: string): Promise<User> {
    const response = await this.makeRequest("/users/me/trainer", {
      method: "PUT",
      body: JSON.stringify({ trainerId }),
    });
    return response.json();
  }

  async getCurrentTrainer(): Promise<User | null> {
    try {
      const response = await this.makeRequest("/users/me/trainer");
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  // Admin personal data management
  async getUserPersonalByUserId(userId: string): Promise<UserPersonal | null> {
    try {
      const response = await this.makeRequest(`/user-personal/${userId}`);
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  async updateUserPersonalByUserId(
    userId: string,
    data: UpdateUserPersonalData
  ): Promise<UserPersonal> {
    const response = await this.makeRequest(`/user-personal/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    return response.json();
  }

  async getTrainerClients(): Promise<TrainerClientsResponse> {
    const response = await this.makeRequest("/users/trainer/clients");
    return response.json();
  }

  async getTrainerClient(clientId: string): Promise<TrainerClientResponse> {
    const response = await this.makeRequest(
      `/users/trainer/clients/${clientId}`
    );
    console.log(response)
    return response.json();
  }

  async getExerciseList(params: ExerciseListParams = {}): Promise<{
    data: Exercise[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.pageSize)
      searchParams.append("pageSize", params.pageSize.toString());
    if (params.muscle) searchParams.append("muscle", params.muscle);
    if (params.search) searchParams.append("search", params.search);

    const response = await this.makeRequest(
      `/exercises?${searchParams.toString()}`
    );
    return response.json();
  }

  async getExercise(id: string): Promise<Exercise> {
    const response = await this.makeRequest(`/exercises/${id}`);
    return response.json();
  }

  async createExercise(data: CreateExerciseData): Promise<Exercise> {
    const response = await this.makeRequest("/exercises", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async updateExercise(
    id: string,
    data: UpdateExerciseData
  ): Promise<Exercise> {
    const response = await this.makeRequest(`/exercises/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteExercise(id: string): Promise<void> {
    await this.makeRequest(`/exercises/${id}`, {
      method: "DELETE",
    });
  }

  async createExerciseWithFiles(data: FormData): Promise<Exercise> {
    const token = authService.getAccessToken();

    const response = await fetch(`${API_BASE_URL}/exercises`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data,
    });

    if (response.status === 401) {
      try {
        await authService.refreshTokens();
        const newToken = authService.getAccessToken();

        const retryResponse = await fetch(`${API_BASE_URL}/exercises`, {
          method: "POST",
          headers: {
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
          },
          body: data,
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.error || "API грешка");
        }

        return retryResponse.json();
      } catch (refreshError) {
        window.location.href = "/login";
        throw new Error("Сесията е изтекла");
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API грешка");
    }

    return response.json();
  }

  async updateExerciseWithFiles(id: string, data: FormData): Promise<Exercise> {
    const token = authService.getAccessToken();

    const response = await fetch(`${API_BASE_URL}/exercises/${id}`, {
      method: "PUT",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data,
    });

    if (response.status === 401) {
      try {
        await authService.refreshTokens();
        const newToken = authService.getAccessToken();

        const retryResponse = await fetch(`${API_BASE_URL}/exercises/${id}`, {
          method: "PUT",
          headers: {
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
          },
          body: data,
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.error || "API грешка");
        }

        return retryResponse.json();
      } catch (refreshError) {
        window.location.href = "/login";
        throw new Error("Сесията е изтекла");
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API грешка");
    }

    return response.json();
  }

  async getSessionList(params: SessionListParams = {}): Promise<{
    data: Session[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.pageSize)
      searchParams.append("pageSize", params.pageSize.toString());
    if (params.bodyArea) searchParams.append("bodyArea", params.bodyArea);
    if (params.durationMin)
      searchParams.append("durationMin", params.durationMin.toString());
    if (params.durationMax)
      searchParams.append("durationMax", params.durationMax.toString());
    if (params.authorId) searchParams.append("authorId", params.authorId);
    if (params.search) searchParams.append("search", params.search);

    const response = await this.makeRequest(
      `/sessions?${searchParams.toString()}`
    );
    return response.json();
  }

  async getSession(id: string, include?: string): Promise<Session> {
    const searchParams = new URLSearchParams();
    if (include) searchParams.append("include", include);

    const response = await this.makeRequest(
      `/sessions/${id}?${searchParams.toString()}`
    );
    return response.json();
  }

  async createSession(data: CreateSessionData): Promise<Session> {
    const response = await this.makeRequest("/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async updateSession(id: string, data: UpdateSessionData): Promise<Session> {
    const response = await this.makeRequest(`/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteSession(id: string): Promise<void> {
    await this.makeRequest(`/sessions/${id}`, {
      method: "DELETE",
    });
  }

  async getSessionExercises(sessionId: string): Promise<SessionExercise[]> {
    const response = await this.makeRequest(`/sessions/${sessionId}/exercises`);
    return response.json();
  }

  async addSessionExercise(
    sessionId: string,
    data: AddSessionExerciseData
  ): Promise<SessionExercise> {
    const response = await this.makeRequest(
      `/sessions/${sessionId}/exercises`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  async updateSessionExercise(
    pivotId: string,
    data: UpdateSessionExerciseData
  ): Promise<SessionExercise> {
    const response = await this.makeRequest(`/session-exercises/${pivotId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteSessionExercise(pivotId: string): Promise<void> {
    await this.makeRequest(`/session-exercises/${pivotId}`, {
      method: "DELETE",
    });
  }

  async getWorkoutPlanList(params: WorkoutPlanListParams = {}): Promise<{
    data: WorkoutPlan[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.pageSize)
      searchParams.append("pageSize", params.pageSize.toString());
    if (params.goal) searchParams.append("goal", params.goal);
    if (params.search) searchParams.append("search", params.search);

    const response = await this.makeRequest(
      `/workout-plans?${searchParams.toString()}`
    );
    return response.json();
  }

  async getWorkoutPlan(id: number, include?: string): Promise<WorkoutPlan> {
    const searchParams = new URLSearchParams();
    if (include) searchParams.append("include", include);

    const response = await this.makeRequest(
      `/workout-plans/${id.toString()}?${searchParams.toString()}`
    );
    return response.json();
  }

  async createWorkoutPlan(data: CreateWorkoutPlanData): Promise<WorkoutPlan> {
    const response = await this.makeRequest("/workout-plans", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async updateWorkoutPlan(
    id: string,
    data: UpdateWorkoutPlanData
  ): Promise<WorkoutPlan> {
    const response = await this.makeRequest(`/workout-plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteWorkoutPlan(id: string): Promise<void> {
    await this.makeRequest(`/workout-plans/${id}`, {
      method: "DELETE",
    });
  }

  async getWorkoutPlanSessions(
    workoutPlanId: string
  ): Promise<WorkoutPlanSession[]> {
    const response = await this.makeRequest(
      `/workout-plans/${workoutPlanId}/sessions`
    );
    return response.json();
  }

  async addWorkoutPlanSession(
    workoutPlanId: string,
    data: AddWorkoutPlanSessionData
  ): Promise<WorkoutPlanSession> {
    const response = await this.makeRequest(
      `/workout-plans/${workoutPlanId}/sessions`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  async updateWorkoutPlanSession(
    pivotId: string,
    data: UpdateWorkoutPlanSessionData
  ): Promise<WorkoutPlanSession> {
    const response = await this.makeRequest(
      `/workout-plan-sessions/${pivotId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  async deleteWorkoutPlanSession(pivotId: string): Promise<void> {
    await this.makeRequest(`/workout-plan-sessions/${pivotId}`, {
      method: "DELETE",
    });
  }

  async assignWorkoutPlanToClient(
    clientId: string,
    workoutPlanId: string
  ): Promise<UserPersonal> {
    const response = await this.makeRequest(
      `/trainer/clients/${clientId}/workout-plan`,
      {
        method: "PUT",
        body: JSON.stringify({ workoutPlanId }),
      }
    );
    return response.json();
  }

  async removeWorkoutPlanFromClient(clientId: string): Promise<UserPersonal> {
    const response = await this.makeRequest(
      `/trainer/clients/${clientId}/workout-plan`,
      {
        method: "DELETE",
      }
    );
    return response.json();
  }

  async getUserWorkoutSchedule(): Promise<{
    workoutPlan: WorkoutPlan | null;
    schedule: { [key: string]: Session[] };
  }> {
    const response = await this.makeRequest("/users/me/workout-schedule");
    return response.json();
  }

  async getCompletedWorkouts(params: CompletedWorkoutListParams = {}): Promise<{
    data: CompletedUserWorkout[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.pageSize)
      searchParams.append("pageSize", params.pageSize.toString());
    if (params.userId) searchParams.append("userId", params.userId);
    if (params.workoutId) searchParams.append("workoutId", params.workoutId);
    if (params.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params.dateTo) searchParams.append("dateTo", params.dateTo);

    const response = await this.makeRequest(
      `/completed-workout?${searchParams.toString()}`
    );
    return response.json();
  }

  async markWorkoutCompleted(
    data: CreateCompletedWorkoutData
  ): Promise<CompletedUserWorkout> {
    const response = await this.makeRequest("/completed-workout", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getCompletedWorkoutStats(): Promise<CompletedWorkoutStats> {
    const response = await this.makeRequest("/completed-workout/stats");
    return response.json();
  }

  async deleteCompletedWorkout(id: string): Promise<void> {
    await this.makeRequest(`/completed-workout/${id}`, {
      method: "DELETE",
    });
  }


  async getCompletedExercises(
    params: CompletedExerciseListParams = {}
  ): Promise<{
    data: CompletedExercise[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const sp = new URLSearchParams();
    if (params.page) sp.append("page", String(params.page));
    if (params.pageSize) sp.append("limit", String(params.pageSize)); // backend expects "limit"
    if (params.userId) sp.append("user_id", params.userId);
    if (params.workoutPlanId) sp.append("workout_plan_id", params.workoutPlanId);
    if (params.sessionId) sp.append("session_id", params.sessionId); // pivot id
    if (params.sessionExerciseId) sp.append("session_exercise_id", params.sessionExerciseId);
    if (params.dateFrom) sp.append("start_date", params.dateFrom);
    if (params.dateTo) sp.append("end_date", params.dateTo);
  
    const res = await this.makeRequest(`/completed-workout/exercises?${sp.toString()}`);
    const json = await res.json(); // { completedExercises, pagination }
    return {
      data: json.completedExercises,
      total: json.pagination?.totalCount ?? 0,
      page: json.pagination?.currentPage ?? (params.page ?? 1),
      pageSize: params.pageSize ?? 10,
    };
  }
  
  // Fetch prescribed checklist + merged completions for a date
  async getExerciseChecklist(args: {
    workoutPlanId: string;
    sessionId: string;        // pivot id
    performedOn: string;  // YYYY-MM-DD
    userId?: string;      // trainers/admins only
  }): Promise<ExerciseChecklistResponse> {
    const sp = new URLSearchParams();
    sp.append("workout_plan_id", String(args.workoutPlanId));
    sp.append("session_id", String(args.sessionId));
    sp.append("performed_on", args.performedOn);
    if (args.userId) sp.append("user_id", args.userId);
  
    const res = await this.makeRequest(`/completed-workout/exercises/checklist?${sp.toString()}`);
    return res.json();
  }
  
  // Upsert a single exercise completion
  async upsertExerciseCompletion(
    body: UpsertExerciseCompletionBody
  ): Promise<CompletedExercise> {
    const res = await this.makeRequest("/completed-workout/exercises", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await res.json(); // { completion }
    return json.completion as CompletedExercise;
  }
  
  // Bulk upsert many exercise completions
  async bulkUpsertExerciseCompletions(
    body: BulkUpsertExerciseCompletionsBody
  ): Promise<CompletedExercise[]> {
    const res = await this.makeRequest("/completed-workout/exercises/bulk", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await res.json(); // { completions }
    return json.completions as CompletedExercise[];
  }
  
  // Delete a single exercise completion (admin/trainer)
  async deleteExerciseCompletion(id: string): Promise<void> {
    await this.makeRequest(`/completed-workout/exercises/${id}`, { method: "DELETE" });
  }



  async getUserNutritionSchedule(
    planId: string
  ): Promise<{
    nutritionPlan: NutritionPlan | null;
    schedule: Record<string, NutritionPlanMealPivot[]>;
  }> {
    if (!planId) {
      return { nutritionPlan: null, schedule: {} };
    }

    const res = await this.makeRequest(
      `/nutrition-plans/${encodeURIComponent(planId)}/schedule`
    );

    return res.json();
  }

  async getNutritionPlans(params: NutritionPlanListParams = {}): Promise<{
    data: NutritionPlan[];
    pagination: PaginationInfo;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.pageSize)
      queryParams.append("pageSize", params.pageSize.toString());
    if (params.goal) queryParams.append("goal", params.goal);
    if (params.authorId) queryParams.append("authorId", params.authorId);
    if (params.search) queryParams.append("search", params.search);
    if (params.include) queryParams.append("include", params.include);

    const response = await this.makeRequest(`/nutrition-plans?${queryParams}`);
    return response.json();
  }

  async getNutritionPlan(id: string, include?: string): Promise<NutritionPlan> {
    const queryParams = include ? `?include=${include}` : "";
    const response = await this.makeRequest(
      `/nutrition-plans/${id}${queryParams}`
    );
    return response.json();
  }

  async createNutritionPlan(
    data: CreateNutritionPlanData
  ): Promise<NutritionPlan> {
    const response = await this.makeRequest("/nutrition-plans", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async updateNutritionPlan(
    id: string,
    data: UpdateNutritionPlanData
  ): Promise<NutritionPlan> {
    const response = await this.makeRequest(`/nutrition-plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteNutritionPlan(id: string): Promise<void> {
    await this.makeRequest(`/nutrition-plans/${id}`, {
      method: "DELETE",
    });
  }

  async getMeals(params: MealListParams = {}): Promise<{
    data: Meal[];
    pagination: PaginationInfo;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.pageSize)
      queryParams.append("pageSize", params.pageSize.toString());
    if (params.kcalMin)
      queryParams.append("kcalMin", params.kcalMin.toString());
    if (params.kcalMax)
      queryParams.append("kcalMax", params.kcalMax.toString());
    if (params.proteinMin)
      queryParams.append("proteinMin", params.proteinMin.toString());
    if (params.proteinMax)
      queryParams.append("proteinMax", params.proteinMax.toString());
    if (params.carbsMin)
      queryParams.append("carbsMin", params.carbsMin.toString());
    if (params.carbsMax)
      queryParams.append("carbsMax", params.carbsMax.toString());
    if (params.fatMin) queryParams.append("fatMin", params.fatMin.toString());
    if (params.fatMax) queryParams.append("fatMax", params.fatMax.toString());
    if (params.search) queryParams.append("search", params.search);

    const response = await this.makeRequest(`/meals?${queryParams}`);
    return response.json();
  }

  async getMeal(id: string): Promise<Meal> {
    const response = await this.makeRequest(`/meals/${id}`);
    return response.json();
  }

  async createMeal(data: CreateMealData): Promise<Meal> {
    const response = await this.makeRequest("/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // JSON
        Authorization: `Bearer ${this.getToken()}`, // токен
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
  // ✅ multipart/form-data (със снимка)
  async createMealWithImage(
    data: CreateMealData & { imageFile?: File }
  ): Promise<Meal> {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("calories", String(data.calories));
    formData.append("protein", String(data.protein));
    formData.append("carbohydrates", String(data.carbohydrates));
    formData.append("fat", String(data.fat));
    if (data.description) formData.append("description", data.description);
    if (data.imageFile) formData.append("image", data.imageFile); // името е "image"

    const response = await this.makeRequestMeal("/meals", {
      method: "POST",
      headers: {
        // ❗ Само Authorization – без Content-Type!
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  async updateMeal(id: string, data: UpdateMealData): Promise<Meal> {
    const response = await this.makeRequest(`/meals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // async updateMealWithImage(id: string, data: UpdateMealData & { imageFile?: File }): Promise<Meal> {
  //   const formData = new FormData()
  //   if (data.title) formData.append("title", data.title)
  //   if (data.calories) formData.append("calories", data.calories.toString())
  //   if (data.protein) formData.append("protein", data.protein.toString())
  //   if (data.carbohydrates) formData.append("carbohydrates", data.carbohydrates.toString())
  //   if (data.fat) formData.append("fat", data.fat.toString())
  //   if (data.description) formData.append("description", data.description)
  //   if (data.imageFile) formData.append("image", data.imageFile)

  //   const response = await this.makeRequestMeal(`/meals/${id}`, {
  //     method: "PUT",
  //     body: formData,
  //     headers: {
  //       Authorization: `Bearer ${this.getToken()}`,
  //     },
  //   })
  //   return response.json()
  // }
  // data: {
  //   title?, description?, calories?, protein?, carbohydrates?, fat?,
  //   imageFile?: File, removeImage?: boolean
  // }

  async updateMealWithImage(
    id: string,
    data: UpdateMealData & { imageFile?: File; removeImage?: boolean }
  ): Promise<Meal> {
    const formData = new FormData();

    // ВНИМАНИЕ: не ползвай "if (data.X)" за числа, защото 0 е валидна стойност.
    if (data.title !== undefined) formData.append("title", data.title);
    if (data.description !== undefined)
      formData.append("description", data.description);
    if (data.calories !== undefined)
      formData.append("calories", String(data.calories));
    if (data.protein !== undefined)
      formData.append("protein", String(data.protein));
    if (data.carbohydrates !== undefined)
      formData.append("carbohydrates", String(data.carbohydrates));
    if (data.fat !== undefined) formData.append("fat", String(data.fat));

    if (data.imageFile) formData.append("image", data.imageFile); // смяна на снимка
    if (data.removeImage) formData.append("removeImage", "true"); // изтриване на снимка

    const response = await this.makeRequestMeal(`/meals/${id}`, {
      method: "PUT", // или PATCH ако предпочиташ частични ъпдейти
      body: formData,
      headers: { Authorization: `Bearer ${this.getToken()}` }, // НЕ слагай Content-Type ръчно
    });
    return response.json();
  }

  async deleteMeal(id: string): Promise<void> {
    await this.makeRequest(`/meals/${id}`, {
      method: "DELETE",
    });
  }

  async getNutritionPlanMeals(
    nutritionPlanId: string
  ): Promise<NutritionPlanMealPivot[]> {
    const response = await this.makeRequest(
      `/nutrition-plans/${nutritionPlanId}/meals`
    );
    return response.json();
  }

  async attachMealToNutritionPlan(
    nutritionPlanId: string,
    data: AttachMealToNutritionPlanData
  ): Promise<NutritionPlanMealPivot> {
    const response = await this.makeRequest(
      `/nutrition-plans/${nutritionPlanId}/meals`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  async updateNutritionPlanMeal(
    pivotId: string,
    data: UpdateNutritionPlanMealData
  ): Promise<NutritionPlanMealPivot> {
    const response = await this.makeRequest(
      `/nutrition-plan-meals/${pivotId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  async detachMealFromNutritionPlan(pivotId: string): Promise<void> {
    await this.makeRequest(`/nutrition-plan-meals/${pivotId}`, {
      method: "DELETE",
    });
  }

  async getTrainerReviews(
    trainerId: string,
    params: ReviewListParams = {}
  ): Promise<{
    data: Review[];
    total: number;
    page: number;
    pageSize: number;
    pagination?: {total: number}
  }> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.pageSize)
      searchParams.append("pageSize", params.pageSize.toString());
    if (params.ratingMin)
      searchParams.append("ratingMin", params.ratingMin.toString());
    if (params.ratingMax)
      searchParams.append("ratingMax", params.ratingMax.toString());
    if (params.sort) searchParams.append("sort", params.sort);

    const response = await this.makeRequest(
      `/reviews/trainers/${trainerId}/reviews?${searchParams.toString()}`
    );
    return response.json();
  }


  // ✅ Работещо изпращане с/без снимки
  async createTrainerReview(
    trainerId: string,
    data: CreateReviewData
  ): Promise<Review> {
    const url = `/reviews/trainers/${trainerId}/reviews`;
    const token = authService.getAccessToken();

    // има ли файлове?
    if (data.images && data.images.length > 0) {
      const formData = new FormData();
      formData.append("rating", String(Math.trunc(Number(data.rating))));
      formData.append("text", data.text ?? "");

      // името на полето трябва да е точно "images"
      for (const file of data.images) {
        formData.append("images", file);
      }

      const response = await this.makeRequestMeal(url, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`, // ❗ НЕ слагай Content-Type тук
        },
      });

      return response.json();
    }

    // без файлове → JSON
    const response = await this.makeRequest(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: Math.trunc(Number(data.rating)),
        text: data.text ?? "",
      }),
    });

    return response.json();
  }

  async updateReview(
    reviewId: string,
    data: UpdateReviewData
  ): Promise<Review> {
    if (data.images && data.images.length > 0) {
      const formData = new FormData();
      if (data.rating) formData.append("rating", data.rating.toString());
      if (data.text) formData.append("text", data.text);

      data.images.forEach((image, index) => {
        formData.append(`images`, image);
      });

      const response = await this.makeRequest(`/reviews/${reviewId}`, {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: `Bearer ${authService.getAccessToken()}`,
        },
      });
      return response.json();
    } else {
      const response = await this.makeRequest(`/reviews/${reviewId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...(data.rating && { rating: data.rating }),
          ...(data.text && { text: data.text }),
        }),
      });
      return response.json();
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    await this.makeRequest(`/reviews/${reviewId}`, {
      method: "DELETE",
    });
  }

  async getMyReviews(params: ReviewListParams = {}): Promise<{
    data: Review[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.pageSize)
      searchParams.append("pageSize", params.pageSize.toString());
    if (params.sort) searchParams.append("sort", params.sort);

    const response = await this.makeRequest(
      `/reviews/me?${searchParams.toString()}`
    );
    return response.json();
  }

  private getToken() {
    return authService.getAccessToken();
  }

  async changeNutritionPlanToClient(
    clientId: string,
    nutritionPlanId: string
  ): Promise<UserPersonal> {
    // const response = await this.makeRequest(`/trainer/clients/${clientId}/nutrition-plan`, {
    //   method: "PUT",
    //   body: JSON.stringify({ nutritionPlanId }),
    // })
    const response = await this.makeRequest(`/user-personal/${clientId}`, {
      method: "PUT",
      body: JSON.stringify({ nutritionPlanId }),
    });
    return response.json();
  }

  async blockUser(id: number, payload: { reason?: string; until?: string }) {
    const res = await this.makeRequest(`/users/${id}/block`, {
      method: "POST",
    });
    if (!res.ok) throw new Error((await res.json()).error || "Block failed");
    return res.json();
  }

  async unblockUser(id: number) {
    const res = await this.makeRequest(`/users/${id}/unblock`, {
      method: "POST",
    });
    if (!res.ok) throw new Error((await res.json()).error || "Unblock failed");
    return res.json();
  }

  async forgotPassword(email: string) {
    const res = await this.makeRequest(`/auth/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || "Неуспешно изпращане на имейл за нулиране")
    return data
}


async verifyResetToken(token: string) {
  const res = await this.makeRequest(
    `/auth/reset-password/verify?token=${encodeURIComponent(token)}`,
    { method: "GET" }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Проблем при проверката на линка")
  return data as { valid: boolean }
}

async resetPassword(token: string, password: string) {
  const res = await this.makeRequest(`/auth/reset-password`, {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Неуспешно изпращане на имейл за нулиране")
  return data
}

}

export const apiService = new ApiService();

export interface Exercise {
  id: string;
  name: string;
  muscle:
    | "chest"
    | "back"
    | "legs"
    | "shoulders"
    | "arms"
    | "core"
    | "full_body";
  image?: string;
  video?: string;
  description?: string;
  createdAt: string;
}

export interface CreateExerciseData {
  name: string;
  muscle:
    | "chest"
    | "back"
    | "legs"
    | "shoulders"
    | "arms"
    | "core"
    | "full_body";
  image?: string;
  video?: string;
}

export interface UpdateExerciseData {
  name?: string;
  muscle?:
    | "chest"
    | "back"
    | "legs"
    | "shoulders"
    | "arms"
    | "core"
    | "full_body";
  image?: string;
  video?: string;
}

export interface ExerciseListParams {
  page?: number;
  pageSize?: number;
  muscle?:
    | "chest"
    | "back"
    | "legs"
    | "shoulders"
    | "arms"
    | "core"
    | "full_body";
  search?: string;
}

export interface Session {
  id: string;
  title: string;
  bodyArea: "full_body" | "upper_body" | "lower_body" | "core";
  durationMins: number;
  description?: string;
  authorId: string;
  createdAt: string;
  exercises?: SessionExercise[];
}

export interface SessionExercise {
  id: string;
  name: string;
  muscle:
    | "chest"
    | "back"
    | "legs"
    | "shoulders"
    | "arms"
    | "core"
    | "full_body";
  exerciseId: string;
  image?: string;
  video?: string;
  pivot_id: string;
  repetitions?: number;
  time?: number;
  exercise: Exercise;
}

export interface CreateSessionData {
  title: string;
  bodyArea: "full_body" | "upper_body" | "lower_body" | "core";
  durationMins: number;
  description: string;
}

export interface UpdateSessionData {
  title?: string;
  bodyArea?: "full_body" | "upper_body" | "lower_body" | "core";
  durationMins?: number;
  description?: string;
}

export interface SessionListParams {
  page?: number;
  pageSize?: number;
  bodyArea?: "full_body" | "upper_body" | "lower_body" | "core";
  durationMin?: number;
  durationMax?: number;
  authorId?: string;
  search?: string;
}

export interface AddSessionExerciseData {
  exerciseId: string;
  repetitions?: number;
  time?: number;
}

export interface UpdateSessionExerciseData {
  repetitions?: number;
  time?: number;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  goal: "lose" | "gain" | "maintain";
  authorId: string;
  createdAt: string;
  sessions?: WorkoutPlanSession[];
}

export interface WorkoutPlanSession {
  id: string;
  title: string;
  duration_mins: number;
  workoutPlanId: string;
  sessionId: string;
  pivot_id: string;
  schedule: ("Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun")[];
  session: Session;
}

export interface CreateWorkoutPlanData {
  title: string;
  goal: "lose" | "gain" | "maintain";
}

export interface UpdateWorkoutPlanData {
  title?: string;
  goal?: "lose" | "gain" | "maintain";
}

export interface WorkoutPlanListParams {
  page?: number;
  pageSize?: number;
  goal?: "lose" | "gain" | "maintain";
  search?: string;
}

export interface AddWorkoutPlanSessionData {
  sessionId: string;
  schedule?: ("Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun")[];
}

export interface UpdateWorkoutPlanSessionData {
  schedule: ("Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun")[];
}

export interface CompletedUserWorkout {
  id: string;
  userId: string;
  workoutId: string;
  createdAt: string;
}

export interface CreateCompletedWorkoutData {
  workout_plan_id: string;
  performed_on: string;
}

export interface CompletedWorkoutListParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  workoutId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CompletedWorkoutStats {
  totalCompleted: number;
  thisWeek: number;
  thisMonth: number;
  averagePerWeek: number;
  streakDays: number;
}

export interface NutritionPlan {
  id: string;
  title: string;
  goal: "lose" | "gain" | "maintain";
  description?: string;
  authorId: string;
  author?: User;
  createdAt: string;
  meals?: NutritionPlanMealPivot[];
  total: number;
}

export interface Meal {
  id: string;
  title: string;
  image?: string;
  description?: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface NutritionPlanMealPivot {
  id: string;
  nutritionPlanId: string;
  mealId: string;
  meal?: Meal;
  quantity?: number;
  quantityKg?: number;
  schedule?: Array<{
    day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    time: string;
  }>;
  totals?: number;
}

export interface CreateNutritionPlanData {
  title: string;
  goal: "lose" | "gain" | "maintain";
  description?: string;
}

export interface UpdateNutritionPlanData {
  title?: string;
  goal?: "lose" | "gain" | "maintain";
  description?: string;
}

export interface CreateMealData {
  title: string;
  image?: string;
  description?: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface UpdateMealData {
  title?: string;
  image?: string;
  description?: string;
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
}

export interface AttachMealToNutritionPlanData {
  mealId: string;
  quantity?: number;
  quantityKg?: number;
  schedule?: Array<{
    day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    time: string;
  }>;
}

export interface UpdateNutritionPlanMealData {
  quantity?: number;
  quantityKg?: number;
  schedule?: Array<{
    day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    time: string;
  }>;
}

export interface NutritionPlanListParams {
  page?: number;
  pageSize?: number;
  goal?: "lose" | "gain" | "maintain";
  authorId?: string;
  search?: string;
  include?: string;
}

export interface MealListParams {
  page?: number;
  pageSize?: number;
  kcalMin?: number;
  kcalMax?: number;
  proteinMin?: number;
  proteinMax?: number;
  carbsMin?: number;
  carbsMax?: number;
  fatMin?: number;
  fatMax?: number;
  search?: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
}

export interface Review {
  id: string;
  trainerId: string;
  userId: string;
  rating: number;
  text: string;
  images?: string[];
  name?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateReviewData {
  rating: number;
  text: string;
  images?: File[];
}

export interface UpdateReviewData {
  rating?: number;
  text?: string;
  images?: File[];
}

export interface ReviewListParams {
  userId?: string;
  page?: number;
  pageSize?: number;
  ratingMin?: number;
  ratingMax?: number;
  sort?: string;
}



export interface CompletedExercise {
  id: string;
  user_id: number;
  workout_plan_id: number;
  session_id: number; // alias of workout_plan_session_id from backend
  session_exercise_id: number;
  performed_on: string; // YYYY-MM-DD
  completed: boolean;
  reps_prescribed?: number | null;
  time_prescribed?: number | null;
  reps_done?: number | null;
  time_done?: number | null;
  weight_kg?: number | null;
  distance_m?: number | null;
  notes?: string | null;
  created_at: string;
  // convenience (from JOINs)
  exercise_name?: string;
  exercise_image?: string | null;
  exercise_video?: string | null;
  occurrence?: number;
  position?: number | null;
}

export interface CompletedExerciseListParams {
  page?: number;
  pageSize?: number;
  userId?: string;           // trainers/admins only
  workoutPlanId?: string;
  sessionId?: string;        // pivot id: workout_plan_sessions.id
  sessionExerciseId?: string;
  dateFrom?: string;         // YYYY-MM-DD
  dateTo?: string;           // YYYY-MM-DD
}

export interface ExerciseChecklistItem {
  workout_plan_session_id: number;
  workout_plan_id: number;
  session_exercise_id: number;
  session_id: number;
  exercise_id: number;
  occurrence: number;
  position: number | null;
  reps_prescribed: number | null;
  time_prescribed: number | null;
  exercise_name: string;
  exercise_image: string | null;
  exercise_video: string | null;
  completion_id: number | null;
  completed: boolean | null;
  reps_done: number | null;
  time_done: number | null;
  weight_kg: number | null;
  distance_m: number | null;
  notes: string | null;
}

export interface ExerciseChecklistResponse {
  workout_plan_id: number;
  session_id: number;        // pivot id
  performed_on: string;      // YYYY-MM-DD
  items: ExerciseChecklistItem[];
}

export interface UpsertExerciseCompletionBody {
  user_id?: string;          // trainers/admins only
  workout_plan_id: number;
  session_id: number;        // pivot id
  session_exercise_id: number;
  performed_on: string;      // YYYY-MM-DD
  completed?: boolean;
  reps_done?: number | null;
  time_done?: number | null;
  weight_kg?: number | null;
  distance_m?: number | null;
  notes?: string | null;
}

export interface BulkUpsertExerciseCompletionsBody {
  user_id?: string;          // trainers/admins only
  workout_plan_id: number;
  session_id: number;        // pivot id
  performed_on: string;      // YYYY-MM-DD
  items: Array<{
    session_exercise_id: number;
    completed?: boolean;
    reps_done?: number | null;
    time_done?: number | null;
    weight_kg?: number | null;
    distance_m?: number | null;
    notes?: string | null;
  }>;
}