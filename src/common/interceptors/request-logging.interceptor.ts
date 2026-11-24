import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';
import { ensureRequestId } from '@/common/http/request-id';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = ensureRequestId(request, response);
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        if (process.env.NODE_ENV === 'test') return;
        const elapsedMs = Date.now() - startedAt;
        this.logger.log(
          `${request.method} ${request.originalUrl} ${response.statusCode} ${elapsedMs}ms [${requestId}]`,
        );
      }),
    );
  }
}
