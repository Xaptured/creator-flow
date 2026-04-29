import axios from 'axios';
import { isApiError, makeApiError } from '@/lib/response/error';
import { ApiError } from '@/lib/response/error';

/**
 * Normalises any thrown value into a structured ApiError.
 *
 * Handles:
 * - Axios errors with a backend ApiError body (Spring GlobalExceptionHandler)
 * - Axios network/timeout errors
 * - Plain Error instances (e.g. XHR rejections from putService)
 * - Unknown throws
 *
 * Use this in every component catch block so error state is always ApiError.
 */
export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (isApiError(data)) return data;
    return makeApiError('SERVICE_ERROR', err.response?.status ?? 503, err.message);
  }
  if (isApiError(err)) return err;
  if (err instanceof Error) return makeApiError('CLIENT_ERROR', 0, err.message);
  return makeApiError('UNKNOWN_ERROR', 0, 'An unexpected error occurred');
}
