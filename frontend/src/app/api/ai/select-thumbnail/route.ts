import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { selectThumbnail } from '@/lib/ai/aiApi'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { SelectThumbnailRequest } from '@/lib/response/ai'
import { makeApiError } from '@/lib/response/error'

/** Promote a chosen thumbnail frame to its permanent S3 key (CF-96). */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const body: SelectThumbnailRequest = await req.json()
    const data = await selectThumbnail(body, session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
