import { kv } from "@vercel/kv"
import type { CalendarEvent } from "@/lib/calendar"
import { getUserTimezone } from "@/lib/auth"

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"
const DEFAULT_CALENDAR_ID = "primary" // Use the user's primary calendar by default

// Interface for Google Calendar event
interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  colorId?: string
  status?: string
  created?: string
  updated?: string
  creator?: {
    email: string
    displayName?: string
  }
  organizer?: {
    email: string
    displayName?: string
  }
}

// Map color IDs to our color scheme
const colorMap: Record<string, string> = {
  "1": "#3b82f6", // Blue (default)
  "2": "#10b981", // Green
  "3": "#ef4444", // Red
  "4": "#f59e0b", // Yellow
  "5": "#8b5cf6", // Purple
  "6": "#ec4899", // Pink
  "7": "#6366f1", // Indigo
  "8": "#14b8a6", // Teal
  "9": "#f97316", // Orange
  "10": "#84cc16", // Lime
  "11": "#06b6d4", // Cyan
}

// Reverse color map for creating events
const reverseColorMap: Record<string, string> = Object.entries(colorMap).reduce(
  (acc, [key, value]) => {
    acc[value] = key
    return acc
  },
  {} as Record<string, string>,
)

/**
 * Helper function to refresh the access token if needed
 */
async function refreshAccessTokenIfNeeded(userId: string, refreshToken: string, expiresAt: number): Promise<string> {
  // Check if token is expired or about to expire (within 5 minutes)
  const isExpired = Date.now() >= (expiresAt - 300) * 1000

  if (!isExpired) {
    // Get the current access token from the user's session
    const userData = await kv.hgetall(`user:${userId}`)
    return userData?.accessToken as string
  }

  // Token is expired, refresh it
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to refresh access token")
  }

  const data = await response.json()

  // Update the user's session with the new token
  await kv.hset(`user:${userId}`, {
    accessToken: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  })

  return data.access_token
}

/**
 * Convert Google Calendar event to our CalendarEvent format
 */
function convertGoogleEventToCalendarEvent(googleEvent: GoogleCalendarEvent, userId: string): CalendarEvent {
  return {
    id: `google_${googleEvent.id}`,
    title: googleEvent.summary,
    description: googleEvent.description,
    start: googleEvent.start.dateTime,
    end: googleEvent.end.dateTime,
    location: googleEvent.location,
    color: googleEvent.colorId ? colorMap[googleEvent.colorId] || "#3b82f6" : "#3b82f6",
    userId,
    source: "google",
    // Store the timezone from Google Calendar
    timezone: googleEvent.start.timeZone || "UTC",
  }
}

// Update the convertCalendarEventToGoogleEvent function to use the user's timezone
async function convertCalendarEventToGoogleEvent(event: CalendarEvent): Promise<Partial<GoogleCalendarEvent>> {
  // Extract the original Google event ID if it exists
  const googleEventId = event.id.startsWith("google_") ? event.id.substring(7) : undefined

  // Get the user's timezone
  const userTimezone = await getUserTimezone(event.userId)

  return {
    id: googleEventId,
    summary: event.title,
    description: event.description,
    start: {
      dateTime: event.start,
      timeZone: userTimezone, // Use the user's timezone
    },
    end: {
      dateTime: event.end,
      timeZone: userTimezone, // Use the user's timezone
    },
    location: event.location,
    colorId: event.color ? reverseColorMap[event.color] || "1" : "1",
  }
}

// Update the getGoogleCalendarEvents function to store events in the database
export async function getGoogleCalendarEvents(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  startDate: Date,
  endDate: Date,
  calendarId: string = DEFAULT_CALENDAR_ID,
): Promise<CalendarEvent[]> {
  try {
    // Refresh token if needed
    const token = await refreshAccessTokenIfNeeded(userId, refreshToken, expiresAt)

    // Get the user's timezone
    const userTimezone = await getUserTimezone(userId)

    // Format dates for Google Calendar API
    const timeMin = startDate.toISOString()
    const timeMax = endDate.toISOString()

    // Fetch events from Google Calendar
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
        calendarId,
      )}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&timeZone=${encodeURIComponent(userTimezone)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch Google Calendar events: ${response.statusText}`)
    }

    const data = await response.json()

    // Convert Google Calendar events to our format
    const events = data.items.map((item: GoogleCalendarEvent) => convertGoogleEventToCalendarEvent(item, userId))

    // Store the events in the database for offline access
    await storeGoogleEventsInDatabase(userId, events)

    return events
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error)
    return []
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
      // Skip if the event already exists (we'll update it later)
      if (existingEventIds.has(event.id)) {
        continue
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
 * Create an event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  event: CalendarEvent,
  calendarId: string = DEFAULT_CALENDAR_ID,
): Promise<CalendarEvent | null> {
  try {
    const token = await refreshAccessTokenIfNeeded(userId, refreshToken, expiresAt)

    const googleEvent = convertCalendarEventToGoogleEvent(event)

    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleEvent),
    })

    if (!response.ok) {
      throw new Error(`Failed to create Google Calendar event: ${response.statusText}`)
    }

    const data = await response.json()

    // Return the created event in our format
    return convertGoogleEventToCalendarEvent(data, userId)
  } catch (error) {
    console.error("Error creating Google Calendar event:", error)
    return null
  }
}

/**
 * Update an event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  event: CalendarEvent,
  calendarId: string = DEFAULT_CALENDAR_ID,
): Promise<CalendarEvent | null> {
  try {
    if (!event.id.startsWith("google_")) {
      throw new Error("Not a Google Calendar event")
    }

    const googleEventId = event.id.substring(7)

    const token = await refreshAccessTokenIfNeeded(userId, refreshToken, expiresAt)

    const googleEvent = convertCalendarEventToGoogleEvent(event)

    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to update Google Calendar event: ${response.statusText}`)
    }

    const data = await response.json()

    // Return the updated event in our format
    return convertGoogleEventToCalendarEvent(data, userId)
  } catch (error) {
    console.error("Error updating Google Calendar event:", error)
    return null
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  eventId: string,
  calendarId: string = DEFAULT_CALENDAR_ID,
): Promise<boolean> {
  try {
    // Ensure this is a Google Calendar event
    if (!eventId.startsWith("google_")) {
      throw new Error("Not a Google Calendar event")
    }

    // Extract the Google event ID
    const googleEventId = eventId.substring(7)

    // Refresh token if needed
    const token = await refreshAccessTokenIfNeeded(userId, refreshToken, expiresAt)

    // Delete event from Google Calendar
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    return response.ok
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error)
    return false
  }
}

/**
 * Get a list of the user's Google Calendars
 */
export async function getGoogleCalendars(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
): Promise<{ id: string; summary: string; primary: boolean; backgroundColor: string }[]> {
  try {
    const token = await refreshAccessTokenIfNeeded(userId, refreshToken, expiresAt)

    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Google Calendars: ${response.statusText}`)
    }

    const data = await response.json()

    return data.items.map((item: any) => ({
      id: item.id,
      summary: item.summary,
      primary: item.primary || false,
      backgroundColor: item.backgroundColor || "#3b82f6",
    }))
  } catch (error) {
    console.error("Error fetching Google Calendars:", error)
    return []
  }
}


export async function hasGoogleCalendarConnected(userId: string): Promise<boolean> {
  try {
    const userData = await kv.hgetall(`user:${userId}`)
    return !!(userData?.provider === "google" && userData?.accessToken && userData?.refreshToken)
  } catch (error) {
    console.error("Error checking Google Calendar connection:", error)
    return false
  }
}
