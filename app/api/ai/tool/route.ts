import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { executeAIToolCall } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { tool, args } = await request.json()

    if (!tool) {
      return NextResponse.json({ message: "Tool name is required" }, { status: 400 })
    }

    const result = await executeAIToolCall(session.user.id, tool, args || [])

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error("AI tool execution error:", error)
    return NextResponse.json({ message: error.message || "Something went wrong" }, { status: 500 })
  }
}
