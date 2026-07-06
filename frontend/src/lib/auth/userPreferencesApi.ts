// Server-side auth-service client for user preferences.
// Called only from Next.js BFF API routes - never from components.
// Uses axiosClient (with retry) and injects Bearer token on every call.
//
// ownerId (Keycloak UUID) is always supplied by the BFF from session.userId.
// It is never sourced from browser input.

import axiosClient from '@/lib/http/axiosClient'
import { buildUrl } from '@/lib/http/serviceUrls'
import { ProvisionUserRequest, UserPreferencesRequest } from '@/lib/request/user'
import { NichesResponse, RegionsResponse, TimezonesResponse, UserMeResponse, UserPreferencesResponse } from '@/lib/response/user'

// Upserts the user row in auth-service on first sign-in.
// ownerId and email are injected server-side by the BFF - never from browser input.
export async function provisionUser(
  body: ProvisionUserRequest,
  accessToken: string
): Promise<UserMeResponse> {
  const url = buildUrl('auth', '/v1.0/api/user/me')
  const { data } = await axiosClient.post<UserMeResponse>(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

export async function fetchUserPreferences(
  ownerId: string,
  accessToken: string
): Promise<UserPreferencesResponse> {
  const url = buildUrl('auth', '/v1.0/api/user/preferences')
  const { data } = await axiosClient.get<UserPreferencesResponse>(url, {
    params: { ownerId },
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

export async function patchUserPreferences(
  body: UserPreferencesRequest,
  accessToken: string
): Promise<UserPreferencesResponse> {
  const url = buildUrl('auth', '/v1.0/api/user/preferences')
  const { data } = await axiosClient.patch<UserPreferencesResponse>(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

export async function fetchNiches(
  ownerId: string,
  accessToken: string
): Promise<NichesResponse> {
  const url = buildUrl('auth', '/v1.0/api/user/niches')
  const { data } = await axiosClient.get<NichesResponse>(url, {
    params: { ownerId },
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

export async function fetchTimezones(
  ownerId: string,
  accessToken: string
): Promise<TimezonesResponse> {
  const url = buildUrl('auth', '/v1.0/api/user/timezones')
  const { data } = await axiosClient.get<TimezonesResponse>(url, {
    params: { ownerId },
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

export async function fetchRegions(
  ownerId: string,
  accessToken: string
): Promise<RegionsResponse> {
  const url = buildUrl('auth', '/v1.0/api/user/regions')
  const { data } = await axiosClient.get<RegionsResponse>(url, {
    params: { ownerId },
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}
