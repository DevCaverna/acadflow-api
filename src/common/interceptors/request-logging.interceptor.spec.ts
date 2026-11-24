import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { REQUEST_ID_HEADER } from '@/common/http/request-id';
import { RequestLoggingInterceptor } from '@/common/interceptors/request-logging.interceptor';

function createHttpContext(incomingRequestId?: string) {
  const headers = new Map<string, string>();
  const request = {
    method: 'GET',
    originalUrl: '/health',
    headers: incomingRequestId === undefined ? {} : { 'x-request-id': incomingRequestId },
  };
  const response = {
    statusCode: 200,
    headersSent: false,
    getHeader: (name: string) => headers.get(name),
    setHeader: (name: string, value: string) => {
      headers.set(name, value);
    },
  };
  const context = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, headers };
}

describe('RequestLoggingInterceptor', () => {
  it('generates a UUID X-Request-Id header when none is provided', () => {
    const interceptor = new RequestLoggingInterceptor();
    const { context, headers } = createHttpContext();
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(context, next).subscribe();

    expect(headers.get(REQUEST_ID_HEADER)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('reuses a safe incoming X-Request-Id header', () => {
    const interceptor = new RequestLoggingInterceptor();
    const { context, headers } = createHttpContext('req-2026-abc_123');
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(context, next).subscribe();

    expect(headers.get(REQUEST_ID_HEADER)).toBe('req-2026-abc_123');
  });

  it('replaces unsafe incoming X-Request-Id values to prevent log injection', () => {
    const interceptor = new RequestLoggingInterceptor();
    const { context, headers } = createHttpContext('bad\nheader value');
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(context, next).subscribe();

    expect(headers.get(REQUEST_ID_HEADER)).not.toBe('bad\nheader value');
    expect(headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('logs completed HTTP requests outside test environment', () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const interceptor = new RequestLoggingInterceptor();
      const logSpy = vi
        .spyOn(
          (interceptor as unknown as { logger: { log: (...args: unknown[]) => void } }).logger,
          'log',
        )
        .mockImplementation(() => undefined);
      const { context } = createHttpContext('req-dev-01');
      const next: CallHandler = { handle: () => of({ ok: true }) };

      interceptor.intercept(context, next).subscribe();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^GET \/health 200 \d+ms \[req-dev-01\]$/),
      );
    } finally {
      process.env.NODE_ENV = previousEnv;
    }
  });
});
