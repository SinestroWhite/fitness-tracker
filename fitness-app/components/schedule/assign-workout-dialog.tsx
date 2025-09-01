"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiService, type User, type WorkoutPlan } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface AssignWorkoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AssignWorkoutDialog({ open, onOpenChange, onSuccess }: AssignWorkoutDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<User[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [formData, setFormData] = useState({
    clientId: "",
    workoutPlanId: "",
  })

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    try {
      const [clientsResponse, plansResponse] = await Promise.all([
        apiService.getTrainerClients(),
        apiService.getWorkoutPlanList({ pageSize: 100 }),
      ])
      //setClients(clientsResponse)
      setWorkoutPlans(plansResponse.data)
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно зареждане на данните",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.clientId || !formData.workoutPlanId) {
      toast({
        title: "Грешка",
        description: "Моля изберете клиент и тренировъчен план",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Update user personal data to assign workout plan
      await apiService.updateUserPersonalByUserId(formData.clientId, {
        workoutPlanId: formData.workoutPlanId,
      } as any)

      toast({
        title: "Успех",
        description: "Тренировъчният план е назначен успешно",
      })

      onSuccess()
    } catch (error) {
      toast({
        title: "Грешка",
        description: "Неуспешно назначаване на тренировъчния план",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Назначи тренировъчен план</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Клиент *</Label>
            <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Изберете клиент" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workoutPlan">Тренировъчен план *</Label>
            <Select
              value={formData.workoutPlanId}
              onValueChange={(value) => setFormData({ ...formData, workoutPlanId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Изберете план" />
              </SelectTrigger>
              <SelectContent>
                {workoutPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.title} ({plan.goal})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Назначаване..." : "Назначи"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отказ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
