import { getEvents } from "./calendar-utils"
import { areIntervalsOverlapping } from "date-fns"
import { format } from "date-fns"

async function findOptimalMeetingTime(
  userId: string,
  participantIds: string[],
  durationMinutes: number,
  startDate: string,
  endDate: string,
) {
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
      "Note: Only your calendar was checked. In a production app, we would check all participants' calendars with proper permissions.",
  }
}
