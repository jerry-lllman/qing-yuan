/**
 * 联系人状态管理
 * 负责好友列表、好友请求、黑名单、在线状态等
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Friend, FriendRequest, FriendRequestStatus, UserStatus } from '@qing-yuan/shared';

// 启用 immer 的 Map/Set 支持
enableMapSet();

// ========================
// 类型定义
// ========================

/** 黑名单项 */
export interface BlockedUser {
  /** 用户 ID */
  userId: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 头像 */
  avatar: string | null;
  /** 拉黑时间 */
  blockedAt: Date;
}

/** 在线状态信息 */
export interface OnlineStatus {
  /** 用户 ID */
  userId: string;
  /** 在线状态 */
  status: UserStatus;
  /** 最后在线时间 */
  lastSeenAt?: Date;
}

/** 联系人状态 */
export interface ContactState {
  // ========== 状态 ==========
  /** 好友列表 */
  friends: Friend[];
  /** 收到的好友请求 */
  receivedRequests: FriendRequest[];
  /** 发出的好友请求 */
  sentRequests: FriendRequest[];
  /** 黑名单 */
  blockedUsers: BlockedUser[];
  /** 在线状态（按用户 ID） */
  onlineStatuses: Map<string, OnlineStatus>;
  /** 是否正在加载好友列表 */
  isLoadingFriends: boolean;
  /** 是否正在加载请求列表 */
  isLoadingRequests: boolean;

  // ========== 好友列表操作 ==========
  /** 设置好友列表 */
  setFriends: (friends: Friend[]) => void;
  /** 添加好友 */
  addFriend: (friend: Friend) => void;
  /** 移除好友 */
  removeFriend: (friendId: string) => void;
  /** 更新好友备注 */
  updateFriendRemark: (friendId: string, remark: string | null) => void;

  // ========== 好友请求操作 ==========
  /** 设置收到的好友请求 */
  setReceivedRequests: (requests: FriendRequest[]) => void;
  /** 设置发出的好友请求 */
  setSentRequests: (requests: FriendRequest[]) => void;
  /** 添加收到的好友请求 */
  addReceivedRequest: (request: FriendRequest) => void;
  /** 添加发出的好友请求 */
  addSentRequest: (request: FriendRequest) => void;
  /** 更新好友请求状态 */
  updateRequestStatus: (requestId: string, status: FriendRequestStatus) => void;
  /** 移除好友请求 */
  removeRequest: (requestId: string) => void;

  // ========== 黑名单操作 ==========
  /** 设置黑名单 */
  setBlockedUsers: (users: BlockedUser[]) => void;
  /** 拉黑用户 */
  blockUser: (user: BlockedUser) => void;
  /** 取消拉黑 */
  unblockUser: (userId: string) => void;
  /** 检查是否已拉黑 */
  isBlocked: (userId: string) => boolean;

  // ========== 在线状态操作 ==========
  /** 设置用户在线状态 */
  setOnlineStatus: (status: OnlineStatus) => void;
  /** 批量设置在线状态 */
  setOnlineStatuses: (statuses: OnlineStatus[]) => void;
  /** 获取用户在线状态 */
  getOnlineStatus: (userId: string) => OnlineStatus | undefined;
  /** 清除在线状态 */
  clearOnlineStatuses: () => void;

  // ========== 加载状态 ==========
  /** 设置好友列表加载状态 */
  setLoadingFriends: (loading: boolean) => void;
  /** 设置请求列表加载状态 */
  setLoadingRequests: (loading: boolean) => void;

  // ========== 重置 ==========
  /** 重置状态 */
  reset: () => void;
}

// ========================
// 初始状态
// ========================

const initialState: Pick<
  ContactState,
  | 'friends'
  | 'receivedRequests'
  | 'sentRequests'
  | 'blockedUsers'
  | 'onlineStatuses'
  | 'isLoadingFriends'
  | 'isLoadingRequests'
> = {
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  blockedUsers: [],
  onlineStatuses: new Map(),
  isLoadingFriends: false,
  isLoadingRequests: false,
};

// ========================
// Store 实现
// ========================

/**
 * 联系人 Store
 *
 * 好友列表和黑名单需要持久化
 * 在线状态不需要持久化（实时获取）
 */
export const useContactStore = create<ContactState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // ========== 初始状态 ==========
        ...initialState,

        // ========== 好友列表操作 ==========
        setFriends: (friends) =>
          set((state: ContactState) => {
            state.friends = friends;
          }),

        addFriend: (friend) =>
          set((state: ContactState) => {
            // 检查是否已存在
            const exists = state.friends.some((f) => f.id === friend.id);
            if (!exists) {
              state.friends.push(friend);
            }
          }),

        removeFriend: (friendId) =>
          set((state: ContactState) => {
            const index = state.friends.findIndex((f) => f.friendId === friendId);
            if (index !== -1) {
              state.friends.splice(index, 1);
            }
          }),

        updateFriendRemark: (friendId, remark) =>
          set((state: ContactState) => {
            const friend = state.friends.find((f) => f.friendId === friendId);
            if (friend) {
              friend.remark = remark;
            }
          }),

        // ========== 好友请求操作 ==========
        setReceivedRequests: (requests) =>
          set((state: ContactState) => {
            state.receivedRequests = requests;
          }),

        setSentRequests: (requests) =>
          set((state: ContactState) => {
            state.sentRequests = requests;
          }),

        addReceivedRequest: (request) =>
          set((state: ContactState) => {
            // 检查是否已存在
            const exists = state.receivedRequests.some((r) => r.id === request.id);
            if (!exists) {
              state.receivedRequests.unshift(request); // 新请求放最前面
            }
          }),

        addSentRequest: (request) =>
          set((state: ContactState) => {
            // 检查是否已存在
            const exists = state.sentRequests.some((r) => r.id === request.id);
            if (!exists) {
              state.sentRequests.unshift(request);
            }
          }),

        updateRequestStatus: (requestId, status) =>
          set((state: ContactState) => {
            // 在收到的请求中查找
            const receivedRequest = state.receivedRequests.find((r) => r.id === requestId);
            if (receivedRequest) {
              receivedRequest.status = status;
              receivedRequest.updatedAt = new Date();
              return;
            }

            // 在发出的请求中查找
            const sentRequest = state.sentRequests.find((r) => r.id === requestId);
            if (sentRequest) {
              sentRequest.status = status;
              sentRequest.updatedAt = new Date();
            }
          }),

        removeRequest: (requestId) =>
          set((state: ContactState) => {
            // 从收到的请求中移除
            const receivedIndex = state.receivedRequests.findIndex((r) => r.id === requestId);
            if (receivedIndex !== -1) {
              state.receivedRequests.splice(receivedIndex, 1);
              return;
            }

            // 从发出的请求中移除
            const sentIndex = state.sentRequests.findIndex((r) => r.id === requestId);
            if (sentIndex !== -1) {
              state.sentRequests.splice(sentIndex, 1);
            }
          }),

        // ========== 黑名单操作 ==========
        setBlockedUsers: (users) =>
          set((state: ContactState) => {
            state.blockedUsers = users;
          }),

        blockUser: (user) =>
          set((state: ContactState) => {
            // 检查是否已拉黑
            const exists = state.blockedUsers.some((u) => u.userId === user.userId);
            if (!exists) {
              state.blockedUsers.push(user);
            }
          }),

        unblockUser: (userId) =>
          set((state: ContactState) => {
            const index = state.blockedUsers.findIndex((u) => u.userId === userId);
            if (index !== -1) {
              state.blockedUsers.splice(index, 1);
            }
          }),

        isBlocked: (userId) => {
          return get().blockedUsers.some((u) => u.userId === userId);
        },

        // ========== 在线状态操作 ==========
        setOnlineStatus: (status) =>
          set((state: ContactState) => {
            state.onlineStatuses.set(status.userId, status);
          }),

        setOnlineStatuses: (statuses) =>
          set((state: ContactState) => {
            for (const status of statuses) {
              state.onlineStatuses.set(status.userId, status);
            }
          }),

        getOnlineStatus: (userId) => {
          return get().onlineStatuses.get(userId);
        },

        clearOnlineStatuses: () =>
          set((state: ContactState) => {
            state.onlineStatuses.clear();
          }),

        // ========== 加载状态 ==========
        setLoadingFriends: (loading) =>
          set((state: ContactState) => {
            state.isLoadingFriends = loading;
          }),

        setLoadingRequests: (loading) =>
          set((state: ContactState) => {
            state.isLoadingRequests = loading;
          }),

        // ========== 重置 ==========
        reset: () => set(() => initialState),
      })),
      {
        name: 'contact-storage',
        // 只持久化部分数据
        partialize: (state) => ({
          friends: state.friends,
          blockedUsers: state.blockedUsers,
        }),
      }
    ),
    { name: 'ContactStore' }
  )
);

// ========================
// 工具函数（非 React 环境）
// ========================

/**
 * 获取好友列表
 */
export function getFriends(): Friend[] {
  return useContactStore.getState().friends;
}

/**
 * 获取好友
 */
export function getFriend(friendId: string): Friend | undefined {
  return useContactStore.getState().friends.find((f) => f.friendId === friendId);
}

/**
 * 检查是否是好友
 */
export function isFriend(userId: string): boolean {
  return useContactStore.getState().friends.some((f) => f.friendId === userId);
}

/**
 * 检查是否已拉黑
 */
export function isBlocked(userId: string): boolean {
  return useContactStore.getState().blockedUsers.some((u) => u.userId === userId);
}

/**
 * 获取用户在线状态
 */
export function getOnlineStatus(userId: string): OnlineStatus | undefined {
  return useContactStore.getState().onlineStatuses.get(userId);
}

/**
 * 获取待处理请求数量
 */
export function getPendingRequestCount(): number {
  return useContactStore.getState().receivedRequests.filter((r) => r.status === 'pending').length;
}
