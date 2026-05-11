/**
 * Server-side platform-status client (media-service).
 * Called only from Next.js BFF API routes — never from components.
 */

import axiosClient from '@/lib/http/axiosClient'
import { buildUrl } from '@/lib/http/serviceUrls'
import { PlatformStatusResponse } from '@/lib/response/platform'

export async function getPlatformStatus(
  ownerId: string,
  accessToken: string
): Promise<PlatformStatusResponse[]> {
  const url = buildUrl('media', '/api/platforms/status', undefined, { ownerId })
  const { data } = await axiosClient.get<PlatformStatusResponse[]>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

/**
 * Calls the backend connect endpoint and returns the OAuth consent URL.
 *
 * The backend returns a 302 with a Location header pointing to the platform's
 * OAuth consent screen. We follow one hop and return the final URL so the BFF
 * can redirect the browser there directly.
 */
export async function getConnectUrl(
  platform: string,
  ownerId: string,
  accessToken: string
): Promise<string> {
  const url = buildUrl('media', `/api/platforms/${platform}/connect`, undefined, { ownerId })

  // maxRedirects: 0 so axios doesn't follow the 302 — we want the Location header
  try {
    await axiosClient.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      maxRedirects: 0,
    })
    // Should not reach here — backend always redirects
    throw new Error('Backend did not redirect')
  } catch (err: unknown) {
    // axios throws on 3xx when maxRedirects=0; the redirect URL is in err.response.headers.location
    const axiosErr = err as { response?: { status?: number; headers?: { location?: string } } }
    const location = axiosErr?.response?.headers?.location
    if (axiosErr?.response?.status === 302 && location) {
      return location
    }
    throw err
  }
}
