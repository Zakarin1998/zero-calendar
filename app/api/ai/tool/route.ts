import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeAIToolCall } from "@/lib/ai"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { tool, args } = body

    if (!tool || !args) {
      return NextResponse.json({ error: "Missing tool or args" }, { status: 400 })
    }

    const result = await executeAIToolCall(session.user.id, tool, args)

    return NextResponse.json({ result })
  } catch (error) {
    console.error("Error in AI tool API:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
