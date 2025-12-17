/**
 * API 相关类型定义
 */

/** API 响应基础结构 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: number;
}

/** API 错误响应 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string; // 出错的字段名，用于前端表单错误映射
    details?: Record<string, unknown>;
  };
  timestamp: number;
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

/** 认证 Token */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** 登录请求 */
export interface LoginRequest {
  /** 用户名或邮箱 */
  account: string;
  password: string;
}

/** 注册请求 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  nickname?: string;
}
