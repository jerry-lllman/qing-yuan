/**
 * useMessage Hook 单元测试
 */

import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useMessage,
  useMessageById,
  useHasPendingMessages,
  useFailedMessageCount,
  getFailedMessages,
  type MessageApi,
} from './use-message';
import { useMessageStore, SendingStatus, type PendingMessage } from '../stores/message.store';
import type { Message, UserBrief } from '@qing-yuan/shared';

// ========================
// Mock 数据
// ========================

const mockUserBrief: UserBrief = {
  id: 'user-1',
  username: 'user1',
  nickname: 'User 1',
  avatar: null,
  status: 'online',
};

const mockMessage1: Message = {
  id: 'msg-1',
  conversationId: 'chat-1',
  senderId: 'user-2',
  sender: { ...mockUserBrief, id: 'user-2', username: 'user2', nickname: 'User 2' },
  type: 'text',
  content: 'Hello!',
  attachments: [],
  replyTo: null,
  status: 'sent',
  isEdited: false,
  isDeleted: false,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

const mockMessage2: Message = {
  id: 'msg-2',
  conversationId: 'chat-1',
  senderId: 'user-1',
  sender: mockUserBrief,
  type: 'text',
  content: 'Hi there!',
  attachments: [],
  replyTo: null,
  status: 'sent',
  isEdited: false,
  isDeleted: false,
  createdAt: new Date('2024-01-01T10:01:00Z'),
  updatedAt: new Date('2024-01-01T10:01:00Z'),
};

const mockMessages = [mockMessage1, mockMessage2];

// ========================
// Mock API
// ========================

const createMockApi = (): MessageApi => ({
  getMessages: vi.fn().mockResolvedValue({ messages: mockMessages, hasMore: true }),
  sendMessage: vi.fn().mockImplementation((data) =>
    Promise.resolve({
      id: 'msg-new',
      conversationId: data.conversationId,
      senderId: 'user-1',
      sender: mockUserBrief,
      type: data.type,
      content: data.content,
      attachments: data.attachments || [],
      replyTo: data.replyTo || null,
      status: 'sent',
      isEdited: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  ),
  editMessage: vi.fn().mockImplementation((messageId, content) =>
    Promise.resolve({
      ...mockMessage1,
      id: messageId,
      content,
      isEdited: true,
      updatedAt: new Date(),
    })
  ),
  deleteMessage: vi.fn().mockResolvedValue(undefined),
  recallMessage: vi.fn().mockResolvedValue(undefined),
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

describe('useMessage', () => {
  let mockApi: MessageApi;
  const conversationId = 'chat-1';

  beforeEach(() => {
    useMessageStore.getState().reset();
    mockApi = createMockApi();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================
  // 初始状态测试
  // ========================

  describe('Initial State', () => {
    it('should return initial state before loading', async () => {
      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      // 初始状态
      expect(result.current.pendingMessages).toEqual([]);
      expect(result.current.draft).toBeUndefined();
      expect(result.current.editingMessageId).toBeNull();
    });

    it('should have all mutation states as false initially', () => {
      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSending).toBe(false);
      expect(result.current.isEditing).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });
  });

  // ========================
  // 获取消息列表测试
  // ========================

  describe('Fetch Messages', () => {
    it('should fetch messages successfully', async () => {
      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApi.getMessages).toHaveBeenCalledWith(conversationId, { limit: 20 });
      expect(result.current.messages).toHaveLength(2);
    });

    it('should update hasMore from response', async () => {
      (mockApi.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
        messages: mockMessages,
        hasMore: false,
      });

      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  // ========================
  // 发送消息测试
  // ========================

  describe('Send Message', () => {
    it('should send message successfully', async () => {
      const onSendSuccess = vi.fn();
      const { result } = renderHook(
        () => useMessage({ api: mockApi, conversationId, onSendSuccess }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.sendMessage({ type: 'text', content: 'Test message' });
      });

      expect(mockApi.sendMessage).toHaveBeenCalledWith({
        conversationId,
        type: 'text',
        content: 'Test message',
      });
      expect(onSendSuccess).toHaveBeenCalled();
    });

    it('should handle send message error', async () => {
      const error = new Error('Send failed');
      (mockApi.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      const onSendError = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(
        () => useMessage({ api: mockApi, conversationId, onSendError, onError }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.sendMessage({ type: 'text', content: 'Test' });
        } catch {
          // Expected error
        }
      });

      expect(onSendError).toHaveBeenCalled();
    });

    it('should clear draft after sending', async () => {
      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 设置草稿
      act(() => {
        result.current.setDraft('Draft content');
      });

      expect(result.current.draft?.content).toBe('Draft content');

      // 发送消息
      await act(async () => {
        await result.current.sendMessage({ type: 'text', content: 'Test' });
      });

      // 草稿应被清除
      expect(result.current.draft).toBeUndefined();
    });
  });

  // ========================
  // 编辑消息测试
  // ========================

  describe('Edit Message', () => {
    it('should edit message successfully', async () => {
      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.editMessage('msg-1', 'Updated content');
      });

      expect(mockApi.editMessage).toHaveBeenCalledWith('msg-1', 'Updated content');
    });

    it('should track editing state', async () => {
      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 开始编辑
      act(() => {
        result.current.startEditing('msg-1');
      });

      expect(result.current.editingMessageId).toBe('msg-1');

      // 取消编辑
      act(() => {
        result.current.cancelEditing();
      });

      expect(result.current.editingMessageId).toBeNull();
    });
  });

  // ========================
  // 删除消息测试
  // ========================

  describe('Delete Message', () => {
    it('should delete message successfully', async () => {
      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteMessage('msg-1');
      });

      expect(mockApi.deleteMessage).toHaveBeenCalledWith('msg-1');
    });
  });

  // ========================
  // 撤回消息测试
  // ========================

  describe('Recall Message', () => {
    it('should recall message successfully', async () => {
      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.recallMessage('msg-1');
      });

      expect(mockApi.recallMessage).toHaveBeenCalledWith('msg-1');
    });
  });

  // ========================
  // 草稿管理测试
  // ========================

  describe('Draft Management', () => {
    it('should set and clear draft', async () => {
      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 设置草稿
      act(() => {
        result.current.setDraft('Draft content', 'reply-to-msg');
      });

      expect(result.current.draft?.content).toBe('Draft content');
      expect(result.current.draft?.replyToId).toBe('reply-to-msg');

      // 清除草稿
      act(() => {
        result.current.clearDraft();
      });

      expect(result.current.draft).toBeUndefined();
    });
  });

  // ========================
  // 重试发送测试
  // ========================

  describe('Retry Send Message', () => {
    it('should retry sending failed message', async () => {
      // 第一次发送失败
      (mockApi.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 发送消息（会失败）
      await act(async () => {
        try {
          await result.current.sendMessage({ type: 'text', content: 'Test' });
        } catch {
          // Expected
        }
      });

      // 应有一条失败的待发送消息
      expect(result.current.pendingMessages).toHaveLength(1);
      expect(result.current.pendingMessages[0]?.status).toBe(SendingStatus.FAILED);

      // 重置 mock 使第二次成功
      (mockApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'msg-retry',
        conversationId,
        senderId: 'user-1',
        sender: mockUserBrief,
        type: 'text',
        content: 'Test',
        attachments: [],
        replyTo: null,
        status: 'sent',
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 重试
      const tempId = result.current.pendingMessages[0]?.tempId;
      if (tempId) {
        await act(async () => {
          await result.current.retrySendMessage(tempId);
        });
      }

      // 待发送消息应被移除
      expect(result.current.pendingMessages).toHaveLength(0);
    });

    it('should cancel pending message', async () => {
      // 发送失败
      (mockApi.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.sendMessage({ type: 'text', content: 'Test' });
        } catch {
          // Expected
        }
      });

      expect(result.current.pendingMessages).toHaveLength(1);

      // 取消发送
      const tempId = result.current.pendingMessages[0]?.tempId;
      if (tempId) {
        act(() => {
          result.current.cancelSendMessage(tempId);
        });
      }

      expect(result.current.pendingMessages).toHaveLength(0);
    });
  });

  // ========================
  // 加载更多测试
  // ========================

  describe('Fetch More Messages', () => {
    it('should fetch more messages', async () => {
      const olderMessages: Message[] = [
        {
          ...mockMessage1,
          id: 'msg-old-1',
          createdAt: new Date('2023-12-31T10:00:00Z'),
        },
      ];

      (mockApi.getMessages as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ messages: mockMessages, hasMore: true })
        .mockResolvedValueOnce({ messages: olderMessages, hasMore: false });

      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 手动设置 oldestMessageId（正常情况下由 setMessages 设置）
      act(() => {
        useMessageStore.getState().setPagination(conversationId, {
          oldestMessageId: 'msg-1',
        });
      });

      await act(async () => {
        await result.current.fetchMoreMessages();
      });

      expect(mockApi.getMessages).toHaveBeenCalledWith(conversationId, {
        before: 'msg-1',
        limit: 20,
      });
    });

    it('should not fetch more when hasMore is false', async () => {
      (mockApi.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
        messages: mockMessages,
        hasMore: false,
      });

      const { result } = renderHook(() => useMessage({ api: mockApi, conversationId }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = (mockApi.getMessages as ReturnType<typeof vi.fn>).mock.calls.length;

      await act(async () => {
        await result.current.fetchMoreMessages();
      });

      // 不应该有新的调用
      expect((mockApi.getMessages as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });
  });
});

// ========================
// 辅助 Hooks 测试
// ========================

describe('useMessageById', () => {
  const conversationId = 'chat-1';

  beforeEach(() => {
    useMessageStore.getState().reset();
  });

  it('should return undefined for null messageId', () => {
    const { result } = renderHook(() => useMessageById(conversationId, null));
    expect(result.current).toBeUndefined();
  });

  it('should return undefined for non-existent message', () => {
    const { result } = renderHook(() => useMessageById(conversationId, 'non-existent'));
    expect(result.current).toBeUndefined();
  });

  it('should return message when exists', () => {
    act(() => {
      useMessageStore.getState().setMessages(conversationId, [mockMessage1]);
    });

    const { result } = renderHook(() => useMessageById(conversationId, 'msg-1'));
    expect(result.current).toEqual(mockMessage1);
  });
});

describe('useHasPendingMessages', () => {
  const conversationId = 'chat-1';

  beforeEach(() => {
    useMessageStore.getState().reset();
  });

  it('should return false when no pending messages', () => {
    const { result } = renderHook(() => useHasPendingMessages(conversationId));
    expect(result.current).toBe(false);
  });

  it('should return true when has pending messages', () => {
    const pending: PendingMessage = {
      tempId: 'temp-1',
      conversationId,
      content: 'Test',
      type: 'text',
      status: SendingStatus.SENDING,
      createdAt: new Date(),
      retryCount: 0,
    };

    act(() => {
      useMessageStore.getState().addPendingMessage(pending);
    });

    const { result } = renderHook(() => useHasPendingMessages(conversationId));
    expect(result.current).toBe(true);
  });
});

describe('useFailedMessageCount and getFailedMessages', () => {
  const conversationId = 'chat-1';

  beforeEach(() => {
    useMessageStore.getState().reset();
  });

  it('should return 0 when no failed messages', () => {
    const { result } = renderHook(() => useFailedMessageCount(conversationId));
    expect(result.current).toBe(0);
  });

  it('should count only failed messages', () => {
    const sendingPending: PendingMessage = {
      tempId: 'temp-1',
      conversationId,
      content: 'Sending',
      type: 'text',
      status: SendingStatus.SENDING,
      createdAt: new Date(),
      retryCount: 0,
    };

    const failedPending: PendingMessage = {
      tempId: 'temp-2',
      conversationId,
      content: 'Failed',
      type: 'text',
      status: SendingStatus.FAILED,
      createdAt: new Date(),
      retryCount: 1,
      error: 'Network error',
    };

    act(() => {
      useMessageStore.getState().addPendingMessage(sendingPending);
      useMessageStore.getState().addPendingMessage(failedPending);
    });

    const { result } = renderHook(() => useFailedMessageCount(conversationId));
    expect(result.current).toBe(1);

    // 测试 getFailedMessages 工具函数
    const failedMessages = getFailedMessages(conversationId);
    expect(failedMessages).toHaveLength(1);
    expect(failedMessages[0]?.tempId).toBe('temp-2');
  });
});
