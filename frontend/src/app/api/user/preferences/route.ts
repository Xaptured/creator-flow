import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'
import { fetchUserPreferences, patchUserPreferences } from '@/lib/auth/userPreferencesApi'
import { UserPreferencesRequest } from '@/lib/request/user'

// GET /api/user/preferences
// ownerId injected server-side from session - never from browser.
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const data = await fetchUserPreferences(session.userId, session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}

// PATCH /api/user/preferences
// Parses client body without ownerId, injects ownerId server-side from session.
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const body: Omit<UserPreferencesRequest, 'ownerId'> = await req.json()
    const data = await patchUserPreferences(
      { ...body, ownerId: session.userId },
      session.accessToken
    )
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
