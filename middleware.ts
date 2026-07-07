import { type NextRequest, NextResponse } from "next/server"

import { updateSession } from "@/services/supabase/middleware"

const AUTH_ROUTES = ["/login"]
const PUBLIC_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/auth/callback",
  "/api/cron/publish",
]

function isPublicAsset(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

function isProtectedRoute(pathname: string): boolean {
  if (isPublicAsset(pathname) || isAuthRoute(pathname)) {
    return false
  }

  return true
}

export async function middleware(request: NextRequest) {
  const { response, session } = await updateSession(request)
  const { pathname } = request.nextUrl
  const hasSession = Boolean(session)

  if (hasSession && isAuthRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  if (!hasSession && isProtectedRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
