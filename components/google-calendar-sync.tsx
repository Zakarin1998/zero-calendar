"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { RefreshCwIcon, CheckIcon, AlertCircleIcon } from "lucide-react"

export function GoogleCalendarSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle")
  const { toast } = useToast()

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatus("idle")

    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to sync with Google Calendar")
      }

      setSyncStatus("success")
      toast({
        title: "Sync successful",
        description: "Your calendar has been synced with Google Calendar",
      })

      setTimeout(() => {
        setSyncStatus("idle")
      }, 3000)
    } catch (error: any) {
      setSyncStatus("error")
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync with Google Calendar",
        variant: "destructive",
      })

      setTimeout(() => {
        setSyncStatus("idle")
      }, 3000)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className={`flex items-center gap-2 ${
        syncStatus === "success"
          ? "bg-green-50 text-green-700 border-green-200"
          : syncStatus === "error"
            ? "bg-red-50 text-red-700 border-red-200"
            : ""
      }`}
    >
      {isSyncing ? (
        <RefreshCwIcon className="h-4 w-4 animate-spin" />
      ) : syncStatus === "success" ? (
        <CheckIcon className="h-4 w-4 text-green-600" />
      ) : syncStatus === "error" ? (
        <AlertCircleIcon className="h-4 w-4 text-red-600" />
      ) : (
        <RefreshCwIcon className="h-4 w-4" />
      )}
      {isSyncing
        ? "Syncing..."
        : syncStatus === "success"
          ? "Sync complete"
          : syncStatus === "error"
            ? "Sync failed"
            : "Sync with Google Calendar"}
    </Button>
  )
}
