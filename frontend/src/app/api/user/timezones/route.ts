import { NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'
import { fetchTimezones } from '@/lib/auth/userPreferencesApi'

// GET /api/user/timezones
// ownerId injected server-side from session - never from browser.
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const data = await fetchTimezones(session.userId, session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
