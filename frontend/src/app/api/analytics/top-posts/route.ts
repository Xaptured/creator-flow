import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { getTopPosts } from '@/lib/analytics/analyticsApi'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const platform = req.nextUrl.searchParams.get('platform') ?? undefined
    const data = await getTopPosts(session.userId, session.accessToken, platform)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
