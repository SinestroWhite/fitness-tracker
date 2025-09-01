"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { authService, type User } from "@/lib/auth"
import { apiService } from "@/lib/api"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    const token = authService.getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
  
    try {
      const res = await apiService.getCurrentUser(); // e.g. { user: { ... } } or axios { data: { user: { ... } } }
      const freshUser = res?.data?.user ?? res.user; // handles both shapes
      setUser(freshUser);
    } catch (error) {
      console.error("Error refreshing user data:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    refreshUser();
  }, []);
  
  

  const login = async (email: string, password: string) => {
    try {
      await authService.login(email, password)
      await refreshUser()
    } catch (error) {
      throw error
    }
  }

  const register = async (email: string, password: string, name: string) => {
    try {
      await authService.register(email, password, name)
      await refreshUser()
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
    } catch (error) {
      console.error("Logout error:", error)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// "use client"

// import type React from "react"
// import { createContext, useContext, useEffect, useState } from "react"
// import { authService, type User } from "@/lib/auth"
// import { apiService } from "@/lib/api"

// interface AuthContextType {
//   user: User | null
//   loading: boolean
//   login: (email: string, password: string) => Promise<void>
//   register: (email: string, password: string, name: string) => Promise<void>
//   logout: () => Promise<void>
//   refreshUser: () => Promise<void>
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined)

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [user, setUser] = useState<User | null>(null)
//   const [loading, setLoading] = useState(true)

//   const refreshUser = async () => {
//     const token = authService.getAccessToken()
//     if (!token) {
//       setUser(null)
//       return
//     }

//     try {
//       const freshUserData = await apiService.getCurrentUser()
//       setUser(freshUserData)
//     } catch (error) {
//       console.error("Error refreshing user data:", error)
//       // If API call fails, clear user state to force re-authentication
//       setUser(null)
//     }
//   }

//   useEffect(() => {
//     refreshUser().finally(() => setLoading(false))
//   }, [])

//   const login = async (email: string, password: string) => {
//     try {
//       await authService.login(email, password)
//       await refreshUser()
//     } catch (error) {
//       throw error
//     }
//   }

//   const register = async (email: string, password: string, name: string) => {
//     try {
//       await authService.register(email, password, name)
//       await refreshUser()
//     } catch (error) {
//       throw error
//     }
//   }

//   const logout = async () => {
//     try {
//       await authService.logout()
//       setUser(null)
//     } catch (error) {
//       console.error("Logout error:", error)
//       setUser(null)
//     }
//   }

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         loading,
//         login,
//         register,
//         logout,
//         refreshUser,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   )
// }

// export function useAuth() {
//   const context = useContext(AuthContext)
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider")
//   }
//   return context
// }
