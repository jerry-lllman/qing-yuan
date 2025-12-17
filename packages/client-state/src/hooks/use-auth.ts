/**
 * useAuth Hook
 * 认证相关的组合 Hook，整合 auth.store 和 TanStack Query
 *
 * 功能：
 * - 登录/登出
 * - 注册
 * - Token 刷新
 * - 当前用户信息
 * - 认证状态检查
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, AuthTokens, LoginRequest, RegisterRequest } from '@qyra/shared';
import { useAuthStore, AuthStatus, type AuthError } from '../stores/auth.store';
import { userKeys } from '../queries/keys';

// ========================
// 类型定义
// ========================

/** 认证 API 接口（由使用方注入） */
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

/** useAuth Hook 配置 */
export interface UseAuthOptions {
  /** 认证 API 实现 */
  api: AuthApi;
  /** 登录成功回调 */
  onLoginSuccess?: (user: User) => void;
  /** 登出成功回调 */
  onLogoutSuccess?: () => void;
  /** 错误回调 */
  onError?: (error: AuthError) => void;
}

/** useAuth Hook 返回值 */
export interface UseAuthReturn {
  // ========== 状态 ==========
  /** 认证状态 */
  status: AuthStatus;
  /** 当前用户 */
  user: User | null;
  /** Token 信息 */
  tokens: AuthTokens | null;
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: AuthError | null;

  // ========== 操作 ==========
  /** 登录 */
  login: (data: LoginRequest) => Promise<void>;
  /** 注册 */
  register: (data: RegisterRequest) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 刷新 Token */
  refreshToken: () => Promise<void>;
  /** 获取当前用户信息 */
  fetchMe: () => Promise<void>;
  /** 更新用户信息 */
  updateProfile: (data: Partial<User>) => Promise<void>;
  /** 清除错误 */
  clearError: () => void;

  // ========== Mutation 状态 ==========
  /** 登录中 */
  isLoggingIn: boolean;
  /** 注册中 */
  isRegistering: boolean;
  /** 登出中 */
  isLoggingOut: boolean;
  /** 刷新 Token 中 */
  isRefreshing: boolean;
  /** 更新用户信息中 */
  isUpdatingProfile: boolean;
}

// ========================
// Hook 实现
// ========================

/**
 * 认证 Hook
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth({
 *   api: authApi,
 *   onLoginSuccess: (user) => console.log('Logged in:', user),
 * });
 *
 * // 登录
 * await login({ email: 'user@example.com', password: 'password' });
 *
 * // 登出
 * await logout();
 * ```
 */
export function useAuth(options: UseAuthOptions): UseAuthReturn {
  const { api, onLoginSuccess, onLogoutSuccess, onError } = options;

  const queryClient = useQueryClient();

  // ========== Store State ==========
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const isAuthenticated = useAuthStore((state) => state.status === AuthStatus.AUTHENTICATED);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  // Store Actions - 只获取实际使用的 actions
  const setUser = useAuthStore((state) => state.setUser);
  const setError = useAuthStore((state) => state.setError);
  const setLoading = useAuthStore((state) => state.setLoading);
  const loginSuccess = useAuthStore((state) => state.loginSuccess);
  const storeLogout = useAuthStore((state) => state.logout);
  const refreshTokenSuccess = useAuthStore((state) => state.refreshTokenSuccess);
  const updateUser = useAuthStore((state) => state.updateUser);

  // ========== 错误处理 ==========
  const handleError = useCallback(
    (err: unknown) => {
      const authError: AuthError = {
        code: (err as { code?: string })?.code || 'UNKNOWN_ERROR',
        message: (err as Error)?.message || '发生未知错误',
      };
      setError(authError);
      onError?.(authError);
      // 不再重新抛出错误，错误已通过 store 状态传递
    },
    [setError, onError]
  );

  // ========== 登录 Mutation ==========
  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      setLoading(true);
      setError(null);
      return api.login(data);
    },
    onSuccess: ({ user: loggedInUser, tokens: authTokens }) => {
      loginSuccess(loggedInUser, authTokens);
      // 更新 Query 缓存
      queryClient.setQueryData(userKeys.me(), loggedInUser);
      onLoginSuccess?.(loggedInUser);
    },
    onError: handleError,
    onSettled: () => {
      setLoading(false);
    },
  });

  // ========== 注册 Mutation ==========
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest) => {
      setLoading(true);
      setError(null);
      return api.register(data);
    },
    onSuccess: async (data) => {
      const { user: registeredUser, tokens: authTokens } = data;
      loginSuccess(registeredUser, authTokens);
      // 更新 Query 缓存
      queryClient.setQueryData(userKeys.me(), registeredUser);
      onLoginSuccess?.(registeredUser);
    },
    onError: handleError,
    onSettled: () => {
      setLoading(false);
    },
  });

  // ========== 登出 Mutation ==========
  const logoutMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      // 即使 API 调用失败也要清除本地状态
      try {
        await api.logout();
      } catch {
        // 忽略登出 API 错误
      }
    },
    onSuccess: () => {
      storeLogout();
      // 清除所有 Query 缓存
      queryClient.clear();
      onLogoutSuccess?.();
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // ========== 刷新 Token Mutation ==========
  const refreshTokenMutation = useMutation({
    mutationFn: async () => {
      const currentRefreshToken = tokens?.refreshToken;
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }
      return api.refreshToken(currentRefreshToken);
    },
    onSuccess: (newTokens) => {
      refreshTokenSuccess(newTokens);
    },
    onError: (err) => {
      // 刷新失败，登出用户
      storeLogout();
      queryClient.clear();
      handleError(err);
    },
  });

  // ========== 获取当前用户 Query ==========
  const meQuery = useQuery({
    queryKey: userKeys.me(),
    queryFn: async () => {
      const userData = await api.getMe();
      setUser(userData);
      return userData;
    },
    enabled: isAuthenticated && !!tokens?.accessToken,
    staleTime: 5 * 60 * 1000, // 5 分钟
  });

  // ========== 更新用户信息 Mutation ==========
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      return api.updateProfile(data);
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      // 更新 Query 缓存
      queryClient.setQueryData(userKeys.me(), updatedUser);
    },
    onError: handleError,
  });

  // ========== 暴露的方法 ==========
  // 注意：mutateAsync 和 refetch 是 TanStack Query 保证稳定的引用
  const login = useCallback(
    async (data: LoginRequest) => {
      await loginMutation.mutateAsync(data);
    },
    [loginMutation.mutateAsync]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      await registerMutation.mutateAsync(data);
    },
    [registerMutation.mutateAsync]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation.mutateAsync]);

  const refreshToken = useCallback(async () => {
    await refreshTokenMutation.mutateAsync();
  }, [refreshTokenMutation.mutateAsync]);

  const fetchMe = useCallback(async () => {
    await meQuery.refetch();
  }, [meQuery.refetch]);

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      await updateProfileMutation.mutateAsync(data);
    },
    [updateProfileMutation.mutateAsync]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // ========== 返回值 ==========
  return useMemo(
    () => ({
      // 状态
      status,
      user,
      tokens,
      isAuthenticated,
      isLoading: isLoading || meQuery.isLoading,
      error,

      // 操作
      login,
      register,
      logout,
      refreshToken,
      fetchMe,
      updateProfile,
      clearError,

      // Mutation 状态
      isLoggingIn: loginMutation.isPending,
      isRegistering: registerMutation.isPending,
      isLoggingOut: logoutMutation.isPending,
      isRefreshing: refreshTokenMutation.isPending,
      isUpdatingProfile: updateProfileMutation.isPending,
    }),
    [
      status,
      user,
      tokens,
      isAuthenticated,
      isLoading,
      meQuery.isLoading,
      error,
      login,
      register,
      logout,
      refreshToken,
      fetchMe,
      updateProfile,
      clearError,
      loginMutation.isPending,
      registerMutation.isPending,
      logoutMutation.isPending,
      refreshTokenMutation.isPending,
      updateProfileMutation.isPending,
    ]
  );
}
