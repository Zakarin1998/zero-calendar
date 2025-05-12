"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ZapIcon, LoaderIcon, CheckIcon } from "lucide-react"
import { createEvent } from "@/lib/calendar"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

interface NaturalLanguageEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventCreated?: () => void
}

export function NaturalLanguageEventDialog({ open, onOpenChange, onEventCreated }: NaturalLanguageEventDialogProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedEvent, setParsedEvent] = useState<any | null>(null)
  const [step, setStep] = useState<"input" | "confirm">("input")

  const handleSubmit = async () => {
    if (!input.trim() || !session?.user?.id) return

    setIsProcessing(true)
    try {
      const parsedEventData = await parseWithGroq(input, session.user.id)
      setParsedEvent(parsedEventData)
      setStep("confirm")
    } catch (error) {
      console.error("Error parsing natural language input:", error)
      toast({
        title: "Error",
        description: "Failed to parse your input. Please try again with a different description.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const parseWithGroq = async (input: string, userId: string) => {
    try {
      const prompt = `
        Parse the following natural language description of a calendar event and extract structured data.
        Return a valid JSON object with the following fields:
        - title: The title of the event
        - description: A description of the event (optional)
        - start: ISO string for the start time
        - end: ISO string for the end time
        - location: The location of the event (optional)
        - category: The category of the event (Work, Personal, Family, Meeting, etc.) (optional)
        - allDay: Boolean indicating if this is an all-day event (optional)
        - recurrence: Object with recurrence information (optional)
          - type: "daily", "weekly", "monthly", or "yearly"
          - interval: Number of units between occurrences
          - endType: "never", "after", or "on"
          - endAfter: Number of occurrences (if endType is "after")
          - endOn: ISO string for end date (if endType is "on")
       
        Use the current date (${new Date().toISOString()}) as reference for relative dates like "tomorrow", "next week", etc.
        If no specific time is mentioned, use 9:00 AM as the default start time and make the event 1 hour long.
       
        Input: ${input}
      `

      const { text } = await generateText({
        model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
        prompt,
        temperature: 0.2,
        maxTokens: 1000,
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from the response")
      }

      const parsedJson = JSON.parse(jsonMatch[0])

      return {
        ...parsedJson,
        userId,
      }
    } catch (error) {
      console.error("Error using Groq for parsing:", error)
      throw error
    }
  }

  const handleConfirm = async () => {
    if (!parsedEvent || !session?.user?.id) return

    setIsProcessing(true)
    try {
      await createEvent(parsedEvent)
      toast({
        title: "Event created",
        description: "Your event has been created successfully",
      })
      if (onEventCreated) onEventCreated()
      onOpenChange(false)
      setInput("")
      setParsedEvent(null)
      setStep("input")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create the event",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    if (step === "confirm") {
      setStep("input")
      setParsedEvent(null)
    } else {
      onOpenChange(false)
      setInput("")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Event with Natural Language</DialogTitle>
          <DialogDescription>Describe your event in natural language and we'll create it for you</DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="e.g. 'Meeting with John tomorrow at 2pm for 1 hour' or 'Lunch with Sarah on Friday at noon'"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[120px]"
                autoFocus
              />

              <div className="rounded-lg bg-mono-100 dark:bg-mono-800 p-3 text-sm">
                <p className="font-medium mb-1">Tips:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Include the event title, date, time, and duration</li>
                  <li>Specify location if applicable</li>
                  <li>Mention participants or categories</li>
                  <li>For recurring events, specify the pattern (e.g., "every Monday")</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!input.trim() || isProcessing} className="gap-2">
                {isProcessing ? (
                  <>
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ZapIcon className="h-4 w-4" />
                    Create Event
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <span className="text-sm font-medium text-mono-500">Title:</span>
                  <p className="font-medium">{parsedEvent?.title}</p>
                </div>

                {parsedEvent?.description && (
                  <div>
                    <span className="text-sm font-medium text-mono-500">Description:</span>
                    <p className="text-sm">{parsedEvent.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-mono-500">Start:</span>
                    <p className="text-sm">{formatDate(parsedEvent?.start)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-mono-500">End:</span>
                    <p className="text-sm">{formatDate(parsedEvent?.end)}</p>
                  </div>
                </div>

                {parsedEvent?.location && (
                  <div>
                    <span className="text-sm font-medium text-mono-500">Location:</span>
                    <p className="text-sm">{parsedEvent.location}</p>
                  </div>
                )}

                {parsedEvent?.category && (
                  <div>
                    <span className="text-sm font-medium text-mono-500">Category:</span>
                    <p className="text-sm">{parsedEvent.category}</p>
                  </div>
                )}

                {parsedEvent?.recurrence && (
                  <div>
                    <span className="text-sm font-medium text-mono-500">Recurrence:</span>
                    <p className="text-sm">
                      {parsedEvent.recurrence.type.charAt(0).toUpperCase() + parsedEvent.recurrence.type.slice(1)}
                      {parsedEvent.recurrence.interval > 1
                        ? ` (every ${parsedEvent.recurrence.interval} ${parsedEvent.recurrence.type}s)`
                        : ""}
                      {parsedEvent.recurrence.endType === "after" ? `, ${parsedEvent.recurrence.endAfter} times` : ""}
                      {parsedEvent.recurrence.endType === "on"
                        ? `, until ${new Date(parsedEvent.recurrence.endOn).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-mono-100 dark:bg-mono-800 p-3 text-sm flex items-start gap-2">
                <ZapIcon className="h-5 w-5 text-mono-500 flex-shrink-0 mt-0.5" />
                <p>
                  We've parsed your input and created this event. Please confirm if this looks correct, or go back to
                  edit your description.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={isProcessing} className="gap-2">
                {isProcessing ? (
                  <>
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Confirm & Create
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
