import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Declares required Keycloak realm roles for a controller or handler.
 * Enforced by RolesGuard.
 *
 * @example
 * @Roles('CREATOR')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
