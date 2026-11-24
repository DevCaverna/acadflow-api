import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

export function ensureRequestId(request: Request, response: Response): string {
  const existing = response.getHeader(REQUEST_ID_HEADER);
  if (typeof existing === 'string' && existing.length > 0) return existing;

  const incoming = request.headers['x-request-id'];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const requestId =
    typeof candidate === 'string' && SAFE_REQUEST_ID.test(candidate) ? candidate : randomUUID();

  if (!response.headersSent) {
    response.setHeader(REQUEST_ID_HEADER, requestId);
  }
  return requestId;
}
