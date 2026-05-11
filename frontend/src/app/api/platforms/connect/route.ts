import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { makeApiError } from '@/lib/response/error'
import { getConnectUrl } from '@/lib/media/platformApi'

/**
 * GET /api/platforms/connect?platform=youtube
 *
 * Calls the backend connect endpoint (which returns a 302 to the OAuth consent
 * screen), extracts the OAuth URL from the Location header, and redirects the
 * browser there directly.
 *
 * ownerId is injected server-side from session — never from the client.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const platform = req.nextUrl.searchParams.get('platform')
    if (!platform) {
      return NextResponse.json(makeApiError('BAD_REQUEST', 400, 'platform query param required'), { status: 400 })
    }

    const oauthUrl = await getConnectUrl(platform, session.userId, session.accessToken)

    return NextResponse.redirect(oauthUrl)
  } catch (err) {
    console.error('[platforms/connect] failed to get OAuth URL', err)
    return NextResponse.redirect(new URL('/dashboard?platform_error=connect_failed', req.url))
  }
}
