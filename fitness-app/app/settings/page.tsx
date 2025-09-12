"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"
import { authService } from "@/lib/auth"

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState(true)
  const [emailUpdates, setEmailUpdates] = useState(false)

  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
    }
  }, [user])

  const handleUpdateProfile = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const updateData: any = {}
      if (name !== user.name) updateData.name = name
      if (email !== user.email) updateData.email = email

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "Няма промени",
          description: "Не са направени промени за запазване.",
        })
        return
      }

      await apiService.updateCurrentUser(updateData)
      await refreshUser()

      toast({
        title: "Успешно обновяване",
        description: "Профилът ви беше обновен успешно.",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Грешка",
        description: "Възникна грешка при обновяването на профила.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Настройки</h1>
          <p className="text-primary">Управлявайте настройките на вашия профил и приложението</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Профилни настройки</CardTitle>
              <CardDescription>Обновете информацията за вашия профил</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Име</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Имейл</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button className="cursor-pointer" onClick={handleUpdateProfile} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Запази промените
              </Button>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader>
              <CardTitle>Известия</CardTitle>
              <CardDescription>Конфигурирайте как искате да получавате известия</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push известия</Label>
                  <p className="text-sm text-muted-foreground">Получавайте известия в браузъра</p>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Имейл обновления</Label>
                  <p className="text-sm text-muted-foreground">Получавайте седмични отчети по имейл</p>
                </div>
                <Switch checked={emailUpdates} onCheckedChange={setEmailUpdates} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Сигурност</CardTitle>
              <CardDescription>Управлявайте сигурността на вашия акаунт</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline">Смени парола</Button>
              <Button variant="destructive">Изтрий акаунт</Button>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </DashboardLayout>
  )
}
