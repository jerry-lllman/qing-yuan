/**
 * 消息状态管理
 * 负责消息列表、消息发送状态、草稿等
 *
 * 注意：不使用 Immer middleware 避免 proxy 撤销问题
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message } from '@qyra/shared';

// ========================
// 类型定义
// ========================

/** 消息发送状态 */
export enum SendingStatus {
  /** 等待发送 */
  PENDING = 'pending',
  /** 发送中 */
  SENDING = 'sending',
  /** 发送成功 */
  SENT = 'sent',
  /** 发送失败 */
  FAILED = 'failed',
}

/** 待发送消息 */
export interface PendingMessage {
  /** 临时 ID（客户端生成） */
  tempId: string;
  /** 会话 ID */
  conversationId: string;
  /** 消息内容 */
  content: string;
  /** 消息类型 */
  type: Message['type'];
  /** 附件 */
  attachments?: Message['attachments'];
  /** 回复消息 ID */
  replyToId?: string;
  /** 发送状态 */
  status: SendingStatus;
  /** 创建时间 */
  createdAt: Date;
  /** 重试次数 */
  retryCount: number;
  /** 错误信息 */
  error?: string;
}

/** 草稿消息 */
export interface DraftMessage {
  /** 会话 ID */
  conversationId: string;
  /** 草稿内容 */
  content: string;
  /** 回复消息 ID */
  replyToId?: string;
  /** 附件 */
  attachments?: Message['attachments'];
  /** 更新时间 */
  updatedAt: Date;
}

/** 分页信息 */
export interface MessagePagination {
  /** 是否有更多消息 */
  hasMore: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 最早消息的 ID（用于向上加载） */
  oldestMessageId?: string;
  /** 最新消息的 ID */
  newestMessageId?: string;
}

/** 消息状态 */
export interface MessageState {
  // ========== 状态 ==========
  /** 消息列表（按会话 ID 分组）- 使用普通对象而非 Map */
  messages: Record<string, Message[]>;
  /** 待发送消息队列 */
  pendingMessages: Record<string, PendingMessage[]>;
  /** 草稿消息 */
  drafts: Record<string, DraftMessage>;
  /** 分页信息（按会话 ID） */
  pagination: Record<string, MessagePagination>;
  /** 正在编辑的消息 ID */
  editingMessageId: string | null;

  // ========== 操作 ==========
  /** 设置会话消息 */
  setMessages: (conversationId: string, messages: Message[]) => void;
  /** 追加历史消息（向上加载） */
  prependMessages: (conversationId: string, messages: Message[]) => void;
  /** 添加新消息 */
  addMessage: (conversationId: string, message: Message) => void;
  /** 更新消息 */
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  /** 删除消息 */
  deleteMessage: (conversationId: string, messageId: string) => void;
  /** 清空会话消息 */
  clearMessages: (conversationId: string) => void;

  /** 添加待发送消息 */
  addPendingMessage: (message: PendingMessage) => void;
  /** 更新待发送消息状态 */
  updatePendingMessage: (tempId: string, updates: Partial<PendingMessage>) => void;
  /** 移除待发送消息（发送成功后） */
  removePendingMessage: (conversationId: string, tempId: string) => void;
  /** 将待发送消息标记为失败 */
  markPendingAsFailed: (tempId: string, error: string) => void;

  /** 设置草稿 */
  setDraft: (draft: DraftMessage) => void;
  /** 获取草稿 */
  getDraft: (conversationId: string) => DraftMessage | undefined;
  /** 清除草稿 */
  clearDraft: (conversationId: string) => void;

  /** 设置分页信息 */
  setPagination: (conversationId: string, pagination: Partial<MessagePagination>) => void;

  /** 设置正在编辑的消息 */
  setEditingMessage: (messageId: string | null) => void;

  /** 重置状态 */
  reset: () => void;
}

// ========================
// 初始状态
// ========================

const initialState: Pick<
  MessageState,
  'messages' | 'pendingMessages' | 'drafts' | 'pagination' | 'editingMessageId'
> = {
  messages: {},
  pendingMessages: {},
  drafts: {},
  pagination: {},
  editingMessageId: null,
};

// ========================
// Store 实现
// ========================

/**
 * 消息 Store
 *
 * 注意：
 * - 不使用 Immer middleware，避免 proxy 撤销问题
 * - 使用普通对象而非 Map，避免序列化问题
 * - 所有更新都是不可变的（创建新对象）
 */
export const useMessageStore = create<MessageState>()(
  devtools(
    (set, get) => ({
      // ========== 初始状态 ==========
      ...initialState,

      // ========== 消息操作 ==========
      setMessages: (conversationId, messages) =>
        set((state) => {
          const newPagination = { ...state.pagination };
          if (messages.length > 0) {
            newPagination[conversationId] = {
              ...state.pagination[conversationId],
              hasMore: state.pagination[conversationId]?.hasMore ?? true,
              isLoading: false,
              oldestMessageId: messages[0]?.id,
              newestMessageId: messages[messages.length - 1]?.id,
            };
          }
          return {
            messages: { ...state.messages, [conversationId]: [...messages] },
            pagination: newPagination,
          };
        }),

      prependMessages: (conversationId, messages) =>
        set((state) => {
          const existing = state.messages[conversationId] || [];
          const newPagination = { ...state.pagination };
          if (messages.length > 0) {
            newPagination[conversationId] = {
              ...state.pagination[conversationId],
              hasMore: state.pagination[conversationId]?.hasMore ?? true,
              isLoading: false,
              oldestMessageId: messages[0]?.id,
            };
          }
          return {
            messages: { ...state.messages, [conversationId]: [...messages, ...existing] },
            pagination: newPagination,
          };
        }),

      addMessage: (conversationId, message) =>
        set((state) => {
          const existing = state.messages[conversationId] || [];
          // 检查消息是否已存在（避免重复）
          if (existing.some((m) => m.id === message.id)) {
            return state;
          }
          const newPagination = {
            ...state.pagination,
            [conversationId]: {
              ...state.pagination[conversationId],
              hasMore: state.pagination[conversationId]?.hasMore ?? true,
              isLoading: false,
              newestMessageId: message.id,
            },
          };
          return {
            messages: { ...state.messages, [conversationId]: [...existing, message] },
            pagination: newPagination,
          };
        }),

      updateMessage: (conversationId, messageId, updates) =>
        set((state) => {
          const messages = state.messages[conversationId];
          if (!messages) return state;
          const index = messages.findIndex((m) => m.id === messageId);
          if (index === -1) return state;
          const newMessages = [...messages];
          newMessages[index] = { ...messages[index]!, ...updates };
          return {
            messages: { ...state.messages, [conversationId]: newMessages },
          };
        }),

      deleteMessage: (conversationId, messageId) =>
        set((state) => {
          const messages = state.messages[conversationId];
          if (!messages) return state;
          const index = messages.findIndex((m) => m.id === messageId);
          if (index === -1) return state;
          const newMessages = [...messages];
          newMessages[index] = { ...messages[index]!, isDeleted: true, content: '' };
          return {
            messages: { ...state.messages, [conversationId]: newMessages },
          };
        }),

      clearMessages: (conversationId) =>
        set((state) => {
          const { [conversationId]: _, ...restMessages } = state.messages;
          const { [conversationId]: __, ...restPagination } = state.pagination;
          return {
            messages: restMessages,
            pagination: restPagination,
          };
        }),

      // ========== 待发送消息操作 ==========
      addPendingMessage: (message) =>
        set((state) => {
          const existing = state.pendingMessages[message.conversationId] || [];
          return {
            pendingMessages: {
              ...state.pendingMessages,
              [message.conversationId]: [...existing, message],
            },
          };
        }),

      updatePendingMessage: (tempId, updates) =>
        set((state) => {
          const newPendingMessages = { ...state.pendingMessages };
          for (const conversationId of Object.keys(newPendingMessages)) {
            const messages = newPendingMessages[conversationId]!;
            const index = messages.findIndex((m) => m.tempId === tempId);
            if (index !== -1) {
              const newMessages = [...messages];
              newMessages[index] = { ...messages[index]!, ...updates };
              newPendingMessages[conversationId] = newMessages;
              break;
            }
          }
          return { pendingMessages: newPendingMessages };
        }),

      removePendingMessage: (conversationId, tempId) =>
        set((state) => {
          const messages = state.pendingMessages[conversationId];
          if (!messages) return state;
          const filtered = messages.filter((m) => m.tempId !== tempId);
          if (filtered.length === 0) {
            const { [conversationId]: _, ...rest } = state.pendingMessages;
            return { pendingMessages: rest };
          }
          return {
            pendingMessages: { ...state.pendingMessages, [conversationId]: filtered },
          };
        }),

      markPendingAsFailed: (tempId, error) =>
        set((state) => {
          const newPendingMessages = { ...state.pendingMessages };
          for (const conversationId of Object.keys(newPendingMessages)) {
            const messages = newPendingMessages[conversationId]!;
            const index = messages.findIndex((m) => m.tempId === tempId);
            if (index !== -1) {
              const newMessages = [...messages];
              newMessages[index] = {
                ...messages[index]!,
                status: SendingStatus.FAILED,
                error,
                retryCount: messages[index]!.retryCount + 1,
              };
              newPendingMessages[conversationId] = newMessages;
              break;
            }
          }
          return { pendingMessages: newPendingMessages };
        }),

      // ========== 草稿操作 ==========
      setDraft: (draft) =>
        set((state) => ({
          drafts: { ...state.drafts, [draft.conversationId]: draft },
        })),

      getDraft: (conversationId) => {
        return get().drafts[conversationId];
      },

      clearDraft: (conversationId) =>
        set((state) => {
          const { [conversationId]: _, ...rest } = state.drafts;
          return { drafts: rest };
        }),

      // ========== 分页操作 ==========
      setPagination: (conversationId, pagination) =>
        set((state) => ({
          pagination: {
            ...state.pagination,
            [conversationId]: {
              hasMore: true,
              isLoading: false,
              ...state.pagination[conversationId],
              ...pagination,
            },
          },
        })),

      // ========== 编辑消息 ==========
      setEditingMessage: (messageId) =>
        set(() => ({
          editingMessageId: messageId,
        })),

      // ========== 重置 ==========
      reset: () => set(() => ({ ...initialState })),
    }),
    { name: 'MessageStore' }
  )
);

// ========================
// 工具函数（非 React 环境）
// ========================

/**
 * 获取会话消息
 */
export function getMessages(conversationId: string): Message[] {
  return useMessageStore.getState().messages[conversationId] || [];
}

/**
 * 获取单条消息
 */
export function getMessage(conversationId: string, messageId: string): Message | undefined {
  const messages = useMessageStore.getState().messages[conversationId];
  return messages?.find((m) => m.id === messageId);
}

/**
 * 获取待发送消息
 */
export function getPendingMessages(conversationId: string): PendingMessage[] {
  return useMessageStore.getState().pendingMessages[conversationId] || [];
}

/**
 * 获取草稿
 */
export function getDraft(conversationId: string): DraftMessage | undefined {
  return useMessageStore.getState().drafts[conversationId];
}

/**
 * 生成临时消息 ID
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
