/**
 * useMessage Hook
 * 消息相关的组合 Hook，整合 message.store 和 TanStack Query
 *
 * 功能：
 * - 消息列表管理
 * - 发送消息
 * - 加载历史消息
 * - 消息编辑/删除
 * - 草稿管理
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Message, SendMessageRequest } from '@qyra/shared';
import {
  useMessageStore,
  generateTempId,
  SendingStatus,
  type PendingMessage,
  type DraftMessage,
  type MessagePagination,
} from '../stores/message.store';
import { useChatStore } from '../stores/chat.store';
import { messageKeys } from '../queries/keys';

// ========================
// 类型定义
// ========================

/** 消息 API 接口（由使用方注入） */
export interface MessageApi {
  /** 获取会话消息列表 */
  getMessages: (
    conversationId: string,
    params?: { before?: string; limit?: number }
  ) => Promise<{ messages: Message[]; hasMore: boolean }>;
  /** 发送消息 */
  sendMessage: (data: SendMessageRequest) => Promise<Message>;
  /** 编辑消息 */
  editMessage: (messageId: string, content: string) => Promise<Message>;
  /** 删除消息 */
  deleteMessage: (messageId: string) => Promise<void>;
  /** 撤回消息 */
  recallMessage: (messageId: string) => Promise<void>;
}

/** useMessage Hook 配置 */
export interface UseMessageOptions {
  /** 消息 API 实现 */
  api: MessageApi;
  /** 会话 ID */
  conversationId: string;
  /** 当前用户 ID（用于标记 pending 消息的发送者） */
  currentUserId: string;
  /** 每页消息数量 */
  pageSize?: number;
  /** 消息发送成功回调 */
  onSendSuccess?: (message: Message) => void;
  /** 消息发送失败回调 */
  onSendError?: (error: Error, pendingMessage: PendingMessage) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/** useMessage Hook 返回值 */
export interface UseMessageReturn {
  // ========== 状态 ==========
  /** 消息列表（包含待发送消息） */
  messages: Message[];
  /** 待发送消息 */
  pendingMessages: PendingMessage[];
  /** 草稿 */
  draft: DraftMessage | undefined;
  /** 分页信息 */
  pagination: MessagePagination;
  /** 正在编辑的消息 ID */
  editingMessageId: string | null;

  // ========== 操作 ==========
  /** 加载消息 */
  fetchMessages: () => Promise<void>;
  /** 加载更多历史消息 */
  fetchMoreMessages: () => Promise<void>;
  /** 刷新消息 */
  refetchMessages: () => void;
  /** 发送消息 */
  sendMessage: (data: Omit<SendMessageRequest, 'conversationId'>) => Promise<void>;
  /** 重试发送消息 */
  retrySendMessage: (tempId: string) => Promise<void>;
  /** 取消发送消息 */
  cancelSendMessage: (tempId: string) => void;
  /** 编辑消息 */
  editMessage: (messageId: string, content: string) => Promise<void>;
  /** 删除消息 */
  deleteMessage: (messageId: string) => Promise<void>;
  /** 撤回消息 */
  recallMessage: (messageId: string) => Promise<void>;
  /** 设置草稿 */
  setDraft: (content: string, replyToId?: string) => void;
  /** 清除草稿 */
  clearDraft: () => void;
  /** 开始编辑消息 */
  startEditing: (messageId: string) => void;
  /** 取消编辑消息 */
  cancelEditing: () => void;

  // ========== 状态标志 ==========
  /** 是否正在加载消息 */
  isLoading: boolean;
  /** 是否正在加载更多 */
  isLoadingMore: boolean;
  /** 是否有更多消息 */
  hasMore: boolean;
  /** 是否正在发送消息 */
  isSending: boolean;
  /** 是否正在编辑消息 */
  isEditing: boolean;
  /** 是否正在删除消息 */
  isDeleting: boolean;
  /** 加载错误 */
  error: Error | null;
}

// ========================
// Hook 实现
// ========================

/**
 * 消息 Hook
 *
 * @example
 * ```tsx
 * const {
 *   messages,
 *   sendMessage,
 *   fetchMoreMessages,
 *   hasMore,
 * } = useMessage({
 *   api: messageApi,
 *   conversationId: 'chat-123',
 * });
 *
 * // 发送消息
 * await sendMessage({ type: 'TEXT', content: 'Hello!' });
 *
 * // 加载更多
 * if (hasMore) {
 *   await fetchMoreMessages();
 * }
 * ```
 */
// 默认值（保持引用稳定）
const DEFAULT_PAGINATION: MessagePagination = { hasMore: true, isLoading: false };
const EMPTY_MESSAGES: Message[] = [];
const EMPTY_PENDING: PendingMessage[] = [];

export function useMessage(options: UseMessageOptions): UseMessageReturn {
  const {
    api,
    conversationId,
    currentUserId,
    pageSize = 20,
    onSendSuccess,
    onSendError,
    onError,
  } = options;

  const queryClient = useQueryClient();

  // ========== Store State ==========
  // 现在使用普通对象而非 Map + Immer，直接使用 selector 即可
  const messages = useMessageStore((state) => state.messages[conversationId] ?? EMPTY_MESSAGES);

  const pendingMessages = useMessageStore(
    (state) => state.pendingMessages[conversationId] ?? EMPTY_PENDING
  );

  const draft = useMessageStore((state) => state.drafts[conversationId]);

  const pagination = useMessageStore(
    (state) => state.pagination[conversationId] ?? DEFAULT_PAGINATION
  );

  const editingMessageId = useMessageStore((state) => state.editingMessageId);

  // Store Actions
  const setMessages = useMessageStore((state) => state.setMessages);
  const prependMessages = useMessageStore((state) => state.prependMessages);
  const addMessage = useMessageStore((state) => state.addMessage);
  const updateMessage = useMessageStore((state) => state.updateMessage);
  const storeDeleteMessage = useMessageStore((state) => state.deleteMessage);
  const addPendingMessage = useMessageStore((state) => state.addPendingMessage);
  const updatePendingMessage = useMessageStore((state) => state.updatePendingMessage);
  const removePendingMessage = useMessageStore((state) => state.removePendingMessage);
  const markPendingAsFailed = useMessageStore((state) => state.markPendingAsFailed);
  const storeSetDraft = useMessageStore((state) => state.setDraft);
  const storeClearDraft = useMessageStore((state) => state.clearDraft);
  const setPagination = useMessageStore((state) => state.setPagination);
  const setEditingMessage = useMessageStore((state) => state.setEditingMessage);

  // 合并消息列表（包含待发送消息）
  const allMessages = useMemo(() => {
    // 将待发送消息转换为 Message 格式并追加到末尾
    const pendingAsMessages: Message[] = pendingMessages.map((pm) => ({
      id: pm.tempId,
      conversationId: pm.conversationId,
      senderId: currentUserId, // 使用当前用户 ID
      sender: {
        id: currentUserId,
        username: '',
        nickname: '',
        avatar: null,
        status: 'online' as const,
        email: '',
      },
      type: pm.type,
      content: pm.content,
      attachments: pm.attachments || [],
      replyTo: pm.replyToId || null,
      status: pm.status === SendingStatus.SENT ? 'sent' : 'pending',
      isEdited: false,
      isDeleted: false,
      createdAt: pm.createdAt,
      updatedAt: pm.createdAt,
    }));
    return [...messages, ...pendingAsMessages];
  }, [messages, pendingMessages, currentUserId]);

  // ========== 错误处理 ==========
  const handleError = useCallback(
    (err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      throw error;
    },
    [onError]
  );

  // ========== 消息列表 Query ==========
  const messagesQuery = useQuery({
    queryKey: messageKeys.list(conversationId),
    queryFn: async () => {
      setPagination(conversationId, { isLoading: true });
      try {
        const result = await api.getMessages(conversationId, { limit: pageSize });

        // 直接设置服务端返回的消息，不做本地合并
        // 因为刚发送的消息应该已经通过 mutation 的 queryClient.setQueryData 更新到缓存了
        setMessages(conversationId, result.messages);
        setPagination(conversationId, { hasMore: result.hasMore, isLoading: false });
        return { messages: result.messages, hasMore: result.hasMore };
      } catch (err) {
        setPagination(conversationId, { isLoading: false });
        throw err;
      }
    },
    staleTime: 1000 * 60, // 1 分钟
    enabled: !!conversationId,
  });

  // ========== 发送消息 Mutation ==========
  const sendMessageMutation = useMutation({
    mutationFn: async (data: Omit<SendMessageRequest, 'conversationId'>) => {
      const tempId = generateTempId();

      // 创建待发送消息
      const pendingMessage: PendingMessage = {
        tempId,
        conversationId,
        content: data.content,
        type: data.type,
        attachments: data.attachments as Message['attachments'],
        replyToId: data.replyTo,
        status: SendingStatus.SENDING,
        createdAt: new Date(),
        retryCount: 0,
      };

      // 添加到待发送队列
      addPendingMessage(pendingMessage);

      try {
        // 发送到服务器
        const message = await api.sendMessage({
          ...data,
          conversationId,
        });

        // 发送成功，移除待发送消息，添加实际消息
        removePendingMessage(conversationId, tempId);
        addMessage(conversationId, message);

        // 更新会话的最后一条消息（发送方本地更新）
        useChatStore.getState().updateLastMessage(conversationId, message);

        // 同时更新 React Query 缓存，防止 refetch 时覆盖
        queryClient.setQueryData(
          messageKeys.list(conversationId),
          (oldData: { messages: Message[]; hasMore: boolean } | undefined) => {
            if (!oldData) return { messages: [message], hasMore: false };
            // 检查消息是否已存在
            const exists = oldData.messages.some((m) => m.id === message.id);
            if (exists) return oldData;
            return {
              ...oldData,
              messages: [...oldData.messages, message],
            };
          }
        );

        onSendSuccess?.(message);
        return message;
      } catch (err) {
        // 发送失败
        const error = err instanceof Error ? err : new Error(String(err));
        markPendingAsFailed(tempId, error.message);
        onSendError?.(error, pendingMessage);
        throw error;
      }
    },
    onError: handleError,
  });

  // ========== 编辑消息 Mutation ==========
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const message = await api.editMessage(messageId, content);
      updateMessage(conversationId, messageId, {
        content: message.content,
        isEdited: true,
        updatedAt: message.updatedAt,
      });
      setEditingMessage(null);
      return message;
    },
    onError: handleError,
  });

  // ========== 删除消息 Mutation ==========
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await api.deleteMessage(messageId);
      storeDeleteMessage(conversationId, messageId);
    },
    onError: handleError,
  });

  // ========== 撤回消息 Mutation ==========
  const recallMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await api.recallMessage(messageId);
      updateMessage(conversationId, messageId, {
        isDeleted: true,
        content: '[消息已撤回]',
      });
    },
    onError: handleError,
  });

  // ========== 操作方法 ==========
  const fetchMessages = useCallback(async () => {
    await messagesQuery.refetch();
  }, [messagesQuery]);

  const fetchMoreMessages = useCallback(async () => {
    if (!pagination.hasMore || pagination.isLoading) return;

    const oldestMessageId = pagination.oldestMessageId;
    if (!oldestMessageId) return;

    setPagination(conversationId, { isLoading: true });

    try {
      const result = await api.getMessages(conversationId, {
        before: oldestMessageId,
        limit: pageSize,
      });

      prependMessages(conversationId, result.messages);
      setPagination(conversationId, { hasMore: result.hasMore, isLoading: false });
    } catch (err) {
      setPagination(conversationId, { isLoading: false });
      handleError(err);
    }
  }, [api, conversationId, pageSize, pagination, prependMessages, setPagination, handleError]);

  const sendMessage = useCallback(
    async (data: Omit<SendMessageRequest, 'conversationId'>) => {
      await sendMessageMutation.mutateAsync(data);
      // 清除草稿
      storeClearDraft(conversationId);
    },
    [sendMessageMutation, storeClearDraft, conversationId]
  );

  const retrySendMessage = useCallback(
    async (tempId: string) => {
      const pending = pendingMessages.find((pm) => pm.tempId === tempId);
      if (!pending) return;

      // 更新状态为发送中
      updatePendingMessage(tempId, {
        status: SendingStatus.SENDING,
        retryCount: pending.retryCount + 1,
        error: undefined,
      });

      try {
        const message = await api.sendMessage({
          conversationId,
          type: pending.type,
          content: pending.content,
          attachments: pending.attachments,
          replyTo: pending.replyToId,
        });

        removePendingMessage(conversationId, tempId);
        addMessage(conversationId, message);
        onSendSuccess?.(message);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        markPendingAsFailed(tempId, error.message);
        onSendError?.(error, pending);
      }
    },
    [
      api,
      conversationId,
      pendingMessages,
      updatePendingMessage,
      removePendingMessage,
      addMessage,
      markPendingAsFailed,
      onSendSuccess,
      onSendError,
    ]
  );

  const cancelSendMessage = useCallback(
    (tempId: string) => {
      removePendingMessage(conversationId, tempId);
    },
    [removePendingMessage, conversationId]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      await editMessageMutation.mutateAsync({ messageId, content });
    },
    [editMessageMutation]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await deleteMessageMutation.mutateAsync(messageId);
    },
    [deleteMessageMutation]
  );

  const recallMessage = useCallback(
    async (messageId: string) => {
      await recallMessageMutation.mutateAsync(messageId);
    },
    [recallMessageMutation]
  );

  const setDraft = useCallback(
    (content: string, replyToId?: string) => {
      storeSetDraft({
        conversationId,
        content,
        replyToId,
        updatedAt: new Date(),
      });
    },
    [storeSetDraft, conversationId]
  );

  const clearDraft = useCallback(() => {
    storeClearDraft(conversationId);
  }, [storeClearDraft, conversationId]);

  const startEditing = useCallback(
    (messageId: string) => {
      setEditingMessage(messageId);
    },
    [setEditingMessage]
  );

  const cancelEditing = useCallback(() => {
    setEditingMessage(null);
  }, [setEditingMessage]);

  // ========== 返回值 ==========
  return {
    // 状态
    messages: allMessages,
    pendingMessages,
    draft,
    pagination,
    editingMessageId,

    // 操作
    fetchMessages,
    fetchMoreMessages,
    refetchMessages: messagesQuery.refetch,
    sendMessage,
    retrySendMessage,
    cancelSendMessage,
    editMessage,
    deleteMessage,
    recallMessage,
    setDraft,
    clearDraft,
    startEditing,
    cancelEditing,

    // 状态标志
    isLoading: messagesQuery.isLoading,
    isLoadingMore: pagination.isLoading,
    hasMore: pagination.hasMore,
    isSending: sendMessageMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    error: messagesQuery.error,
  };
}

// ========================
// 辅助 Hooks
// ========================

/**
 * 获取单条消息
 */
export function useMessageById(
  conversationId: string,
  messageId: string | null
): Message | undefined {
  return useMessageStore((state) => {
    if (!messageId) return undefined;
    const messages = state.messages[conversationId];
    return messages?.find((m) => m.id === messageId);
  });
}

/**
 * 检查是否有待发送消息
 */
export function useHasPendingMessages(conversationId: string): boolean {
  return useMessageStore((state) => {
    const pending = state.pendingMessages[conversationId];
    return !!pending && pending.length > 0;
  });
}

/**
 * 获取失败的待发送消息数量
 */
export function useFailedMessageCount(conversationId: string): number {
  return useMessageStore((state) => {
    const pending = state.pendingMessages[conversationId] || [];
    return pending.filter((pm) => pm.status === SendingStatus.FAILED).length;
  });
}

/**
 * 获取失败的待发送消息（非响应式，直接获取）
 */
export function getFailedMessages(conversationId: string): PendingMessage[] {
  const pending = useMessageStore.getState().pendingMessages[conversationId] || [];
  return pending.filter((pm) => pm.status === SendingStatus.FAILED);
}
