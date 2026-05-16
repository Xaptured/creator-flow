import { NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'
import { provisionUser } from '@/lib/auth/userPreferencesApi'

// POST /api/user/me
// Upserts the user row in auth-service on first sign-in.
// Called from the NextAuth jwt callback - not directly from browser components.
// ownerId (Keycloak UUID) and email are sourced from the session server-side.
// Nothing is trusted from the browser.
export async function POST(): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const data = await provisionUser(
      {
        ownerId: session.userId,
        email: session.user?.email ?? '',
      },
      session.accessToken
    )
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return handleRouteError(err)
  }
}
