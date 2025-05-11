"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrashIcon, MapPinIcon, ClockIcon, AlignLeftIcon, XIcon, CheckIcon } from "lucide-react"
import { type CalendarEvent, createEvent, updateEvent, deleteEvent } from "@/lib/calendar"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  start: z.string().min(1, "Start date is required"),
  end: z.string().min(1, "End date is required"),
  location: z.string().optional(),
  color: z.string().default("#3b82f6"),
  timezone: z.string().optional(),
})

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEvent | null
  onEventUpdated?: (event: CalendarEvent) => void
  onEventDeleted?: (eventId: string) => void
}

export function EventDialog({ open, onOpenChange, event, onEventUpdated, onEventDeleted }: EventDialogProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      start: new Date().toISOString().slice(0, 16),
      end: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      location: "",
      color: "#3b82f6",
    },
  })

  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description || "",
        start: new Date(event.start).toISOString().slice(0, 16),
        end: new Date(event.end).toISOString().slice(0, 16),
        location: event.location || "",
        color: event.color || "#3b82f6",
      })
    } else {
      form.reset({
        title: "",
        description: "",
        start: new Date().toISOString().slice(0, 16),
        end: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        location: "",
        color: "#3b82f6",
      })
    }

    // Reset delete confirmation when dialog opens/closes
    setConfirmDelete(false)
  }, [event, form, open])

  useEffect(() => {
    // Get the user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

    // Set the timezone in the form
    form.setValue("timezone", userTimezone)
  }, [form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create events",
        variant: "destructive",
      })
      return
    }

    try {
      const eventData: CalendarEvent = {
        id: event?.id || `event_${Date.now()}`,
        title: values.title,
        description: values.description,
        start: values.start,
        end: values.end,
        location: values.location,
        color: values.color,
        userId: session.user.id,
        timezone: values.timezone || "UTC", // Include the timezone
      }

      if (event) {
        const updatedEvent = await updateEvent(eventData)
        toast({
          title: "Event updated",
          description: "Your event has been updated successfully",
        })
        if (onEventUpdated) {
          onEventUpdated(updatedEvent)
        }
      } else {
        const newEvent = await createEvent(eventData)
        toast({
          title: "Event created",
          description: "Your event has been created successfully",
        })
        if (onEventUpdated) {
          onEventUpdated(newEvent)
        }
      }

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error saving your event",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!event || !session?.user?.id) return

    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setIsDeleting(true)
    try {
      await deleteEvent(session.user.id, event.id)
      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully",
      })
      if (onEventDeleted) {
        onEventDeleted(event.id)
      }
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error deleting your event",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-content max-w-lg">
        <DialogHeader className="dialog-header">
          <DialogTitle className="dialog-title">{event ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription className="dialog-description">
            {event ? "Make changes to your event here." : "Add a new event to your calendar."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Event title"
                      {...field}
                      className="text-lg font-medium border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-mono-400"
                    />
                  </FormControl>
                  <FormMessage className="text-mono-500" />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-mono-100 dark:bg-mono-800 text-mono-500">
                  <ClockIcon className="h-5 w-5" />
                </div>
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <FormField
                    control={form.control}
                    name="start"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            className="rounded-lg border-mono-200 dark:border-mono-700 h-9 text-sm focus-visible:ring-mono-400 dark:focus-visible:ring-mono-500"
                          />
                        </FormControl>
                        <FormMessage className="text-mono-500" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            className="rounded-lg border-mono-200 dark:border-mono-700 h-9 text-sm focus-visible:ring-mono-400 dark:focus-visible:ring-mono-500"
                          />
                        </FormControl>
                        <FormMessage className="text-mono-500" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-mono-100 dark:bg-mono-800 text-mono-500">
                  <MapPinIcon className="h-5 w-5" />
                </div>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="Add location"
                          {...field}
                          className="rounded-lg border-mono-200 dark:border-mono-700 h-9 text-sm focus-visible:ring-mono-400 dark:focus-visible:ring-mono-500"
                        />
                      </FormControl>
                      <FormMessage className="text-mono-500" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-mono-100 dark:bg-mono-800 text-mono-500">
                  <AlignLeftIcon className="h-5 w-5" />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Textarea
                          placeholder="Add a description"
                          className="resize-none rounded-lg min-h-[100px] border-mono-200 dark:border-mono-700 focus-visible:ring-mono-400 dark:focus-visible:ring-mono-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-mono-500" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center overflow-hidden">
                  <div
                    className={cn(
                      "w-full h-full",
                      form.watch("color") === "#3b82f6" && "bg-mono-900 dark:bg-mono-100",
                      form.watch("color") === "#10b981" && "bg-mono-700 dark:bg-mono-300",
                      form.watch("color") === "#ef4444" && "bg-mono-500 dark:bg-mono-500",
                      form.watch("color") === "#f59e0b" && "bg-mono-300 dark:bg-mono-700",
                      form.watch("color") === "#8b5cf6" && "bg-mono-200 dark:bg-mono-800",
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg border-mono-200 dark:border-mono-700 h-9">
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg border-mono-200 dark:border-mono-700">
                          <SelectItem value="#3b82f6" className="rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="mr-2 h-4 w-4 rounded-full bg-mono-900 dark:bg-mono-100" />
                              <span>Black</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="#10b981" className="rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="mr-2 h-4 w-4 rounded-full bg-mono-700 dark:bg-mono-300" />
                              <span>Dark Gray</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="#ef4444" className="rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="mr-2 h-4 w-4 rounded-full bg-mono-500 dark:bg-mono-500" />
                              <span>Gray</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="#f59e0b" className="rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="mr-2 h-4 w-4 rounded-full bg-mono-300 dark:bg-mono-700" />
                              <span>Light Gray</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="#8b5cf6" className="rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="mr-2 h-4 w-4 rounded-full bg-mono-200 dark:bg-mono-800" />
                              <span>Subtle</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-mono-500" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        <DialogFooter className="px-6 py-4 mt-4 bg-mono-50 dark:bg-mono-900">
          <div className="flex w-full items-center justify-between">
            {event && (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                onClick={handleDelete}
                disabled={isDeleting}
                className={cn(
                  "rounded-lg text-sm",
                  confirmDelete
                    ? "bg-mono-500 text-mono-50 hover:bg-mono-600 dark:bg-mono-400 dark:text-mono-900"
                    : "text-mono-500 hover:text-mono-700 hover:bg-mono-100 dark:text-mono-400 dark:hover:text-mono-200",
                )}
              >
                {confirmDelete ? (
                  <>
                    <CheckIcon className="mr-2 h-4 w-4" />
                    Confirm
                  </>
                ) : (
                  <>
                    <TrashIcon className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </>
                )}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-lg text-sm bg-mono-100 dark:bg-mono-800 hover:bg-mono-200 dark:hover:bg-mono-700"
              >
                <XIcon className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={form.handleSubmit(onSubmit)}
                disabled={form.formState.isSubmitting}
                className="rounded-lg text-sm bg-mono-900 text-mono-50 hover:bg-mono-800 dark:bg-mono-50 dark:text-mono-900 dark:hover:bg-mono-200"
              >
                <CheckIcon className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Saving..." : event ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
