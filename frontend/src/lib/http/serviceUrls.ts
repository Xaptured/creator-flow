/**
 * Service base URLs — pulled from env vars at runtime (server-side only).
 * Add corresponding vars to .env.local — see .env.local for current values.
 */
const SERVICE_BASE_URLS: Record<string, string> = {
  media: process.env.MEDIA_SERVICE_URL ?? 'http://localhost:8082/creator-flow/media',
  auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:8081/creator-flow/auth',
  scheduler: process.env.SCHEDULER_SERVICE_URL ?? 'http://localhost:8084/creator-flow/scheduler',
  ai: process.env.AI_SERVICE_URL ?? 'http://localhost:8085',
};

/**
 * Builds a complete URL for a backend service endpoint.
 *
 * @param service   - Service name key ('media' | 'auth')
 * @param path      - Endpoint path with optional :param placeholders
 * @param pathVars  - Map of placeholder → value  e.g. { id: 'abc-123' }
 * @param query     - Map of query param key → value  e.g. { status: 'UPLOADED' }
 *
 * @example
 * buildUrl('media', '/v1.0/api/media/:id', { id: 'abc-123' })
 * // → 'http://localhost:8082/creator-flow/media/v1.0/api/media/abc-123'
 */
export function buildUrl(
  service: string,
  path: string,
  pathVars?: Record<string, string>,
  query?: Record<string, string>
): string {
  const base = SERVICE_BASE_URLS[service];
  if (!base) throw new Error(`Unknown service: "${service}". Add it to SERVICE_BASE_URLS.`);

  let resolvedPath = path;
  if (pathVars) {
    for (const [key, value] of Object.entries(pathVars)) {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(value));
    }
  }

  const url = `${base}${resolvedPath}`;
  if (query && Object.keys(query).length > 0) {
    return `${url}?${new URLSearchParams(query).toString()}`;
  }
  return url;
}
