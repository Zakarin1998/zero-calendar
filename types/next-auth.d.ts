import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      accessToken?: string
      refreshToken?: string
      expiresAt?: number
      provider?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
  }
}
