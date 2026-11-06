import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './types.js';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as AuthUser;
});
