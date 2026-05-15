import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'
import { fetchUserPreferences, patchUserPreferences } from '@/lib/auth/userPreferencesApi'
import { UpdateUserPreferencesRequest } from '@/lib/request/user'

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const data = await fetchUserPreferences(session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const body: UpdateUserPreferencesRequest = await req.json()
    const data = await patchUserPreferences(body, session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
