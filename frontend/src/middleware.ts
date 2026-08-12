import { auth } from "../auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_ENABLED, isPublicPath } from "@/lib/flags"

/**
 * NOTE: this file must live in `src/`, not at the project root.
 * This app uses a `src/` directory, and Next.js only picks up middleware
 * co-located with the app directory. A root-level middleware.ts is silently
 * ignored - it does not appear as `ƒ Middleware` in the build output.
 */

/**
 * Authenticated mode (CF-130). Unchanged behaviour: /dashboard requires a
 * session, an unrecoverable refresh failure forces re-login.
 */
const authMiddleware = auth((req) => {
  const isLoggedIn = !!req.auth
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard")

  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Refresh token expired - session is unrecoverable, force re-login
  if (isDashboard && req.auth?.error === "RefreshTokenExpired") {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

/**
 * Landing-page-only mode (CF-112). Serves the public marketing surface and
 * 404s everything else, including /login and /api/auth/*.
 *
 * This branch never calls auth(), so no AUTH_SECRET is required at runtime -
 * which is what allows the deployment to carry no secrets at all.
 */
function landingOnlyMiddleware(req: NextRequest) {
  if (isPublicPath(req.nextUrl.pathname)) {
    return NextResponse.next()
  }

  // Rewrite (not redirect) so the URL stays put and crawlers see a real 404.
  // /_not-found is Next's built-in not-found route, rendered by app/not-found.tsx.
  return NextResponse.rewrite(new URL("/_not-found", req.url), { status: 404 })
}

// Branch on a module-level constant so the auth wrapper is never reached
// while authentication is disabled.
export default AUTH_ENABLED ? authMiddleware : landingOnlyMiddleware

export const config = {
  // Must be statically analysable, so it cannot depend on AUTH_ENABLED.
  // Broad in both modes; excludes Next internals, static assets and crawler files.
  matcher: [
    "/((?!_next/static|_next/image|_not-found|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff|woff2|ttf|txt|xml)$).*)",
  ],
}
