import { SetMetadata } from '@nestjs/common';
import type { Role } from './types.js';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles; enforced by RolesGuard. No decorator = any authenticated role. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
