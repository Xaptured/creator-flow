import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { getThumbnailScores, retryThumbnailScoring } from '@/lib/ai/aiApi'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'

type RouteParams = { params: { mediaFileId: string } }

/** Poll thumbnail scores for a media file (CF-96 — YouTube videos only). */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const data = await getThumbnailScores(params.mediaFileId, session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}

/** Retry a FAILED scoring run. */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    await retryThumbnailScoring(params.mediaFileId, session.accessToken)
    return new NextResponse(null, { status: 202 })
  } catch (err) {
    return handleRouteError(err)
  }
}
