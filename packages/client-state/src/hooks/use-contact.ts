/**
 * useContact Hook
 * 联系人相关的组合 Hook，整合 contact.store 和 TanStack Query
 *
 * 功能：
 * - 好友列表管理
 * - 好友请求处理
 * - 黑名单管理
 * - 在线状态
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import type { Friend, FriendRequest } from '@qyra/shared';
import { useContactStore, type BlockedUser, type OnlineStatus } from '../stores/contact.store';
import { contactKeys } from '../queries/keys';

// ========================
// 类型定义
// ========================

/** 联系人 API 接口（由使用方注入） */
export interface ContactApi {
  /** 获取好友列表 */
  getFriends: () => Promise<Friend[]>;
  /** 发送好友请求 */
  sendFriendRequest: (userId: string, message?: string) => Promise<FriendRequest>;
  /** 接受好友请求 */
  acceptFriendRequest: (requestId: string) => Promise<Friend>;
  /** 拒绝好友请求 */
  rejectFriendRequest: (requestId: string) => Promise<void>;
  /** 删除好友 */
  deleteFriend: (friendId: string) => Promise<void>;
  /** 更新好友备注 */
  updateFriendRemark: (friendId: string, remark: string | null) => Promise<void>;
  /** 获取收到的好友请求 */
  getReceivedRequests: () => Promise<FriendRequest[]>;
  /** 获取发出的好友请求 */
  getSentRequests: () => Promise<FriendRequest[]>;
  /** 拉黑用户 */
  // blockUser: (userId: string) => Promise<BlockedUser>;
  /** 取消拉黑 */
  unblockUser: (userId: string) => Promise<void>;
  /** 获取黑名单 */
  // getBlockedUsers: () => Promise<BlockedUser[]>;
}

/** useContact Hook 配置 */
export interface UseContactOptions {
  /** 联系人 API 实现 */
  api: ContactApi;
  /** 好友请求接受成功回调 */
  // onAcceptSuccess?: (friend: Friend) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/** useContact Hook 返回值 */
export interface UseContactReturn {
  // ========== 状态 ==========
  /** 好友列表 */
  friends: Friend[];
  /** 收到的好友请求 */
  receivedRequests: FriendRequest[];
  /** 发出的好友请求 */
  sentRequests: FriendRequest[];
  /** 待处理的好友请求数量 */
  pendingRequestCount: number;
  /** 黑名单 */
  blockedUsers: BlockedUser[];
  /** 在线状态 Map */
  onlineStatuses: Map<string, OnlineStatus>;

  // ========== 操作 ==========
  /** 刷新好友列表 */
  fetchFriends: () => Promise<void>;
  /** 刷新好友请求 */
  fetchRequests: () => Promise<void>;
  /** 刷新黑名单 */
  // fetchBlockedUsers: () => Promise<void>;
  /** 发送好友请求 */
  sendFriendRequest: (userId: string, message?: string) => Promise<FriendRequest>;
  /** 接受好友请求 */
  acceptFriendRequest: (requestId: string) => Promise<void>;
  /** 拒绝好友请求 */
  rejectFriendRequest: (requestId: string) => Promise<void>;
  /** 删除好友 */
  deleteFriend: (friendId: string) => Promise<void>;
  /** 更新好友备注 */
  updateFriendRemark: (friendId: string, remark: string | null) => Promise<void>;
  /** 拉黑用户 */
  // blockUser: (userId: string) => Promise<void>;
  /** 取消拉黑 */
  unblockUser: (userId: string) => Promise<void>;

  // ========== 查询方法 ==========
  /** 检查是否是好友 */
  isFriend: (userId: string) => boolean;
  /** 检查是否已拉黑 */
  isBlocked: (userId: string) => boolean;
  /** 获取好友信息 */
  getFriend: (friendId: string) => Friend | undefined;
  /** 获取用户在线状态 */
  getOnlineStatus: (userId: string) => OnlineStatus | undefined;

  // ========== 状态标志 ==========
  /** 是否正在加载好友列表 */
  isLoadingFriends: boolean;
  /** 是否正在加载请求列表 */
  isLoadingRequests: boolean;
  /** 是否正在发送好友请求 */
  isSendingRequest: boolean;
  /** 是否正在处理好友请求 */
  isProcessingRequest: boolean;
  /** 是否正在删除好友 */
  isDeletingFriend: boolean;
  /** 好友列表加载错误 */
  friendsError: Error | null;
  /** 请求列表加载错误 */
  requestsError: Error | null;
}

// ========================
// Hook 实现
// ========================

/**
 * 联系人 Hook
 *
 * @example
 * ```tsx
 * const {
 *   friends,
 *   receivedRequests,
 *   pendingRequestCount,
 *   sendFriendRequest,
 *   acceptFriendRequest,
 * } = useContact({ api: contactApi });
 *
 * // 发送好友请求
 * await sendFriendRequest('user-123', 'Hi, let\'s be friends!');
 *
 * // 接受好友请求
 * await acceptFriendRequest('request-456');
 * ```
 */
export function useContact(options: UseContactOptions): UseContactReturn {
  const {
    api,
    //  onAcceptSuccess,
    onError,
  } = options;

  // ========== Store State ==========
  const {
    friends,
    receivedRequests,
    sentRequests,
    blockedUsers,
    onlineStatuses,
    isLoadingFriends,
    isLoadingRequests,
  } = useContactStore(
    useShallow((state) => ({
      friends: state.friends,
      receivedRequests: state.receivedRequests,
      sentRequests: state.sentRequests,
      blockedUsers: state.blockedUsers,
      onlineStatuses: state.onlineStatuses,
      isLoadingFriends: state.isLoadingFriends,
      isLoadingRequests: state.isLoadingRequests,
    }))
  );

  // Store Actions
  const {
    setFriends,
    addFriend,
    removeFriend,
    updateFriendRemark: storeUpdateRemark,
    setReceivedRequests,
    setSentRequests,
    addSentRequest,
    updateRequestStatus,
    removeRequest,
    // setBlockedUsers,
    // blockUser: storeBlockUser,
    unblockUser: storeUnblockUser,
    setLoadingFriends,
    setLoadingRequests,
  } = useContactStore();

  // ========== 派生状态 ==========
  const pendingRequestCount = useMemo(
    () => receivedRequests.filter((r) => r.status === 'pending').length,
    [receivedRequests]
  );

  // ========== 错误处理 ==========
  const handleError = useCallback(
    (err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      // throw error;
    },
    [onError]
  );

  // ========== 好友列表 Query ==========
  const friendsQuery = useQuery({
    queryKey: contactKeys.list(),
    queryFn: async () => {
      setLoadingFriends(true);
      try {
        const data = await api.getFriends();
        setFriends(data);
        return data;
      } finally {
        setLoadingFriends(false);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 分钟
  });

  // ========== 收到的请求 Query ==========
  const receivedRequestsQuery = useQuery({
    queryKey: contactKeys.receivedRequests(),
    queryFn: async () => {
      setLoadingRequests(true);
      try {
        const data = await api.getReceivedRequests();
        setReceivedRequests(data);
        return data;
      } finally {
        setLoadingRequests(false);
      }
    },
    staleTime: 1000 * 60, // 1 分钟
  });

  // ========== 发出的请求 Query ==========
  const sentRequestsQuery = useQuery({
    queryKey: contactKeys.sentRequests(),
    queryFn: async () => {
      const data = await api.getSentRequests();
      setSentRequests(data);
      return data;
    },
    staleTime: 1000 * 60, // 1 分钟
  });

  // ========== 黑名单 Query ==========
  // const blockedUsersQuery = useQuery({
  //   queryKey: contactKeys.list({ status: 'blocked' }),
  //   queryFn: async () => {
  //     const data = await api.getBlockedUsers();
  //     setBlockedUsers(data);
  //     return data;
  //   },
  //   staleTime: 1000 * 60 * 10, // 10 分钟
  // });

  // ========== 发送好友请求 Mutation ==========
  const sendRequestMutation = useMutation({
    mutationFn: ({ userId, message }: { userId: string; message?: string }) =>
      api.sendFriendRequest(userId, message),
    onSuccess: (request) => {
      addSentRequest(request);
    },
    onError: handleError,
  });

  // ========== 接受好友请求 Mutation ==========
  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => api.acceptFriendRequest(requestId),
    onSuccess: (friend, requestId) => {
      addFriend(friend);
      removeRequest(requestId);
      // onAcceptSuccess?.(friend);
    },
    onError: handleError,
  });

  // ========== 拒绝好友请求 Mutation ==========
  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) => api.rejectFriendRequest(requestId),
    onSuccess: (_, requestId) => {
      updateRequestStatus(requestId, 'rejected');
    },
    onError: handleError,
  });

  // ========== 删除好友 Mutation ==========
  const deleteFriendMutation = useMutation({
    mutationFn: (friendId: string) => api.deleteFriend(friendId),
    onSuccess: (_, friendId) => {
      removeFriend(friendId);
    },
    onError: handleError,
  });

  // ========== 更新备注 Mutation ==========
  const updateRemarkMutation = useMutation({
    mutationFn: ({ friendId, remark }: { friendId: string; remark: string | null }) =>
      api.updateFriendRemark(friendId, remark),
    onSuccess: (_, { friendId, remark }) => {
      storeUpdateRemark(friendId, remark);
    },
    onError: handleError,
  });

  // ========== 拉黑用户 Mutation ==========
  // const blockUserMutation = useMutation({
  //   mutationFn: (userId: string) => api.blockUser(userId),
  //   onSuccess: (blockedUser) => {
  //     storeBlockUser(blockedUser);
  //     // 如果是好友，则移除
  //     removeFriend(blockedUser.userId);
  //   },
  //   onError: handleError,
  // });

  // ========== 取消拉黑 Mutation ==========
  const unblockUserMutation = useMutation({
    mutationFn: (userId: string) => api.unblockUser(userId),
    onSuccess: (_, userId) => {
      storeUnblockUser(userId);
    },
    onError: handleError,
  });

  // ========== 操作方法 ==========
  const fetchFriends = useCallback(async () => {
    await friendsQuery.refetch();
  }, [friendsQuery]);

  const fetchRequests = useCallback(async () => {
    await Promise.all([receivedRequestsQuery.refetch(), sentRequestsQuery.refetch()]);
  }, [receivedRequestsQuery, sentRequestsQuery]);

  // const fetchBlockedUsers = useCallback(async () => {
  //   await blockedUsersQuery.refetch();
  // }, [blockedUsersQuery]);

  const sendFriendRequest = useCallback(
    async (userId: string, message?: string) => {
      return sendRequestMutation.mutateAsync({ userId, message });
    },
    [sendRequestMutation]
  );

  const acceptFriendRequest = useCallback(
    async (requestId: string) => {
      await acceptRequestMutation.mutateAsync(requestId);
    },
    [acceptRequestMutation]
  );

  const rejectFriendRequest = useCallback(
    async (requestId: string) => {
      await rejectRequestMutation.mutateAsync(requestId);
    },
    [rejectRequestMutation]
  );

  const deleteFriend = useCallback(
    async (friendId: string) => {
      await deleteFriendMutation.mutateAsync(friendId);
    },
    [deleteFriendMutation]
  );

  const updateFriendRemark = useCallback(
    async (friendId: string, remark: string | null) => {
      await updateRemarkMutation.mutateAsync({ friendId, remark });
    },
    [updateRemarkMutation]
  );

  // const blockUser = useCallback(
  //   async (userId: string) => {
  //     await blockUserMutation.mutateAsync(userId);
  //   },
  //   [blockUserMutation]
  // );

  const unblockUser = useCallback(
    async (userId: string) => {
      await unblockUserMutation.mutateAsync(userId);
    },
    [unblockUserMutation]
  );

  // ========== 查询方法 ==========
  const isFriend = useCallback(
    (userId: string) => friends.some((f) => f.friendId === userId),
    [friends]
  );

  const isBlocked = useCallback(
    (userId: string) => blockedUsers.some((u) => u.userId === userId),
    [blockedUsers]
  );

  const getFriend = useCallback(
    (friendId: string) => friends.find((f) => f.friendId === friendId),
    [friends]
  );

  const getOnlineStatus = useCallback(
    (userId: string) => onlineStatuses.get(userId),
    [onlineStatuses]
  );

  // ========== 返回值 ==========
  return {
    // 状态
    friends,
    receivedRequests,
    sentRequests,
    pendingRequestCount,
    blockedUsers,
    onlineStatuses,

    // 操作
    fetchFriends,
    fetchRequests,
    // fetchBlockedUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    deleteFriend,
    updateFriendRemark,
    // blockUser,
    unblockUser,

    // 查询方法
    isFriend,
    isBlocked,
    getFriend,
    getOnlineStatus,

    // 状态标志
    isLoadingFriends: friendsQuery.isLoading || isLoadingFriends,
    isLoadingRequests: receivedRequestsQuery.isLoading || isLoadingRequests,
    isSendingRequest: sendRequestMutation.isPending,
    isProcessingRequest: acceptRequestMutation.isPending || rejectRequestMutation.isPending,
    isDeletingFriend: deleteFriendMutation.isPending,
    friendsError: friendsQuery.error,
    requestsError: receivedRequestsQuery.error,
  };
}

// ========================
// 辅助 Hooks
// ========================

/**
 * 获取好友信息
 */
export function useFriend(friendId: string | null): Friend | undefined {
  return useContactStore((state) => {
    if (!friendId) return undefined;
    return state.friends.find((f) => f.friendId === friendId);
  });
}

/**
 * 检查是否是好友
 */
export function useIsFriend(userId: string): boolean {
  return useContactStore((state) => state.friends.some((f) => f.friendId === userId));
}

/**
 * 检查是否已拉黑
 */
export function useIsBlocked(userId: string): boolean {
  return useContactStore((state) => state.blockedUsers.some((u) => u.userId === userId));
}

/**
 * 获取用户在线状态
 */
export function useOnlineStatus(userId: string): OnlineStatus | undefined {
  return useContactStore((state) => state.onlineStatuses.get(userId));
}

/**
 * 获取待处理请求数量
 */
export function usePendingRequestCount(): number {
  return useContactStore(
    (state) => state.receivedRequests.filter((r) => r.status === 'pending').length
  );
}
