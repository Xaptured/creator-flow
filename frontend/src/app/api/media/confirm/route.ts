import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { handleRouteError } from '@/lib/http/routeErrorHandler';
import { confirmUpload } from '@/lib/media/mediaApi';
import { ConfirmUploadRequest } from '@/lib/request/media';
import { makeApiError } from '@/lib/response/error';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    const body: Omit<ConfirmUploadRequest, 'ownerId'> = await req.json();
    const data = await confirmUpload({ ...body, ownerId: session.userId }, session.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
