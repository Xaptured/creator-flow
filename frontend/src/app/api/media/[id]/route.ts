import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { handleRouteError } from '@/lib/http/routeErrorHandler';
import { deleteMediaFile, getMediaFile } from '@/lib/media/mediaApi';
import { makeApiError } from '@/lib/response/error';
import logger from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    logger.info({ userId: session.userId, mediaId: params.id }, '[media] Fetching media file');
    const data = await getMediaFile(params.id, session.userId, session.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    logger.info({ userId: session.userId, mediaId: params.id }, '[media] Deleting media file');
    await deleteMediaFile(params.id, session.userId, session.accessToken);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}
