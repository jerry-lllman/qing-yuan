/**
 * 会话状态管理
 * 负责会话列表、当前会话、未读消息计数等
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Conversation, PrivateConversation, GroupConversation } from '@qing-yuan/shared';

// 启用 immer 的 Map/Set 支持
enableMapSet();

// ========================
// 类型定义
// ========================

/** 会话类型联合 */
export type ChatConversation = PrivateConversation | GroupConversation;

/** 会话排序类型 */
export type ChatSortType = 'lastMessage' | 'unread' | 'pinned';

/** 会话筛选条件 */
export interface ChatFilter {
  type?: 'private' | 'group' | 'all';
  hasUnread?: boolean;
  isPinned?: boolean;
}

/** 会话状态 */
export interface ChatState {
  // ========== 状态 ==========
  /** 会话列表（Map 存储，便于快速查找） */
  chats: Map<string, ChatConversation>;
  /** 会话 ID 列表（用于排序展示） */
  chatIds: string[];
  /** 当前选中的会话 ID */
  currentChatId: string | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 总未读数 */
  totalUnreadCount: number;

  // ========== 操作 ==========
  /** 设置会话列表 */
  setChats: (chats: ChatConversation[]) => void;
  /** 添加会话 */
  addChat: (chat: ChatConversation) => void;
  /** 更新会话 */
  updateChat: (chatId: string, updates: Partial<ChatConversation>) => void;
  /** 移除会话 */
  removeChat: (chatId: string) => void;
  /** 设置当前会话 */
  setCurrentChat: (chatId: string | null) => void;
  /** 标记会话已读 */
  markAsRead: (chatId: string) => void;
  /** 增加未读数 */
  incrementUnread: (chatId: string, count?: number) => void;
  /** 置顶/取消置顶会话 */
  togglePin: (chatId: string) => void;
  /** 静音/取消静音会话 */
  toggleMute: (chatId: string) => void;
  /** 更新最后一条消息 */
  updateLastMessage: (chatId: string, message: Conversation['lastMessage']) => void;
  /** 设置加载状态 */
  setLoading: (isLoading: boolean) => void;
  /** 重置状态 */
  reset: () => void;
}

// ========================
// 初始状态
// ========================

const initialState: Pick<
  ChatState,
  'chats' | 'chatIds' | 'currentChatId' | 'isLoading' | 'totalUnreadCount'
> = {
  chats: new Map(),
  chatIds: [],
  currentChatId: null,
  isLoading: false,
  totalUnreadCount: 0,
};

// ========================
// 辅助函数
// ========================

/**
 * 计算总未读数
 */
function calculateTotalUnread(chats: Map<string, ChatConversation>): number {
  let total = 0;
  for (const chat of chats.values()) {
    if (!chat.isMuted) {
      total += chat.unreadCount;
    }
  }
  return total;
}

/**
 * 排序会话列表
 * 排序规则：置顶 > 最后消息时间
 */
function sortChatIds(chats: Map<string, ChatConversation>): string[] {
  const chatArray = Array.from(chats.values());

  chatArray.sort((a, b) => {
    // 置顶优先
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    // 按最后消息时间排序
    const timeA = a.lastMessage?.createdAt ?? a.updatedAt;
    const timeB = b.lastMessage?.createdAt ?? b.updatedAt;

    return new Date(timeB).getTime() - new Date(timeA).getTime();
  });

  return chatArray.map((chat) => chat.id);
}

// ========================
// Store 实现
// ========================

/**
 * 会话 Store
 */
export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // ========== 初始状态 ==========
        ...initialState,

        // ========== 操作 ==========
        setChats: (chats) =>
          set((state: ChatState) => {
            state.chats = new Map(chats.map((chat) => [chat.id, chat]));
            state.chatIds = sortChatIds(state.chats);
            state.totalUnreadCount = calculateTotalUnread(state.chats);
          }),

        addChat: (chat) =>
          set((state: ChatState) => {
            state.chats.set(chat.id, chat);
            state.chatIds = sortChatIds(state.chats);
            state.totalUnreadCount = calculateTotalUnread(state.chats);
          }),

        updateChat: (chatId, updates) =>
          set((state: ChatState) => {
            const chat = state.chats.get(chatId);
            if (chat) {
              Object.assign(chat, updates);
              state.chatIds = sortChatIds(state.chats);
              state.totalUnreadCount = calculateTotalUnread(state.chats);
            }
          }),

        removeChat: (chatId) =>
          set((state: ChatState) => {
            state.chats.delete(chatId);
            state.chatIds = state.chatIds.filter((id: string) => id !== chatId);
            state.totalUnreadCount = calculateTotalUnread(state.chats);

            // 如果删除的是当前会话，清除选中
            if (state.currentChatId === chatId) {
              state.currentChatId = null;
            }
          }),

        setCurrentChat: (chatId) =>
          set((state: ChatState) => {
            state.currentChatId = chatId;

            // 选中会话时自动标记已读
            if (chatId) {
              const chat = state.chats.get(chatId);
              if (chat && chat.unreadCount > 0) {
                chat.unreadCount = 0;
                state.totalUnreadCount = calculateTotalUnread(state.chats);
              }
            }
          }),

        markAsRead: (chatId) =>
          set((state: ChatState) => {
            const chat = state.chats.get(chatId);
            if (chat && chat.unreadCount > 0) {
              chat.unreadCount = 0;
              state.totalUnreadCount = calculateTotalUnread(state.chats);
            }
          }),

        incrementUnread: (chatId, count = 1) =>
          set((state: ChatState) => {
            const chat = state.chats.get(chatId);
            if (chat) {
              // 如果是当前正在查看的会话，不增加未读数
              if (state.currentChatId !== chatId) {
                chat.unreadCount += count;
                state.totalUnreadCount = calculateTotalUnread(state.chats);
              }
            }
          }),

        togglePin: (chatId) =>
          set((state: ChatState) => {
            const chat = state.chats.get(chatId);
            if (chat) {
              chat.isPinned = !chat.isPinned;
              state.chatIds = sortChatIds(state.chats);
            }
          }),

        toggleMute: (chatId) =>
          set((state: ChatState) => {
            const chat = state.chats.get(chatId);
            if (chat) {
              chat.isMuted = !chat.isMuted;
              state.totalUnreadCount = calculateTotalUnread(state.chats);
            }
          }),

        updateLastMessage: (chatId, message) =>
          set((state: ChatState) => {
            const chat = state.chats.get(chatId);
            if (chat) {
              chat.lastMessage = message;
              chat.updatedAt = new Date();
              state.chatIds = sortChatIds(state.chats);
            }
          }),

        setLoading: (isLoading) =>
          set((state: ChatState) => {
            state.isLoading = isLoading;
          }),

        reset: () => set(() => initialState),
      })),
      {
        name: 'qing-yuan-chats',
        // 只持久化必要的数据
        partialize: (state) => ({
          currentChatId: state.currentChatId,
          // 注意：chats 是 Map，需要特殊处理
        }),
        storage: createJSONStorage(() => {
          if (typeof window === 'undefined') {
            return {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            };
          }
          return localStorage;
        }),
      }
    ),
    { name: 'ChatStore' }
  )
);

// ========================
// Selector Hooks（性能优化）
// ========================

/** 获取会话列表（已排序） */
export const useChatList = () =>
  useChatStore((state) => state.chatIds.map((id) => state.chats.get(id)!).filter(Boolean));

/** 获取当前会话 ID */
export const useCurrentChatId = () => useChatStore((state) => state.currentChatId);

/** 获取当前会话 */
export const useCurrentChat = () =>
  useChatStore((state) =>
    state.currentChatId ? (state.chats.get(state.currentChatId) ?? null) : null
  );

/** 获取指定会话 */
export const useChat = (chatId: string) => useChatStore((state) => state.chats.get(chatId) ?? null);

/** 获取总未读数 */
export const useTotalUnreadCount = () => useChatStore((state) => state.totalUnreadCount);

/** 获取会话加载状态 */
export const useChatLoading = () => useChatStore((state) => state.isLoading);

/** 获取私聊会话列表 */
export const usePrivateChats = () =>
  useChatStore((state) =>
    state.chatIds
      .map((id) => state.chats.get(id))
      .filter((chat): chat is PrivateConversation => chat?.type === 'private')
  );

/** 获取群聊会话列表 */
export const useGroupChats = () =>
  useChatStore((state) =>
    state.chatIds
      .map((id) => state.chats.get(id))
      .filter((chat): chat is GroupConversation => chat?.type === 'group')
  );

/** 获取置顶会话列表 */
export const usePinnedChats = () =>
  useChatStore((state) =>
    state.chatIds.map((id) => state.chats.get(id)!).filter((chat) => chat?.isPinned)
  );

// ========================
// 工具函数（非 React 环境）
// ========================

/**
 * 获取当前会话 ID
 */
export function getCurrentChatId(): string | null {
  return useChatStore.getState().currentChatId;
}

/**
 * 获取指定会话
 */
export function getChat(chatId: string): ChatConversation | undefined {
  return useChatStore.getState().chats.get(chatId);
}

/**
 * 获取总未读数
 */
export function getTotalUnreadCount(): number {
  return useChatStore.getState().totalUnreadCount;
}

/**
 * 检查会话是否存在
 */
export function hasChat(chatId: string): boolean {
  return useChatStore.getState().chats.has(chatId);
}
