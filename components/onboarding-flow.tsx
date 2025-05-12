"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { saveUserPreferences } from "@/lib/auth"
import { CalendarIcon, CheckIcon, ArrowRightIcon } from "lucide-react"

interface OnboardingFlowProps {
  open: boolean
  onComplete: () => void
}

export function OnboardingFlow({ open, onComplete }: OnboardingFlowProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferences, setPreferences] = useState({
    name: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    defaultView: "month",
    workingHours: {
      start: "09:00",
      end: "17:00",
    },
    workDays: [1, 2, 3, 4, 5], 
    showWeekends: true,
    enableNotifications: true,
    theme: "system",
  })

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    if (!session?.user?.id) return

    setIsSubmitting(true)
    try {
      await saveUserPreferences(session.user.id, preferences)

      toast({
        title: "Setup complete",
        description: "Your preferences have been saved successfully",
      })

      onComplete()
      router.push("/calendar")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your preferences",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleWorkDay = (day: number) => {
    setPreferences((prev) => {
      const workDays = [...prev.workDays]

      if (workDays.includes(day)) {
        return {
          ...prev,
          workDays: workDays.filter((d) => d !== day),
        }
      } else {
        return {
          ...prev,
          workDays: [...workDays, day].sort(),
        }
      }
    })
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Welcome to Zero Calendar
          </DialogTitle>
          <DialogDescription>Let's set up your calendar preferences</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex justify-between mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= i
                      ? "bg-mono-900 text-mono-50 dark:bg-mono-50 dark:text-mono-900"
                      : "bg-mono-200 text-mono-500 dark:bg-mono-700"
                  }`}
                >
                  {step > i ? <CheckIcon className="h-4 w-4" /> : i}
                </div>
                <div className="text-xs mt-1 text-mono-500">
                  {i === 1 && "Basics"}
                  {i === 2 && "Schedule"}
                  {i === 3 && "Preferences"}
                  {i === 4 && "Finish"}
                </div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={preferences.name}
                  onChange={(e) => setPreferences((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => setPreferences((prev) => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Intl.supportedValuesOf("timeZone").map((timezone) => (
                      <SelectItem key={timezone} value={timezone}>
                        {timezone.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme Preference</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) => setPreferences((prev) => ({ ...prev, theme: value }))}
                >
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Working Days</Label>
                <div className="flex flex-wrap gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
                    const dayNum = (index + 1) % 7
                    return (
                      <div
                        key={day}
                        className={`px-3 py-1.5 rounded-md cursor-pointer border ${
                          preferences.workDays.includes(dayNum)
                            ? "bg-mono-900 text-mono-50 dark:bg-mono-50 dark:text-mono-900 border-mono-900 dark:border-mono-50"
                            : "bg-mono-100 text-mono-500 dark:bg-mono-800 border-mono-200 dark:border-mono-700"
                        }`}
                        onClick={() => toggleWorkDay(dayNum)}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="work-start">Work Day Starts</Label>
                  <Input
                    id="work-start"
                    type="time"
                    value={preferences.workingHours.start}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        workingHours: { ...prev.workingHours, start: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work-end">Work Day Ends</Label>
                  <Input
                    id="work-end"
                    type="time"
                    value={preferences.workingHours.end}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        workingHours: { ...prev.workingHours, end: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-weekends"
                  checked={preferences.showWeekends}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({
                      ...prev,
                      showWeekends: checked === true,
                    }))
                  }
                />
                <label htmlFor="show-weekends" className="text-sm font-medium">
                  Show weekends in calendar view
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-view">Default Calendar View</Label>
                <Select
                  value={preferences.defaultView}
                  onValueChange={(value) => setPreferences((prev) => ({ ...prev, defaultView: value }))}
                >
                  <SelectTrigger id="default-view">
                    <SelectValue placeholder="Select default view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-notifications"
                  checked={preferences.enableNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({
                      ...prev,
                      enableNotifications: checked === true,
                    }))
                  }
                />
                <label htmlFor="enable-notifications" className="text-sm font-medium">
                  Enable event notifications
                </label>
              </div>

              <div className="rounded-lg bg-mono-100 dark:bg-mono-800 p-4 text-sm">
                <p className="font-medium mb-2">Calendar Integrations</p>
                <p className="text-mono-500 mb-4">
                  You can connect your existing calendars after completing the setup.
                </p>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  <span>Google Calendar</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-6 text-center space-y-4">
                <div className="h-16 w-16 bg-mono-900 dark:bg-mono-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckIcon className="h-8 w-8 text-mono-50 dark:text-mono-900" />
                </div>

                <h3 className="text-xl font-bold">You're all set!</h3>

                <p className="text-mono-500">
                  Your calendar is ready to use. You can always change these settings later.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-mono-500">Name:</span>
                  <span>{preferences.name || session?.user?.name || "Not set"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-mono-500">Timezone:</span>
                  <span>{preferences.timezone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-mono-500">Working Hours:</span>
                  <span>
                    {preferences.workingHours.start} - {preferences.workingHours.end}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-mono-500">Default View:</span>
                  <span className="capitalize">{preferences.defaultView}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              Back
            </Button>
          )}

          <Button onClick={handleNext} disabled={isSubmitting || (step === 1 && !preferences.name)} className="gap-2">
            {isSubmitting ? (
              "Saving..."
            ) : step < 4 ? (
              <>
                Next
                <ArrowRightIcon className="h-4 w-4" />
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
