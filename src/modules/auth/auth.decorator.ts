import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import type { Role } from '@/common/types/role';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

export const Auth = (...roles: Role[]) =>
  applyDecorators(Roles(...roles), UseGuards(JwtAuthGuard, RolesGuard), ApiBearerAuth());
