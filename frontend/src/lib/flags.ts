/**
 * Build-time feature flags.
 *
 * CF-112: the landing page is deployed publicly while Keycloak and the backend
 * services are not yet reachable from Vercel. Authentication is switched off
 * here rather than removed, so CF-130 can turn it back on with a config change
 * instead of a revert.
 *
 * NEXT_PUBLIC_ is intentional: this controls UI and routing only and carries no
 * secret. It is inlined at build time, so changing it requires a rebuild.
 */
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

/**
 * Paths that stay reachable while AUTH_ENABLED is false.
 * Everything else — /login, /dashboard/*, /api/* — returns 404.
 */
export const PUBLIC_PATHS: readonly string[] = ['/'];

/** True when the request path is publicly reachable in the current auth mode. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}
