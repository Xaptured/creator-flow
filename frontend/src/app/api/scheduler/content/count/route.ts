import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { getScheduledCount } from '@/lib/scheduler/schedulerApi'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const status = req.nextUrl.searchParams.get('status') ?? 'SCHEDULED'
    const data = await getScheduledCount(session.userId, session.accessToken, status)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
