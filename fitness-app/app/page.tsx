"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    } else {
      router.replace("/register")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <CardTitle className="text-3xl font-bold">Фитнес Трекър</CardTitle>
          <CardDescription className="text-lg">
            Проследявайте своя фитнес прогрес и постигайте целите си
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full cursor-pointer" size="lg">
            <Link href="/login">Влез в профила си</Link>
          </Button>
          <Button asChild variant="outline" className="w-full bg-transparent cursor-pointer" size="lg">
            <Link href="/register">Създай нов профил</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
