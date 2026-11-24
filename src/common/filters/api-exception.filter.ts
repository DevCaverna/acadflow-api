import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  type ValidationError,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { ApiException } from '@/common/filters/api.exception';
import { ensureRequestId } from '@/common/http/request-id';
import type { ApiError, ErrorCode } from '@/common/types/api-error';

const VALIDATION_KEY_PREFIX = 'validation.';

const CODE_BY_STATUS: Readonly<Record<number, ErrorCode>> = {
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = ensureRequestId(request, response);
    const statusCode = this.getStatus(exception);
    const code = this.getCode(exception, statusCode);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled exception [${requestId}] ${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    if (response.headersSent) {
      response.end();
      return;
    }

    const lang = this.getLanguage(request, host);
    const body: ApiError = { statusCode, code, message: this.getMessage(exception, code, lang) };
    response.status(statusCode).json(body);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    const status =
      exception instanceof Error && 'statusCode' in exception ? exception.statusCode : undefined;
    return typeof status === 'number' && status >= 400 && status < 500
      ? status
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getCode(exception: unknown, status: number): ErrorCode {
    if (exception instanceof ApiException) return exception.code;
    if (status >= 500) return 'INTERNAL_ERROR';
    return CODE_BY_STATUS[status] ?? 'VALIDATION_ERROR';
  }

  private getLanguage(request: Request, host: ArgumentsHost): string | undefined {
    const lang = I18nContext.current(host)?.lang;
    if (lang) return lang;
    if (!request.headers['accept-language']) return undefined;
    return request.acceptsLanguages(...this.i18n.getSupportedLanguages()) || undefined;
  }

  private getMessage(exception: unknown, code: ErrorCode, lang: string | undefined): string {
    const options = lang ? { lang } : {};
    if (exception instanceof ApiException) {
      const messages = this.getValidationMessages(exception.validationErrors, options);
      if (messages.length > 0) return [...new Set(messages)].join('; ');
    }
    return this.i18n.t(`errors.${code}`, options);
  }

  private getValidationMessages(
    errors: readonly ValidationError[],
    options: { lang?: string },
  ): string[] {
    return errors.flatMap((error) => [
      ...Object.values(error.constraints ?? {})
        .filter((constraint) => constraint.startsWith(VALIDATION_KEY_PREFIX))
        .map((constraint) => this.translateConstraint(constraint, error.property, options)),
      ...this.getValidationMessages(error.children ?? [], options),
    ]);
  }

  private translateConstraint(
    constraint: string,
    property: string,
    options: { lang?: string },
  ): string {
    const separator = constraint.indexOf('|');
    const key = separator < 0 ? constraint : constraint.slice(0, separator);
    const { constraints = [] } = (
      separator < 0 ? {} : JSON.parse(constraint.slice(separator + 1))
    ) as { constraints?: unknown[] };
    const fieldKey = `common.fields.${property}`;
    const field: string = this.i18n.t(fieldKey, options);
    return this.i18n.t(key, {
      ...options,
      args: {
        property: field === fieldKey ? property : field,
        constraints: Object.assign({}, constraints),
      },
    });
  }
}
