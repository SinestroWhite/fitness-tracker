"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Паролите не съвпадат")
      return
    }

    if (password.length < 6) {
      setError("Паролата трябва да е поне 6 символа")
      return
    }

    setLoading(true)

    try {
      await register(email, password, name)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Възникна грешка при регистрация")
    } finally {
      setLoading(false)
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

                <span className="text-2xl font-bold text-secondary">Фитнес Тракър</span>
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

    <div className="min-h-screen flex items-center justify-center  p-4">
      <Card className="w-full max-w-md bg-gray-950/25 backdrop-blur-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-secondary">Регистрация</CardTitle>
          <CardDescription className="text-center ">Създайте нов профил за достъп до приложението</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Име</Label>
              <Input
                id="name"
                type="text"
                placeholder="Вашето име"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Парола</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Поне 6 символа"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute cursor-pointer right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Потвърдете паролата</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Повторете паролата"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute cursor-pointer right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full cursor-pointer bg-secondary text-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 cursor-pointer h-4 w-4 animate-spin" />
                  Регистрация...
                </>
              ) : (
                "Регистрирай се"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-secondary">Вече имате профил? </span>
            <Link href="/login" className="text-secondary hover:underline">
              Влезте тук
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}
