import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { JwtPayload } from './jwt.strategy.js';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Checks that the authenticated JWT contains all required Keycloak realm roles.
 * Must run after JwtAuthGuard (which populates req.user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    const realmRoles = user?.realm_access?.roles ?? [];

    return requiredRoles.every((role) => realmRoles.includes(role));
  }
}
