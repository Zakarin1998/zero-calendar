import { kv } from "@vercel/kv"
import { parseISO, addMinutes } from "date-fns"
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz"
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleCalendarEvents,
} from "./google-calendar"
import ical from "ical-generator"

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
  recurrence?: string
  attendees?: { email: string; name?: string; status?: "accepted" | "declined" | "tentative" | "needs-action" }[]
  categories?: string[]
  reminders?: { minutes: number; method: "email" | "popup" }[]
  timezone?: string
}

async function getUserTimezone(userId: string): Promise<string> {
  const userData = await kv.hgetall(`user:${userId}`)
  return (userData?.timezone as string) || "UTC"
}

function adjustEventTimezone(event: CalendarEvent, timezone: string): CalendarEvent {
  if (!event.timezone || event.timezone === timezone) {
    return event
  }

  const startUtc = parseISO(event.start)
  const endUtc = parseISO(event.end)

  const startInUserTz = utcToZonedTime(startUtc, timezone)
  const endInUserTz = utcToZonedTime(endUtc, timezone)

  return {
    ...event,
    start: startInUserTz.toISOString(),
    end: endInUserTz.toISOString(),
    timezone,
  }
}

export async function getEvents(userId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
  const timezone = await getUserTimezone(userId)

  const startUtc = zonedTimeToUtc(start, timezone)
  const endUtc = zonedTimeToUtc(end, timezone)

  const userData = await kv.hgetall(`user:${userId}`)
  const hasGoogleCalendar = userData?.provider === "google" && userData?.accessToken && userData?.refreshToken

  let events: CalendarEvent[] = []

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
    }
  }

  const startTimestamp = startUtc.getTime()
  const endTimestamp = endUtc.getTime()

  const localEvents = await kv.zrangebyscore(`events:${userId}`, startTimestamp, endTimestamp)

  if (localEvents && localEvents.length > 0) {
    events = [...events, ...localEvents.map((event) => adjustEventTimezone(event as CalendarEvent, timezone))]
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

export async function createEvent(newEvent: CalendarEvent): Promise<CalendarEvent> {
  const timezone = await getUserTimezone(newEvent.userId)

  newEvent.timezone = newEvent.timezone || timezone

  const userData = await kv.hgetall(`user:${newEvent.userId}`)
  const hasGoogleCalendar = userData?.provider === "google" && userData?.accessToken && userData?.refreshToken

  if (newEvent.source === "local" || !hasGoogleCalendar) {
    const startTimestamp = new Date(newEvent.start).getTime()
    await kv.zadd(`events:${newEvent.userId}`, { score: startTimestamp, member: newEvent })
    return newEvent
  }

  const googleEvent = await createGoogleCalendarEvent(
    newEvent.userId,
    userData.accessToken as string,
    userData.refreshToken as string,
    userData.expiresAt as number,
    newEvent,
  )

  if (googleEvent) {
    if (newEvent.categories?.length || newEvent.reminders?.length) {
      await kv.hset(`event_meta:${newEvent.userId}:${googleEvent.id}`, {
        categories: newEvent.categories || [],
        reminders: newEvent.reminders || [],
      })
    }
    return googleEvent
  }

  newEvent.source = "local"
  const startTimestamp = new Date(newEvent.start).getTime()
  await kv.zadd(`events:${newEvent.userId}`, { score: startTimestamp, member: newEvent })
  return newEvent
}

export async function updateEvent(updatedEvent: CalendarEvent): Promise<CalendarEvent> {
  const timezone = await getUserTimezone(updatedEvent.userId)

  updatedEvent.timezone = updatedEvent.timezone || timezone

  if (updatedEvent.source === "google") {
    const userData = await kv.hgetall(`user:${updatedEvent.userId}`)

    if (userData?.accessToken && userData?.refreshToken) {
      const googleEvent = await updateGoogleCalendarEvent(
        updatedEvent.userId,
        userData.accessToken as string,
        userData.refreshToken as string,
        userData.expiresAt as number,
        updatedEvent,
      )

      if (googleEvent) {
        if (updatedEvent.categories?.length || updatedEvent.reminders?.length) {
          await kv.hset(`event_meta:${updatedEvent.userId}:${googleEvent.id}`, {
            categories: updatedEvent.categories || [],
            reminders: updatedEvent.reminders || [],
          })
        }
        return googleEvent
      }
    }
  }


  const allEvents = await kv.zrange(`events:${updatedEvent.userId}`, 0, -1)
  const oldEvent = allEvents.find((event: any) => event.id === updatedEvent.id)

  if (oldEvent) {
    await kv.zrem(`events:${updatedEvent.userId}`, oldEvent)
  }

  const startTimestamp = new Date(updatedEvent.start).getTime()
  await kv.zadd(`events:${updatedEvent.userId}`, { score: startTimestamp, member: updatedEvent })

  return updatedEvent
}

export async function deleteEvent(userId: string, eventId: string): Promise<boolean> {
  const allEvents = await kv.zrange(`events:${userId}`, 0, -1)
  const event = allEvents.find((event: any) => event.id === eventId) as CalendarEvent | undefined

  if (!event) {
    const userData = await kv.hgetall(`user:${userId}`)

    if (userData?.provider === "google" && userData?.accessToken && userData?.refreshToken) {
      try {
        await deleteGoogleCalendarEvent(
          userId,
          userData.accessToken as string,
          userData.refreshToken as string,
          userData.expiresAt as number,
          eventId,
        )

        await kv.del(`event_meta:${userId}:${eventId}`)

        return true
      } catch (error) {
        console.error("Error deleting Google Calendar event:", error)
        return false
      }
    }

    return false
  }

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
      }
    }
  }

  await kv.zrem(`events:${userId}`, event)

  await kv.del(`event_meta:${userId}:${eventId}`)

  return true
}

export async function searchEvents(userId: string, query: string): Promise<CalendarEvent[]> {
  const allEvents = await kv.zrange(`events:${userId}`, 0, -1)

  const timezone = await getUserTimezone(userId)

  const queryLower = query.toLowerCase()
  const matchingEvents = allEvents.filter((event: any) => {
    return (
      event.title.toLowerCase().includes(queryLower) ||
      (event.description && event.description.toLowerCase().includes(queryLower)) ||
      (event.location && event.location.toLowerCase().includes(queryLower))
    )
  })

  const userData = await kv.hgetall(`user:${userId}`)
  const hasGoogleCalendar = userData?.provider === "google" && userData?.accessToken && userData?.refreshToken

  if (hasGoogleCalendar) {
    try {
   
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

      const allMatchingEvents = [...matchingEvents, ...matchingGoogleEvents]
      const uniqueEvents = allMatchingEvents.filter(
        (event, index, self) => index === self.findIndex((e) => e.id === event.id),
      )

      return uniqueEvents.map((event) => adjustEventTimezone(event as CalendarEvent, timezone))
    } catch (error) {
      console.error("Error searching Google Calendar:", error)
    }
  }

  return matchingEvents.map((event) => adjustEventTimezone(event as CalendarEvent, timezone))
}

export async function exportToICS(userId: string, start?: Date, end?: Date): Promise<string> {
  const events = await getEvents(userId, start || new Date(0), end || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365))

  const calendar = ical({
    name: "Zero Calendar",
    timezone: await getUserTimezone(userId),
  })

  events.forEach((event) => {
    calendar.createEvent({
      id: event.id,
      start: new Date(event.start),
      end: new Date(event.end),
      summary: event.title,
      description: event.description,
      location: event.location,
      timezone: event.timezone,
    })
  })

  return calendar.toString()
}

export async function importFromICS(userId: string, icsData: string): Promise<{ imported: number; errors: number }> {
  return { imported: 0, errors: 0 }
}

export async function getEventsForMultipleUsers(
  userIds: string[],
  start: Date,
  end: Date,
): Promise<Record<string, CalendarEvent[]>> {


  const results: Record<string, CalendarEvent[]> = {}

  for (const userId of userIds) {
    try {
      const events = await getEvents(userId, start, end)
      results[userId] = events
    } catch (error) {
      console.error(`Error getting events for user ${userId}:`, error)
      results[userId] = []
    }
  }

  return results
}

export async function findCommonFreeTimes(
  userIds: string[],
  start: Date,
  end: Date,
  durationMinutes: number,
): Promise<{ start: string; end: string }[]> {
  const allUserEvents = await getEventsForMultipleUsers(userIds, start, end)

  const allEvents: CalendarEvent[] = []
  Object.values(allUserEvents).forEach((userEvents) => {
    allEvents.push(...userEvents)
  })

  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  const freeSlots: { start: string; end: string }[] = []
  let currentTime = new Date(start)

  for (const event of allEvents) {
    const eventStart = new Date(event.start)

    if (eventStart.getTime() - currentTime.getTime() >= durationMinutes * 60 * 1000) {
      freeSlots.push({
        start: currentTime.toISOString(),
        end: addMinutes(currentTime, durationMinutes).toISOString(),
      })
    }

    const eventEnd = new Date(event.end)
    if (eventEnd > currentTime) {
      currentTime = new Date(eventEnd)
    }
  }

  if (end.getTime() - currentTime.getTime() >= durationMinutes * 60 * 1000) {
    freeSlots.push({
      start: currentTime.toISOString(),
      end: addMinutes(currentTime, durationMinutes).toISOString(),
    })
  }

  return freeSlots
}
