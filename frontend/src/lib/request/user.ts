// Request types for user preference endpoints.
// Mirrors com.creatorflow.auth_service.dto.request (ProvisionUserRequest, UserPreferencesRequest)
//
// ownerId = Keycloak UUID (session.userId) - always injected server-side by the BFF.
// Components use Omit with ownerId excluded and never supply ownerId directly.

export interface ProvisionUserRequest {
  ownerId: string
  email: string
  role?: string
}

export interface UserPreferencesRequest {
  ownerId: string
  timezone: string
  displayName?: string | null
  niche?: string | null
}
