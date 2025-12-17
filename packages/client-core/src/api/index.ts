import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse, ApiError, AuthTokens } from '@qyra/shared';

// ============================================================================
// 类型定义
// ============================================================================

/** 扩展的请求配置 */
export interface RequestConfig extends AxiosRequestConfig {
  /** 是否跳过认证 */
  skipAuth?: boolean;
  /** 重试次数 */
  retryCount?: number;
  /** 是否静默错误（不触发全局错误处理） */
  silent?: boolean;
}

/** Token 管理器接口 */
export interface TokenManager {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (tokens: AuthTokens) => void;
  clearTokens: () => void;
}

/** 错误处理器类型 */
export type ErrorHandler = (error: ApiError) => void;

/** 请求客户端配置 */
export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  tokenManager?: TokenManager;
  onUnauthorized?: () => void;
  onError?: ErrorHandler;
}

// ============================================================================
// 自定义错误类
// ============================================================================

/** 网络错误 */
export class NetworkError extends Error {
  constructor(message = '网络连接失败，请检查网络设置') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** API 错误 */
export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly details?: Record<string, unknown>;
  public readonly statusCode: number;

  constructor(error: ApiError, statusCode: number) {
    super(error.error.message);
    this.name = 'ApiRequestError';
    this.code = error.error.code;
    this.field = error.error.field;
    this.details = error.error.details;
    this.statusCode = statusCode;
  }
}

/** 认证错误 */
export class AuthenticationError extends Error {
  constructor(message = '认证失败，请重新登录') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// ============================================================================
// HTTP 客户端类
// ============================================================================

export class HttpClient {
  private readonly instance;
  private readonly config: HttpClientConfig;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(config: HttpClientConfig) {
    this.config = config;

    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // --------------------------------------------------------------------------
  // 拦截器设置
  // --------------------------------------------------------------------------

  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig & RequestConfig) => {
        // 添加认证 Token
        if (!config.skipAuth && this.config.tokenManager) {
          const token = this.config.tokenManager.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as
          | (InternalAxiosRequestConfig & RequestConfig & { _retry?: boolean })
          | undefined;

        // 网络错误
        if (!error.response) {
          return Promise.reject(new NetworkError());
        }

        const { status, data } = error.response;

        // 401 未授权 - 尝试刷新 Token
        if (
          status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          this.config.tokenManager?.getRefreshToken()
        ) {
          if (this.isRefreshing) {
            // 等待 Token 刷新完成
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.instance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newTokens = await this.refreshToken();
            this.config.tokenManager?.setTokens(newTokens);

            // 通知所有等待的请求
            this.refreshSubscribers.forEach((callback) => callback(newTokens.accessToken));
            this.refreshSubscribers = [];

            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            this.config.tokenManager?.clearTokens();
            this.config.onUnauthorized?.();
            return Promise.reject(new AuthenticationError());
          } finally {
            this.isRefreshing = false;
          }
        }

        // 构造 API 错误
        const apiError = data ?? {
          success: false as const,
          error: {
            code: `HTTP_${status}`,
            message: error.message || '请求失败',
          },
          timestamp: Date.now(),
        };

        const requestError = new ApiRequestError(apiError, status);

        // 触发全局错误处理
        if (!originalRequest?.silent) {
          this.config.onError?.(apiError);
        }

        return Promise.reject(requestError);
      }
    );
  }

  // --------------------------------------------------------------------------
  // Token 刷新
  // --------------------------------------------------------------------------

  private async refreshToken(): Promise<AuthTokens> {
    const refreshToken = this.config.tokenManager?.getRefreshToken();
    if (!refreshToken) {
      throw new AuthenticationError('No refresh token available');
    }

    const response = await this.instance.post<ApiResponse<AuthTokens>>(
      '/auth/refresh',
      { refreshToken },
      { skipAuth: true } as RequestConfig
    );

    return response.data.data;
  }

  // --------------------------------------------------------------------------
  // HTTP 方法
  // --------------------------------------------------------------------------

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  async post<T, D = unknown>(url: string, data?: D, config?: RequestConfig): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async put<T, D = unknown>(url: string, data?: D, config?: RequestConfig): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async patch<T, D = unknown>(url: string, data?: D, config?: RequestConfig): Promise<T> {
    const response = await this.instance.patch<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  // --------------------------------------------------------------------------
  // 文件上传
  // --------------------------------------------------------------------------

  async upload<T>(
    url: string,
    file: File | Blob,
    fieldName = 'file',
    config?: RequestConfig
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await this.instance.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  // --------------------------------------------------------------------------
  // 原始请求（不解析 data）
  // --------------------------------------------------------------------------

  async request<T>(config: RequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.request<T>(config);
  }
}

// ============================================================================
// 默认实例工厂
// ============================================================================

let defaultClient: HttpClient | null = null;

/** 初始化默认 HTTP 客户端 */
export function initHttpClient(config: HttpClientConfig): HttpClient {
  defaultClient = new HttpClient(config);
  return defaultClient;
}

/** 获取默认 HTTP 客户端 */
export function getHttpClient(): HttpClient {
  if (!defaultClient) {
    throw new Error('HttpClient not initialized. Call initHttpClient() first.');
  }
  return defaultClient;
}

// ============================================================================
// 便捷方法导出
// ============================================================================

export const http = {
  get: <T>(url: string, config?: RequestConfig) => getHttpClient().get<T>(url, config),

  post: <T, D = unknown>(url: string, data?: D, config?: RequestConfig) =>
    getHttpClient().post<T, D>(url, data, config),

  put: <T, D = unknown>(url: string, data?: D, config?: RequestConfig) =>
    getHttpClient().put<T, D>(url, data, config),

  patch: <T, D = unknown>(url: string, data?: D, config?: RequestConfig) =>
    getHttpClient().patch<T, D>(url, data, config),

  delete: <T>(url: string, config?: RequestConfig) => getHttpClient().delete<T>(url, config),

  upload: <T>(url: string, file: File | Blob, fieldName?: string, config?: RequestConfig) =>
    getHttpClient().upload<T>(url, file, fieldName, config),
};

// 导出 Auth API 工厂
export { createAuthApi, type AuthApi } from './auth';
