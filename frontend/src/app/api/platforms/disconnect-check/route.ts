import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { makeApiError } from '@/lib/response/error'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { checkPlatformDisconnect } from '@/lib/media/platformApi'

/**
 * GET /api/platforms/disconnect-check?platform=youtube
 *
 * Returns { scheduledCount: N } — the number of SCHEDULED content rows that
 * target the given platform for the authenticated user.
 *
 * A count > 0 means the frontend should show a confirmation dialog warning the
 * user that disconnecting will affect those scheduled posts.
 *
 * ownerId is always injected server-side from session — never trusted from client.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const platform = req.nextUrl.searchParams.get('platform')
    if (!platform) {
      return NextResponse.json(
        makeApiError('BAD_REQUEST', 400, 'platform query param required'),
        { status: 400 }
      )
    }

    const data = await checkPlatformDisconnect(platform, session.userId, session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
