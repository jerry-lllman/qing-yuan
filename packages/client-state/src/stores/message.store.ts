/**
 * 消息状态管理
 * 负责消息列表、消息发送状态、草稿等
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Message } from '@qing-yuan/shared';

// 启用 immer 的 Map/Set 支持
enableMapSet();

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
  /** 消息列表（按会话 ID 分组） */
  messages: Map<string, Message[]>;
  /** 待发送消息队列 */
  pendingMessages: Map<string, PendingMessage[]>;
  /** 草稿消息 */
  drafts: Map<string, DraftMessage>;
  /** 分页信息（按会话 ID） */
  pagination: Map<string, MessagePagination>;
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
  messages: new Map(),
  pendingMessages: new Map(),
  drafts: new Map(),
  pagination: new Map(),
  editingMessageId: null,
};

// ========================
// Store 实现
// ========================

/**
 * 消息 Store
 *
 * 注意：消息不做持久化，每次打开应用从服务器获取
 * 草稿可以考虑持久化（如果需要可以添加 persist 中间件）
 */
export const useMessageStore = create<MessageState>()(
  devtools(
    immer((set, get) => ({
      // ========== 初始状态 ==========
      ...initialState,

      // ========== 消息操作 ==========
      setMessages: (conversationId, messages) =>
        set((state: MessageState) => {
          state.messages.set(conversationId, messages);

          // 更新分页信息
          if (messages.length > 0) {
            const pagination = state.pagination.get(conversationId) || {
              hasMore: true,
              isLoading: false,
            };
            pagination.oldestMessageId = messages[0]?.id;
            pagination.newestMessageId = messages[messages.length - 1]?.id;
            state.pagination.set(conversationId, pagination);
          }
        }),

      prependMessages: (conversationId, messages) =>
        set((state: MessageState) => {
          const existing = state.messages.get(conversationId);
          if (existing) {
            // 在现有数组前面插入新消息
            existing.unshift(...messages);
          } else {
            state.messages.set(conversationId, [...messages]);
          }

          // 更新最早消息 ID
          if (messages.length > 0) {
            const pagination = state.pagination.get(conversationId) || {
              hasMore: true,
              isLoading: false,
            };
            pagination.oldestMessageId = messages[0]?.id;
            state.pagination.set(conversationId, pagination);
          }
        }),

      addMessage: (conversationId, message) =>
        set((state: MessageState) => {
          const existing = state.messages.get(conversationId) || [];

          // 检查消息是否已存在（避免重复）
          const exists = existing.some((m) => m.id === message.id);
          if (!exists) {
            state.messages.set(conversationId, [...existing, message]);

            // 更新最新消息 ID
            const pagination = state.pagination.get(conversationId) || {
              hasMore: true,
              isLoading: false,
            };
            pagination.newestMessageId = message.id;
            state.pagination.set(conversationId, pagination);
          }
        }),

      updateMessage: (conversationId, messageId, updates) =>
        set((state: MessageState) => {
          const messages = state.messages.get(conversationId);
          if (messages) {
            const index = messages.findIndex((m) => m.id === messageId);
            if (index !== -1) {
              Object.assign(messages[index]!, updates);
            }
          }
        }),

      deleteMessage: (conversationId, messageId) =>
        set((state: MessageState) => {
          const messages = state.messages.get(conversationId);
          if (messages) {
            const index = messages.findIndex((m) => m.id === messageId);
            if (index !== -1) {
              // 软删除：标记为已删除
              messages[index]!.isDeleted = true;
              messages[index]!.content = '';
            }
          }
        }),

      clearMessages: (conversationId) =>
        set((state: MessageState) => {
          state.messages.delete(conversationId);
          state.pagination.delete(conversationId);
        }),

      // ========== 待发送消息操作 ==========
      addPendingMessage: (message) =>
        set((state: MessageState) => {
          const existing = state.pendingMessages.get(message.conversationId);
          if (existing) {
            // 直接 push 到现有数组，避免创建新数组导致 proxy 问题
            existing.push(message);
          } else {
            state.pendingMessages.set(message.conversationId, [message]);
          }
        }),

      updatePendingMessage: (tempId, updates) =>
        set((state: MessageState) => {
          for (const [_conversationId, messages] of state.pendingMessages) {
            const index = messages.findIndex((m) => m.tempId === tempId);
            if (index !== -1) {
              Object.assign(messages[index]!, updates);
              break;
            }
          }
        }),

      removePendingMessage: (conversationId, tempId) =>
        set((state: MessageState) => {
          const messages = state.pendingMessages.get(conversationId);
          if (!messages) return;

          // 从后往前遍历查找并删除，避免索引问题
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i]?.tempId === tempId) {
              messages.splice(i, 1);
              break;
            }
          }

          // 如果数组为空，删除 key
          if (messages.length === 0) {
            state.pendingMessages.delete(conversationId);
          }
        }),

      markPendingAsFailed: (tempId, error) =>
        set((state: MessageState) => {
          for (const [, messages] of state.pendingMessages) {
            const message = messages.find((m) => m.tempId === tempId);
            if (message) {
              message.status = SendingStatus.FAILED;
              message.error = error;
              message.retryCount += 1;
              break;
            }
          }
        }),

      // ========== 草稿操作 ==========
      setDraft: (draft) =>
        set((state: MessageState) => {
          state.drafts.set(draft.conversationId, draft);
        }),

      getDraft: (conversationId) => {
        return get().drafts.get(conversationId);
      },

      clearDraft: (conversationId) =>
        set((state: MessageState) => {
          state.drafts.delete(conversationId);
        }),

      // ========== 分页操作 ==========
      setPagination: (conversationId, pagination) =>
        set((state: MessageState) => {
          const existing = state.pagination.get(conversationId) || {
            hasMore: true,
            isLoading: false,
          };
          state.pagination.set(conversationId, { ...existing, ...pagination });
        }),

      // ========== 编辑消息 ==========
      setEditingMessage: (messageId) =>
        set((state: MessageState) => {
          state.editingMessageId = messageId;
        }),

      // ========== 重置 ==========
      reset: () => set(() => initialState),
    })),
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
  return useMessageStore.getState().messages.get(conversationId) || [];
}

/**
 * 获取单条消息
 */
export function getMessage(conversationId: string, messageId: string): Message | undefined {
  const messages = useMessageStore.getState().messages.get(conversationId);
  return messages?.find((m) => m.id === messageId);
}

/**
 * 获取待发送消息
 */
export function getPendingMessages(conversationId: string): PendingMessage[] {
  return useMessageStore.getState().pendingMessages.get(conversationId) || [];
}

/**
 * 获取草稿
 */
export function getDraft(conversationId: string): DraftMessage | undefined {
  return useMessageStore.getState().drafts.get(conversationId);
}

/**
 * 生成临时消息 ID
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
