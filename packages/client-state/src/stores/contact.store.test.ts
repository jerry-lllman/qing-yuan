/**
 * 联系人状态管理测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useContactStore,
  getFriends,
  getFriend,
  isFriend,
  isBlocked,
  getOnlineStatus,
  getPendingRequestCount,
  type BlockedUser,
  type OnlineStatus,
} from './contact.store';
import type { Friend, FriendRequest } from '@qyra/shared';

// ========================
// 测试数据
// ========================

const mockFriend1: Friend = {
  id: 'friend-1',
  userId: 'user-1',
  friendId: 'friend-user-1',
  friend: {
    id: 'friend-user-1',
    username: 'alice',
    nickname: 'Alice',
    avatar: 'https://example.com/alice.jpg',
    status: 'online',
  },
  remark: null,
  createdAt: new Date('2024-01-01'),
};

const mockFriend2: Friend = {
  id: 'friend-2',
  userId: 'user-1',
  friendId: 'friend-user-2',
  friend: {
    id: 'friend-user-2',
    username: 'bob',
    nickname: 'Bob',
    avatar: null,
    status: 'offline',
  },
  remark: '小王',
  createdAt: new Date('2024-01-02'),
};

const mockFriend3: Friend = {
  id: 'friend-3',
  userId: 'user-1',
  friendId: 'friend-user-3',
  friend: {
    id: 'friend-user-3',
    username: 'charlie',
    nickname: 'Charlie',
    avatar: null,
    status: 'away',
  },
  remark: null,
  createdAt: new Date('2024-01-03'),
};

const mockReceivedRequest: FriendRequest = {
  id: 'request-1',
  fromUserId: 'user-2',
  fromUser: {
    id: 'user-2',
    username: 'david',
    nickname: 'David',
    avatar: null,
    status: 'online',
  },
  toUserId: 'user-1',
  toUser: {
    id: 'user-1',
    username: 'me',
    nickname: 'Me',
    avatar: null,
    status: 'online',
  },
  message: '我是你的同学',
  status: 'pending',
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-10'),
};

const mockSentRequest: FriendRequest = {
  id: 'request-2',
  fromUserId: 'user-1',
  fromUser: {
    id: 'user-1',
    username: 'me',
    nickname: 'Me',
    avatar: null,
    status: 'online',
  },
  toUserId: 'user-3',
  toUser: {
    id: 'user-3',
    username: 'eve',
    nickname: 'Eve',
    avatar: null,
    status: 'offline',
  },
  message: '你好，加个好友',
  status: 'pending',
  createdAt: new Date('2024-01-11'),
  updatedAt: new Date('2024-01-11'),
};

const mockBlockedUser: BlockedUser = {
  userId: 'blocked-user-1',
  username: 'spammer',
  nickname: 'Spammer',
  avatar: null,
  blockedAt: new Date('2024-01-15'),
};

// ========================
// 测试套件
// ========================

describe('ContactStore', () => {
  beforeEach(() => {
    useContactStore.getState().reset();
  });

  // ========================
  // 好友列表操作测试
  // ========================

  describe('Friends', () => {
    describe('setFriends', () => {
      it('should set friends list', () => {
        const { setFriends } = useContactStore.getState();

        setFriends([mockFriend1, mockFriend2]);

        const state = useContactStore.getState();
        expect(state.friends).toHaveLength(2);
        expect(state.friends[0]).toEqual(mockFriend1);
        expect(state.friends[1]).toEqual(mockFriend2);
      });

      it('should replace existing friends', () => {
        const { setFriends } = useContactStore.getState();

        setFriends([mockFriend1]);
        setFriends([mockFriend2, mockFriend3]);

        const state = useContactStore.getState();
        expect(state.friends).toHaveLength(2);
        expect(state.friends[0]).toEqual(mockFriend2);
      });
    });

    describe('addFriend', () => {
      it('should add a friend', () => {
        const { addFriend } = useContactStore.getState();

        addFriend(mockFriend1);

        const state = useContactStore.getState();
        expect(state.friends).toHaveLength(1);
        expect(state.friends[0]).toEqual(mockFriend1);
      });

      it('should not add duplicate friend', () => {
        const { addFriend } = useContactStore.getState();

        addFriend(mockFriend1);
        addFriend(mockFriend1);

        const state = useContactStore.getState();
        expect(state.friends).toHaveLength(1);
      });
    });

    describe('removeFriend', () => {
      it('should remove a friend by friendId', () => {
        const { setFriends, removeFriend } = useContactStore.getState();

        setFriends([mockFriend1, mockFriend2]);
        removeFriend(mockFriend1.friendId);

        const state = useContactStore.getState();
        expect(state.friends).toHaveLength(1);
        expect(state.friends[0]).toEqual(mockFriend2);
      });

      it('should do nothing if friend not found', () => {
        const { setFriends, removeFriend } = useContactStore.getState();

        setFriends([mockFriend1]);
        removeFriend('non-existent');

        const state = useContactStore.getState();
        expect(state.friends).toHaveLength(1);
      });
    });

    describe('updateFriendRemark', () => {
      it('should update friend remark', () => {
        const { setFriends, updateFriendRemark } = useContactStore.getState();

        setFriends([mockFriend1]);
        updateFriendRemark(mockFriend1.friendId, '好闺蜜');

        const state = useContactStore.getState();
        expect(state.friends[0]?.remark).toBe('好闺蜜');
      });

      it('should clear remark when set to null', () => {
        const { setFriends, updateFriendRemark } = useContactStore.getState();

        setFriends([mockFriend2]); // mockFriend2 has remark
        updateFriendRemark(mockFriend2.friendId, null);

        const state = useContactStore.getState();
        expect(state.friends[0]?.remark).toBeNull();
      });

      it('should do nothing if friend not found', () => {
        const { setFriends, updateFriendRemark } = useContactStore.getState();

        setFriends([mockFriend1]);
        updateFriendRemark('non-existent', '备注');

        const state = useContactStore.getState();
        expect(state.friends[0]?.remark).toBeNull();
      });
    });
  });

  // ========================
  // 好友请求操作测试
  // ========================

  describe('Friend Requests', () => {
    describe('setReceivedRequests', () => {
      it('should set received requests', () => {
        const { setReceivedRequests } = useContactStore.getState();

        setReceivedRequests([mockReceivedRequest]);

        const state = useContactStore.getState();
        expect(state.receivedRequests).toHaveLength(1);
        expect(state.receivedRequests[0]).toEqual(mockReceivedRequest);
      });
    });

    describe('setSentRequests', () => {
      it('should set sent requests', () => {
        const { setSentRequests } = useContactStore.getState();

        setSentRequests([mockSentRequest]);

        const state = useContactStore.getState();
        expect(state.sentRequests).toHaveLength(1);
        expect(state.sentRequests[0]).toEqual(mockSentRequest);
      });
    });

    describe('addReceivedRequest', () => {
      it('should add received request at the beginning', () => {
        const { setReceivedRequests, addReceivedRequest } = useContactStore.getState();

        const existingRequest: FriendRequest = {
          ...mockReceivedRequest,
          id: 'old-request',
        };
        setReceivedRequests([existingRequest]);

        const newRequest: FriendRequest = {
          ...mockReceivedRequest,
          id: 'new-request',
        };
        addReceivedRequest(newRequest);

        const state = useContactStore.getState();
        expect(state.receivedRequests).toHaveLength(2);
        expect(state.receivedRequests[0]?.id).toBe('new-request');
      });

      it('should not add duplicate request', () => {
        const { addReceivedRequest } = useContactStore.getState();

        addReceivedRequest(mockReceivedRequest);
        addReceivedRequest(mockReceivedRequest);

        const state = useContactStore.getState();
        expect(state.receivedRequests).toHaveLength(1);
      });
    });

    describe('addSentRequest', () => {
      it('should add sent request at the beginning', () => {
        const { addSentRequest } = useContactStore.getState();

        const request1: FriendRequest = { ...mockSentRequest, id: 'sent-1' };
        const request2: FriendRequest = { ...mockSentRequest, id: 'sent-2' };

        addSentRequest(request1);
        addSentRequest(request2);

        const state = useContactStore.getState();
        expect(state.sentRequests).toHaveLength(2);
        expect(state.sentRequests[0]?.id).toBe('sent-2');
      });

      it('should not add duplicate request', () => {
        const { addSentRequest } = useContactStore.getState();

        addSentRequest(mockSentRequest);
        addSentRequest(mockSentRequest);

        const state = useContactStore.getState();
        expect(state.sentRequests).toHaveLength(1);
      });
    });

    describe('updateRequestStatus', () => {
      it('should update received request status', () => {
        const { setReceivedRequests, updateRequestStatus } = useContactStore.getState();

        setReceivedRequests([mockReceivedRequest]);
        updateRequestStatus(mockReceivedRequest.id, 'accepted');

        const state = useContactStore.getState();
        expect(state.receivedRequests[0]?.status).toBe('accepted');
        expect(state.receivedRequests[0]?.updatedAt).not.toEqual(mockReceivedRequest.updatedAt);
      });

      it('should update sent request status', () => {
        const { setSentRequests, updateRequestStatus } = useContactStore.getState();

        setSentRequests([mockSentRequest]);
        updateRequestStatus(mockSentRequest.id, 'rejected');

        const state = useContactStore.getState();
        expect(state.sentRequests[0]?.status).toBe('rejected');
      });

      it('should do nothing if request not found', () => {
        const { setReceivedRequests, updateRequestStatus } = useContactStore.getState();

        setReceivedRequests([mockReceivedRequest]);
        updateRequestStatus('non-existent', 'accepted');

        const state = useContactStore.getState();
        expect(state.receivedRequests[0]?.status).toBe('pending');
      });
    });

    describe('removeRequest', () => {
      it('should remove received request', () => {
        const { setReceivedRequests, removeRequest } = useContactStore.getState();

        setReceivedRequests([mockReceivedRequest]);
        removeRequest(mockReceivedRequest.id);

        const state = useContactStore.getState();
        expect(state.receivedRequests).toHaveLength(0);
      });

      it('should remove sent request', () => {
        const { setSentRequests, removeRequest } = useContactStore.getState();

        setSentRequests([mockSentRequest]);
        removeRequest(mockSentRequest.id);

        const state = useContactStore.getState();
        expect(state.sentRequests).toHaveLength(0);
      });

      it('should do nothing if request not found', () => {
        const { setReceivedRequests, removeRequest } = useContactStore.getState();

        setReceivedRequests([mockReceivedRequest]);
        removeRequest('non-existent');

        const state = useContactStore.getState();
        expect(state.receivedRequests).toHaveLength(1);
      });
    });
  });

  // ========================
  // 黑名单操作测试
  // ========================

  describe('Blocked Users', () => {
    describe('setBlockedUsers', () => {
      it('should set blocked users', () => {
        const { setBlockedUsers } = useContactStore.getState();

        setBlockedUsers([mockBlockedUser]);

        const state = useContactStore.getState();
        expect(state.blockedUsers).toHaveLength(1);
        expect(state.blockedUsers[0]).toEqual(mockBlockedUser);
      });
    });

    describe('blockUser', () => {
      it('should block a user', () => {
        const { blockUser } = useContactStore.getState();

        blockUser(mockBlockedUser);

        const state = useContactStore.getState();
        expect(state.blockedUsers).toHaveLength(1);
        expect(state.blockedUsers[0]).toEqual(mockBlockedUser);
      });

      it('should not add duplicate blocked user', () => {
        const { blockUser } = useContactStore.getState();

        blockUser(mockBlockedUser);
        blockUser(mockBlockedUser);

        const state = useContactStore.getState();
        expect(state.blockedUsers).toHaveLength(1);
      });
    });

    describe('unblockUser', () => {
      it('should unblock a user', () => {
        const { setBlockedUsers, unblockUser } = useContactStore.getState();

        setBlockedUsers([mockBlockedUser]);
        unblockUser(mockBlockedUser.userId);

        const state = useContactStore.getState();
        expect(state.blockedUsers).toHaveLength(0);
      });

      it('should do nothing if user not blocked', () => {
        const { setBlockedUsers, unblockUser } = useContactStore.getState();

        setBlockedUsers([mockBlockedUser]);
        unblockUser('non-existent');

        const state = useContactStore.getState();
        expect(state.blockedUsers).toHaveLength(1);
      });
    });

    describe('isBlocked', () => {
      it('should return true if user is blocked', () => {
        const { setBlockedUsers, isBlocked } = useContactStore.getState();

        setBlockedUsers([mockBlockedUser]);

        expect(isBlocked(mockBlockedUser.userId)).toBe(true);
      });

      it('should return false if user is not blocked', () => {
        const { isBlocked } = useContactStore.getState();

        expect(isBlocked('non-existent')).toBe(false);
      });
    });
  });

  // ========================
  // 在线状态操作测试
  // ========================

  describe('Online Status', () => {
    const mockOnlineStatus: OnlineStatus = {
      userId: 'friend-user-1',
      status: 'online',
      lastSeenAt: new Date(),
    };

    describe('setOnlineStatus', () => {
      it('should set user online status', () => {
        const { setOnlineStatus } = useContactStore.getState();

        setOnlineStatus(mockOnlineStatus);

        const state = useContactStore.getState();
        expect(state.onlineStatuses.get(mockOnlineStatus.userId)).toEqual(mockOnlineStatus);
      });

      it('should update existing status', () => {
        const { setOnlineStatus } = useContactStore.getState();

        setOnlineStatus(mockOnlineStatus);
        const updatedStatus: OnlineStatus = { ...mockOnlineStatus, status: 'away' };
        setOnlineStatus(updatedStatus);

        const state = useContactStore.getState();
        expect(state.onlineStatuses.get(mockOnlineStatus.userId)?.status).toBe('away');
      });
    });

    describe('setOnlineStatuses', () => {
      it('should set multiple online statuses', () => {
        const { setOnlineStatuses } = useContactStore.getState();

        const statuses: OnlineStatus[] = [
          { userId: 'user-1', status: 'online' },
          { userId: 'user-2', status: 'offline' },
          { userId: 'user-3', status: 'away' },
        ];

        setOnlineStatuses(statuses);

        const state = useContactStore.getState();
        expect(state.onlineStatuses.size).toBe(3);
        expect(state.onlineStatuses.get('user-1')?.status).toBe('online');
        expect(state.onlineStatuses.get('user-2')?.status).toBe('offline');
        expect(state.onlineStatuses.get('user-3')?.status).toBe('away');
      });
    });

    describe('getOnlineStatus', () => {
      it('should get user online status', () => {
        const { setOnlineStatus, getOnlineStatus } = useContactStore.getState();

        setOnlineStatus(mockOnlineStatus);

        expect(getOnlineStatus(mockOnlineStatus.userId)).toEqual(mockOnlineStatus);
      });

      it('should return undefined if status not found', () => {
        const { getOnlineStatus } = useContactStore.getState();

        expect(getOnlineStatus('non-existent')).toBeUndefined();
      });
    });

    describe('clearOnlineStatuses', () => {
      it('should clear all online statuses', () => {
        const { setOnlineStatus, clearOnlineStatuses } = useContactStore.getState();

        setOnlineStatus(mockOnlineStatus);
        clearOnlineStatuses();

        const state = useContactStore.getState();
        expect(state.onlineStatuses.size).toBe(0);
      });
    });
  });

  // ========================
  // 加载状态测试
  // ========================

  describe('Loading States', () => {
    describe('setLoadingFriends', () => {
      it('should set loading friends state', () => {
        const { setLoadingFriends } = useContactStore.getState();

        setLoadingFriends(true);
        expect(useContactStore.getState().isLoadingFriends).toBe(true);

        setLoadingFriends(false);
        expect(useContactStore.getState().isLoadingFriends).toBe(false);
      });
    });

    describe('setLoadingRequests', () => {
      it('should set loading requests state', () => {
        const { setLoadingRequests } = useContactStore.getState();

        setLoadingRequests(true);
        expect(useContactStore.getState().isLoadingRequests).toBe(true);

        setLoadingRequests(false);
        expect(useContactStore.getState().isLoadingRequests).toBe(false);
      });
    });
  });

  // ========================
  // Reset 测试
  // ========================

  describe('reset', () => {
    it('should reset all state to initial', () => {
      const state = useContactStore.getState();

      // 设置一些数据
      state.setFriends([mockFriend1, mockFriend2]);
      state.setReceivedRequests([mockReceivedRequest]);
      state.setSentRequests([mockSentRequest]);
      state.setBlockedUsers([mockBlockedUser]);
      state.setOnlineStatus({ userId: 'test', status: 'online' });
      state.setLoadingFriends(true);
      state.setLoadingRequests(true);

      // 重置
      state.reset();

      const resetState = useContactStore.getState();
      expect(resetState.friends).toHaveLength(0);
      expect(resetState.receivedRequests).toHaveLength(0);
      expect(resetState.sentRequests).toHaveLength(0);
      expect(resetState.blockedUsers).toHaveLength(0);
      expect(resetState.onlineStatuses.size).toBe(0);
      expect(resetState.isLoadingFriends).toBe(false);
      expect(resetState.isLoadingRequests).toBe(false);
    });
  });

  // ========================
  // 工具函数测试
  // ========================
  // 注意: Selector Hooks (useFriends, useReceivedRequests 等) 是 React Hooks,
  // 需要在 React 组件或测试环境中使用 @testing-library/react 进行测试

  describe('Utility Functions', () => {
    it('getFriends should return friends list', () => {
      useContactStore.getState().setFriends([mockFriend1, mockFriend2]);
      expect(getFriends()).toHaveLength(2);
    });

    it('getFriend should return friend by friendId', () => {
      useContactStore.getState().setFriends([mockFriend1, mockFriend2]);
      expect(getFriend(mockFriend1.friendId)).toEqual(mockFriend1);
      expect(getFriend('non-existent')).toBeUndefined();
    });

    it('isFriend should check if user is friend', () => {
      useContactStore.getState().setFriends([mockFriend1]);
      expect(isFriend(mockFriend1.friendId)).toBe(true);
      expect(isFriend('non-existent')).toBe(false);
    });

    it('isBlocked should check if user is blocked', () => {
      useContactStore.getState().setBlockedUsers([mockBlockedUser]);
      expect(isBlocked(mockBlockedUser.userId)).toBe(true);
      expect(isBlocked('non-existent')).toBe(false);
    });

    it('getOnlineStatus should return user online status', () => {
      const status: OnlineStatus = { userId: 'test', status: 'online' };
      useContactStore.getState().setOnlineStatus(status);
      expect(getOnlineStatus('test')).toEqual(status);
      expect(getOnlineStatus('non-existent')).toBeUndefined();
    });

    it('getPendingRequestCount should return pending count', () => {
      const accepted: FriendRequest = { ...mockReceivedRequest, id: 'r2', status: 'accepted' };
      const rejected: FriendRequest = { ...mockReceivedRequest, id: 'r3', status: 'rejected' };
      useContactStore.getState().setReceivedRequests([mockReceivedRequest, accepted, rejected]);
      expect(getPendingRequestCount()).toBe(1);
    });
  });
});
