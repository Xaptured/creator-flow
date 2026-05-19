import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { handleRouteError } from '@/lib/http/routeErrorHandler';
import { makeApiError } from '@/lib/response/error';
import { deleteScheduledContent, getScheduledContentById, updateScheduledContent } from '@/lib/scheduler/schedulerApi';
import { UpdateContentRequest } from '@/lib/request/scheduler';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    const data = await getScheduledContentById(params.id, session.userId, session.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    const body: Omit<UpdateContentRequest, 'ownerId'> = await req.json();
    // Always inject ownerId from session — never trust client-supplied ownerId
    const data = await updateScheduledContent(
      params.id,
      { ...body, ownerId: session.userId },
      session.accessToken
    );
    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }

    // ownerId always injected from session — never trusted from client
    await deleteScheduledContent(params.id, session.userId, session.accessToken);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}
