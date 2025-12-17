/**
 * Auth API 工厂
 * 提供认证 API，可被 desktop/mobile 复用
 *
 * 验证策略：
 * - Form 层：使用 zod schema + react-hook-form 即时验证，提升 UX
 * - API 层：纯 HTTP 封装，不重复验证（信任 Form 层）
 * - 服务端：最终安全防线，必须验证
 */

import type { User, AuthTokens, LoginRequest, RegisterRequest } from '@qyra/shared';
import { HttpClient } from './index';

/** API 版本前缀 */
const V1 = '/v1';

/** Auth API 接口 */
export interface AuthApi {
  /** 登录 */
  login: (data: LoginRequest) => Promise<{ user: User; tokens: AuthTokens }>;
  /** 注册 */
  register: (data: RegisterRequest) => Promise<{ user: User; tokens: AuthTokens }>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 刷新 Token */
  refreshToken: (refreshToken: string) => Promise<AuthTokens>;
  /** 获取当前用户信息 */
  getMe: () => Promise<User>;
  /** 更新用户信息 */
  updateProfile: (data: Partial<User>) => Promise<User>;
}

/**
 * 创建 Auth API 实例
 * 纯 HTTP 封装，验证由 Form 层和服务端负责
 *
 * @param getHttpClient - 获取 HttpClient 实例的函数
 * @returns Auth API 实例
 */
export function createAuthApi(getHttpClient: () => HttpClient): AuthApi {
  return {
    async login(data: LoginRequest) {
      const http = getHttpClient();
      return http.post<{ user: User; tokens: AuthTokens }>(`${V1}/auth/login`, data);
    },

    async register(data: RegisterRequest) {
      const http = getHttpClient();
      return http.post<{ user: User; tokens: AuthTokens }>(`${V1}/auth/register`, data);
    },

    async logout() {
      try {
        const http = getHttpClient();
        await http.post<void>(`${V1}/auth/logout`);
      } catch {
        // 即使请求失败也清除本地状态
      }
    },

    async refreshToken(refreshToken: string) {
      const http = getHttpClient();
      return http.post<AuthTokens>(`${V1}/auth/refresh`, { refreshToken });
    },

    async getMe() {
      const http = getHttpClient();
      return http.get<User>(`${V1}/users/me`);
    },

    async updateProfile(data: Partial<User>) {
      const http = getHttpClient();
      return http.patch<User>(`${V1}/users/me`, data);
    },
  };
}
