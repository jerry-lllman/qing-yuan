/**
 * 应用初始化
 * 配置 HttpClient 和 TokenManager
 */

import { initHttpClient } from '@qyra/client-core';
import { useAuthStore } from '@qyra/client-state';

// API 基础 URL (包含 /api/v1 前缀)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * TokenManager 实现
 * 桥接 HttpClient 和 Zustand auth store
 */
const tokenManager = {
  getAccessToken: () => useAuthStore.getState().tokens?.accessToken ?? null,
  getRefreshToken: () => useAuthStore.getState().tokens?.refreshToken ?? null,
  setTokens: (tokens: { accessToken: string; refreshToken: string; expiresIn?: number }) => {
    useAuthStore.getState().setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn ?? 3600, // 默认 1 小时
    });
  },
  clearTokens: () => {
    // 使用 setTokens(null) 清除 tokens
    useAuthStore.getState().setTokens(null);
  },
};

/**
 * 初始化应用
 * 必须在应用启动时调用
 */
export function initializeApp(): void {
  // 初始化 HttpClient
  initHttpClient({
    baseURL: API_BASE_URL,
    timeout: 30000,
    tokenManager,
  });

  console.warn('[App] Initialized with API:', API_BASE_URL);
}
