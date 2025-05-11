import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { syncWithGoogleCalendar, hasGoogleCalendarConnected } from "@/lib/calendar"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user has Google Calendar connected
    const hasGoogleCalendar = await hasGoogleCalendarConnected(session.user.id)

    if (!hasGoogleCalendar) {
      return NextResponse.json({ message: "Google Calendar not connected" }, { status: 400 })
    }

    // Sync with Google Calendar
    const success = await syncWithGoogleCalendar(session.user.id)

    if (success) {
      return NextResponse.json({
        message: "Synced with Google Calendar successfully",
        status: "success",
      })
    } else {
      return NextResponse.json(
        {
          message: "Failed to sync with Google Calendar. Please try again later.",
          status: "error",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Calendar sync error:", error)

    // Provide more detailed error message
    let errorMessage = "Something went wrong during synchronization"

    if (error.message) {
      if (error.message.includes("token")) {
        errorMessage = "Authentication error. Please sign out and sign in again."
      } else if (error.message.includes("rate limit")) {
        errorMessage = "Google Calendar API rate limit exceeded. Please try again later."
      } else if (error.message.includes("network")) {
        errorMessage = "Network error. Please check your connection and try again."
      }
    }

    return NextResponse.json(
      {
        message: errorMessage,
        status: "error",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
