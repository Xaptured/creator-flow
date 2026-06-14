import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  realm_access?: { roles?: string[] };
  [key: string]: unknown;
}

/**
 * Validates Bearer tokens issued by Keycloak.
 * Fetches public keys from the Keycloak JWKS endpoint — same issuer
 * used by the Spring Boot resource servers.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const issuerUri = config.getOrThrow<string>('KEYCLOAK_ISSUER_URI');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${issuerUri}/protocol/openid-connect/certs`,
      }),
      issuer: issuerUri,
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
