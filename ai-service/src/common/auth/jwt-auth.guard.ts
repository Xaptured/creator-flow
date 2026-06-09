import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Requires a valid Keycloak-issued Bearer token.
 * Used on all AI endpoints — token validated via JwtStrategy (JWKS).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
