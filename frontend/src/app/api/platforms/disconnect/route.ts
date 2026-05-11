import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { makeApiError } from '@/lib/response/error'
import { buildUrl } from '@/lib/http/serviceUrls'
import axiosClient from '@/lib/http/axiosClient'

/**
 * DELETE /api/platforms/disconnect?platform=youtube
 *
 * Disconnects the given platform for the authenticated user.
 * ownerId is injected server-side from session.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const platform = req.nextUrl.searchParams.get('platform')
    if (!platform) {
      return NextResponse.json(makeApiError('BAD_REQUEST', 400, 'platform query param required'), { status: 400 })
    }

    const url = buildUrl('media', `/api/platforms/${platform}/disconnect`, undefined, {
      ownerId: session.userId,
    })

    await axiosClient.delete(url, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const { handleRouteError } = await import('@/lib/http/routeErrorHandler')
    return handleRouteError(err)
  }
}
