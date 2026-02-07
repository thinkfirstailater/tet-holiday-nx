import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  path: string;
  timestamp: string;
}

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CustomExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(
      JSON.stringify({
        statusCode: status,
        message,
        path: request.url,
        method: request.method,
        timestamp: errorResponse.timestamp,
        body: request.body,
      })
    );

    response.status(status).json(errorResponse);
  }
}
