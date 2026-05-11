import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { handleRouteError } from '@/lib/http/routeErrorHandler';
import { makeApiError } from '@/lib/response/error';
import { scheduleContent } from '@/lib/scheduler/schedulerApi';
import { ScheduleContentRequest } from '@/lib/request/scheduler';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    // ownerId never trusted from client — always injected from session
    const body: Omit<ScheduleContentRequest, 'ownerId'> = await req.json();
    logger.info(
      { userId: session.userId, platforms: body.platformTargets },
      '[scheduler/schedule] Scheduling content'
    );

    const data = await scheduleContent({ ...body, ownerId: session.userId }, session.accessToken);
    const anySucceeded = data.some((r) => r.contentId != null);
    return NextResponse.json(data, { status: anySucceeded ? 201 : 500 });
  } catch (err) {
    return handleRouteError(err);
  }
}
