"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Activity } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { apiService, type UpdateUserPersonalData, type UpdateUserData } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const { user, refreshUser} = useAuth()
  const { toast } = useToast()

  // User data state
  const [userData, setUserData] = useState({
    name: "",
    email: "",
  })
  const [userLoading, setUserLoading] = useState(false)

  type FormPersonal = Partial<UpdateUserPersonalData>;

  // Personal data state
  const [personalData, setPersonalData] = useState<FormPersonal>({});
  const [personalLoading, setPersonalLoading] = useState(false)
  const [hasPersonalData, setHasPersonalData] = useState(false)

  // Error states
  const [userError, setUserError] = useState("")
  const [personalError, setPersonalError] = useState("")

  // Load initial data
  useEffect(() => {
    if (user) {
      setUserData({
        name: user.name,
        email: user.email,
      })
      if(user.role == "user"){
        loadPersonalData()
      }
    }
  }, [user])

  const loadPersonalData = async () => {
    try {
      const personal = await apiService.getUserPersonal()
      if (personal) {
        setPersonalData({
          sex: personal.sex ?? "",
          height: personal.height ?? "",
          goal: personal.goal ?? "",
          nutritionPlanId: personal.nutritionPlanId || "",
          workoutPlanId: personal.workoutPlanId || "",
        })
        setHasPersonalData(true)
      } else {
        // без данни – остави {} (контролирани със стойности по подразбиране)
        setPersonalData({})
        setHasPersonalData(false)
      }
    } catch (error) {
      console.error("Error loading personal data:", error)
    }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserError("")
    setUserLoading(true)

    try {
      const updateData: UpdateUserData = {}

      if (userData.name !== user?.name) {
        updateData.name = userData.name
      }

      if (userData.email !== user?.email) {
        updateData.email = userData.email
      }

      if (Object.keys(updateData).length > 0) {
        await apiService.updateCurrentUser(updateData)
        await refreshUser()
        toast({
          title: "Успех",
          description: "Профилът е обновен успешно",
        })
      }
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "Грешка при обновяване на профила")
    } finally {
      setUserLoading(false)
    }
  }

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPersonalError("")
    setPersonalLoading(true)

    try {
      // const submitData = {
      //   ...personalData,
      //   nutritionPlanId: personalData?.nutritionPlanId || undefined,
      //   workoutPlanId: personalData?.workoutPlanId || undefined,
      // }

      // await apiService.updateUserPersonal(submitData)
      // setHasPersonalData(true)
      // toast({
      //   title: "Успех",
      //   description: "Личните данни са обновени успешно",
      // })
      if (!personalData?.sex || personalData.height == null || !personalData.goal) {
        setPersonalError("Моля, попълнете Пол, Височина и Цел.")
        return
      }
  
      // ✅ Build a complete payload that matches UpdateUserPersonalData
      const payload: UpdateUserPersonalData = {
        sex: personalData.sex,            // "male" | "female"
        height: personalData.height,      // number
        goal: personalData.goal,          // "lose" | "gain" | "keep"
        ...(personalData.nutritionPlanId
          ? { nutritionPlanId: personalData.nutritionPlanId }
          : {}),
        ...(personalData.workoutPlanId
          ? { workoutPlanId: personalData.workoutPlanId }
          : {}),
      }
  
      await apiService.updateUserPersonal(payload)
      setHasPersonalData(true)
      toast({ title: "Успех", description: "Личните данни са обновени успешно" })
    } catch (error) {
      setPersonalError(error instanceof Error ? error.message : "Грешка при обновяване на личните данни")
    } finally {
      setPersonalLoading(false)
    }
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl text-secondary font-bold">Моят профил</h1>
          <p className="text-secondary">Управлявайте информацията за вашия профил и фитнес данни</p>
        </div>

         {/* Personal Fitness Data Card */}
         {user?.role === "user" && (<Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <CardTitle>Фитнес данни</CardTitle>
              </div>
              <CardDescription>
                {hasPersonalData
                  ? "Обновете вашите фитнес цели и параметри"
                  : "Добавете вашите фитнес цели и параметри за по-добро проследяване"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePersonalSubmit} className="space-y-4">
                {personalError && (
                  <Alert variant="destructive">
                    <AlertDescription>{personalError}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sex">Пол</Label>
                    <Select
                      value={personalData.sex ?? ""}
                      onValueChange={(value: "male" | "female") => setPersonalData({ ...personalData, sex: value })}
                      disabled={personalLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Мъж</SelectItem>
                        <SelectItem value="female">Жена</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Височина (см)</Label>
                    <Input
                      id="height"
                      type="number"
                      min="100"
                      max="250"
                      className="border-1 border-gray-500"
                      value={personalData.height}
                      onChange={(e) =>
                        setPersonalData({
                          ...personalData,
                          height: Number.parseInt(e.target.value),
                        })
                      }
                      disabled={personalLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Цел</Label>
                  <Select
                    value={personalData.goal}
                    onValueChange={(value: "lose" | "gain" | "keep") =>
                      setPersonalData({ ...personalData, goal: value })
                    }
                    disabled={personalLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lose">Отслабване</SelectItem>
                      <SelectItem value="gain">Качване на тегло</SelectItem>
                      <SelectItem value="keep">Поддържане на теглото</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

           

                <Button variant="white" className="cursor-pointer " type="submit" disabled={personalLoading}>
                  {personalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Запазване...
                    </>
                  ) : hasPersonalData ? (
                    "Обнови данните"
                  ) : (
                    "Създай профил"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>)}

        <div className="grid gap-6">
          {/* User Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <CardTitle>Профилна информация</CardTitle>
              </div>
              <CardDescription>Обновете основната информация за вашия акаунт</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                {userError && (
                  <Alert variant="destructive">
                    <AlertDescription>{userError}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Име</Label>
                    <Input
                      id="name"
                      value={userData.name ?? ""}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      className="border-1 border-gray-500"
                      disabled={userLoading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Имейл</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email ?? ""}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      disabled={userLoading}
                      className="border-1 border-gray-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Роля</Label>
                  <div className="text-sm text-secondary capitalize">
                    {user.role === "user" && "Потребител"}
                    {user.role === "trainer" && "Треньор"}
                    {user.role === "admin" && "Администратор"}
                  </div>
                </div>

                <Button variant="white" className="cursor-pointer" type="submit" disabled={userLoading}>
                  {userLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Запазване...
                    </>
                  ) : (
                    "Запази промените"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  )
}
