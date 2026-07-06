import { NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'
import { fetchRegions } from '@/lib/auth/userPreferencesApi'

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const data = await fetchRegions(session.userId, session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
