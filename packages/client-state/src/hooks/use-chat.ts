/**
 * useChat Hook
 * 会话相关的组合 Hook，整合 chat.store 和 TanStack Query
 *
 * 功能：
 * - 会话列表管理
 * - 当前会话切换
 * - 创建会话
 * - 会话操作（置顶、静音、删除）
 * - 未读计数
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import type { PrivateConversation, GroupConversation } from '@qyra/shared';
import { useChatStore, type ChatConversation } from '../stores/chat.store';
import { chatKeys } from '../queries/keys';

// ========================
// 类型定义
// ========================

/** 会话 API 接口（由使用方注入） */
export interface ChatApi {
  /** 获取会话列表 */
  getChats: () => Promise<ChatConversation[]>;
  /** 获取单个会话 */
  getChat: (chatId: string) => Promise<ChatConversation>;
  /** 创建私聊会话 */
  createPrivateChat: (userId: string) => Promise<PrivateConversation>;
  /** 创建群聊会话 */
  createGroupChat: (data: { name: string; memberIds: string[] }) => Promise<GroupConversation>;
  /** 删除会话 */
  deleteChat: (chatId: string) => Promise<void>;
  /** 置顶会话 */
  pinChat: (chatId: string, isPinned: boolean) => Promise<void>;
  /** 静音会话 */
  muteChat: (chatId: string, isMuted: boolean) => Promise<void>;
  /** 标记已读 */
  markAsRead: (chatId: string) => Promise<void>;
}

/** useChat Hook 配置 */
export interface UseChatOptions {
  /** 会话 API 实现 */
  api: ChatApi;
  /** 会话切换回调 */
  onChatChange?: (chatId: string | null) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/** useChat Hook 返回值 */
export interface UseChatReturn {
  // ========== 状态 ==========
  /** 会话列表（已排序） */
  chats: ChatConversation[];
  /** 私聊列表 */
  privateChats: PrivateConversation[];
  /** 群聊列表 */
  groupChats: GroupConversation[];
  /** 置顶会话列表 */
  pinnedChats: ChatConversation[];
  /** 当前会话 ID */
  currentChatId: string | null;
  /** 当前会话 */
  currentChat: ChatConversation | null;
  /** 总未读数 */
  totalUnreadCount: number;
  /** 是否正在加载 */
  isLoading: boolean;

  // ========== 操作 ==========
  /** 获取会话列表 */
  fetchChats: () => Promise<void>;
  /** 获取单个会话 */
  fetchChat: (chatId: string) => Promise<ChatConversation | undefined>;
  /** 切换当前会话 */
  setCurrentChat: (chatId: string | null) => void;
  /** 创建私聊会话 */
  createPrivateChat: (userId: string) => Promise<PrivateConversation>;
  /** 创建群聊会话 */
  createGroupChat: (data: { name: string; memberIds: string[] }) => Promise<GroupConversation>;
  /** 删除会话 */
  deleteChat: (chatId: string) => Promise<void>;
  /** 置顶/取消置顶会话 */
  togglePin: (chatId: string) => Promise<void>;
  /** 静音/取消静音会话 */
  toggleMute: (chatId: string) => Promise<void>;
  /** 标记已读 */
  markAsRead: (chatId: string) => Promise<void>;

  // ========== Mutation 状态 ==========
  /** 正在创建私聊 */
  isCreatingPrivateChat: boolean;
  /** 正在创建群聊 */
  isCreatingGroupChat: boolean;
  /** 正在删除会话 */
  isDeletingChat: boolean;

  // ========== Query 状态 ==========
  /** 会话列表加载中 */
  isFetchingChats: boolean;
  /** 会话列表加载错误 */
  chatsError: Error | null;
  /** 刷新会话列表 */
  refetchChats: () => void;
}

// ========================
// Hook 实现
// ========================

/**
 * 会话 Hook
 *
 * @example
 * ```tsx
 * const {
 *   chats,
 *   currentChat,
 *   setCurrentChat,
 *   createPrivateChat,
 * } = useChat({ api: chatApi });
 *
 * // 切换会话
 * setCurrentChat('chat-123');
 *
 * // 创建私聊
 * const chat = await createPrivateChat('user-456');
 * ```
 */
export function useChat(options: UseChatOptions): UseChatReturn {
  const { api, onChatChange, onError } = options;

  const queryClient = useQueryClient();

  // ========== Store State ==========
  // 使用 useShallow 避免不必要的重渲染
  const { chatIds, chatsMap, currentChatId, totalUnreadCount, isLoading } = useChatStore(
    useShallow((state) => ({
      chatIds: state.chatIds,
      chatsMap: state.chats,
      currentChatId: state.currentChatId,
      totalUnreadCount: state.totalUnreadCount,
      isLoading: state.isLoading,
    }))
  );

  // 派生状态 - 使用 useMemo 避免每次渲染创建新数组
  const chats = useMemo(
    () => chatIds.map((id) => chatsMap.get(id)!).filter(Boolean),
    [chatIds, chatsMap]
  );

  const currentChat = useMemo(
    () => (currentChatId ? (chatsMap.get(currentChatId) ?? null) : null),
    [currentChatId, chatsMap]
  );

  const privateChats = useMemo(
    () => chats.filter((chat): chat is PrivateConversation => chat.type === 'private'),
    [chats]
  );

  const groupChats = useMemo(
    () => chats.filter((chat): chat is GroupConversation => chat.type === 'group'),
    [chats]
  );

  const pinnedChats = useMemo(() => chats.filter((chat) => chat.isPinned), [chats]);

  // Store Actions
  const {
    setChats,
    addChat,
    removeChat,
    setCurrentChat: storeSetCurrentChat,
    markAsRead: storeMarkAsRead,
    togglePin: storeTogglePin,
    toggleMute: storeToggleMute,
    setLoading,
  } = useChatStore();

  // ========== 错误处理 ==========
  const handleError = useCallback(
    (err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      throw error;
    },
    [onError]
  );

  // ========== 会话列表 Query ==========
  const chatsQuery = useQuery({
    queryKey: chatKeys.list(),
    queryFn: async () => {
      setLoading(true);
      try {
        const data = await api.getChats();
        setChats(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 分钟
  });

  // ========== 创建私聊 Mutation ==========
  const createPrivateChatMutation = useMutation({
    mutationFn: (userId: string) => api.createPrivateChat(userId),
    onSuccess: (chat) => {
      addChat(chat);
      queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
    onError: handleError,
  });

  // ========== 创建群聊 Mutation ==========
  const createGroupChatMutation = useMutation({
    mutationFn: (data: { name: string; memberIds: string[] }) => api.createGroupChat(data),
    onSuccess: (chat) => {
      addChat(chat);
      queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
    onError: handleError,
  });

  // ========== 删除会话 Mutation ==========
  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) => api.deleteChat(chatId),
    onSuccess: (_, chatId) => {
      removeChat(chatId);
      queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
    onError: handleError,
  });

  // ========== 置顶会话 Mutation ==========
  const pinChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const chat = useChatStore.getState().chats.get(chatId);
      if (!chat) throw new Error('Chat not found');
      await api.pinChat(chatId, !chat.isPinned);
      return chatId;
    },
    onSuccess: (chatId) => {
      storeTogglePin(chatId);
    },
    onError: handleError,
  });

  // ========== 静音会话 Mutation ==========
  const muteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const chat = useChatStore.getState().chats.get(chatId);
      if (!chat) throw new Error('Chat not found');
      await api.muteChat(chatId, !chat.isMuted);
      return chatId;
    },
    onSuccess: (chatId) => {
      storeToggleMute(chatId);
    },
    onError: handleError,
  });

  // ========== 标记已读 Mutation ==========
  const markAsReadMutation = useMutation({
    mutationFn: (chatId: string) => api.markAsRead(chatId),
    onSuccess: (_, chatId) => {
      storeMarkAsRead(chatId);
    },
    onError: handleError,
  });

  // ========== 操作方法 ==========
  const setCurrentChat = useCallback(
    (chatId: string | null) => {
      storeSetCurrentChat(chatId);
      onChatChange?.(chatId);

      // 切换会话时标记已读
      if (chatId) {
        markAsReadMutation.mutate(chatId);
      }
    },
    [storeSetCurrentChat, onChatChange, markAsReadMutation]
  );

  // 使用 chatsQuery.refetch 的稳定引用
  const refetchChats = chatsQuery.refetch;

  const fetchChats = useCallback(async () => {
    await refetchChats();
  }, [refetchChats]);

  const fetchChat = useCallback(
    async (chatId: string) => {
      try {
        const chat = await api.getChat(chatId);
        addChat(chat);
        return chat;
      } catch (err) {
        handleError(err);
        return undefined;
      }
    },
    [api, addChat, handleError]
  );

  const createPrivateChat = useCallback(
    async (userId: string) => {
      return createPrivateChatMutation.mutateAsync(userId);
    },
    [createPrivateChatMutation]
  );

  const createGroupChat = useCallback(
    async (data: { name: string; memberIds: string[] }) => {
      return createGroupChatMutation.mutateAsync(data);
    },
    [createGroupChatMutation]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      await deleteChatMutation.mutateAsync(chatId);
    },
    [deleteChatMutation]
  );

  const togglePin = useCallback(
    async (chatId: string) => {
      await pinChatMutation.mutateAsync(chatId);
    },
    [pinChatMutation]
  );

  const toggleMute = useCallback(
    async (chatId: string) => {
      await muteChatMutation.mutateAsync(chatId);
    },
    [muteChatMutation]
  );

  const markAsRead = useCallback(
    async (chatId: string) => {
      await markAsReadMutation.mutateAsync(chatId);
    },
    [markAsReadMutation]
  );

  // ========== 返回值 ==========
  return {
    // 状态
    chats,
    privateChats,
    groupChats,
    pinnedChats,
    currentChatId,
    currentChat,
    totalUnreadCount,
    isLoading,

    // 操作
    fetchChats,
    fetchChat,
    setCurrentChat,
    createPrivateChat,
    createGroupChat,
    deleteChat,
    togglePin,
    toggleMute,
    markAsRead,

    // Mutation 状态
    isCreatingPrivateChat: createPrivateChatMutation.isPending,
    isCreatingGroupChat: createGroupChatMutation.isPending,
    isDeletingChat: deleteChatMutation.isPending,

    // Query 状态
    isFetchingChats: chatsQuery.isFetching,
    chatsError: chatsQuery.error,
    refetchChats: chatsQuery.refetch,
  };
}

// ========================
// 辅助 Hooks
// ========================

/**
 * 获取指定会话的 Hook
 */
export function useChatById(chatId: string | null): ChatConversation | null {
  return useChatStore((state) => (chatId ? (state.chats.get(chatId) ?? null) : null));
}

/**
 * 检查是否有未读消息
 */
export function useHasUnread(): boolean {
  return useChatStore((state) => state.totalUnreadCount) > 0;
}

/**
 * 获取未读会话数量
 */
export function useUnreadChatCount(): number {
  return useChatStore((state) => {
    let count = 0;
    for (const chat of state.chats.values()) {
      if (chat.unreadCount > 0) {
        count++;
      }
    }
    return count;
  });
}
