import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // /api/metrics, /api/health 엔드포인트는 제외
    if (request.path === '/api/metrics' || request.path === '/api/health') {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000;
        const routePath = (request.route as { path: string } | undefined)?.path;
        this.metricsService.recordHttpRequest(
          request.method,
          routePath ?? request.path,
          response.statusCode,
          duration,
        );
      }),
      catchError((error: unknown) => {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = error instanceof HttpException ? error.getStatus() : 500;
        const routePath = (request.route as { path: string } | undefined)?.path;
        this.metricsService.recordHttpRequest(
          request.method,
          routePath ?? request.path,
          statusCode,
          duration,
        );

        return throwError(() => error);
      }),
    );
  }
}
