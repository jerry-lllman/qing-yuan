/**
 * useChat Hook 单元测试
 */

import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChat, useChatById, useHasUnread, useUnreadChatCount, type ChatApi } from './use-chat';
import { useChatStore, type ChatConversation } from '../stores/chat.store';
import type { PrivateConversation, GroupConversation } from '@qing-yuan/shared';

// ========================
// Mock 数据
// ========================

const mockUserBrief = {
  id: 'user-2',
  username: 'user2',
  nickname: 'User 2',
  avatar: null,
  status: 'online' as const,
};

const mockMessage = {
  id: 'msg-1',
  conversationId: 'chat-1',
  senderId: 'user-2',
  sender: mockUserBrief,
  type: 'text' as const,
  content: 'Hello',
  attachments: [],
  replyTo: null,
  status: 'sent' as const,
  isEdited: false,
  isDeleted: false,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

const mockPrivateChat: PrivateConversation = {
  id: 'chat-1',
  type: 'private',
  name: null,
  avatar: null,
  unreadCount: 2,
  isPinned: false,
  isMuted: false,
  lastMessage: mockMessage,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  participant: mockUserBrief,
};

const mockGroupMessage = {
  id: 'msg-2',
  conversationId: 'chat-2',
  senderId: 'user-3',
  sender: { ...mockUserBrief, id: 'user-3', username: 'user3', nickname: 'User 3' },
  type: 'text' as const,
  content: 'Group message',
  attachments: [],
  replyTo: null,
  status: 'sent' as const,
  isEdited: false,
  isDeleted: false,
  createdAt: new Date('2024-01-02T12:00:00Z'),
  updatedAt: new Date('2024-01-02T12:00:00Z'),
};

const mockGroupChat: GroupConversation = {
  id: 'chat-2',
  type: 'group',
  name: 'Test Group',
  avatar: null,
  unreadCount: 0,
  isPinned: true,
  isMuted: false,
  lastMessage: mockGroupMessage,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  memberCount: 3,
  ownerId: 'user-1',
  announcement: null,
};

const mockChats: ChatConversation[] = [mockPrivateChat, mockGroupChat];

// ========================
// Mock API
// ========================

const createMockApi = (): ChatApi => ({
  getChats: vi.fn().mockResolvedValue(mockChats),
  getChat: vi.fn().mockImplementation((chatId: string) => {
    const chat = mockChats.find((c) => c.id === chatId);
    return chat ? Promise.resolve(chat) : Promise.reject(new Error('Chat not found'));
  }),
  createPrivateChat: vi.fn().mockResolvedValue(mockPrivateChat),
  createGroupChat: vi.fn().mockResolvedValue(mockGroupChat),
  deleteChat: vi.fn().mockResolvedValue(undefined),
  pinChat: vi.fn().mockResolvedValue(undefined),
  muteChat: vi.fn().mockResolvedValue(undefined),
  markAsRead: vi.fn().mockResolvedValue(undefined),
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

describe('useChat', () => {
  let mockApi: ChatApi;

  beforeEach(() => {
    // 重置 store
    useChatStore.getState().reset();
    // 创建新的 mock API
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
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 等待初始 query 完成
      await waitFor(() => {
        expect(result.current.isFetchingChats).toBe(false);
      });

      expect(result.current.currentChatId).toBeNull();
      expect(result.current.currentChat).toBeNull();
    });

    it('should have all mutation states as false initially', () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isCreatingPrivateChat).toBe(false);
      expect(result.current.isCreatingGroupChat).toBe(false);
      expect(result.current.isDeletingChat).toBe(false);
    });
  });

  // ========================
  // 获取会话列表测试
  // ========================

  describe('Fetch Chats', () => {
    it('should fetch chats successfully', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.fetchChats();
      });

      expect(mockApi.getChats).toHaveBeenCalled();
      expect(result.current.chats).toHaveLength(2);
    });

    it('should set loading state during fetch', async () => {
      let resolveChats: (value: ChatConversation[]) => void;
      (mockApi.getChats as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveChats = resolve;
          })
      );

      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.fetchChats();
      });

      await waitFor(() => {
        expect(result.current.isFetchingChats).toBe(true);
      });

      await act(async () => {
        resolveChats!(mockChats);
      });

      await waitFor(() => {
        expect(result.current.isFetchingChats).toBe(false);
      });
    });
  });

  // ========================
  // 切换当前会话测试
  // ========================

  describe('Set Current Chat', () => {
    it('should set current chat', async () => {
      const onChatChange = vi.fn();
      const { result } = renderHook(() => useChat({ api: mockApi, onChatChange }), {
        wrapper: createWrapper(),
      });

      // 先加载会话
      await act(async () => {
        await result.current.fetchChats();
      });

      // 切换会话
      act(() => {
        result.current.setCurrentChat('chat-1');
      });

      await waitFor(() => {
        expect(result.current.currentChatId).toBe('chat-1');
        expect(result.current.currentChat?.id).toBe('chat-1');
        // 切换会话会自动标记已读，所以 unreadCount 会变为 0
        expect(result.current.currentChat?.unreadCount).toBe(0);
        expect(onChatChange).toHaveBeenCalledWith('chat-1');
      });
    });

    it('should mark as read when switching chat', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先加载会话
      await act(async () => {
        await result.current.fetchChats();
      });

      // 切换会话
      act(() => {
        result.current.setCurrentChat('chat-1');
      });

      await waitFor(() => {
        expect(mockApi.markAsRead).toHaveBeenCalledWith('chat-1');
      });
    });

    it('should clear current chat when passing null', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先设置当前会话
      await act(async () => {
        await result.current.fetchChats();
      });

      act(() => {
        result.current.setCurrentChat('chat-1');
      });

      await waitFor(() => {
        expect(result.current.currentChatId).toBe('chat-1');
      });

      // 清除当前会话
      act(() => {
        result.current.setCurrentChat(null);
      });

      expect(result.current.currentChatId).toBeNull();
      expect(result.current.currentChat).toBeNull();
    });
  });

  // ========================
  // 创建私聊测试
  // ========================

  describe('Create Private Chat', () => {
    it('should create private chat successfully', async () => {
      const newPrivateChat: PrivateConversation = {
        ...mockPrivateChat,
        id: 'chat-new',
        participant: { ...mockUserBrief, id: 'user-3', username: 'user3', nickname: 'User 3' },
      };
      (mockApi.createPrivateChat as ReturnType<typeof vi.fn>).mockResolvedValue(newPrivateChat);

      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      let createdChat: PrivateConversation;
      await act(async () => {
        createdChat = await result.current.createPrivateChat('user-3');
      });

      expect(mockApi.createPrivateChat).toHaveBeenCalledWith('user-3');
      expect(createdChat!).toEqual(newPrivateChat);
    });

    it('should set isCreatingPrivateChat during creation', async () => {
      let resolveCreate: (value: PrivateConversation) => void;
      (mockApi.createPrivateChat as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          })
      );

      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      let createPromise: Promise<PrivateConversation>;
      act(() => {
        createPromise = result.current.createPrivateChat('user-3');
      });

      await waitFor(() => {
        expect(result.current.isCreatingPrivateChat).toBe(true);
      });

      await act(async () => {
        resolveCreate!(mockPrivateChat);
        await createPromise;
      });

      await waitFor(() => {
        expect(result.current.isCreatingPrivateChat).toBe(false);
      });
    });

    it('should handle create private chat error', async () => {
      const error = new Error('User not found');
      (mockApi.createPrivateChat as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      const onError = vi.fn();

      const { result } = renderHook(() => useChat({ api: mockApi, onError }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.createPrivateChat('invalid-user');
        } catch {
          // Expected error
        }
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  // ========================
  // 创建群聊测试
  // ========================

  describe('Create Group Chat', () => {
    it('should create group chat successfully', async () => {
      const newGroupChat: GroupConversation = {
        ...mockGroupChat,
        id: 'chat-new-group',
        name: 'New Group',
      };
      (mockApi.createGroupChat as ReturnType<typeof vi.fn>).mockResolvedValue(newGroupChat);

      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      let createdChat: GroupConversation;
      await act(async () => {
        createdChat = await result.current.createGroupChat({
          name: 'New Group',
          memberIds: ['user-2', 'user-3'],
        });
      });

      expect(mockApi.createGroupChat).toHaveBeenCalledWith({
        name: 'New Group',
        memberIds: ['user-2', 'user-3'],
      });
      expect(createdChat!).toEqual(newGroupChat);
    });

    it('should set isCreatingGroupChat during creation', async () => {
      let resolveCreate: (value: GroupConversation) => void;
      (mockApi.createGroupChat as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          })
      );

      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      let createPromise: Promise<GroupConversation>;
      act(() => {
        createPromise = result.current.createGroupChat({
          name: 'New Group',
          memberIds: ['user-2'],
        });
      });

      await waitFor(() => {
        expect(result.current.isCreatingGroupChat).toBe(true);
      });

      await act(async () => {
        resolveCreate!(mockGroupChat);
        await createPromise;
      });

      await waitFor(() => {
        expect(result.current.isCreatingGroupChat).toBe(false);
      });
    });
  });

  // ========================
  // 删除会话测试
  // ========================

  describe('Delete Chat', () => {
    it('should delete chat successfully', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先加载会话
      await act(async () => {
        await result.current.fetchChats();
      });

      expect(result.current.chats).toHaveLength(2);

      // 删除后 getChats 返回剩余的会话
      (mockApi.getChats as ReturnType<typeof vi.fn>).mockResolvedValue([mockGroupChat]);

      // 删除会话
      await act(async () => {
        await result.current.deleteChat('chat-1');
      });

      expect(mockApi.deleteChat).toHaveBeenCalledWith('chat-1');

      // 等待状态更新（invalidateQueries 会重新获取）
      await waitFor(() => {
        expect(result.current.chats).toHaveLength(1);
        expect(result.current.chats[0]?.id).toBe('chat-2');
      });
    });

    it('should set isDeletingChat during deletion', async () => {
      let resolveDelete: (value?: unknown) => void;
      (mockApi.deleteChat as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveDelete = resolve;
          })
      );

      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.deleteChat('chat-1');
      });

      await waitFor(() => {
        expect(result.current.isDeletingChat).toBe(true);
      });

      await act(async () => {
        resolveDelete!();
        await deletePromise;
      });

      await waitFor(() => {
        expect(result.current.isDeletingChat).toBe(false);
      });
    });
  });

  // ========================
  // 置顶会话测试
  // ========================

  describe('Toggle Pin', () => {
    it('should toggle pin chat', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先加载会话
      await act(async () => {
        await result.current.fetchChats();
      });

      // chat-1 初始未置顶
      const chat1 = result.current.chats.find((c) => c.id === 'chat-1');
      expect(chat1?.isPinned).toBe(false);

      // 置顶
      await act(async () => {
        await result.current.togglePin('chat-1');
      });

      expect(mockApi.pinChat).toHaveBeenCalledWith('chat-1', true);

      // 验证 store 中状态已更新
      const updatedChat1 = result.current.chats.find((c) => c.id === 'chat-1');
      expect(updatedChat1?.isPinned).toBe(true);
    });

    it('should handle pin error', async () => {
      const error = new Error('Pin failed');
      (mockApi.pinChat as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      const onError = vi.fn();

      const { result } = renderHook(() => useChat({ api: mockApi, onError }), {
        wrapper: createWrapper(),
      });

      // 先加载会话
      await act(async () => {
        await result.current.fetchChats();
      });

      await act(async () => {
        try {
          await result.current.togglePin('chat-1');
        } catch {
          // Expected error
        }
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  // ========================
  // 静音会话测试
  // ========================

  describe('Toggle Mute', () => {
    it('should toggle mute chat', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先加载会话
      await act(async () => {
        await result.current.fetchChats();
      });

      // chat-1 初始未静音
      const chat1 = result.current.chats.find((c) => c.id === 'chat-1');
      expect(chat1?.isMuted).toBe(false);

      // 静音
      await act(async () => {
        await result.current.toggleMute('chat-1');
      });

      expect(mockApi.muteChat).toHaveBeenCalledWith('chat-1', true);

      // 验证 store 中状态已更新
      const updatedChat1 = result.current.chats.find((c) => c.id === 'chat-1');
      expect(updatedChat1?.isMuted).toBe(true);
    });
  });

  // ========================
  // 标记已读测试
  // ========================

  describe('Mark As Read', () => {
    it('should mark chat as read', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      // 先加载会话
      await act(async () => {
        await result.current.fetchChats();
      });

      // chat-1 有 2 条未读
      const chat1 = result.current.chats.find((c) => c.id === 'chat-1');
      expect(chat1?.unreadCount).toBe(2);

      // 标记已读
      await act(async () => {
        await result.current.markAsRead('chat-1');
      });

      expect(mockApi.markAsRead).toHaveBeenCalledWith('chat-1');

      // 验证未读数清零
      const updatedChat1 = result.current.chats.find((c) => c.id === 'chat-1');
      expect(updatedChat1?.unreadCount).toBe(0);
    });
  });

  // ========================
  // 过滤列表测试
  // ========================

  describe('Filtered Lists', () => {
    it('should return private chats only', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.fetchChats();
      });

      expect(result.current.privateChats).toHaveLength(1);
      expect(result.current.privateChats[0]?.type).toBe('private');
    });

    it('should return group chats only', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.fetchChats();
      });

      expect(result.current.groupChats).toHaveLength(1);
      expect(result.current.groupChats[0]?.type).toBe('group');
    });

    it('should return pinned chats only', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.fetchChats();
      });

      expect(result.current.pinnedChats).toHaveLength(1);
      expect(result.current.pinnedChats[0]?.isPinned).toBe(true);
    });
  });

  // ========================
  // 未读计数测试
  // ========================

  describe('Unread Count', () => {
    it('should calculate total unread count', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.fetchChats();
      });

      // chat-1 有 2 条未读，chat-2 有 0 条
      expect(result.current.totalUnreadCount).toBe(2);
    });

    it('should update total unread count after marking as read', async () => {
      const { result } = renderHook(() => useChat({ api: mockApi }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.fetchChats();
      });

      expect(result.current.totalUnreadCount).toBe(2);

      await act(async () => {
        await result.current.markAsRead('chat-1');
      });

      expect(result.current.totalUnreadCount).toBe(0);
    });
  });
});

// ========================
// 辅助 Hooks 测试
// ========================

describe('useChatById', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('should return null for null chatId', () => {
    const { result } = renderHook(() => useChatById(null));
    expect(result.current).toBeNull();
  });

  it('should return null for non-existent chat', () => {
    const { result } = renderHook(() => useChatById('non-existent'));
    expect(result.current).toBeNull();
  });

  it('should return chat when exists', () => {
    const chat: PrivateConversation = {
      id: 'chat-1',
      type: 'private',
      name: null,
      avatar: null,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      lastMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participant: mockUserBrief,
    };

    act(() => {
      useChatStore.getState().addChat(chat);
    });

    const { result } = renderHook(() => useChatById('chat-1'));
    expect(result.current).toEqual(chat);
  });
});

describe('useHasUnread', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('should return false when no unread messages', () => {
    const { result } = renderHook(() => useHasUnread());
    expect(result.current).toBe(false);
  });

  it('should return true when has unread messages', () => {
    const chat: PrivateConversation = {
      id: 'chat-1',
      type: 'private',
      name: null,
      avatar: null,
      unreadCount: 5,
      isPinned: false,
      isMuted: false,
      lastMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participant: mockUserBrief,
    };

    act(() => {
      useChatStore.getState().addChat(chat);
    });

    const { result } = renderHook(() => useHasUnread());
    expect(result.current).toBe(true);
  });
});

describe('useUnreadChatCount', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('should return 0 when no chats', () => {
    const { result } = renderHook(() => useUnreadChatCount());
    expect(result.current).toBe(0);
  });

  it('should count chats with unread messages', () => {
    const chat1: PrivateConversation = {
      id: 'chat-1',
      type: 'private',
      name: null,
      avatar: null,
      unreadCount: 5,
      isPinned: false,
      isMuted: false,
      lastMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participant: mockUserBrief,
    };

    const chat2: PrivateConversation = {
      id: 'chat-2',
      type: 'private',
      name: null,
      avatar: null,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      lastMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participant: { ...mockUserBrief, id: 'user-3', username: 'user3', nickname: 'User 3' },
    };

    const chat3: GroupConversation = {
      id: 'chat-3',
      type: 'group',
      name: 'Group',
      avatar: null,
      unreadCount: 3,
      isPinned: false,
      isMuted: false,
      lastMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      memberCount: 3,
      ownerId: 'user-1',
      announcement: null,
    };

    act(() => {
      useChatStore.getState().setChats([chat1, chat2, chat3]);
    });

    const { result } = renderHook(() => useUnreadChatCount());
    // chat1 和 chat3 有未读消息
    expect(result.current).toBe(2);
  });
});
