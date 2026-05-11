import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { handleRouteError } from '@/lib/http/routeErrorHandler';
import { makeApiError } from '@/lib/response/error';
import { rescheduleContent } from '@/lib/scheduler/schedulerApi';
import logger from '@/lib/logger';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    const { scheduledAt }: { scheduledAt: string } = await req.json();
    if (!scheduledAt) {
      return NextResponse.json(
        makeApiError('BAD_REQUEST', 400, 'scheduledAt is required'),
        { status: 400 }
      );
    }

    logger.info(
      { userId: session.userId, contentId: params.id, scheduledAt },
      '[scheduler/reschedule] Rescheduling content'
    );

    // ownerId injected from session — backend validates ownership via findByIdAndOwnerId
    await rescheduleContent(
      params.id,
      { ownerId: session.userId, scheduledAt },
      session.accessToken
    );
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}
