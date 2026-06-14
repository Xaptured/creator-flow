import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { getContentHistory } from '@/lib/analytics/analyticsApi'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'

export async function GET(
  _req: NextRequest,
  { params }: { params: { contentId: string } },
) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const data = await getContentHistory(params.contentId, session.userId, session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
