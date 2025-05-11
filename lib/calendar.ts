import { kv } from "@vercel/kv"
import {
  getGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/google-calendar"

// Update the CalendarEvent type to include timezone
export type CalendarEvent = {
  id: string
  title: string
  description?: string
  start: string
  end: string
  allDay?: boolean
  location?: string
  color?: string
  userId: string
  source?: string
  timezone?: string
}

export type UserSession = {
  id: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  provider?: string
}

// Update the getEvents function to handle offline access
export async function getEvents(userId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
  // Get local events
  const localEvents = await getLocalEvents(userId, start, end)

  // Check if user has Google Calendar connected
  const userData = await kv.hgetall(`user:${userId}`)
  const hasGoogleCalendar = userData?.provider === "google" && userData?.accessToken && userData?.refreshToken

  if (hasGoogleCalendar) {
    try {
      // Try to get Google Calendar events
      const googleEvents = await getGoogleCalendarEvents(
        userId,
        userData.accessToken as string,
        userData.refreshToken as string,
        userData.expiresAt as number,
        start,
        end,
      )

      // Combine local and Google Calendar events
      return [...localEvents, ...googleEvents]
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error)

      // If online fetch fails, try to get cached Google events from the database
      const cachedGoogleEvents = await getCachedGoogleEvents(userId, start, end)
      return [...localEvents, ...cachedGoogleEvents]
    }
  }

  // Return local events if Google Calendar is not connected
  return localEvents
}

/**
 * Get events from local storage
 */
async function getLocalEvents(userId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
  const events = await kv.zrange(`events:${userId}`, start.getTime(), end.getTime())
  return events as CalendarEvent[]
}

// Add a function to get cached Google events from the database
async function getCachedGoogleEvents(userId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
  try {
    const events = await kv.zrange(`google_events:${userId}`, start.getTime(), end.getTime())
    return events as CalendarEvent[]
  } catch (error) {
    console.error("Error getting cached Google events:", error)
    return []
  }
}

/**
 * Create a new event
 */
export async function createEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const id = event.id || `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const newEvent = { ...event, id }

  // Check if user has Google Calendar connected and if we should create the event there
  const userData = await kv.hgetall(`user:${newEvent.userId}`)
  const hasGoogleCalendar = userData?.provider === "google" && userData?.accessToken && userData?.refreshToken

  // If this is explicitly marked as a local event or Google Calendar is not connected
  if (newEvent.source === "local" || !hasGoogleCalendar) {
    // Create local event
    await kv.zadd(`events:${newEvent.userId}`, {
      score: new Date(newEvent.start).getTime(),
      member: JSON.stringify(newEvent),
    })

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
    return googleEvent
  }

  // Fallback to local event if Google Calendar creation fails
  await kv.zadd(`events:${newEvent.userId}`, {
    score: new Date(newEvent.start).getTime(),
    member: JSON.stringify(newEvent),
  })

  return newEvent
}

/**
 * Update an existing event
 */
export async function updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
  // Check if this is a Google Calendar event
  if (event.id.startsWith("google_")) {
    const userData = await kv.hgetall(`user:${event.userId}`)

    if (userData?.provider === "google" && userData?.accessToken && userData?.refreshToken) {
      // Update in Google Calendar
      const updatedEvent = await updateGoogleCalendarEvent(
        event.userId,
        userData.accessToken as string,
        userData.refreshToken as string,
        userData.expiresAt as number,
        event,
      )

      if (updatedEvent) {
        return updatedEvent
      }
    }
  } else {
    // This is a local event, update it in local storage
    // First remove the old event
    const events = await kv.zrange(`events:${event.userId}`, 0, -1)
    const oldEvent = events.find((e: any) => {
      const parsed = typeof e === "string" ? JSON.parse(e) : e
      return parsed.id === event.id
    })

    if (oldEvent) {
      await kv.zrem(`events:${event.userId}`, oldEvent)
    }

    // Then add the updated event
    await kv.zadd(`events:${event.userId}`, {
      score: new Date(event.start).getTime(),
      member: JSON.stringify(event),
    })
  }

  return event
}

/**
 * Delete an event
 */
export async function deleteEvent(userId: string, eventId: string): Promise<boolean> {
  // Check if this is a Google Calendar event
  if (eventId.startsWith("google_")) {
    const userData = await kv.hgetall(`user:${userId}`)

    if (userData?.provider === "google" && userData?.accessToken && userData?.refreshToken) {
      // Delete from Google Calendar
      const success = await deleteGoogleCalendarEvent(
        userId,
        userData.accessToken as string,
        userData.refreshToken as string,
        userData.expiresAt as number,
        eventId,
      )

      if (success) {
        return true
      }
    }
  }

  // Delete from local storage
  const events = await kv.zrange(`events:${userId}`, 0, -1)
  const event = events.find((e: any) => {
    const parsed = typeof e === "string" ? JSON.parse(e) : e
    return parsed.id === eventId
  })

  if (event) {
    await kv.zrem(`events:${userId}`, event)
    return true
  }

  return false
}

// Update the syncWithGoogleCalendar function to be more robust
export async function syncWithGoogleCalendar(userId: string): Promise<boolean> {
  try {
    const userData = await kv.hgetall(`user:${userId}`)

    if (userData?.provider !== "google" || !userData?.accessToken || !userData?.refreshToken) {
      return false
    }

    // Get events from the last 30 days to the next 90 days
    const start = new Date()
    start.setDate(start.getDate() - 30)

    const end = new Date()
    end.setDate(end.getDate() + 90)

    // Get Google Calendar events
    const googleEvents = await getGoogleCalendarEvents(
      userId,
      userData.accessToken as string,
      userData.refreshToken as string,
      userData.expiresAt as number,
      start,
      end,
    )

    // Get local events
    const localEvents = await getLocalEvents(userId, start, end)

    // Filter local events that are not from Google
    const nonGoogleLocalEvents = localEvents.filter((event) => !event.id.startsWith("google_"))

    // Create these events in Google Calendar
    for (const event of nonGoogleLocalEvents) {
      await createGoogleCalendarEvent(
        userId,
        userData.accessToken as string,
        userData.refreshToken as string,
        userData.expiresAt as number,
        event,
      )
    }

    // Store the Google events in the database for offline access
    await storeGoogleEventsInDatabase(userId, googleEvents)

    return true
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error)
    return false
  }
}

// Add a function to store Google events in the database
async function storeGoogleEventsInDatabase(userId: string, events: CalendarEvent[]): Promise<void> {
  try {
    // Get existing Google events for this user
    const existingEvents = await kv.zrange(`google_events:${userId}`, 0, -1)

    // Create a map of existing event IDs for quick lookup
    const existingEventIds = new Set()
    existingEvents.forEach((event: any) => {
      const parsed = typeof event === "string" ? JSON.parse(event) : event
      existingEventIds.add(parsed.id)
    })

    // Add or update events in the database
    for (const event of events) {
      // Remove the event if it already exists (we'll add the updated version)
      if (existingEventIds.has(event.id)) {
        const existingEvent = existingEvents.find((e: any) => {
          const parsed = typeof e === "string" ? JSON.parse(e) : e
          return parsed.id === event.id
        })

        if (existingEvent) {
          await kv.zrem(`google_events:${userId}`, existingEvent)
        }
      }

      // Add the event to the database
      await kv.zadd(`google_events:${userId}`, {
        score: new Date(event.start).getTime(),
        member: JSON.stringify(event),
      })
    }

    // Remove events that no longer exist in Google Calendar
    const currentEventIds = new Set(events.map((event) => event.id))
    for (const existingEvent of existingEvents) {
      const parsed = typeof existingEvent === "string" ? JSON.parse(existingEvent) : existingEvent
      if (!currentEventIds.has(parsed.id)) {
        await kv.zrem(`google_events:${userId}`, existingEvent)
      }
    }
  } catch (error) {
    console.error("Error storing Google events in database:", error)
  }
}

/**
 * Check if a user has connected their Google Calendar
 */
export async function hasGoogleCalendarConnected(userId: string): Promise<boolean> {
  try {
    const userData = await kv.hgetall(`user:${userId}`)
    return !!(userData?.provider === "google" && userData?.accessToken && userData?.refreshToken)
  } catch (error) {
    console.error("Error checking Google Calendar connection:", error)
    return false
  }
}
