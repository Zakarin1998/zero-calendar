import { kv } from "@vercel/kv"
import { parseISO, addMinutes, format } from "date-fns"
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz"
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleCalendarEvents,
} from "./google-calendar"
import ical from "ical-generator"
import { v4 as uuidv4 } from "uuid"
import { RRule } from "rrule"

export type RecurrenceRule = {
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  interval: number
  count?: number
  until?: string
  byDay?: string[]
  byMonthDay?: number[]
  byMonth?: number[]
  bySetPos?: number[]
  weekStart?: string
  exceptions?: string[] // ISO date strings for exceptions
}

export type CalendarEvent = {
  id: string
  title: string
  description?: string
  start: string // ISO string
  end: string // ISO string
  location?: string
  color?: string
  userId: string
  source?: "google" | "local" | "microsoft"
  sourceId?: string
  recurrence?: RecurrenceRule
  exceptions?: {
    date: string // ISO date string
    status: "cancelled" | "modified"
    modifiedEvent?: Omit<CalendarEvent, "id" | "userId" | "recurrence" | "exceptions">
  }[]
  attendees?: { email: string; name?: string; status?: "accepted" | "declined" | "tentative" | "needs-action" }[]
  categories?: string[]
  reminders?: { minutes: number; method: "email" | "popup" }[]
  timezone?: string
  allDay?: boolean
  isRecurring?: boolean
}

// Convert RecurrenceRule to RRule options
function recurrenceRuleToRRuleOptions(rule: RecurrenceRule, eventStart: Date): RRule.Options {
  const options: RRule.Options = {
    freq: {
      daily: RRule.DAILY,
      weekly: RRule.WEEKLY,
      monthly: RRule.MONTHLY,
      yearly: RRule.YEARLY,
    }[rule.frequency],
    interval: rule.interval,
    dtstart: eventStart,
  }

  if (rule.count) {
    options.count = rule.count
  }

  if (rule.until) {
    options.until = new Date(rule.until)
  }

  if (rule.byDay) {
    options.byweekday = rule.byDay.map((day) => {
      const dayMap: Record<string, number> = {
        MO: RRule.MO,
        TU: RRule.TU,
        WE: RRule.WE,
        TH: RRule.TH,
        FR: RRule.FR,
        SA: RRule.SA,
        SU: RRule.SU,
      }
      return dayMap[day]
    })
  }

  if (rule.byMonthDay) {
    options.bymonthday = rule.byMonthDay
  }

  if (rule.byMonth) {
    options.bymonth = rule.byMonth
  }

  if (rule.bySetPos) {
    options.bysetpos = rule.bySetPos
  }

  if (rule.weekStart) {
    options.wkst = {
      MO: RRule.MO,
      TU: RRule.TU,
      WE: RRule.WE,
      TH: RRule.TH,
      FR: RRule.FR,
      SA: RRule.SA,
      SU: RRule.SU,
    }[rule.weekStart]
  }

  return options
}

// Generate recurring event instances
function generateRecurringInstances(
  event: CalendarEvent,
  startRange: Date,
  endRange: Date,
  timezone: string,
): CalendarEvent[] {
  if (!event.recurrence) return [event]

  const eventStart = parseISO(event.start)
  const eventEnd = parseISO(event.end)
  const duration = eventEnd.getTime() - eventStart.getTime()

  const rruleOptions = recurrenceRuleToRRuleOptions(event.recurrence, eventStart)
  const rule = new RRule(rruleOptions)

  // Get all occurrences in the date range
  const occurrences = rule.between(startRange, endRange, true)

  // Create event instances for each occurrence
  const instances = occurrences.map((date) => {
    const instanceStart = new Date(date)
    const instanceEnd = new Date(instanceStart.getTime() + duration)

    // Check if this instance is an exception
    const exceptionDate = event.exceptions?.find((ex) => {
      const exDate = parseISO(ex.date)
      return (
        exDate.getFullYear() === instanceStart.getFullYear() &&
        exDate.getMonth() === instanceStart.getMonth() &&
        exDate.getDate() === instanceStart.getDate()
      )
    })

    // Skip cancelled exceptions
    if (exceptionDate?.status === "cancelled") {
      return null
    }

    // Use modified event data for modified exceptions
    if (exceptionDate?.status === "modified" && exceptionDate.modifiedEvent) {
      return {
        ...event,
        id: `${event.id}_${format(instanceStart, "yyyyMMdd")}`,
        start: exceptionDate.modifiedEvent.start,
        end: exceptionDate.modifiedEvent.end,
        title: exceptionDate.modifiedEvent.title || event.title,
        description: exceptionDate.modifiedEvent.description || event.description,
        location: exceptionDate.modifiedEvent.location || event.location,
        color: exceptionDate.modifiedEvent.color || event.color,
        isRecurringInstance: true,
        originalEventId: event.id,
        exceptionDate: exceptionDate.date,
      }
    }

    // Regular instance
    return {
      ...event,
      id: `${event.id}_${format(instanceStart, "yyyyMMdd")}`,
      start: instanceStart.toISOString(),
      end: instanceEnd.toISOString(),
      isRecurringInstance: true,
      originalEventId: event.id,
    }
  })

  // Filter out null instances (cancelled exceptions)
  return instances.filter(Boolean) as CalendarEvent[]
}

// Get user's timezone or default to UTC
async function getUserTimezone(userId: string): Promise<string> {
  const userData = await kv.hgetall(`user:${userId}`)
  return (userData?.timezone as string) || "UTC"
}

// Convert event times to user's timezone
function adjustEventTimezone(event: CalendarEvent, fromTimezone: string, toTimezone: string): CalendarEvent {
  if (fromTimezone === toTimezone || event.allDay) {
    return event
  }

  const startUtc = parseISO(event.start)
  const endUtc = parseISO(event.end)

  const startInUserTz = utcToZonedTime(startUtc, toTimezone)
  const endInUserTz = utcToZonedTime(endUtc, toTimezone)

  return {
    ...event,
    start: startInUserTz.toISOString(),
    end: endInUserTz.toISOString(),
    timezone: toTimezone,
  }
}

// Get events for a specific date range
export async function getEvents(userId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
  // Get user's timezone
  const timezone = await getUserTimezone(userId)

  // Convert start/end to UTC for storage
  const startUtc = zonedTimeToUtc(start, timezone)
  const endUtc = zonedTimeToUtc(end, timezone)

  // Check if user has Google Calendar connected
  const userData = await kv.hgetall(`user:${userId}`)
  const hasGoogleCalendar = userData?.provider === "google" && userData?.accessToken && userData?.refreshToken

  let events: CalendarEvent[] = []

  // Get events from Google Calendar if connected
  if (hasGoogleCalendar) {
    try {
      const googleEvents = await getGoogleCalendarEvents(
        userId,
        userData.accessToken as string,
        userData.refreshToken as string,
        userData.expiresAt as number,
        startUtc,
        endUtc,
      )
      events = [...events, ...googleEvents]
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error)
      // Continue with local events if Google Calendar fails
    }
  }

  // Get local events
  const startTimestamp = startUtc.getTime()
  const endTimestamp = endUtc.getTime()

  // Get all events that might be relevant (including recurring events that started before the range)
  const localEvents = await kv.zrange(`events:${userId}`, 0, -1)

  if (localEvents && localEvents.length > 0) {
    // Process each event, expanding recurring events
    for (const event of localEvents as CalendarEvent[]) {
      if (event.recurrence) {
        // For recurring events, generate instances in the date range
        const instances = generateRecurringInstances(event, startUtc, endUtc, timezone)
        events = [...events, ...instances]
      } else {
        // For non-recurring events, check if they fall in the date range
        const eventStart = new Date(event.start).getTime()
        const eventEnd = new Date(event.end).getTime()

        if (
          (eventStart >= startTimestamp && eventStart <= endTimestamp) ||
          (eventEnd >= startTimestamp && eventEnd <= endTimestamp) ||
          (eventStart <= startTimestamp && eventEnd >= endTimestamp)
        ) {
          events.push(adjustEventTimezone(event, event.timezone || "UTC", timezone))
        }
      }
    }
  }

  // Sort events by start time
  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

// Create a new event with enhanced recurrence support
export async function createEvent(newEvent: CalendarEvent): Promise<CalendarEvent> {
  // Get user's timezone
  const timezone = await getUserTimezone(newEvent.userId)

  // Ensure event has timezone info
  newEvent.timezone = newEvent.timezone || timezone

  // Generate a unique ID if not provided
  if (!newEvent.id) {
    newEvent.id = `event_${uuidv4()}`
  }

  // Check if user has Google Calendar connected and if we should create the event there
  const userData = await kv.hgetall(`user:${newEvent.userId}`)
  const hasGoogleCalendar = userData?.provider === "google" && userData?.accessToken && userData?.refreshToken

  // If this is explicitly marked as a local event or Google Calendar is not connected
  if (newEvent.source === "local" || !hasGoogleCalendar) {
    // Create local event
    const startTimestamp = new Date(newEvent.start).getTime()
    await kv.zadd(`events:${newEvent.userId}`, { score: startTimestamp, member: newEvent })
    return newEvent
  }

  // Create event in Google Calendar
  const googleEvent = await createGoogleCalendarEvent(
    newEvent.userId,
    userData.accessToken as string,
    userData.refreshToken as string,
    userData.expiresAt as number,
    newEvent,
  )

  if (googleEvent) {
    // Store categories and reminders locally if needed
    if (newEvent.categories?.length || newEvent.reminders?.length || newEvent.recurrence) {
      await kv.hset(`event_meta:${newEvent.userId}:${googleEvent.id}`, {
        categories: newEvent.categories || [],
        reminders: newEvent.reminders || [],
        recurrence: newEvent.recurrence || null,
        exceptions: newEvent.exceptions || [],
      })
    }
    return googleEvent
  }

  // Fallback to local event if Google Calendar creation fails
  newEvent.source = "local"
  const startTimestamp = new Date(newEvent.start).getTime()
  await kv.zadd(`events:${newEvent.userId}`, { score: startTimestamp, member: newEvent })
  return newEvent
}

// Update an existing event with recurrence support
export async function updateEvent(updatedEvent: CalendarEvent): Promise<CalendarEvent> {
  // Get user's timezone
  const timezone = await getUserTimezone(updatedEvent.userId)

  // Ensure event has timezone info
  updatedEvent.timezone = updatedEvent.timezone || timezone

  // Check if this is a recurring event instance
  if (updatedEvent.isRecurringInstance && updatedEvent.originalEventId) {
    // Get the original recurring event
    const allEvents = await kv.zrange(`events:${updatedEvent.userId}`, 0, -1)
    const originalEvent = allEvents.find((event: any) => event.id === updatedEvent.originalEventId) as
      | CalendarEvent
      | undefined

    if (originalEvent && originalEvent.recurrence) {
      // Create or update an exception for this instance
      const exceptionDate = updatedEvent.exceptionDate || updatedEvent.start
      const exceptions = originalEvent.exceptions || []

      const existingExceptionIndex = exceptions.findIndex((ex) => ex.date === exceptionDate)

      if (existingExceptionIndex >= 0) {
        // Update existing exception
        exceptions[existingExceptionIndex] = {
          date: exceptionDate,
          status: "modified",
          modifiedEvent: {
            title: updatedEvent.title,
            description: updatedEvent.description,
            start: updatedEvent.start,
            end: updatedEvent.end,
            location: updatedEvent.location,
            color: updatedEvent.color,
            allDay: updatedEvent.allDay,
          },
        }
      } else {
        // Add new exception
        exceptions.push({
          date: exceptionDate,
          status: "modified",
          modifiedEvent: {
            title: updatedEvent.title,
            description: updatedEvent.description,
            start: updatedEvent.start,
            end: updatedEvent.end,
            location: updatedEvent.location,
            color: updatedEvent.color,
            allDay: updatedEvent.allDay,
          },
        })
      }

      // Update the original recurring event with the new exception
      const updatedOriginalEvent = {
        ...originalEvent,
        exceptions,
      }

      // Remove the old event
      await kv.zrem(`events:${updatedEvent.userId}`, originalEvent)

      // Add the updated original event
      const startTimestamp = new Date(originalEvent.start).getTime()
      await kv.zadd(`events:${updatedEvent.userId}`, { score: startTimestamp, member: updatedOriginalEvent })

      return updatedEvent
    }
  }

  // Regular event update (non-instance)
  // Check if this is a Google Calendar event
  if (updatedEvent.source === "google") {
    const userData = await kv.hgetall(`user:${updatedEvent.userId}`)

    if (userData?.accessToken && userData?.refreshToken) {
      // Update in Google Calendar
      const googleEvent = await updateGoogleCalendarEvent(
        updatedEvent.userId,
        userData.accessToken as string,
        userData.refreshToken as string,
        userData.expiresAt as number,
        updatedEvent,
      )

      if (googleEvent) {
        // Update categories and reminders locally if needed
        if (updatedEvent.categories?.length || updatedEvent.reminders?.length || updatedEvent.recurrence) {
          await kv.hset(`event_meta:${updatedEvent.userId}:${googleEvent.id}`, {
            categories: updatedEvent.categories || [],
            reminders: updatedEvent.reminders || [],
            recurrence: updatedEvent.recurrence || null,
            exceptions: updatedEvent.exceptions || [],
          })
        }
        return googleEvent
      }
    }
  }

  // Update local event
  // First, remove the old event
  const allEvents = await kv.zrange(`events:${updatedEvent.userId}`, 0, -1)
  const oldEvent = allEvents.find((event: any) => event.id === updatedEvent.id)

  if (oldEvent) {
    await kv.zrem(`events:${updatedEvent.userId}`, oldEvent)
  }

  // Then add the updated event
  const startTimestamp = new Date(updatedEvent.start).getTime()
  await kv.zadd(`events:${updatedEvent.userId}`, { score: startTimestamp, member: updatedEvent })

  return updatedEvent
}

// Delete an event with recurrence support
export async function deleteEvent(userId: string, eventId: string, deleteAllInstances = false): Promise<boolean> {
  // Check if this is a recurring event instance
  if (eventId.includes("_") && !deleteAllInstances) {
    const originalEventId = eventId.split("_")[0]

    // Get the original recurring event
    const allEvents = await kv.zrange(`events:${userId}`, 0, -1)
    const originalEvent = allEvents.find((event: any) => event.id === originalEventId) as CalendarEvent | undefined

    if (originalEvent && originalEvent.recurrence) {
      // Get the instance date from the ID
      const instanceDateStr = eventId.split("_")[1]
      const instanceDate = new Date(
        Number.parseInt(instanceDateStr.substring(0, 4)),
        Number.parseInt(instanceDateStr.substring(4, 6)) - 1,
        Number.parseInt(instanceDateStr.substring(6, 8)),
      )

      // Add an exception for this instance
      const exceptions = originalEvent.exceptions || []
      exceptions.push({
        date: instanceDate.toISOString(),
        status: "cancelled",
      })

      // Update the original recurring event
      const updatedOriginalEvent = {
        ...originalEvent,
        exceptions,
      }

      // Remove the old event
      await kv.zrem(`events:${userId}`, originalEvent)

      // Add the updated original event
      const startTimestamp = new Date(originalEvent.start).getTime()
      await kv.zadd(`events:${userId}`, { score: startTimestamp, member: updatedOriginalEvent })

      return true
    }
  }

  // Regular event deletion or delete all instances
  // First, find the event
  const allEvents = await kv.zrange(`events:${userId}`, 0, -1)
  const event = allEvents.find((event: any) => event.id === eventId) as CalendarEvent | undefined

  if (!event) {
    // Check if it's a Google Calendar event
    const userData = await kv.hgetall(`user:${userId}`)

    if (userData?.provider === "google" && userData?.accessToken && userData?.refreshToken) {
      try {
        // Delete from Google Calendar
        await deleteGoogleCalendarEvent(
          userId,
          userData.accessToken as string,
          userData.refreshToken as string,
          userData.expiresAt as number,
          eventId,
        )

        // Remove any local metadata
        await kv.del(`event_meta:${userId}:${eventId}`)

        return true
      } catch (error) {
        console.error("Error deleting Google Calendar event:", error)
        return false
      }
    }

    return false
  }

  // If it's a Google Calendar event, delete it there too
  if (event.source === "google" && event.sourceId) {
    const userData = await kv.hgetall(`user:${userId}`)

    if (userData?.accessToken && userData?.refreshToken) {
      try {
        await deleteGoogleCalendarEvent(
          userId,
          userData.accessToken as string,
          userData.refreshToken as string,
          userData.expiresAt as number,
          event.sourceId,
        )
      } catch (error) {
        console.error("Error deleting Google Calendar event:", error)
        // Continue with local deletion even if Google Calendar fails
      }
    }
  }

  // Delete local event
  await kv.zrem(`events:${userId}`, event)

  // Remove any metadata
  await kv.del(`event_meta:${userId}:${eventId}`)

  return true
}

// Search for events
export async function searchEvents(userId: string, query: string): Promise<CalendarEvent[]> {
  // Get all events for the user (past and future)
  const allEvents = await kv.zrange(`events:${userId}`, 0, -1)

  // Get user's timezone
  const timezone = await getUserTimezone(userId)

  // Filter events by query
  const queryLower = query.toLowerCase()
  const matchingEvents = allEvents.filter((event: any) => {
    return (
      event.title.toLowerCase().includes(queryLower) ||
      (event.description && event.description.toLowerCase().includes(queryLower)) ||
      (event.location && event.location.toLowerCase().includes(queryLower))
    )
  })

  // Also search Google Calendar if connected
  const userData = await kv.hgetall(`user:${userId}`)
  const hasGoogleCalendar = userData?.provider === "google" && userData?.accessToken && userData?.refreshToken

  if (hasGoogleCalendar) {
    try {
      // This would be a call to search Google Calendar
      // For now, we'll just get all events and filter them
      const start = new Date(0) // Beginning of time
      const end = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) // One year from now

      const googleEvents = await getGoogleCalendarEvents(
        userId,
        userData.accessToken as string,
        userData.refreshToken as string,
        userData.expiresAt as number,
        start,
        end,
      )

      const matchingGoogleEvents = googleEvents.filter((event) => {
        return (
          event.title.toLowerCase().includes(queryLower) ||
          (event.description && event.description.toLowerCase().includes(queryLower)) ||
          (event.location && event.location.toLowerCase().includes(queryLower))
        )
      })

      // Combine and deduplicate events
      const allMatchingEvents = [...matchingEvents, ...matchingGoogleEvents]
      const uniqueEvents = allMatchingEvents.filter(
        (event, index, self) => index === self.findIndex((e) => e.id === event.id),
      )

      return uniqueEvents.map((event) => adjustEventTimezone(event as CalendarEvent, timezone))
    } catch (error) {
      console.error("Error searching Google Calendar:", error)
      // Continue with local results if Google Calendar fails
    }
  }

  return matchingEvents.map((event) => adjustEventTimezone(event as CalendarEvent, timezone))
}

// Export calendar to ICS with enhanced timezone and recurrence support
export async function exportToICS(userId: string, start?: Date, end?: Date): Promise<string> {
  // Get user's timezone
  const userTimezone = await getUserTimezone(userId)

  // Get all events or events in a specific range
  const events = await getEvents(userId, start || new Date(0), end || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365))

  // Create ICS calendar
  const calendar = ical({
    name: "Zero Calendar",
    timezone: userTimezone,
  })

  // Add events to calendar
  events.forEach((event) => {
    // Skip recurring instances as we'll add the master event with recurrence rule
    if (event.isRecurringInstance) return

    const icalEvent = calendar.createEvent({
      id: event.id,
      start: new Date(event.start),
      end: new Date(event.end),
      summary: event.title,
      description: event.description,
      location: event.location,
      timezone: event.timezone || userTimezone,
      allDay: event.allDay,
    })

    // Add recurrence rule if this is a recurring event
    if (event.recurrence) {
      const rruleOptions = recurrenceRuleToRRuleOptions(event.recurrence, new Date(event.start))
      const rule = new RRule(rruleOptions)
      icalEvent.repeating(rule.toString())

      // Add exceptions
      if (event.exceptions) {
        event.exceptions.forEach((exception) => {
          if (exception.status === "cancelled") {
            icalEvent.exdate(new Date(exception.date))
          } else if (exception.status === "modified" && exception.modifiedEvent) {
            // For modified exceptions, we need to create a new event
            calendar.createEvent({
              id: `${event.id}_exception_${new Date(exception.date).toISOString()}`,
              start: new Date(exception.modifiedEvent.start || event.start),
              end: new Date(exception.modifiedEvent.end || event.end),
              summary: exception.modifiedEvent.title || event.title,
              description: exception.modifiedEvent.description || event.description,
              location: exception.modifiedEvent.location || event.location,
              timezone: event.timezone || userTimezone,
              allDay: exception.modifiedEvent.allDay || event.allDay,
              recurrenceId: new Date(exception.date),
            })
          }
        })
      }
    }

    // Add attendees
    if (event.attendees) {
      event.attendees.forEach((attendee) => {
        icalEvent.createAttendee({
          email: attendee.email,
          name: attendee.name,
          status: attendee.status as any,
        })
      })
    }

    // Add categories
    if (event.categories) {
      icalEvent.categories(event.categories)
    }
  })

  return calendar.toString()
}

// Import events from ICS with enhanced timezone and recurrence support
export async function importFromICS(userId: string, icsData: string): Promise<{ imported: number; errors: number }> {
  const userTimezone = await getUserTimezone(userId)
  let imported = 0
  let errors = 0

  try {
    // Parse ICS data
    const ical = require("node-ical")
    const parsedEvents = ical.parseICS(icsData)

    // Process each event
    for (const key in parsedEvents) {
      const parsedEvent = parsedEvents[key]

      // Skip non-events
      if (parsedEvent.type !== "VEVENT") continue

      try {
        // Create event object
        const event: CalendarEvent = {
          id: `imported_${uuidv4()}`,
          title: parsedEvent.summary || "Untitled Event",
          description: parsedEvent.description,
          start: parsedEvent.start.toISOString(),
          end: parsedEvent.end.toISOString(),
          location: parsedEvent.location,
          userId,
          source: "local",
          timezone: parsedEvent.timezone || userTimezone,
          allDay: parsedEvent.allDay || false,
        }

        // Handle recurrence
        if (parsedEvent.rrule) {
          const rrule = parsedEvent.rrule.toString()

          // Parse frequency
          let frequency: "daily" | "weekly" | "monthly" | "yearly" = "daily"
          if (rrule.includes("FREQ=DAILY")) frequency = "daily"
          if (rrule.includes("FREQ=WEEKLY")) frequency = "weekly"
          if (rrule.includes("FREQ=MONTHLY")) frequency = "monthly"
          if (rrule.includes("FREQ=YEARLY")) frequency = "yearly"

          // Parse interval
          const intervalMatch = rrule.match(/INTERVAL=(\d+)/)
          const interval = intervalMatch ? Number.parseInt(intervalMatch[1]) : 1

          // Parse count
          const countMatch = rrule.match(/COUNT=(\d+)/)
          const count = countMatch ? Number.parseInt(countMatch[1]) : undefined

          // Parse until
          const untilMatch = rrule.match(/UNTIL=(\d+T\d+Z)/)
          const until = untilMatch ? new Date(untilMatch[1]).toISOString() : undefined

          // Parse byDay
          const byDayMatch = rrule.match(/BYDAY=([^;]+)/)
          const byDay = byDayMatch ? byDayMatch[1].split(",") : undefined

          // Parse byMonthDay
          const byMonthDayMatch = rrule.match(/BYMONTHDAY=([^;]+)/)
          const byMonthDay = byMonthDayMatch ? byMonthDayMatch[1].split(",").map(Number) : undefined

          // Parse byMonth
          const byMonthMatch = rrule.match(/BYMONTH=([^;]+)/)
          const byMonth = byMonthMatch ? byMonthMatch[1].split(",").map(Number) : undefined

          // Create recurrence rule
          event.recurrence = {
            frequency,
            interval,
            count,
            until,
            byDay,
            byMonthDay,
            byMonth,
          }

          // Handle exceptions
          if (parsedEvent.exdate) {
            event.exceptions = []

            // Convert exdate to array if it's not already
            const exdates = Array.isArray(parsedEvent.exdate) ? parsedEvent.exdate : [parsedEvent.exdate]

            exdates.forEach((exdate) => {
              event.exceptions!.push({
                date: exdate.toISOString(),
                status: "cancelled",
              })
            })
          }
        }

        // Save the event
        await createEvent(event)
        imported++
      } catch (error) {
        console.error("Error importing event:", error)
        errors++
      }
    }

    return { imported, errors }
  } catch (error) {
    console.error("Error parsing ICS data:", error)
    return { imported, errors: 1 }
  }
}

// Export calendar to CSV
export async function exportToCSV(userId: string, start?: Date, end?: Date): Promise<string> {
  // Get user's timezone
  const userTimezone = await getUserTimezone(userId)

  // Get all events or events in a specific range
  const events = await getEvents(userId, start || new Date(0), end || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365))

  // Create CSV header
  let csv = "Subject,Start Date,Start Time,End Date,End Time,All Day,Description,Location,Categories\n"

  // Add events to CSV
  events.forEach((event) => {
    const startDate = new Date(event.start)
    const endDate = new Date(event.end)

    // Format dates and times
    const startDateFormatted = format(startDate, "MM/dd/yyyy")
    const startTimeFormatted = event.allDay ? "" : format(startDate, "HH:mm")
    const endDateFormatted = format(endDate, "MM/dd/yyyy")
    const endTimeFormatted = event.allDay ? "" : format(endDate, "HH:mm")

    // Escape fields
    const escapeCSV = (field = "") => `"${field.replace(/"/g, '""')}"`

    // Add row
    csv +=
      [
        escapeCSV(event.title),
        startDateFormatted,
        startTimeFormatted,
        endDateFormatted,
        endTimeFormatted,
        event.allDay ? "TRUE" : "FALSE",
        escapeCSV(event.description),
        escapeCSV(event.location),
        escapeCSV(event.categories?.join(", ")),
      ].join(",") + "\n"
  })

  return csv
}

// Import events from CSV
export async function importFromCSV(userId: string, csvData: string): Promise<{ imported: number; errors: number }> {
  const userTimezone = await getUserTimezone(userId)
  let imported = 0
  let errors = 0

  try {
    // Parse CSV data
    const rows = csvData.split("\n")
    const headers = rows[0].split(",")

    // Find column indices
    const getColumnIndex = (name: string) => {
      const index = headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()))
      return index >= 0 ? index : null
    }

    const subjectIndex = getColumnIndex("subject") || getColumnIndex("title")
    const startDateIndex = getColumnIndex("start date")
    const startTimeIndex = getColumnIndex("start time")
    const endDateIndex = getColumnIndex("end date")
    const endTimeIndex = getColumnIndex("end time")
    const allDayIndex = getColumnIndex("all day")
    const descriptionIndex = getColumnIndex("description")
    const locationIndex = getColumnIndex("location")
    const categoriesIndex = getColumnIndex("categories")

    // Validate required columns
    if (subjectIndex === null || startDateIndex === null) {
      throw new Error("CSV must contain at least Subject/Title and Start Date columns")
    }

    // Process each row
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue

      try {
        // Parse row
        const row = rows[i].split(",")

        // Parse CSV field, handling quoted values
        const parseField = (index: number | null) => {
          if (index === null || index >= row.length) return ""

          let value = row[index].trim()

          // Handle quoted values
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1).replace(/""/g, '"')
          }

          return value
        }

        // Get field values
        const title = parseField(subjectIndex)
        const startDateStr = parseField(startDateIndex)
        const startTimeStr = startTimeIndex !== null ? parseField(startTimeIndex) : ""
        const endDateStr = endDateIndex !== null ? parseField(endDateIndex) : startDateStr
        const endTimeStr =
          endTimeIndex !== null
            ? parseField(endTimeIndex)
            : startTimeStr
              ? addMinutes(parseISO(`${startDateStr}T${startTimeStr}`), 30)
                  .toISOString()
                  .substring(11, 16)
              : ""
        const allDayStr = allDayIndex !== null ? parseField(allDayIndex).toLowerCase() : ""
        const description = descriptionIndex !== null ? parseField(descriptionIndex) : ""
        const location = locationIndex !== null ? parseField(locationIndex) : ""
        const categoriesStr = categoriesIndex !== null ? parseField(categoriesIndex) : ""

        // Parse dates
        const startDate = parseISO(`${startDateStr}${startTimeStr ? `T${startTimeStr}` : "T00:00:00"}`)
        const endDate = parseISO(`${endDateStr}${endTimeStr ? `T${endTimeStr}` : "T23:59:59"}`)

        // Parse all day flag
        const allDay = allDayStr === "true" || allDayStr === "yes" || allDayStr === "1" || !startTimeStr

        // Parse categories
        const categories = categoriesStr ? categoriesStr.split(",").map((c) => c.trim()) : []

        // Create event
        const event: CalendarEvent = {
          id: `imported_${uuidv4()}`,
          title,
          description,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          location,
          userId,
          source: "local",
          timezone: userTimezone,
          allDay,
          categories: categories.length > 0 ? categories : undefined,
        }

        // Save the event
        await createEvent(event)
        imported++
      } catch (error) {
        console.error("Error importing event from CSV row:", error)
        errors++
      }
    }

    return { imported, errors }
  } catch (error) {
    console.error("Error parsing CSV data:", error)
    return { imported, errors: 1 }
  }
}
