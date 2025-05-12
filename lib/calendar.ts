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

  const occurrences = rule.between(startRange, endRange, true)

  const instances = occurrences.map((date) => {
    const instanceStart = new Date(date)
    const instanceEnd = new Date(instanceStart.getTime() + duration)

    const exceptionDate = event.exceptions?.find((ex) => {
      const exDate = parseISO(ex.date)
      return (
        exDate.getFullYear() === instanceStart.getFullYear() &&
        exDate.getMonth() === instanceStart.getMonth() &&
        exDate.getDate() === instanceStart.getDate()
      )
    })

    if (exceptionDate?.status === "cancelled") {
      return null
    }

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

    return {
      ...event,
      id: `${event.id}_${format(instanceStart, "yyyyMMdd")}`,
      start: instanceStart.toISOString(),
      end: instanceEnd.toISOString(),
      isRecurringInstance: true,
      originalEventId: event.id,
    }
  })

  return instances.filter(Boolean) as CalendarEvent[]
}

async function getUserTimezone(userId: string): Promise<string> {
  const userData = await kv.hgetall(`user:${userId}`)
  return (userData?.timezone as string) || "UTC"
}

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

  const localEvents = await kv.zrange(`events:${userId}`, 0, -1)

  if (localEvents && localEvents.length > 0) {
    for (const event of localEvents as CalendarEvent[]) {
      if (event.recurrence) {
        const instances = generateRecurringInstances(event, startUtc, endUtc, timezone)
        events = [...events, ...instances]
      } else {
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

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

export async function createEvent(newEvent: CalendarEvent): Promise<CalendarEvent> {
  const timezone = await getUserTimezone(newEvent.userId)

  newEvent.timezone = newEvent.timezone || timezone

  if (!newEvent.id) {
    newEvent.id = `event_${uuidv4()}`
  }

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

  newEvent.source = "local"
  const startTimestamp = new Date(newEvent.start).getTime()
  await kv.zadd(`events:${newEvent.userId}`, { score: startTimestamp, member: newEvent })
  return newEvent
}

export async function updateEvent(updatedEvent: CalendarEvent): Promise<CalendarEvent> {
  const timezone = await getUserTimezone(updatedEvent.userId)

  updatedEvent.timezone = updatedEvent.timezone || timezone

  if (updatedEvent.isRecurringInstance && updatedEvent.originalEventId) {
    const allEvents = await kv.zrange(`events:${updatedEvent.userId}`, 0, -1)
    const originalEvent = allEvents.find((event: any) => event.id === updatedEvent.originalEventId) as
      | CalendarEvent
      | undefined

    if (originalEvent && originalEvent.recurrence) {
      const exceptionDate = updatedEvent.exceptionDate || updatedEvent.start
      const exceptions = originalEvent.exceptions || []

      const existingExceptionIndex = exceptions.findIndex((ex) => ex.date === exceptionDate)

      if (existingExceptionIndex >= 0) {
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

      const updatedOriginalEvent = {
        ...originalEvent,
        exceptions,
      }

      await kv.zrem(`events:${updatedEvent.userId}`, originalEvent)

      const startTimestamp = new Date(originalEvent.start).getTime()
      await kv.zadd(`events:${updatedEvent.userId}`, { score: startTimestamp, member: updatedOriginalEvent })

      return updatedEvent
    }
  }

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


  const allEvents = await kv.zrange(`events:${updatedEvent.userId}`, 0, -1)
  const oldEvent = allEvents.find((event: any) => event.id === updatedEvent.id)

  if (oldEvent) {
    await kv.zrem(`events:${updatedEvent.userId}`, oldEvent)
  }


  const startTimestamp = new Date(updatedEvent.start).getTime()
  await kv.zadd(`events:${updatedEvent.userId}`, { score: startTimestamp, member: updatedEvent })

  return updatedEvent
}


export async function deleteEvent(userId: string, eventId: string, deleteAllInstances = false): Promise<boolean> {
  if (eventId.includes("_") && !deleteAllInstances) {
    const originalEventId = eventId.split("_")[0]

    const allEvents = await kv.zrange(`events:${userId}`, 0, -1)
    const originalEvent = allEvents.find((event: any) => event.id === originalEventId) as CalendarEvent | undefined

    if (originalEvent && originalEvent.recurrence) {
      const instanceDateStr = eventId.split("_")[1]
      const instanceDate = new Date(
        Number.parseInt(instanceDateStr.substring(0, 4)),
        Number.parseInt(instanceDateStr.substring(4, 6)) - 1,
        Number.parseInt(instanceDateStr.substring(6, 8)),
      )

      const exceptions = originalEvent.exceptions || []
      exceptions.push({
        date: instanceDate.toISOString(),
        status: "cancelled",
      })

      const updatedOriginalEvent = {
        ...originalEvent,
        exceptions,
      }

      await kv.zrem(`events:${userId}`, originalEvent)

      const startTimestamp = new Date(originalEvent.start).getTime()
      await kv.zadd(`events:${userId}`, { score: startTimestamp, member: updatedOriginalEvent })

      return true
    }
  }


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
  const userTimezone = await getUserTimezone(userId)

  const events = await getEvents(userId, start || new Date(0), end || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365))

  const calendar = ical({
    name: "Zero Calendar",
    timezone: userTimezone,
  })

  events.forEach((event) => {
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

    if (event.recurrence) {
      const rruleOptions = recurrenceRuleToRRuleOptions(event.recurrence, new Date(event.start))
      const rule = new RRule(rruleOptions)
      icalEvent.repeating(rule.toString())

      if (event.exceptions) {
        event.exceptions.forEach((exception) => {
          if (exception.status === "cancelled") {
            icalEvent.exdate(new Date(exception.date))
          } else if (exception.status === "modified" && exception.modifiedEvent) {
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

    if (event.attendees) {
      event.attendees.forEach((attendee) => {
        icalEvent.createAttendee({
          email: attendee.email,
          name: attendee.name,
          status: attendee.status as any,
        })
      })
    }

    if (event.categories) {
      icalEvent.categories(event.categories)
    }
  })

  return calendar.toString()
}

export async function importFromICS(userId: string, icsData: string): Promise<{ imported: number; errors: number }> {
  const userTimezone = await getUserTimezone(userId)
  let imported = 0
  let errors = 0

  try {
    const ical = require("node-ical")
    const parsedEvents = ical.parseICS(icsData)

    for (const key in parsedEvents) {
      const parsedEvent = parsedEvents[key]

      if (parsedEvent.type !== "VEVENT") continue

      try {
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

        if (parsedEvent.rrule) {
          const rrule = parsedEvent.rrule.toString()

          let frequency: "daily" | "weekly" | "monthly" | "yearly" = "daily"
          if (rrule.includes("FREQ=DAILY")) frequency = "daily"
          if (rrule.includes("FREQ=WEEKLY")) frequency = "weekly"
          if (rrule.includes("FREQ=MONTHLY")) frequency = "monthly"
          if (rrule.includes("FREQ=YEARLY")) frequency = "yearly"

          const intervalMatch = rrule.match(/INTERVAL=(\d+)/)
          const interval = intervalMatch ? Number.parseInt(intervalMatch[1]) : 1

          const countMatch = rrule.match(/COUNT=(\d+)/)
          const count = countMatch ? Number.parseInt(countMatch[1]) : undefined

          const untilMatch = rrule.match(/UNTIL=(\d+T\d+Z)/)
          const until = untilMatch ? new Date(untilMatch[1]).toISOString() : undefined

          const byDayMatch = rrule.match(/BYDAY=([^;]+)/)
          const byDay = byDayMatch ? byDayMatch[1].split(",") : undefined

          const byMonthDayMatch = rrule.match(/BYMONTHDAY=([^;]+)/)
          const byMonthDay = byMonthDayMatch ? byMonthDayMatch[1].split(",").map(Number) : undefined

          const byMonthMatch = rrule.match(/BYMONTH=([^;]+)/)
          const byMonth = byMonthMatch ? byMonthMatch[1].split(",").map(Number) : undefined

          event.recurrence = {
            frequency,
            interval,
            count,
            until,
            byDay,
            byMonthDay,
            byMonth,
          }

          if (parsedEvent.exdate) {
            event.exceptions = []

            const exdates = Array.isArray(parsedEvent.exdate) ? parsedEvent.exdate : [parsedEvent.exdate]

            exdates.forEach((exdate) => {
              event.exceptions!.push({
                date: exdate.toISOString(),
                status: "cancelled",
              })
            })
          }
        }

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

export async function exportToCSV(userId: string, start?: Date, end?: Date): Promise<string> {
  const userTimezone = await getUserTimezone(userId)

  const events = await getEvents(userId, start || new Date(0), end || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365))

  let csv = "Subject,Start Date,Start Time,End Date,End Time,All Day,Description,Location,Categories\n"

  events.forEach((event) => {
    const startDate = new Date(event.start)
    const endDate = new Date(event.end)

    const startDateFormatted = format(startDate, "MM/dd/yyyy")
    const startTimeFormatted = event.allDay ? "" : format(startDate, "HH:mm")
    const endDateFormatted = format(endDate, "MM/dd/yyyy")
    const endTimeFormatted = event.allDay ? "" : format(endDate, "HH:mm")

    const escapeCSV = (field = "") => `"${field.replace(/"/g, '""')}"`

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

export async function importFromCSV(userId: string, csvData: string): Promise<{ imported: number; errors: number }> {
  const userTimezone = await getUserTimezone(userId)
  let imported = 0
  let errors = 0

  try {
    const rows = csvData.split("\n")
    const headers = rows[0].split(",")

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

    if (subjectIndex === null || startDateIndex === null) {
      throw new Error("CSV must contain at least Subject/Title and Start Date columns")
    }

    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue

      try {
        const row = rows[i].split(",")

        const parseField = (index: number | null) => {
          if (index === null || index >= row.length) return ""

          let value = row[index].trim()

          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1).replace(/""/g, '"')
          }

          return value
        }

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

        const startDate = parseISO(`${startDateStr}${startTimeStr ? `T${startTimeStr}` : "T00:00:00"}`)
        const endDate = parseISO(`${endDateStr}${endTimeStr ? `T${endTimeStr}` : "T23:59:59"}`)

        const allDay = allDayStr === "true" || allDayStr === "yes" || allDayStr === "1" || !startTimeStr

        const categories = categoriesStr ? categoriesStr.split(",").map((c) => c.trim()) : []

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
