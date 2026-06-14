import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/../auth'
import { generateHashtags } from '@/lib/ai/aiApi'
import { handleRouteError } from '@/lib/http/routeErrorHandler'
import { HashtagRequest } from '@/lib/request/ai'
import { makeApiError } from '@/lib/response/error'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 })
    }

    const body: Omit<HashtagRequest, 'ownerId'> = await req.json()
    const data = await generateHashtags(body, session.accessToken)
    return NextResponse.json(data)
  } catch (err) {
    return handleRouteError(err)
  }
}
