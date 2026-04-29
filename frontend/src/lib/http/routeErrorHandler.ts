import { NextResponse } from 'next/server';
import axios from 'axios';
import { makeApiError } from '@/lib/response/error';
import logger from '@/lib/logger';

/**
 * Converts any caught error from a Next.js API route into a consistent
 * ApiError JSON response. Handles:
 * - Axios errors with a backend ApiError body (Spring GlobalExceptionHandler)
 * - Axios network/timeout errors
 * - Unknown errors
 *
 * Usage: return handleRouteError(err)
 */
export function handleRouteError(err: unknown): NextResponse {
  if (axios.isAxiosError(err)) {
    const backendError = err.response?.data;
    if (backendError?.code && backendError?.status && backendError?.message) {
      return NextResponse.json(
        makeApiError(backendError.code, backendError.status, backendError.message),
        { status: backendError.status }
      );
    }
    const status = err.response?.status ?? 503;
    logger.warn({ status, message: err.message }, '[API Route] Backend service error');
    return NextResponse.json(
      makeApiError('SERVICE_UNAVAILABLE', status, err.message ?? 'Backend service unavailable'),
      { status }
    );
  }

  logger.error({ err }, '[API Route] Unhandled error');
  return NextResponse.json(
    makeApiError('INTERNAL_ERROR', 500, 'An unexpected error occurred'),
    { status: 500 }
  );
}
