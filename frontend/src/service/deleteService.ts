import browserAxiosClient from '@/lib/http/browserAxiosClient'

/**
 * Disconnects a platform for the current user.
 * Calls DELETE /api/platforms/disconnect?platform={platform}
 */
export async function disconnectPlatform(platform: string): Promise<void> {
  await browserAxiosClient.delete(`/api/platforms/disconnect?platform=${platform}`)
}

/**
 * Deletes a media file from the vault.
 * Calls DELETE /api/media/{mediaId} — ownerId injected server-side by the BFF.
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  await browserAxiosClient.delete(`/api/media/${mediaId}`)
}
