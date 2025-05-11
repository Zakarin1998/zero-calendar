import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path === "/" || path === "/index" || path === "/home") {
    return NextResponse.redirect(new URL("/waitlist", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (image files)
     * - api routes
     * - waitlist path (to avoid redirect loops)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|api|waitlist).*)",
  ],
}
