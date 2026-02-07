import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const type = context.getType();

    if (type !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request: Request = ctx.getRequest();
    const url = request.originalUrl;

    if (this.excludeLogging(url)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;
        this.logRequest(request, data, responseTime);
      })
    );
  }

  private logRequest(request: Request, data: unknown, responseTime: number): void {
    this.logger.log(
      JSON.stringify({
        time: new Date().toISOString(),
        method: request.method,
        url: request.url,
        statusCode: request.res?.statusCode,
        requestBody: request.body,
        responseTime: `${responseTime}ms`,
        userAgent: request.headers['user-agent'],
      })
    );
  }

  private excludeLogging(url: string): boolean {
    return url.startsWith('/api/health');
  }
}
