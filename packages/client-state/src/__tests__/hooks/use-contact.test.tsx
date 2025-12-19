/**
 * useContact Hook 单元测试
 */

import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useContact,
  useFriend,
  useIsFriend,
  useIsBlocked,
  useOnlineStatus,
  usePendingRequestCount,
  type ContactApi,
} from '../../hooks/use-contact';
import { useContactStore, type BlockedUser, type OnlineStatus } from '../../stores/contact.store';
import type { Friend, FriendRequest, UserBrief } from '@qyra/shared';

// ========================
// Mock 数据
// ========================

const mockUserBrief: UserBrief = {
  id: 'user-2',
  username: 'user2',
  nickname: 'User 2',
  avatar: null,
  status: 'online',
};

const mockFriend: Friend = {
  id: 'friend-1',
  userId: 'user-1',
  friendId: 'user-2',
  friend: mockUserBrief,
  remark: null,
  createdAt: new Date('2024-01-01'),
};

const mockFriend2: Friend = {
  id: 'friend-2',
  userId: 'user-1',
  friendId: 'user-3',
  friend: { ...mockUserBrief, id: 'user-3', username: 'user3', nickname: 'User 3' },
  remark: 'My friend',
  createdAt: new Date('2024-01-02'),
};

const mockFriends = [mockFriend, mockFriend2];

const mockReceivedRequest: FriendRequest = {
  id: 'request-1',
  fromUserId: 'user-4',
  toUserId: 'user-1',
  fromUser: { ...mockUserBrief, id: 'user-4', username: 'user4', nickname: 'User 4' },
  toUser: { ...mockUserBrief, id: 'user-1', username: 'user1', nickname: 'User 1' },
  message: "Hi, let's be friends!",
  status: 'pending',
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-10'),
};

const mockSentRequest: FriendRequest = {
  id: 'request-2',
  fromUserId: 'user-1',
  toUserId: 'user-5',
  fromUser: { ...mockUserBrief, id: 'user-1', username: 'user1', nickname: 'User 1' },
  toUser: { ...mockUserBrief, id: 'user-5', username: 'user5', nickname: 'User 5' },
  message: 'Hello!',
  status: 'pending',
  createdAt: new Date('2024-01-11'),
  updatedAt: new Date('2024-01-11'),
};

const mockBlockedUser: BlockedUser = {
  userId: 'user-6',
  username: 'user6',
  nickname: 'Blocked User',
  avatar: null,
  blockedAt: new Date('2024-01-05'),
};

// ========================
// Mock API
// ========================

const createMockApi = (): ContactApi => ({
  getFriends: vi.fn().mockResolvedValue(mockFriends),
  sendFriendRequest: vi.fn().mockResolvedValue(mockSentRequest),
  acceptFriendRequest: vi.fn().mockResolvedValue(mockFriend),
  rejectFriendRequest: vi.fn().mockResolvedValue(undefined),
  deleteFriend: vi.fn().mockResolvedValue(undefined),
  updateFriendRemark: vi.fn().mockResolvedValue(undefined),
  getReceivedRequests: vi.fn().mockResolvedValue([mockReceivedRequest]),
  getSentRequests: vi.fn().mockResolvedValue([mockSentRequest]),
  blockUser: vi.fn().mockResolvedValue(mockBlockedUser),
  unblockUser: vi.fn().mockResolvedValue(undefined),
  getBlockedUsers: vi.fn().mockResolvedValue([mockBlockedUser]),
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

describe('useContact', () => {
  let mockApi: ContactApi;

  beforeEach(() => {
    useContactStore.getState().reset();
    mockApi = createMockApi();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================
  // 初始状态测试
  // ========================

  describe('Initial State', () => {
    it('should return initial state', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 等待初始 query 完成
      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      expect(result.current.pendingRequestCount).toBeGreaterThanOrEqual(0);
    });

    it('should have all mutation states as false initially', () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSendingRequest).toBe(false);
      expect(result.current.isProcessingRequest).toBe(false);
      expect(result.current.isDeletingFriend).toBe(false);
    });
  });

  // ========================
  // 好友列表测试
  // ========================

  describe('Friends List', () => {
    it('should fetch friends successfully', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      expect(mockApi.getFriends).toHaveBeenCalled();
      expect(result.current.friends).toHaveLength(2);
    });

    it('should check if user is friend', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      expect(result.current.isFriend('user-2')).toBe(true);
      expect(result.current.isFriend('user-999')).toBe(false);
    });

    it('should get friend by id', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      const friend = result.current.getFriend('user-2');
      expect(friend).toBeDefined();
      expect(friend?.friendId).toBe('user-2');
    });
  });

  // ========================
  // 好友请求测试
  // ========================

  describe('Friend Requests', () => {
    it('should fetch received requests', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingRequests).toBe(false);
      });

      expect(mockApi.getReceivedRequests).toHaveBeenCalled();
      expect(result.current.receivedRequests).toHaveLength(1);
    });

    it('should send friend request', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      await act(async () => {
        await result.current.sendFriendRequest('user-new', 'Hi!');
      });

      expect(mockApi.sendFriendRequest).toHaveBeenCalledWith('user-new', 'Hi!');
    });

    it('should accept friend request', async () => {
      const onAcceptSuccess = vi.fn();
      const { result } = renderHook(() => useContact({ api: mockApi, onAcceptSuccess }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      await act(async () => {
        await result.current.acceptFriendRequest('request-1');
      });

      expect(mockApi.acceptFriendRequest).toHaveBeenCalledWith('request-1');
      expect(onAcceptSuccess).toHaveBeenCalled();
    });

    it('should reject friend request', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      await act(async () => {
        await result.current.rejectFriendRequest('request-1');
      });

      expect(mockApi.rejectFriendRequest).toHaveBeenCalledWith('request-1');
    });

    it('should count pending requests', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingRequests).toBe(false);
      });

      expect(result.current.pendingRequestCount).toBe(1);
    });
  });

  // ========================
  // 删除好友测试
  // ========================

  describe('Delete Friend', () => {
    it('should delete friend successfully', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      expect(result.current.friends).toHaveLength(2);

      await act(async () => {
        await result.current.deleteFriend('user-2');
      });

      expect(mockApi.deleteFriend).toHaveBeenCalledWith('user-2');
      expect(result.current.friends).toHaveLength(1);
    });
  });

  // ========================
  // 更新备注测试
  // ========================

  describe('Update Remark', () => {
    it('should update friend remark', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      await act(async () => {
        await result.current.updateFriendRemark('user-2', 'Best friend');
      });

      expect(mockApi.updateFriendRemark).toHaveBeenCalledWith('user-2', 'Best friend');
    });
  });

  // ========================
  // 黑名单测试
  // ========================

  describe('Block User', () => {
    it('should fetch blocked users', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      expect(mockApi.getBlockedUsers).toHaveBeenCalled();
      expect(result.current.blockedUsers).toHaveLength(1);
    });

    it('should block user', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      await act(async () => {
        await result.current.blockUser('user-new');
      });

      expect(mockApi.blockUser).toHaveBeenCalledWith('user-new');
    });

    it('should unblock user', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      await act(async () => {
        await result.current.unblockUser('user-6');
      });

      expect(mockApi.unblockUser).toHaveBeenCalledWith('user-6');
    });

    it('should check if user is blocked', async () => {
      const { result } = renderHook(() => useContact({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingFriends).toBe(false);
      });

      expect(result.current.isBlocked('user-6')).toBe(true);
      expect(result.current.isBlocked('user-999')).toBe(false);
    });
  });
});

// ========================
// 辅助 Hooks 测试
// ========================

describe('useFriend', () => {
  beforeEach(() => {
    useContactStore.getState().reset();
  });

  it('should return undefined for null friendId', () => {
    const { result } = renderHook(() => useFriend(null));
    expect(result.current).toBeUndefined();
  });

  it('should return undefined for non-existent friend', () => {
    const { result } = renderHook(() => useFriend('non-existent'));
    expect(result.current).toBeUndefined();
  });

  it('should return friend when exists', () => {
    act(() => {
      useContactStore.getState().setFriends([mockFriend]);
    });

    const { result } = renderHook(() => useFriend('user-2'));
    expect(result.current).toEqual(mockFriend);
  });
});

describe('useIsFriend', () => {
  beforeEach(() => {
    useContactStore.getState().reset();
  });

  it('should return false when not a friend', () => {
    const { result } = renderHook(() => useIsFriend('user-999'));
    expect(result.current).toBe(false);
  });

  it('should return true when is a friend', () => {
    act(() => {
      useContactStore.getState().setFriends([mockFriend]);
    });

    const { result } = renderHook(() => useIsFriend('user-2'));
    expect(result.current).toBe(true);
  });
});

describe('useIsBlocked', () => {
  beforeEach(() => {
    useContactStore.getState().reset();
  });

  it('should return false when not blocked', () => {
    const { result } = renderHook(() => useIsBlocked('user-999'));
    expect(result.current).toBe(false);
  });

  it('should return true when blocked', () => {
    act(() => {
      useContactStore.getState().setBlockedUsers([mockBlockedUser]);
    });

    const { result } = renderHook(() => useIsBlocked('user-6'));
    expect(result.current).toBe(true);
  });
});

describe('useOnlineStatus', () => {
  beforeEach(() => {
    useContactStore.getState().reset();
  });

  it('should return undefined when no status', () => {
    const { result } = renderHook(() => useOnlineStatus('user-1'));
    expect(result.current).toBeUndefined();
  });

  it('should return status when exists', () => {
    const status: OnlineStatus = {
      userId: 'user-1',
      status: 'online',
      lastSeenAt: new Date(),
    };

    act(() => {
      useContactStore.getState().setOnlineStatus(status);
    });

    const { result } = renderHook(() => useOnlineStatus('user-1'));
    expect(result.current?.status).toBe('online');
  });
});

describe('usePendingRequestCount', () => {
  beforeEach(() => {
    useContactStore.getState().reset();
  });

  it('should return 0 when no pending requests', () => {
    const { result } = renderHook(() => usePendingRequestCount());
    expect(result.current).toBe(0);
  });

  it('should count pending requests only', () => {
    const pendingRequest: FriendRequest = {
      ...mockReceivedRequest,
      id: 'pending-1',
      status: 'pending',
    };

    const acceptedRequest: FriendRequest = {
      ...mockReceivedRequest,
      id: 'accepted-1',
      status: 'accepted',
    };

    act(() => {
      useContactStore.getState().setReceivedRequests([pendingRequest, acceptedRequest]);
    });

    const { result } = renderHook(() => usePendingRequestCount());
    expect(result.current).toBe(1);
  });
});
