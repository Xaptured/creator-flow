import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { handleRouteError } from '@/lib/http/routeErrorHandler';
import { makeApiError } from '@/lib/response/error';
import { listMediaFiles } from '@/lib/media/mediaApi';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    const data = await listMediaFiles(session.userId, session.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
