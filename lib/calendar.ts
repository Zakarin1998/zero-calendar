import { kv } from "@vercel/kv"

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
}

export async function getEvents(userId: string, start: Date, end: Date) {
  const events = await kv.zrange(`events:${userId}`, start.getTime(), end.getTime())
  return events as CalendarEvent[]
}

export async function createEvent(event: CalendarEvent) {
  const id = event.id || `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const newEvent = { ...event, id }

  await kv.zadd(`events:${event.userId}`, {
    score: new Date(event.start).getTime(),
    member: JSON.stringify(newEvent),
  })

  return newEvent
}

export async function updateEvent(event: CalendarEvent) {
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

  return event
}

export async function deleteEvent(userId: string, eventId: string) {
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
