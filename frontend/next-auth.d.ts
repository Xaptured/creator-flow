import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    userId?: string
    error?: "RefreshTokenExpired"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    idToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: "RefreshTokenExpired"
  }
}
