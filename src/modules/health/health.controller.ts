import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthResponseDto } from '@/modules/health/dto/health-response.dto';
import { HealthService } from '@/modules/health/health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthResponseDto })
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthResponseDto> {
    const health = await this.healthService.check();
    if (health.status === 'error') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }
}
