"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, ZapIcon, SearchIcon, FilterIcon } from "lucide-react"
import { type CalendarEvent, getEvents } from "@/lib/calendar"
import { EventDialog } from "./event-dialog"
import { ChatPanel } from "./chat-panel"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
  initialEvents: CalendarEvent[]
}

export function CalendarView({ initialEvents }: CalendarViewProps) {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>(events)

  useEffect(() => {
    if (session?.user?.id) {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      getEvents(session.user.id, startDate, endDate).then((fetchedEvents) => {
        setEvents(fetchedEvents)
      })
    }
  }, [currentDate, session])

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const filtered = events.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          (event.description && event.description.toLowerCase().includes(query)),
      )
      setFilteredEvents(filtered)
    } else {
      setFilteredEvents(events)
    }
  }, [searchQuery, events])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const daysInMonth = []
    const startingDayOfWeek = firstDay.getDay()

    // Add days from previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -i)
      daysInMonth.unshift({
        date: prevMonthDay,
        isCurrentMonth: false,
        events: [],
      })
    }

    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currentDate = new Date(year, month, i)
      const dayEvents = filteredEvents.filter((event) => {
        const eventDate = new Date(event.start)
        return eventDate.getDate() === i && eventDate.getMonth() === month && eventDate.getFullYear() === year
      })

      daysInMonth.push({
        date: currentDate,
        isCurrentMonth: true,
        events: dayEvents,
      })
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - daysInMonth.length // 6 rows of 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDay = new Date(year, month + 1, i)
      daysInMonth.push({
        date: nextMonthDay,
        isCurrentMonth: false,
        events: [],
      })
    }

    return daysInMonth
  }

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDialog(true)
  }

  const handleAIToolExecution = async (result: any) => {
    // Refresh events after AI makes changes
    if (session?.user?.id) {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const refreshedEvents = await getEvents(session.user.id, startDate, endDate)
      setEvents(refreshedEvents)
    }
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const getEventColor = (event: CalendarEvent) => {
    const colorMap: Record<string, string> = {
      "#3b82f6": "event-item-black",
      "#10b981": "event-item-gray",
      "#ef4444": "event-item-light",
      "#f59e0b": "event-item-subtle",
      "#8b5cf6": "event-item-outline",
    }

    return colorMap[event.color || "#3b82f6"] || "event-item-black"
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold text-mono-900 dark:text-mono-50 tracking-tight">
              {currentDate.toLocaleDateString("en-US", { month: "long" })}
            </h2>
            <span className="text-mono-500 tracking-wide text-sm">
              {currentDate.toLocaleDateString("en-US", { year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="rounded-lg h-9 w-9 bg-mono-100 dark:bg-mono-800"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="rounded-lg h-9 w-9 bg-mono-100 dark:bg-mono-800"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="rounded-lg h-9 border-mono-200 dark:border-mono-700"
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="relative w-56">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mono-400" />
            <Input
              placeholder="Search events..."
              className="pl-9 rounded-lg bg-mono-50 dark:bg-mono-900 h-9 text-sm focus-visible:ring-mono-400 dark:focus-visible:ring-mono-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={view} onValueChange={(value: "month" | "week" | "day") => setView(value)}>
            <SelectTrigger className="w-32 rounded-lg h-9 border-mono-200 dark:border-mono-700">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-mono-200 dark:border-mono-700">
              <SelectItem value="month" className="rounded-md my-1 cursor-pointer">
                Month
              </SelectItem>
              <SelectItem value="week" className="rounded-md my-1 cursor-pointer">
                Week
              </SelectItem>
              <SelectItem value="day" className="rounded-md my-1 cursor-pointer">
                Day
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 bg-mono-100 dark:bg-mono-800">
            <FilterIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="rounded-lg h-9 gap-1 shadow-soft"
            onClick={() => setShowEventDialog(true)}
          >
            <PlusIcon className="h-4 w-4" />
            <span>Event</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg h-9 gap-1 bg-mono-100 dark:bg-mono-800"
            onClick={() => setShowChatPanel(true)}
          >
            <ZapIcon className="h-4 w-4" />
            <span>AI</span>
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-mono-200 dark:border-mono-700 shadow-soft overflow-hidden">
        <div className="grid grid-cols-7 border-b border-mono-200 dark:border-mono-700 bg-mono-50 dark:bg-mono-900">
          {weekdays.map((day) => (
            <div key={day} className="text-center py-3 font-medium text-sm text-mono-500 dark:text-mono-400">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-background">
          {daysInMonth.map((day, index) => (
            <div
              key={index}
              className={cn(
                "calendar-day",
                !day.isCurrentMonth && "not-current-month",
                day.date.toDateString() === new Date().toDateString() && "today",
              )}
            >
              <div className="calendar-day-header">
                <span
                  className={cn(
                    "calendar-day-number",
                    day.date.toDateString() === new Date().toDateString() && "text-mono-900 dark:text-mono-50",
                  )}
                >
                  {day.date.getDate()}
                </span>
                {day.date.toDateString() === new Date().toDateString() && (
                  <Badge className="h-5 text-xs bg-mono-200 text-mono-700 dark:bg-mono-700 dark:text-mono-200 rounded-md px-1.5">
                    Today
                  </Badge>
                )}
              </div>
              <div className="mt-1 space-y-1">
                {day.events.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={cn("event-item", getEventColor(event))}
                    onClick={() => handleEventClick(event)}
                  >
                    {event.title}
                  </div>
                ))}
                {day.events.length > 3 && (
                  <div className="text-xs text-center cursor-pointer hover:underline text-mono-500 dark:text-mono-400">
                    +{day.events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <EventDialog
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        event={selectedEvent}
        onEventUpdated={(updatedEvent) => {
          setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)))
          setSelectedEvent(null)
        }}
        onEventDeleted={(eventId) => {
          setEvents((prev) => prev.filter((e) => e.id !== eventId))
          setSelectedEvent(null)
        }}
      />

      <ChatPanel open={showChatPanel} onOpenChange={setShowChatPanel} onToolExecution={handleAIToolExecution} />

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          className="h-12 w-12 rounded-full shadow-glow bg-mono-900 text-mono-50 dark:bg-mono-50 dark:text-mono-900 hover:scale-105 transition-transform"
          onClick={() => setShowChatPanel(true)}
          aria-label="Open AI Assistant"
        >
          <ZapIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
