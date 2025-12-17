/**
 * 应用初始化
 * 配置 HttpClient 和 TokenManager
 */

import { initHttpClient } from '@qing-yuan/client-core';
import { useAuthStore } from '@qing-yuan/client-state';

// API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * TokenManager 实现
 * 桥接 HttpClient 和 Zustand auth store
 */
const tokenManager = {
  getAccessToken: () => useAuthStore.getState().tokens?.accessToken ?? null,
  getRefreshToken: () => useAuthStore.getState().tokens?.refreshToken ?? null,
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => {
    useAuthStore.getState().setTokens(tokens);
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

  console.log('[App] Initialized with API:', API_BASE_URL);
}
