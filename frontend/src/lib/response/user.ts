/**
 * Response types mirroring the auth-service DTOs.
 */

export interface UserMeResponse {
  id: string
  keycloakId: string
  email: string
  role: string
  timezone: string
  displayName: string | null
  niche: string | null
}

export interface UserPreferencesResponse {
  email: string
  timezone: string
  displayName: string | null
  niche: string | null
  region: string
}

export interface NichesResponse {
  niches: string[]
}

export interface TimezonesResponse {
  timezones: string[]
}

export interface RegionOption {
  code: string
  name: string
}

export interface RegionsResponse {
  regions: RegionOption[]
}
