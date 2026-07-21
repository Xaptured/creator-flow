import { NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { generateCommentDigest } from '@/lib/ai/aiApi'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { makeApiError } from '@/lib/response/error'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    // No body — ai-service derives ownerId from the JWT sub claim.
    const data = await generateCommentDigest(session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
