import { type CalendarEvent, createEvent, updateEvent, deleteEvent, getEvents } from "@/lib/calendar"

// AI Tool functions that will be exposed to the AI assistant
export const calendarTools = {
  // Get events for a specific date range
  async getEvents(userId: string, startDate: string, endDate: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return await getEvents(userId, start, end)
  },

  // Get events for today
  async getTodayEvents(userId: string) {
    const today = new Date()
    const start = new Date(today.setHours(0, 0, 0, 0))
    const end = new Date(today.setHours(23, 59, 59, 999))
    return await getEvents(userId, start, end)
  },

  // Create a new event
  async createEvent(
    userId: string,
    title: string,
    startTime: string,
    endTime: string,
    description?: string,
    location?: string,
    color?: string,
  ) {
    const event: CalendarEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      description,
      start: startTime,
      end: endTime,
      location,
      color: color || "#3b82f6",
      userId,
    }

    return await createEvent(event)
  },

  // Update an existing event
  async updateEvent(
    userId: string,
    eventId: string,
    updates: {
      title?: string
      description?: string
      start?: string
      end?: string
      location?: string
      color?: string
    },
  ) {
    // First get the existing event
    const allEvents = await getEvents(userId, new Date(0), new Date(Date.now() + 1000 * 60 * 60 * 24 * 365))
    const existingEvent = allEvents.find((event) => event.id === eventId)

    if (!existingEvent) {
      throw new Error(`Event with ID ${eventId} not found`)
    }

    // Update the event with new values
    const updatedEvent: CalendarEvent = {
      ...existingEvent,
      title: updates.title || existingEvent.title,
      description: updates.description !== undefined ? updates.description : existingEvent.description,
      start: updates.start || existingEvent.start,
      end: updates.end || existingEvent.end,
      location: updates.location !== undefined ? updates.location : existingEvent.location,
      color: updates.color || existingEvent.color,
    }

    return await updateEvent(updatedEvent)
  },

  // Delete an event
  async deleteEvent(userId: string, eventId: string) {
    return await deleteEvent(userId, eventId)
  },

  // Find events by title or description
  async findEvents(userId: string, query: string) {
    const allEvents = await getEvents(userId, new Date(0), new Date(Date.now() + 1000 * 60 * 60 * 24 * 365))

    const queryLower = query.toLowerCase()
    return allEvents.filter(
      (event) =>
        event.title.toLowerCase().includes(queryLower) ||
        (event.description && event.description.toLowerCase().includes(queryLower)),
    )
  },

  // Find available time slots
  async findAvailableTimeSlots(userId: string, date: string, durationMinutes: number) {
    const targetDate = new Date(date)
    const start = new Date(targetDate.setHours(8, 0, 0, 0)) // Start at 8 AM
    const end = new Date(targetDate.setHours(18, 0, 0, 0)) // End at 6 PM

    const events = await getEvents(userId, start, end)

    // Sort events by start time
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    const availableSlots = []
    let currentTime = new Date(start)

    // Check each event to find gaps
    for (const event of events) {
      const eventStart = new Date(event.start)

      // If there's enough time before the event starts
      if (eventStart.getTime() - currentTime.getTime() >= durationMinutes * 60 * 1000) {
        availableSlots.push({
          start: currentTime.toISOString(),
          end: new Date(currentTime.getTime() + durationMinutes * 60 * 1000).toISOString(),
        })
      }

      // Move current time to the end of this event
      currentTime = new Date(event.end)
    }

    // Check if there's time after the last event
    if (end.getTime() - currentTime.getTime() >= durationMinutes * 60 * 1000) {
      availableSlots.push({
        start: currentTime.toISOString(),
        end: new Date(currentTime.getTime() + durationMinutes * 60 * 1000).toISOString(),
      })
    }

    return availableSlots
  },

  // Reschedule an event
  async rescheduleEvent(userId: string, eventId: string, newStartTime: string, newEndTime: string) {
    return await this.updateEvent(userId, eventId, {
      start: newStartTime,
      end: newEndTime,
    })
  },
}

// Generate the system prompt for the AI assistant
export function generateAISystemPrompt(userId: string) {
  return `
You are an AI assistant for Zero Calendar, an AI-powered calendar application.
You have access to the following tools to help manage the user's calendar:

1. getEvents(userId, startDate, endDate) - Get events between two dates
2. getTodayEvents(userId) - Get all events for today
3. createEvent(userId, title, startTime, endTime, description?, location?, color?) - Create a new event
4. updateEvent(userId, eventId, updates) - Update an existing event
5. deleteEvent(userId, eventId) - Delete an event
6. findEvents(userId, query) - Search for events by title or description
7. findAvailableTimeSlots(userId, date, durationMinutes) - Find available time slots on a specific date
8. rescheduleEvent(userId, eventId, newStartTime, newEndTime) - Reschedule an event

The user's ID is: ${userId}

When the user asks you to perform calendar operations, use these tools to help them.
Always confirm before making changes to their calendar.
Format dates and times in a user-friendly way.
Be concise but helpful in your responses.
`
}
