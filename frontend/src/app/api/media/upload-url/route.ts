import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { handleRouteError } from '@/lib/http/routeErrorHandler';
import { requestUploadUrl } from '@/lib/media/mediaApi';
import { UploadUrlRequest } from '@/lib/request/media';
import { makeApiError } from '@/lib/response/error';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    const body: Omit<UploadUrlRequest, 'ownerId'> = await req.json();
    const data = await requestUploadUrl({ ...body, ownerId: session.userId }, session.accessToken);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
