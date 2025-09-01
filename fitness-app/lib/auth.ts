import { jwtDecode } from "jwt-decode"

export interface User {
  id: string
  email: string
  name: string
  role: "user" | "trainer" | "admin"
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface JWTPayload {
  id: string
  email: string
  name: string
  role: "user" | "trainer" | "admin"
  exp: number
  iat: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const USER_KEY   = "user"

class AuthService {
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("accessToken")
      this.refreshToken = localStorage.getItem("refreshToken")
    }
  }

  async register(email: string, password: string, name: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Грешка при регистрация")
    }

    const data = await response.json() as {
      user?: User;
      accessToken?: string;
      refreshToken?: string;
    };
  
    if (!data.accessToken || !data.refreshToken) {
      throw new Error("Невалиден отговор при вход: липсват токени.");
    }
    if (!data.user) {
      throw new Error("Невалиден отговор при вход: липсва user.");
    }
  
    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };

    this.setTokens(tokens);
    return { user: data.user, tokens };

    // if (!response.ok) {
    //   const error = await response.json()
    //   throw new Error(error.error || "Грешка при регистрация")
    // }

    // const data = await response.json()
    // this.setTokens(data.tokens);
    // return data
  }

  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Грешка при вход")
    }

    const data = await response.json() as {
      user?: User;
      accessToken?: string;
      refreshToken?: string;
    };
  
    if (!data.accessToken || !data.refreshToken) {
      throw new Error("Невалиден отговор при вход: липсват токени.");
    }
    if (!data.user) {
      throw new Error("Невалиден отговор при вход: липсва user.");
    }
  
    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };

    this.setTokens(tokens);
    return { user: data.user, tokens };
  }

  

  async logout(): Promise<void> {
    if (this.accessToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.accessToken}`
          }
        })
      } catch (error) {
        console.error("Logout error:", error)
      }
    }

    this.clearTokens()
  }

  async refreshTokens(): Promise<AuthTokens> {
    if (!this.refreshToken) {
      throw new Error("Няма refresh token")
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    })

    if (!response.ok) {
      this.clearTokens()
      throw new Error("Неуспешно обновяване на токен")
    }

    const tokens = await response.json()
    this.setTokens(tokens)
    return tokens
  }


  getCurrentUser(): User | null {
    if (!this.accessToken) return null

    try {
      const payload = jwtDecode<JWTPayload>(this.accessToken)
      console.log(payload)

      // Check if token is expired
      if (payload.exp * 1000 < Date.now()) {
        return null
      }

      return {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        createdAt: new Date(payload.iat * 1000).toISOString(),
      }
    } catch (error) {
      return null
    }
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken

    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", tokens.accessToken)
      localStorage.setItem("refreshToken", tokens.refreshToken)
    }
  }

  private clearTokens(): void {
    this.accessToken = null
    this.refreshToken = null

    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
    }
  }
}

export const authService = new AuthService()
