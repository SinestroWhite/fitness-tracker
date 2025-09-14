// "use client"

// import type React from "react"

// import { useEffect, useState } from "react"
// import { useRouter } from "next/navigation"
// import Link from "next/link"
// import { useAuth } from "@/contexts/auth-context"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Alert, AlertDescription } from "@/components/ui/alert"
// import { Eye, EyeOff, Loader2 } from "lucide-react"
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog"
// import { useToast } from "@/hooks/use-toast"
// import { apiService } from "@/lib/api"

// export default function LoginPage() {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")
//   const [showPassword, setShowPassword] = useState(false)
//   const [error, setError] = useState("")
//   const [loading, setLoading] = useState(false)

//   // Forgot password UI state
//   const [forgotOpen, setForgotOpen] = useState(false)
//   const [forgotEmail, setForgotEmail] = useState("")
//   const [forgotLoading, setForgotLoading] = useState(false)
//   const [forgotMessage, setForgotMessage] = useState<string | null>(null)

//   const { login } = useAuth()
//   const router = useRouter()
//   const { toast } = useToast()

//   useEffect(() => {
//     if (forgotOpen) setForgotEmail((prev) => prev || email)
//   }, [forgotOpen, email])

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setError("")
//     setLoading(true)

//     try {
//       await login(email.trim(), password)
//       router.push("/dashboard")
//     } catch (err: any) {
//       // Surface server message if available (e.g., "Профилът е блокиран")
//       const msg = err?.message || "Възникна грешка при влизане"
//       setError(msg)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleForgot = async () => {
//     setForgotMessage(null)
//     setForgotLoading(true)
//     try {
//       const data = await apiService.forgotPassword(forgotEmail.trim()) // ← use forgotEmail here
//       if (data?.debug?.resetLink) {
//         toast({ title: "DEV", description: `Reset link: ${data.debug.resetLink}` })
//       }
//       setForgotMessage(
//         data?.message ||
//           "Ако имейлът съществува, изпратихме линк за нулиране на паролата. Проверете пощата си."
//       )
//     } catch (err: any) {
//       setForgotMessage(err?.message || "Неуспешно изпращане")
//     } finally {
//       setForgotLoading(false)
//     }
//   }
  

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="space-y-1">
//           <CardTitle className="text-2xl font-bold text-center">Вход</CardTitle>
//           <CardDescription className="text-center">
//             Въведете имейл и парола за достъп до профила си
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             {error && (
//               <Alert variant="destructive">
//                 <AlertDescription>{error}</AlertDescription>
//               </Alert>
//             )}

//             <div className="space-y-2">
//               <Label htmlFor="email">Имейл</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="example@email.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//                 disabled={loading}
//                 autoComplete="username"
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password">Парола</Label>
//               <div className="relative">
//                 <Input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Въведете парола"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   required
//                   disabled={loading}
//                   autoComplete="current-password"
//                 />
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="sm"
//                   className="absolute cursor-pointer right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
//                   onClick={() => setShowPassword((s) => !s)}
//                   disabled={loading}
//                   aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"}
//                 >
//                   {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                 </Button>
//               </div>
//             </div>

//             <div className="flex items-center justify-between">
//               <Dialog open={forgotOpen} onOpenChange={(open) => { setForgotOpen(open); if (!open) { setForgotMessage(null) } }}>
//                 <DialogTrigger asChild>
//                   <Button type="button" variant="link" className="px-0" onClick={() => setForgotOpen(true)}>
//                     Забравена парола?
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>Нулиране на парола</DialogTitle>
//                     <DialogDescription>
//                       Въведете имейл адреса си и ще ви изпратим линк за нулиране.
//                     </DialogDescription>
//                   </DialogHeader>

//                   {forgotMessage && (
//                     <Alert className="mb-2">
//                       <AlertDescription>{forgotMessage}</AlertDescription>
//                     </Alert>
//                   )}

//                   <div className="space-y-2">
//                     <Label htmlFor="forgotEmail">Имейл</Label>
//                     <Input
//                       id="forgotEmail"
//                       type="email"
//                       value={forgotEmail}
//                       onChange={(e) => setForgotEmail(e.target.value)}
//                       placeholder="example@email.com"
//                       autoFocus
//                     />
//                   </div>

//                   <DialogFooter>
//                     <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotLoading}>
//                       Затвори
//                     </Button>
//                     <Button type="button" onClick={handleForgot} disabled={forgotLoading || !forgotEmail.trim()} className="cursor-pointer">
//                       {forgotLoading ? (
//                         <>
//                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                           Изпращане...
//                         </>
//                       ) : (
//                         "Изпрати линк"
//                       )}
//                     </Button>
//                   </DialogFooter>
//                 </DialogContent>
//               </Dialog>

//               <Link href="/register" className="text-sm text-primary hover:underline">
//                 Нямате профил? Регистрирайте се
//               </Link>
//             </div>

//             <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
//               {loading ? (
//                 <>
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                   Влизане...
//                 </>
//               ) : (
//                 "Влез"
//               )}
//             </Button>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }


"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Forgot password UI state
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)

  // ✨ Ново: четем reason/from от URL и показваме инфо банер
  const searchParams = useSearchParams()
  const reason = searchParams.get("reason")
  const from = searchParams.get("from")
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (reason === "session-expired") {
      setInfo("Сесията ви изтече. Моля, влезте отново.")
    } else if (reason === "logged-out") {
      setInfo("Излязохте от профила си успешно.")
    } else if (reason === "unauthorized") {
      setInfo("Моля, влезте в профила си, за да продължите.")
    } else {
      setInfo(null)
    }
  }, [reason])

  // Безопасна цел след вход
  const redirectTarget = (() => {
    if (!from || !from.startsWith("/")) return "/dashboard"
    const PUBLIC = ["/", "/login", "/register", "/forgot-password"]
    if (PUBLIC.some((p) => from === p || from.startsWith(p + "/"))) return "/dashboard"
    return from
  })()

  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (forgotOpen) setForgotEmail((prev) => prev || email)
  }, [forgotOpen, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email.trim(), password)
      router.push(redirectTarget)
    } catch (err: any) {
      const msg = err?.message || "Възникна грешка при влизане"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    setForgotMessage(null)
    setForgotLoading(true)
    try {
      const data = await apiService.forgotPassword(forgotEmail.trim())
      if (data?.debug?.resetLink) {
        toast({ title: "DEV", description: `Reset link: ${data.debug.resetLink}` })
      }
      setForgotMessage(
        data?.message ||
          "Ако имейлът съществува, изпратихме линк за нулиране на паролата. Проверете пощата си."
      )
    } catch (err: any) {
      setForgotMessage(err?.message || "Неуспешно изпращане")
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="bg-[url(/herologin.jpg)] h-screen bg-cover overflow-hidden">
     <header className="bg-primary text-secondary">
        {/* Main navigation */}
        <div className="relative">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              {/* Logo */}
              <div className="flex items-center gap-2">

                <span className="text-2xl font-bold text-secondary">FitJourney</span>
              </div>


              <div className="flex items-center gap-4">
          <Button onClick={()=> router.push("/login")} className="px-4 py-2 rounded bg-secondary text-primary font-semibold hover:bg-gray-100">
            ВХОД
          </Button>
        </div>

            </div>
          </div>
        </div>
      </header>

    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-950/25 backdrop-blur-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-secondary text-center">Вход</CardTitle>
          <CardDescription className="text-center">
            Въведете имейл и парола за достъп до профила си
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ℹ️ Информационен банер от URL reason */}
            {info && (
              <Alert>
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}

            {/* ❗ Сървърни/валидиращи грешки */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Имейл</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Парола</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Въведете парола"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute cursor-pointer right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword((s) => !s)}
                  disabled={loading}
                  aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Dialog
                open={forgotOpen}
                onOpenChange={(open) => {
                  setForgotOpen(open)
                  if (!open) {
                    setForgotMessage(null)
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-secondary"
                    onClick={() => setForgotOpen(true)}
                  >
                    Забравена парола?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Нулиране на парола</DialogTitle>
                    <DialogDescription>
                      Въведете имейл адреса си и ще ви изпратим линк за нулиране.
                    </DialogDescription>
                  </DialogHeader>

                  {forgotMessage && (
                    <Alert className="mb-2">
                      <AlertDescription>{forgotMessage}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="forgotEmail">Имейл</Label>
                    <Input
                      id="forgotEmail"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className={"text-secondary"}
                      placeholder="example@email.com"
                      autoFocus
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setForgotOpen(false)}
                      disabled={forgotLoading}
                    >
                      Затвори
                    </Button>
                    <Button
                      type="button"
                      onClick={handleForgot}
                      disabled={forgotLoading || !forgotEmail.trim()}
                      className="cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Изпращане...
                        </>
                      ) : (
                        "Изпрати линк"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Link href="/register" className="text-sm text-secondary hover:underline">
                Нямате профил? Регистрирайте се
              </Link>
            </div>

            <Button type="submit" className="w-full cursor-pointer bg-secondary text-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Влизане...
                </>
              ) : (
                "Влез"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}
