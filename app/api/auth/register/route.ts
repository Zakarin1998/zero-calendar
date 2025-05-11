import { NextResponse } from "next/server"
import { createUser, getUserByEmail } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const existingUser = await getUserByEmail(email)

    if (existingUser) {
      return NextResponse.json({ message: "Email already in use" }, { status: 409 })
    }

    const user = await createUser(name, email, password)

    return NextResponse.json(
      { message: "User created successfully", user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
