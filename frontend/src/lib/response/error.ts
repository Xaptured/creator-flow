/**
 * Unified error response shape.
 * Returned by all Next.js API routes on failure.
 * Mirrors com.creatorflow.media_service.dto.response.ErrorResponse on the backend.
 *
 * All client components should check for ApiError when a request fails
 * so error messages can be surfaced consistently (e.g. via MUI Alert/Snackbar).
 */
export interface ApiError {
  code: string;
  status: number;
  message: string;
}

/**
 * Type guard — narrows an unknown catch value to ApiError.
 *
 * @example
 * catch (err) {
 *   const message = isApiError(err) ? err.message : 'Something went wrong';
 * }
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'status' in value &&
    'message' in value
  );
}

/** Builds a plain ApiError object — use in Next.js route catch blocks. */
export function makeApiError(code: string, status: number, message: string): ApiError {
  return { code, status, message };
}
