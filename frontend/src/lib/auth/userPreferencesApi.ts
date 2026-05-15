/**
 * Server-side auth-service client for user preferences.
 * Called only from Next.js BFF API routes — never from components.
 * Uses axiosClient (with retry) and injects Bearer token on every call.
 */

import axiosClient from '@/lib/http/axiosClient'
import { buildUrl } from '@/lib/http/serviceUrls'
import { UpdateUserPreferencesRequest } from '@/lib/request/user'
import { UserPreferencesResponse } from '@/lib/response/user'

export async function fetchUserPreferences(
  accessToken: string
): Promise<UserPreferencesResponse> {
  const url = buildUrl('auth', '/v1.0/api/user/preferences')
  const { data } = await axiosClient.get<UserPreferencesResponse>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

export async function patchUserPreferences(
  body: UpdateUserPreferencesRequest,
  accessToken: string
): Promise<UserPreferencesResponse> {
  const url = buildUrl('auth', '/v1.0/api/user/preferences')
  const { data } = await axiosClient.patch<UserPreferencesResponse>(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}
