import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '@/modules/users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<{ user: User }>().user,
);
