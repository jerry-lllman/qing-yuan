/**
 * 认证 Store 测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useAuthStore,
  AuthStatus,
  getAccessToken,
  getCurrentUserId,
  checkIsAuthenticated,
} from './auth.store';
import type { User, AuthTokens } from '@qyra/shared';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

// 测试数据
const mockUser: User = {
  id: 'user-123',
  username: 'testuser',
  nickname: 'Test User',
  email: 'test@example.com',
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

describe('useAuthStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useAuthStore.getState().reset();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.status).toBe(AuthStatus.IDLE);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setStatus', () => {
    it('should update status', () => {
      useAuthStore.getState().setStatus(AuthStatus.CHECKING);

      expect(useAuthStore.getState().status).toBe(AuthStatus.CHECKING);
    });
  });

  describe('setUser', () => {
    it('should set user', () => {
      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should clear user when set to null', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setUser(null);

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('setTokens', () => {
    it('should set tokens', () => {
      useAuthStore.getState().setTokens(mockTokens);

      expect(useAuthStore.getState().tokens).toEqual(mockTokens);
    });

    it('should clear tokens when set to null', () => {
      useAuthStore.getState().setTokens(mockTokens);
      useAuthStore.getState().setTokens(null);

      expect(useAuthStore.getState().tokens).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set error', () => {
      const error = { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' };
      useAuthStore.getState().setError(error);

      expect(useAuthStore.getState().error).toEqual(error);
    });

    it('should clear error when set to null', () => {
      const error = { code: 'ERROR', message: 'Some error' };
      useAuthStore.getState().setError(error);
      useAuthStore.getState().setError(null);

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useAuthStore.getState().setLoading(true);

      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });

  describe('loginSuccess', () => {
    it('should set authenticated state with user and tokens', () => {
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().setError({ code: 'PREV_ERROR', message: 'Previous error' });

      useAuthStore.getState().loginSuccess(mockUser, mockTokens);

      const state = useAuthStore.getState();
      expect(state.status).toBe(AuthStatus.AUTHENTICATED);
      expect(state.user).toEqual(mockUser);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear all auth data', () => {
      // 先登录
      useAuthStore.getState().loginSuccess(mockUser, mockTokens);

      // 然后登出
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.status).toBe(AuthStatus.UNAUTHENTICATED);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('refreshTokenSuccess', () => {
    it('should update tokens', () => {
      useAuthStore.getState().loginSuccess(mockUser, mockTokens);

      const newTokens: AuthTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 7200,
      };

      useAuthStore.getState().refreshTokenSuccess(newTokens);

      expect(useAuthStore.getState().tokens).toEqual(newTokens);
      // 用户信息不变
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });
  });

  describe('updateUser', () => {
    it('should update user fields', () => {
      useAuthStore.getState().loginSuccess(mockUser, mockTokens);

      useAuthStore.getState().updateUser({
        nickname: 'Updated Name',
        bio: 'New bio',
      });

      const user = useAuthStore.getState().user;
      expect(user?.nickname).toBe('Updated Name');
      expect(user?.bio).toBe('New bio');
      // 其他字段不变
      expect(user?.username).toBe(mockUser.username);
    });

    it('should do nothing if no user is set', () => {
      useAuthStore.getState().updateUser({ nickname: 'Test' });

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useAuthStore.getState().loginSuccess(mockUser, mockTokens);
      useAuthStore.getState().setError({ code: 'ERROR', message: 'Error' });

      useAuthStore.getState().reset();

      const state = useAuthStore.getState();
      expect(state.status).toBe(AuthStatus.IDLE);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('checkIsAuthenticated (via status)', () => {
    it('should return true when authenticated', () => {
      useAuthStore.getState().loginSuccess(mockUser, mockTokens);

      expect(useAuthStore.getState().status).toBe(AuthStatus.AUTHENTICATED);
    });

    it('should return false when not authenticated', () => {
      expect(useAuthStore.getState().status).toBe(AuthStatus.IDLE);

      useAuthStore.getState().setStatus(AuthStatus.UNAUTHENTICATED);
      expect(useAuthStore.getState().status).toBe(AuthStatus.UNAUTHENTICATED);
    });
  });
});

describe('工具函数', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  describe('getAccessToken', () => {
    it('should return access token when logged in', () => {
      useAuthStore.getState().loginSuccess(mockUser, mockTokens);

      expect(getAccessToken()).toBe(mockTokens.accessToken);
    });

    it('should return null when not logged in', () => {
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('getCurrentUserId', () => {
    it('should return user id when logged in', () => {
      useAuthStore.getState().loginSuccess(mockUser, mockTokens);

      expect(getCurrentUserId()).toBe(mockUser.id);
    });

    it('should return null when not logged in', () => {
      expect(getCurrentUserId()).toBeNull();
    });
  });

  describe('checkIsAuthenticated', () => {
    it('should return true when authenticated', () => {
      useAuthStore.getState().loginSuccess(mockUser, mockTokens);

      expect(checkIsAuthenticated()).toBe(true);
    });

    it('should return false when not authenticated', () => {
      expect(checkIsAuthenticated()).toBe(false);
    });
  });
});
