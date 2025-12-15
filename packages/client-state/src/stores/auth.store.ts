/**
 * 认证状态管理
 * 负责用户登录状态、Token 管理、当前用户信息
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { User, AuthTokens, LoginRequest, RegisterRequest } from '@qing-yuan/shared';

// ========================
// 类型定义
// ========================

/** 认证状态枚举 */
export enum AuthStatus {
  /** 未初始化（应用启动时） */
  IDLE = 'idle',
  /** 正在检查认证状态 */
  CHECKING = 'checking',
  /** 已认证 */
  AUTHENTICATED = 'authenticated',
  /** 未认证 */
  UNAUTHENTICATED = 'unauthenticated',
}

/** 认证错误 */
export interface AuthError {
  code: string;
  message: string;
}

/** 认证状态 */
export interface AuthState {
  // ========== 状态 ==========
  /** 认证状态 */
  status: AuthStatus;
  /** 当前用户 */
  user: User | null;
  /** 认证 Token */
  tokens: AuthTokens | null;
  /** 错误信息 */
  error: AuthError | null;
  /** 是否正在加载 */
  isLoading: boolean;

  // ========== 操作 ==========
  /** 设置认证状态 */
  setStatus: (status: AuthStatus) => void;
  /** 设置用户信息 */
  setUser: (user: User | null) => void;
  /** 设置 Token */
  setTokens: (tokens: AuthTokens | null) => void;
  /** 设置错误 */
  setError: (error: AuthError | null) => void;
  /** 设置加载状态 */
  setLoading: (isLoading: boolean) => void;
  /** 登录成功 */
  loginSuccess: (user: User, tokens: AuthTokens) => void;
  /** 登出 */
  logout: () => void;
  /** 刷新 Token 成功 */
  refreshTokenSuccess: (tokens: AuthTokens) => void;
  /** 更新用户信息 */
  updateUser: (updates: Partial<User>) => void;
  /** 重置状态 */
  reset: () => void;
}

// ========================
// 初始状态
// ========================

const initialState: Pick<AuthState, 'status' | 'user' | 'tokens' | 'error' | 'isLoading'> = {
  status: AuthStatus.IDLE,
  user: null,
  tokens: null,
  error: null,
  isLoading: false,
};

// ========================
// Store 实现
// ========================

/**
 * 认证 Store
 *
 * 使用 Zustand + immer + devtools + persist
 * - immer: 简化不可变更新
 * - devtools: Redux DevTools 支持
 * - persist: 持久化到 localStorage
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // ========== 初始状态 ==========
        ...initialState,

        // ========== 操作 ==========
        setStatus: (status) =>
          set((state) => {
            state.status = status;
          }),

        setUser: (user) =>
          set((state) => {
            state.user = user;
          }),

        setTokens: (tokens) =>
          set((state) => {
            state.tokens = tokens;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        setLoading: (isLoading) =>
          set((state) => {
            state.isLoading = isLoading;
          }),

        loginSuccess: (user, tokens) =>
          set((state) => {
            state.status = AuthStatus.AUTHENTICATED;
            state.user = user;
            state.tokens = tokens;
            state.error = null;
            state.isLoading = false;
          }),

        logout: () =>
          set((state) => {
            state.status = AuthStatus.UNAUTHENTICATED;
            state.user = null;
            state.tokens = null;
            state.error = null;
            state.isLoading = false;
          }),

        refreshTokenSuccess: (tokens) =>
          set((state) => {
            state.tokens = tokens;
          }),

        updateUser: (updates) =>
          set((state) => {
            if (state.user) {
              Object.assign(state.user, updates);
            }
          }),

        reset: () => set(() => initialState),
      })),
      {
        name: 'qing-yuan-auth',
        // 只持久化必要的数据
        partialize: (state) => ({
          tokens: state.tokens,
          user: state.user,
          status: state.status,
        }),
        // 自定义 storage（支持 SSR）
        storage: createJSONStorage(() => {
          // 检查是否在浏览器环境
          if (typeof window === 'undefined') {
            return {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            };
          }
          return localStorage;
        }),
        // 恢复后的处理
        onRehydrateStorage: () => (state) => {
          if (state?.tokens) {
            // 有 token，设置为已认证（后续需验证 token 有效性）
            state.status = AuthStatus.AUTHENTICATED;
          } else {
            state?.setStatus(AuthStatus.UNAUTHENTICATED);
          }
        },
      }
    ),
    { name: 'AuthStore' }
  )
);

// ========================
// Selector Hooks（性能优化）
// ========================

/** 获取认证状态 */
export const useAuthStatus = () => useAuthStore((state) => state.status);

/** 获取当前用户 */
export const useCurrentUser = () => useAuthStore((state) => state.user);

/** 获取是否已认证 */
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.status === AuthStatus.AUTHENTICATED);

/** 获取 Token */
export const useAuthTokens = () => useAuthStore((state) => state.tokens);

/** 获取加载状态 */
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);

/** 获取错误信息 */
export const useAuthError = () => useAuthStore((state) => state.error);

// ========================
// 工具函数
// ========================

/**
 * 获取当前 Access Token（用于非 React 环境）
 */
export function getAccessToken(): string | null {
  return useAuthStore.getState().tokens?.accessToken ?? null;
}

/**
 * 获取当前 Refresh Token（用于非 React 环境）
 */
export function getRefreshToken(): string | null {
  return useAuthStore.getState().tokens?.refreshToken ?? null;
}

/**
 * 获取当前用户 ID（用于非 React 环境）
 */
export function getCurrentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

/**
 * 检查是否已认证（用于非 React 环境）
 */
export function checkIsAuthenticated(): boolean {
  return useAuthStore.getState().status === AuthStatus.AUTHENTICATED;
}

// ========================
// 类型导出
// ========================

export type { LoginRequest, RegisterRequest };
