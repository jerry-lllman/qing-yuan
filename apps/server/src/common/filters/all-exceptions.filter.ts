import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * API 统一错误响应格式
 * 与 @qing-yuan/shared 中的 ApiError 类型保持一致
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string; // 出错的字段名，用于前端表单错误映射
    details?: Record<string, unknown>;
  };
  timestamp: number;
}

/**
 * 全局异常过滤器
 * 将所有异常统一转换为 { success: false, error: { code, message }, timestamp } 格式
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 'INTERNAL_ERROR';
    let field: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string) || exception.message;
        // 提取 field 信息（用于前端表单错误映射）
        if (res.field && typeof res.field === 'string') {
          field = res.field;
        }
        // 处理 class-validator 的验证错误数组
        if (Array.isArray(res.message)) {
          message = res.message[0];
          details = { messages: res.message };
        }
      }

      // 根据 HTTP 状态码设置错误代码
      code = this.getErrorCode(status);
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(field && { field }),
        ...(details && { details }),
      },
      timestamp: Date.now(),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * 根据 HTTP 状态码获取错误代码
   */
  private getErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return codeMap[status] || `HTTP_${status}`;
  }
}
