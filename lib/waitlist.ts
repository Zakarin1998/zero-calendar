import { kv } from "@vercel/kv"

export type WaitlistEntry = {
  email: string
  joinedAt: number
}

export async function getWaitlistCount(): Promise<number> {
  try {
    const count = await kv.get("waitlist:count")
    const emailCount = await kv.zcard("waitlist:emails")

    return Math.max(count ? Number(count) : 0, emailCount ? Number(emailCount) : 0)
  } catch (error) {
    console.error("Error getting waitlist count:", error)
    return 0
  }
}

export async function getWaitlistEmails(): Promise<WaitlistEntry[]> {
  try {
    const emailsWithScores = await kv.zrange("waitlist:emails", 0, -1, { withScores: true })

    const entries: WaitlistEntry[] = []

    for (let i = 0; i < emailsWithScores.length; i += 2) {
      entries.push({
        email: emailsWithScores[i] as string,
        joinedAt: Number(emailsWithScores[i + 1]),
      })
    }

    return entries.sort((a, b) => b.joinedAt - a.joinedAt)
  } catch (error) {
    console.error("Error getting waitlist emails:", error)
    return []
  }
}

export async function addToWaitlist(email: string): Promise<boolean> {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    const exists = await kv.zscore("waitlist:emails", normalizedEmail)

    if (exists) {
      return false 
    }

    await kv.zadd("waitlist:emails", {
      score: Date.now(),
      member: normalizedEmail,
    })

    await kv.incr("waitlist:count")

    await kv.lpush("waitlist:email_list", normalizedEmail)

    return true
  } catch (error) {
    console.error("Error adding to waitlist:", error)
    return false
  }
}

export async function exportWaitlistToCSV(): Promise<string> {
  try {
    const entries = await getWaitlistEmails()

    let csv = "Email,JoinedAt\n"

    entries.forEach((entry) => {
      const joinedDate = new Date(entry.joinedAt).toISOString()
      csv += `${entry.email},"${joinedDate}"\n`
    })

    return csv
  } catch (error) {
    console.error("Error exporting waitlist to CSV:", error)
    return "Error,Error\n"
  }
}
