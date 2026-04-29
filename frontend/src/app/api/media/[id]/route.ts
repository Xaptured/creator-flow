import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { handleRouteError } from '@/lib/http/routeErrorHandler';
import { getMediaFile } from '@/lib/media/mediaApi';
import { makeApiError } from '@/lib/response/error';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    const data = await getMediaFile(params.id, session.userId, session.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
