import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const exists = await kv.zscore("waitlist:emails", normalizedEmail)

    if (exists) {
      return NextResponse.json({ success: true, alreadyJoined: true })
    }

    await kv.zadd("waitlist:emails", {
      score: Date.now(),
      member: normalizedEmail,
    })

    await kv.incr("waitlist:count")

    await kv.lpush("waitlist:email_list", normalizedEmail)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Waitlist error:", error)
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const count = (await kv.get("waitlist:count")) || 0

    const emailCount = await kv.zcard("waitlist:emails")

    const finalCount = Math.max(Number(count), Number(emailCount))

    return NextResponse.json({ count: finalCount })
  } catch (error) {
    console.error("Waitlist count error:", error)
    return NextResponse.json({ count: 0 })
  }
}
