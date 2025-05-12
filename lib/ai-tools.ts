import { getEvents } from "./calendar-utils"
import { areIntervalsOverlapping, format, addDays, startOfDay, endOfDay, isSameDay } from "date-fns"
import { kv } from "@vercel/kv"
import { getUserPreferences, getUserTimezone } from "./auth"

export const calendarTools = {
  findOptimalMeetingTime: async (
    userId: string,
    participantIds: string[],
    durationMinutes: number,
    startDate: string,
    endDate: string,
  ) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const events = await getEvents(userId, start, end)

    const slots = []
    let currentSlot = new Date(start)

    while (currentSlot < end) {
      const slotEnd = new Date(currentSlot.getTime() + durationMinutes * 60 * 1000)

      if (currentSlot.getHours() >= 9 && currentSlot.getHours() < 17) {
        const hasConflict = events.some((event) => {
          const eventStart = new Date(event.start)
          const eventEnd = new Date(event.end)

          return areIntervalsOverlapping({ start: currentSlot, end: slotEnd }, { start: eventStart, end: eventEnd })
        })

        if (!hasConflict) {
          slots.push({
            start: currentSlot.toISOString(),
            end: slotEnd.toISOString(),
            label: `${format(currentSlot, "EEE, MMM d, h:mm a")} - ${format(slotEnd, "h:mm a")}`,
          })
        }
      }

      currentSlot = new Date(currentSlot.getTime() + 30 * 60 * 1000)
    }

    return {
      availableSlots: slots.slice(0, 5),
      participantsChecked: [userId],
      participantsUnavailable: participantIds.filter((id) => id !== userId),
      message:
        "Note: Only your calendar was checked.",
    }
  },

  getCalendarAnalytics: async (userId: string, startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const events = await getEvents(userId, start, end)

    let totalMeetingMinutes = 0
    let meetingCount = 0
    const categoryCounts: Record<string, number> = {}
    const dailyMeetingMinutes: Record<string, number> = {}

    events.forEach((event) => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)

      if (event.allDay) return

      const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60)
      totalMeetingMinutes += durationMinutes
      meetingCount++

      if (event.categories && event.categories.length > 0) {
        event.categories.forEach((category) => {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1
        })
      } else {
        categoryCounts["Uncategorized"] = (categoryCounts["Uncategorized"] || 0) + 1
      }

      const dateKey = format(eventStart, "yyyy-MM-dd")
      dailyMeetingMinutes[dateKey] = (dailyMeetingMinutes[dateKey] || 0) + durationMinutes
    })

    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const averageDailyMeetingMinutes = totalMeetingMinutes / dayCount

    let busiestDay = ""
    let busiestDayMinutes = 0

    Object.entries(dailyMeetingMinutes).forEach(([date, minutes]) => {
      if (minutes > busiestDayMinutes) {
        busiestDay = date
        busiestDayMinutes = minutes
      }
    })

    return {
      totalMeetingMinutes,
      totalMeetingHours: Math.round((totalMeetingMinutes / 60) * 10) / 10,
      meetingCount,
      averageMeetingLength: meetingCount > 0 ? Math.round(totalMeetingMinutes / meetingCount) : 0,
      averageDailyMeetingMinutes: Math.round(averageDailyMeetingMinutes),
      averageDailyMeetingHours: Math.round((averageDailyMeetingMinutes / 60) * 10) / 10,
      categoryCounts,
      busiestDay,
      busiestDayMinutes,
      busiestDayHours: Math.round((busiestDayMinutes / 60) * 10) / 10,
      dailyMeetingMinutes,
    }
  },

  findFreeTimeSlots: async (userId: string, startDate: string, endDate: string, minDurationMinutes = 30) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const events = await getEvents(userId, start, end)

    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    const freeSlots = []
    let currentDay = startOfDay(start)
    const lastDay = endOfDay(end)

    while (currentDay <= lastDay) {
      const dayStart = new Date(currentDay)
      dayStart.setHours(9, 0, 0, 0)

      const dayEnd = new Date(currentDay)
      dayEnd.setHours(17, 0, 0, 0)

      if (dayEnd < start || dayStart > end) {
        currentDay = addDays(currentDay, 1)
        continue
      }

      const effectiveDayStart = dayStart < start ? start : dayStart
      const effectiveDayEnd = dayEnd > end ? end : dayEnd

      const dayEvents = sortedEvents.filter((event) => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        return areIntervalsOverlapping(
          { start: effectiveDayStart, end: effectiveDayEnd },
          { start: eventStart, end: eventEnd },
        )
      })

      const timePointer = effectiveDayStart

      const augmentedEvents = [
        { start: effectiveDayStart.toISOString(), end: effectiveDayStart.toISOString() },
        ...dayEvents,
        { start: effectiveDayEnd.toISOString(), end: effectiveDayEnd.toISOString() },
      ]

      for (let i = 0; i < augmentedEvents.length - 1; i++) {
        const currentEventEnd = new Date(augmentedEvents[i].end)
        const nextEventStart = new Date(augmentedEvents[i + 1].start)

        if (nextEventStart.getTime() - currentEventEnd.getTime() >= minDurationMinutes * 60 * 1000) {
          freeSlots.push({
            start: currentEventEnd.toISOString(),
            end: nextEventStart.toISOString(),
            duration: Math.floor((nextEventStart.getTime() - currentEventEnd.getTime()) / (1000 * 60)),
            label: `${format(currentEventEnd, "EEE, MMM d, h:mm a")} - ${format(nextEventStart, "h:mm a")}`,
          })
        }
      }

      currentDay = addDays(currentDay, 1)
    }

    return {
      freeSlots,
      totalFreeSlots: freeSlots.length,
      totalFreeDurationMinutes: freeSlots.reduce((total, slot) => total + slot.duration, 0),
    }
  },

  suggestRescheduling: async (userId: string, eventId: string) => {
    const now = new Date()
    const futureDate = addDays(now, 14)
    const events = await getEvents(userId, now, futureDate)

    const eventToReschedule = events.find((event) => event.id === eventId)
    if (!eventToReschedule) {
      return {
        success: false,
        message: "Event not found",
      }
    }

    const eventStart = new Date(eventToReschedule.start)
    const eventEnd = new Date(eventToReschedule.end)
    const durationMinutes = Math.floor((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60))

    const result = await calendarTools.findFreeTimeSlots(
      userId,
      now.toISOString(),
      futureDate.toISOString(),
      durationMinutes,
    )

    const alternativeSlots = result.freeSlots.filter((slot) => !isSameDay(new Date(slot.start), eventStart)).slice(0, 3)

    return {
      success: true,
      event: {
        id: eventToReschedule.id,
        title: eventToReschedule.title,
        start: eventToReschedule.start,
        end: eventToReschedule.end,
        duration: durationMinutes,
      },
      alternativeSlots,
    }
  },
}

export async function generateAISystemPrompt(userId: string): Promise<string> {
  const userData = await getUserData(userId)

  const now = new Date()
  const nextWeek = addDays(now, 7)
  const upcomingEvents = await getEvents(userId, now, nextWeek)

  const formattedEvents = upcomingEvents
    .map((event) => {
      const start = new Date(event.start)
      const end = new Date(event.end)
      return `- ${event.title}: ${format(start, "EEE, MMM d, h:mm a")} - ${format(end, "h:mm a")}`
    })
    .join("\n")

  return `
You are Zero Calendar AI, an intelligent calendar assistant for ${userData.name || "the user"}.

Current date and time: ${format(now, "EEEE, MMMM d, yyyy h:mm a")}

User preferences:
- Timezone: ${userData.timezone || "UTC"}
- Working hours: ${userData.workingHours || "9:00 AM - 5:00 PM"}
- Meeting preferences: ${userData.meetingPreferences || "No specific preferences set"}

Upcoming events in the next 7 days:
${formattedEvents || "No upcoming events in the next 7 days."}

Your capabilities include:
1. Creating, updating, and deleting calendar events
2. Finding optimal meeting times
3. Analyzing calendar usage and providing insights
4. Suggesting schedule optimizations
5. Helping manage recurring events
6. Assisting with timezone conversions

Always be helpful, concise, and respectful of the user's time. When suggesting actions, consider the user's existing schedule and preferences.
`
}

async function getUserData(userId: string): Promise<any> {
  try {
    const userData = await kv.hgetall(`user:${userId}`)

    if (!userData) {
      throw new Error(`User data not found for ID: ${userId}`)
    }

    const preferences = await getUserPreferences(userId)
    const timezone = await getUserTimezone(userId)

    const workingHoursStart = preferences.workingHoursStart || "09:00"
    const workingHoursEnd = preferences.workingHoursEnd || "17:00"

    const meetingPreferences = {
      preferredDuration: preferences.preferredMeetingDuration || 30,
      preferredDays: preferences.preferredMeetingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      bufferBetweenMeetings: preferences.bufferBetweenMeetings || 15,
    }

    const formattedWorkingHours = `${formatTimeString(workingHoursStart)} - ${formatTimeString(workingHoursEnd)}`

    const formattedMeetingPreferences = [
      `Preferred duration: ${meetingPreferences.preferredDuration} minutes`,
      `Preferred days: ${meetingPreferences.preferredDays.join(", ")}`,
      `Buffer between meetings: ${meetingPreferences.bufferBetweenMeetings} minutes`,
    ].join("; ")

    return {
      id: userId,
      name: userData.name || "User",
      email: userData.email || "",
      timezone: timezone,
      workingHours: formattedWorkingHours,
      meetingPreferences: formattedMeetingPreferences,
      rawPreferences: preferences,
    }
  } catch (error) {
    console.error(`Error fetching user data: ${error}`)

    return {
      id: userId,
      name: "User",
      email: "",
      timezone: "UTC",
      workingHours: "9:00 AM - 5:00 PM",
      meetingPreferences: "Default preferences",
      rawPreferences: {},
    }
  }
}

function formatTimeString(timeString: string): string {
  const [hours, minutes] = timeString.split(":").map(Number)
  const period = hours >= 12 ? "PM" : "AM"
  const formattedHours = hours % 12 || 12
  return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`
}
