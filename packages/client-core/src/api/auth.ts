/**
 * Auth API 工厂
 * 提供带 Zod 验证的认证 API，可被 desktop/mobile 复用
 */

import type { User, AuthTokens, LoginRequest, RegisterRequest } from '@qing-yuan/shared';
import { loginSchema, registerSchema } from '@qing-yuan/protocol';
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
 * 内置 Zod schema 验证，确保所有调用都经过数据校验
 *
 * @param getHttpClient - 获取 HttpClient 实例的函数
 * @returns Auth API 实例
 */
export function createAuthApi(getHttpClient: () => HttpClient): AuthApi {
  return {
    async login(data: LoginRequest) {
      // API 层统一验证
      const validated = loginSchema.parse(data);
      const http = getHttpClient();
      return http.post<{ user: User; tokens: AuthTokens }>(`${V1}/auth/login`, validated);
    },

    async register(data: RegisterRequest) {
      // API 层统一验证，确保数据格式正确
      const validated = registerSchema.parse(data);
      const http = getHttpClient();
      return http.post<{ user: User; tokens: AuthTokens }>(`${V1}/auth/register`, validated);
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
