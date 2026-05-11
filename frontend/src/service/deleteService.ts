import browserAxiosClient from '@/lib/http/browserAxiosClient'

/**
 * Disconnects a platform for the current user.
 * Calls DELETE /api/platforms/disconnect?platform={platform}
 */
export async function disconnectPlatform(platform: string): Promise<void> {
  await browserAxiosClient.delete(`/api/platforms/disconnect?platform=${platform}`)
}
