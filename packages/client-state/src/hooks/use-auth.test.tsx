/**
 * useAuth Hook 单元测试
 */

import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, type AuthApi } from './use-auth';
import { useAuthStore, AuthStatus } from '../stores/auth.store';
import type { User, AuthTokens } from '@qing-yuan/shared';

// ========================
// Mock 数据
// ========================

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  nickname: 'Test User',
  avatar: null,
  phone: null,
  status: 'online',
  bio: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTokens: AuthTokens = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
  expiresIn: 3600,
};

const mockNewTokens: AuthTokens = {
  accessToken: 'new-access-token-789',
  refreshToken: 'new-refresh-token-012',
  expiresIn: 3600,
};

// ========================
// Mock API
// ========================

const createMockApi = (): AuthApi => ({
  login: vi.fn().mockResolvedValue({ user: mockUser, tokens: mockTokens }),
  register: vi.fn().mockResolvedValue({ user: mockUser, tokens: mockTokens }),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshToken: vi.fn().mockResolvedValue(mockNewTokens),
  getMe: vi.fn().mockResolvedValue(mockUser),
  updateProfile: vi.fn().mockResolvedValue(mockUser),
});

// ========================
// Test Wrapper
// ========================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ========================
// 测试套件
// ========================

describe('useAuth', () => {
  let mockApi: AuthApi;

  beforeEach(() => {
    // 重置 store
    useAuthStore.getState().reset();
    // 创建新的 mock API
    mockApi = createMockApi();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================
  // 初始状态测试
  // ========================

  describe('Initial State', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      expect(result.current.status).toBe(AuthStatus.IDLE);
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have all mutation states as false initially', () => {
      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoggingIn).toBe(false);
      expect(result.current.isRegistering).toBe(false);
      expect(result.current.isLoggingOut).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.isUpdatingProfile).toBe(false);
    });
  });

  // ========================
  // 登录测试
  // ========================

  describe('Login', () => {
    it('should login successfully', async () => {
      const onLoginSuccess = vi.fn();
      const { result } = renderHook(() => useAuth({ api: mockApi, onLoginSuccess }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password123' });
      });

      expect(mockApi.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
      expect(result.current.status).toBe(AuthStatus.AUTHENTICATED);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isAuthenticated).toBe(true);
      expect(onLoginSuccess).toHaveBeenCalledWith(mockUser);
    });

    it('should handle login error', async () => {
      const error = new Error('Invalid credentials');
      (mockApi.login as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      const onError = vi.fn();

      const { result } = renderHook(() => useAuth({ api: mockApi, onError }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.login({ username: 'testuser', password: 'wrong' });
        } catch {
          // Expected error
        }
      });

      expect(result.current.status).not.toBe(AuthStatus.AUTHENTICATED);
      expect(result.current.error).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'Invalid credentials',
      });
      expect(onError).toHaveBeenCalled();
    });

    it('should set isLoggingIn during login', async () => {
      let resolveLogin: (value: { user: User; tokens: AuthTokens }) => void;
      (mockApi.login as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          })
      );

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      let loginPromise: Promise<void>;
      act(() => {
        loginPromise = result.current.login({ username: 'testuser', password: 'password' });
      });

      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(true);
      });

      await act(async () => {
        resolveLogin!({ user: mockUser, tokens: mockTokens });
        await loginPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(false);
      });
    });
  });

  // ========================
  // 注册测试
  // ========================

  describe('Register', () => {
    it('should register successfully', async () => {
      const onLoginSuccess = vi.fn();
      const { result } = renderHook(() => useAuth({ api: mockApi, onLoginSuccess }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'password123',
          username: 'newuser',
        });
      });

      expect(mockApi.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });
      expect(result.current.status).toBe(AuthStatus.AUTHENTICATED);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(onLoginSuccess).toHaveBeenCalledWith(mockUser);
    });

    it('should handle register error', async () => {
      const error = new Error('Email already exists');
      (mockApi.register as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      const onError = vi.fn();

      const { result } = renderHook(() => useAuth({ api: mockApi, onError }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password',
            username: 'existinguser',
          });
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'Email already exists',
      });
      expect(onError).toHaveBeenCalled();
    });

    it('should set isRegistering during registration', async () => {
      let resolveRegister: (value: { user: User; tokens: AuthTokens }) => void;
      (mockApi.register as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRegister = resolve;
          })
      );

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      let registerPromise: Promise<void>;
      act(() => {
        registerPromise = result.current.register({
          email: 'new@example.com',
          password: 'password',
          username: 'newuser',
        });
      });

      await waitFor(() => {
        expect(result.current.isRegistering).toBe(true);
      });

      await act(async () => {
        resolveRegister!({ user: mockUser, tokens: mockTokens });
        await registerPromise;
      });

      await waitFor(() => {
        expect(result.current.isRegistering).toBe(false);
      });
    });
  });

  // ========================
  // 登出测试
  // ========================

  describe('Logout', () => {
    it('should logout successfully', async () => {
      const onLogoutSuccess = vi.fn();
      const { result } = renderHook(() => useAuth({ api: mockApi, onLogoutSuccess }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      expect(result.current.isAuthenticated).toBe(true);

      // 登出
      await act(async () => {
        await result.current.logout();
      });

      expect(mockApi.logout).toHaveBeenCalled();
      expect(result.current.status).toBe(AuthStatus.UNAUTHENTICATED);
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(onLogoutSuccess).toHaveBeenCalled();
    });

    it('should clear local state even if API logout fails', async () => {
      (mockApi.logout as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      // 登出（即使 API 失败也应该清除本地状态）
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.status).toBe(AuthStatus.UNAUTHENTICATED);
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
    });

    it('should set isLoggingOut during logout', async () => {
      let resolveLogout: (value?: unknown) => void;
      (mockApi.logout as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogout = resolve;
          })
      );

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      let logoutPromise: Promise<void>;
      act(() => {
        logoutPromise = result.current.logout();
      });

      await waitFor(() => {
        expect(result.current.isLoggingOut).toBe(true);
      });

      await act(async () => {
        resolveLogout!();
        await logoutPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoggingOut).toBe(false);
      });
    });
  });

  // ========================
  // Token 刷新测试
  // ========================

  describe('Refresh Token', () => {
    it('should refresh token successfully', async () => {
      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      expect(result.current.tokens).toEqual(mockTokens);

      // 刷新 Token
      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockApi.refreshToken).toHaveBeenCalledWith(mockTokens.refreshToken);
      expect(result.current.tokens).toEqual(mockNewTokens);
    });

    it('should throw error when no refresh token available', async () => {
      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (error) {
          expect((error as Error).message).toBe('No refresh token available');
        }
      });
    });

    it('should logout user when refresh token fails', async () => {
      (mockApi.refreshToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Token expired')
      );

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      // 刷新 Token（失败）
      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch {
          // Expected error
        }
      });

      expect(result.current.status).toBe(AuthStatus.UNAUTHENTICATED);
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
    });

    it('should set isRefreshing during refresh', async () => {
      let resolveRefresh: (value: AuthTokens) => void;
      (mockApi.refreshToken as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          })
      );

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      let refreshPromise: Promise<void>;
      act(() => {
        refreshPromise = result.current.refreshToken();
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(true);
      });

      await act(async () => {
        resolveRefresh!(mockNewTokens);
        await refreshPromise;
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });
  });

  // ========================
  // 更新用户信息测试
  // ========================

  describe('Update Profile', () => {
    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, nickname: 'New Nickname' };
      (mockApi.updateProfile as ReturnType<typeof vi.fn>).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      // 更新用户信息
      await act(async () => {
        await result.current.updateProfile({ nickname: 'New Nickname' });
      });

      expect(mockApi.updateProfile).toHaveBeenCalledWith({ nickname: 'New Nickname' });
      expect(result.current.user?.nickname).toBe('New Nickname');
    });

    it('should handle update profile error', async () => {
      const error = new Error('Update failed');
      (mockApi.updateProfile as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      const onError = vi.fn();

      const { result } = renderHook(() => useAuth({ api: mockApi, onError }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      // 更新用户信息（失败）
      await act(async () => {
        try {
          await result.current.updateProfile({ nickname: 'New Nickname' });
        } catch {
          // Expected error
        }
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should set isUpdatingProfile during update', async () => {
      let resolveUpdate: (value: User) => void;
      (mockApi.updateProfile as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          })
      );

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      let updatePromise: Promise<void>;
      act(() => {
        updatePromise = result.current.updateProfile({ nickname: 'New Nickname' });
      });

      await waitFor(() => {
        expect(result.current.isUpdatingProfile).toBe(true);
      });

      await act(async () => {
        resolveUpdate!(mockUser);
        await updatePromise;
      });

      await waitFor(() => {
        expect(result.current.isUpdatingProfile).toBe(false);
      });
    });
  });

  // ========================
  // 错误处理测试
  // ========================

  describe('Error Handling', () => {
    it('should clear error with clearError', async () => {
      const error = new Error('Test error');
      (mockApi.login as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 触发错误
      await act(async () => {
        try {
          await result.current.login({ username: 'testuser', password: 'wrong' });
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).not.toBeNull();

      // 清除错误
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle error with custom code', async () => {
      const error = { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' };
      (mockApi.login as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.login({ username: 'testuser', password: 'wrong' });
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toEqual({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    });
  });

  // ========================
  // 获取当前用户测试
  // ========================

  describe('Fetch Me', () => {
    it('should fetch current user when authenticated', async () => {
      const { result } = renderHook(() => useAuth({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先登录
      await act(async () => {
        await result.current.login({ username: 'testuser', password: 'password' });
      });

      // 重置 mock 调用计数
      vi.clearAllMocks();

      // 获取当前用户
      await act(async () => {
        await result.current.fetchMe();
      });

      expect(mockApi.getMe).toHaveBeenCalled();
    });
  });
});
