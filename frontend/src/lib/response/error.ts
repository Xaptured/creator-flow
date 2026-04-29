export interface ApiError {
  code: string;
  status: number;
  message: string;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'status' in value &&
    'message' in value
  );
}

export function makeApiError(code: string, status: number, message: string): ApiError {
  return { code, status, message };
}
