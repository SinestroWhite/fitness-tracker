// app/reset-password/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { apiService } from "@/lib/api"

export default function ResetPasswordPage() {
  const sp = useSearchParams()
  const token = sp.get("token") ?? ""
  const router = useRouter()

  const [validating, setValidating] = useState(true)
  const [valid, setValid] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const verify = async () => {
      setValidating(true)
      try {
        const data = await apiService.verifyResetToken(token)
        setValid(!!data.valid)
      } catch {
        setValid(false)
      } finally {
        setValidating(false)
      }
    }
    if (token) verify()
    else {
      setValid(false)
      setValidating(false)
    }
  }, [token])

  const submit = async () => {
    setError("")
    if (password.length < 8) return setError("Паролата трябва да е поне 8 символа")
    if (password !== confirm) return setError("Паролите не съвпадат")
    setSubmitting(true)
    try {
      await apiService.resetPassword(token, password)
      setOk(true)
      setTimeout(() => router.push("/login"), 1200)
    } catch (e: any) {
      setError(e?.message || "Неуспешно нулиране")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Нова парола</CardTitle>
          <CardDescription>Въведете нова парола за профила си</CardDescription>
        </CardHeader>
        <CardContent>
          {validating ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !valid ? (
            <Alert variant="destructive">
              <AlertDescription>Линкът е невалиден или е изтекъл.</AlertDescription>
            </Alert>
          ) : ok ? (
            <Alert>
              <AlertDescription>Паролата е сменена успешно. Пренасочване…</AlertDescription>
            </Alert>
          ) : (
            <>
              {error && (
                <Alert variant="destructive" className="mb-3">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-secondary" htmlFor="pass">Нова парола</Label>
                  <Input
                    id="pass"
                    type="password"
                    value={password}
                    className="text-secondary"
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-secondary" htmlFor="confirm">Потвърди парола</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    className="text-secondary"
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    disabled={submitting}
                  />
                </div>
                <Button onClick={submit} disabled={submitting} className="w-full cursor-pointer">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Запис…
                    </>
                  ) : (
                    "Запази"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
