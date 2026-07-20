import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { getBestTime } from '@/lib/ai/aiApi'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'
import { TrendingPlatform } from '@/lib/response/ai'

const TRENDING_PLATFORMS: TrendingPlatform[] = ['YOUTUBE', 'INSTAGRAM', 'TWITTER']

// GET /api/ai/best-time[?platform=YOUTUBE|INSTAGRAM|TWITTER]
// ownerId comes from the JWT sub claim inside ai-service — never sent from here.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const platformParam = req.nextUrl.searchParams.get('platform')
    if (platformParam && !TRENDING_PLATFORMS.includes(platformParam as TrendingPlatform)) {
      return NextResponse.json(
        makeApiError('INVALID_PLATFORM', 400, `Unknown platform '${platformParam}'`),
        { status: 400 }
      )
    }

    const data = await getBestTime(session.accessToken, (platformParam as TrendingPlatform) ?? undefined)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
