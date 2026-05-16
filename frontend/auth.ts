import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"
import { JWT } from "next-auth/jwt"
import { provisionUser } from "@/lib/auth/userPreferencesApi"

// Buffer in seconds - refresh the token this many seconds before it actually expires
const REFRESH_BUFFER_SECONDS = 60

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const tokenEndpoint = process.env.AUTH_KEYCLOAK_ISSUER + "/protocol/openid-connect/token"

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.AUTH_KEYCLOAK_ID!,
        client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
        refresh_token: token.refreshToken as string,
      }),
    })

    const refreshed = await response.json()

    if (!response.ok) {
      throw new Error(refreshed.error ?? "Failed to refresh token")
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      idToken: refreshed.id_token ?? token.idToken,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
    }
  } catch {
    return {
      ...token,
      error: "RefreshTokenExpired" as const,
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: store tokens and provision the user row in DB
      if (account) {
        const newToken: JWT = {
          ...token,
          accessToken: account.access_token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + (account.expires_in as number) * 1000,
          sub: account.providerAccountId,
        }

        // Provision user in DB - fire-and-forget, must not block login on failure
        // ownerId = Keycloak UUID (JWT sub); email from OIDC profile claim
        try {
          await provisionUser(
            {
              ownerId: account.providerAccountId,
              email: (token.email ?? "") as string,
            },
            account.access_token as string
          )
        } catch (err) {
          console.error("[auth] Failed to provision user on first sign-in:", err)
        }

        return newToken
      }

      // Subsequent calls: return token as-is if still valid (with buffer)
      const expiresAt = token.accessTokenExpires ?? 0
      const isExpiringSoon = Date.now() >= expiresAt - REFRESH_BUFFER_SECONDS * 1000

      if (!isExpiringSoon) {
        return token
      }

      // Token is expired or expiring soon - attempt refresh
      return refreshAccessToken(token)
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.userId = token.sub as string
      session.error = token.error
      return session
    },
  },
})
