/**
 * 消息 Store 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useMessageStore,
  SendingStatus,
  getMessages,
  getMessage,
  getPendingMessages,
  getDraft,
  generateTempId,
  type PendingMessage,
  type DraftMessage,
} from './message.store';
import type { Message } from '@qyra/shared';

// 测试数据
const mockMessage: Message = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-1',
  sender: {
    id: 'user-1',
    username: 'test',
    nickname: 'Test User',
    avatar: null,
    status: 'online',
  },
  type: 'text',
  content: 'Hello, World!',
  attachments: [],
  replyTo: null,
  status: 'sent',
  isEdited: false,
  isDeleted: false,
  createdAt: new Date('2024-01-01T12:00:00'),
  updatedAt: new Date('2024-01-01T12:00:00'),
};

const mockMessage2: Message = {
  ...mockMessage,
  id: 'msg-2',
  content: 'Second message',
  createdAt: new Date('2024-01-01T12:01:00'),
  updatedAt: new Date('2024-01-01T12:01:00'),
};

const mockMessage3: Message = {
  ...mockMessage,
  id: 'msg-3',
  content: 'Third message',
  createdAt: new Date('2024-01-01T12:02:00'),
  updatedAt: new Date('2024-01-01T12:02:00'),
};

const mockPendingMessage: PendingMessage = {
  tempId: 'temp-1',
  conversationId: 'conv-1',
  content: 'Pending message',
  type: 'text',
  status: SendingStatus.PENDING,
  createdAt: new Date('2024-01-01T12:03:00'),
  retryCount: 0,
};

const mockDraft: DraftMessage = {
  conversationId: 'conv-1',
  content: 'Draft content',
  updatedAt: new Date('2024-01-01T12:00:00'),
};

describe('useMessageStore', () => {
  beforeEach(() => {
    useMessageStore.getState().reset();
  });

  describe('初始状态', () => {
    it('should have correct initial state', () => {
      const state = useMessageStore.getState();

      expect(state.messages.size).toBe(0);
      expect(state.pendingMessages.size).toBe(0);
      expect(state.drafts.size).toBe(0);
      expect(state.pagination.size).toBe(0);
      expect(state.editingMessageId).toBeNull();
    });
  });

  describe('消息操作', () => {
    describe('setMessages', () => {
      it('should set messages for a conversation', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage, mockMessage2]);

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages).toHaveLength(2);
        expect(messages?.[0]).toEqual(mockMessage);
        expect(messages?.[1]).toEqual(mockMessage2);
      });

      it('should update pagination info', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage, mockMessage2]);

        const pagination = useMessageStore.getState().pagination.get('conv-1');
        expect(pagination?.oldestMessageId).toBe('msg-1');
        expect(pagination?.newestMessageId).toBe('msg-2');
      });

      it('should replace existing messages', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage]);
        useMessageStore.getState().setMessages('conv-1', [mockMessage2]);

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages).toHaveLength(1);
        expect(messages?.[0]?.id).toBe('msg-2');
      });
    });

    describe('prependMessages', () => {
      it('should prepend messages to existing list', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage2, mockMessage3]);
        useMessageStore.getState().prependMessages('conv-1', [mockMessage]);

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages).toHaveLength(3);
        expect(messages?.[0]?.id).toBe('msg-1');
        expect(messages?.[1]?.id).toBe('msg-2');
        expect(messages?.[2]?.id).toBe('msg-3');
      });

      it('should update oldest message id', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage2]);
        useMessageStore.getState().prependMessages('conv-1', [mockMessage]);

        const pagination = useMessageStore.getState().pagination.get('conv-1');
        expect(pagination?.oldestMessageId).toBe('msg-1');
      });

      it('should handle empty existing messages', () => {
        useMessageStore.getState().prependMessages('conv-1', [mockMessage]);

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages).toHaveLength(1);
      });
    });

    describe('addMessage', () => {
      it('should add message to conversation', () => {
        useMessageStore.getState().addMessage('conv-1', mockMessage);

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages).toHaveLength(1);
        expect(messages?.[0]).toEqual(mockMessage);
      });

      it('should append to existing messages', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage]);
        useMessageStore.getState().addMessage('conv-1', mockMessage2);

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages).toHaveLength(2);
        expect(messages?.[1]?.id).toBe('msg-2');
      });

      it('should not add duplicate message', () => {
        useMessageStore.getState().addMessage('conv-1', mockMessage);
        useMessageStore.getState().addMessage('conv-1', mockMessage);

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages).toHaveLength(1);
      });

      it('should update newest message id', () => {
        useMessageStore.getState().addMessage('conv-1', mockMessage);

        const pagination = useMessageStore.getState().pagination.get('conv-1');
        expect(pagination?.newestMessageId).toBe('msg-1');
      });
    });

    describe('updateMessage', () => {
      it('should update message content', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage]);
        useMessageStore.getState().updateMessage('conv-1', 'msg-1', { content: 'Updated!' });

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages?.[0]?.content).toBe('Updated!');
      });

      it('should update message status', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage]);
        useMessageStore.getState().updateMessage('conv-1', 'msg-1', { status: 'read' });

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages?.[0]?.status).toBe('read');
      });

      it('should do nothing for non-existent message', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage]);
        useMessageStore.getState().updateMessage('conv-1', 'non-existent', { content: 'Updated!' });

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages?.[0]?.content).toBe('Hello, World!');
      });

      it('should do nothing for non-existent conversation', () => {
        useMessageStore.getState().updateMessage('non-existent', 'msg-1', { content: 'Updated!' });

        expect(useMessageStore.getState().messages.size).toBe(0);
      });
    });

    describe('deleteMessage', () => {
      it('should soft delete message', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage]);
        useMessageStore.getState().deleteMessage('conv-1', 'msg-1');

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages?.[0]?.isDeleted).toBe(true);
        expect(messages?.[0]?.content).toBe('');
      });

      it('should do nothing for non-existent message', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage]);
        useMessageStore.getState().deleteMessage('conv-1', 'non-existent');

        const messages = useMessageStore.getState().messages.get('conv-1');
        expect(messages?.[0]?.isDeleted).toBe(false);
      });
    });

    describe('clearMessages', () => {
      it('should clear all messages for conversation', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage, mockMessage2]);
        useMessageStore.getState().clearMessages('conv-1');

        expect(useMessageStore.getState().messages.get('conv-1')).toBeUndefined();
      });

      it('should clear pagination for conversation', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage]);
        useMessageStore.getState().clearMessages('conv-1');

        expect(useMessageStore.getState().pagination.get('conv-1')).toBeUndefined();
      });

      it('should not affect other conversations', () => {
        useMessageStore.getState().setMessages('conv-1', [mockMessage]);
        useMessageStore.getState().setMessages('conv-2', [mockMessage2]);
        useMessageStore.getState().clearMessages('conv-1');

        expect(useMessageStore.getState().messages.get('conv-1')).toBeUndefined();
        expect(useMessageStore.getState().messages.get('conv-2')).toHaveLength(1);
      });
    });
  });

  describe('待发送消息操作', () => {
    describe('addPendingMessage', () => {
      it('should add pending message', () => {
        useMessageStore.getState().addPendingMessage(mockPendingMessage);

        const pending = useMessageStore.getState().pendingMessages.get('conv-1');
        expect(pending).toHaveLength(1);
        expect(pending?.[0]).toEqual(mockPendingMessage);
      });

      it('should append to existing pending messages', () => {
        const pending2: PendingMessage = { ...mockPendingMessage, tempId: 'temp-2' };

        useMessageStore.getState().addPendingMessage(mockPendingMessage);
        useMessageStore.getState().addPendingMessage(pending2);

        const pending = useMessageStore.getState().pendingMessages.get('conv-1');
        expect(pending).toHaveLength(2);
      });
    });

    describe('updatePendingMessage', () => {
      it('should update pending message status', () => {
        useMessageStore.getState().addPendingMessage(mockPendingMessage);
        useMessageStore
          .getState()
          .updatePendingMessage('temp-1', { status: SendingStatus.SENDING });

        const pending = useMessageStore.getState().pendingMessages.get('conv-1');
        expect(pending?.[0]?.status).toBe(SendingStatus.SENDING);
      });

      it('should find message across conversations', () => {
        const pending2: PendingMessage = {
          ...mockPendingMessage,
          tempId: 'temp-2',
          conversationId: 'conv-2',
        };

        useMessageStore.getState().addPendingMessage(mockPendingMessage);
        useMessageStore.getState().addPendingMessage(pending2);
        useMessageStore.getState().updatePendingMessage('temp-2', { status: SendingStatus.SENT });

        const pending = useMessageStore.getState().pendingMessages.get('conv-2');
        expect(pending?.[0]?.status).toBe(SendingStatus.SENT);
      });
    });

    describe('removePendingMessage', () => {
      it('should remove pending message', () => {
        useMessageStore.getState().addPendingMessage(mockPendingMessage);
        useMessageStore.getState().removePendingMessage('conv-1', 'temp-1');

        expect(useMessageStore.getState().pendingMessages.get('conv-1')).toBeUndefined();
      });

      it('should keep other pending messages', () => {
        // 使用 reset 确保干净状态
        useMessageStore.getState().reset();

        // 创建两个不同的待发送消息
        const pending1: PendingMessage = {
          tempId: 'temp-keep-1',
          conversationId: 'conv-keep',
          content: 'Message 1',
          type: 'text',
          status: SendingStatus.PENDING,
          createdAt: new Date('2024-01-01T12:00:00'),
          retryCount: 0,
        };
        const pending2: PendingMessage = {
          tempId: 'temp-keep-2',
          conversationId: 'conv-keep',
          content: 'Message 2',
          type: 'text',
          status: SendingStatus.PENDING,
          createdAt: new Date('2024-01-01T12:01:00'),
          retryCount: 0,
        };

        // 一次性添加两个消息
        useMessageStore.getState().addPendingMessage(pending1);
        useMessageStore.getState().addPendingMessage(pending2);

        // 验证添加成功
        const beforeRemove = useMessageStore.getState().pendingMessages.get('conv-keep');
        expect(beforeRemove).toHaveLength(2);

        // 移除第一个 - 直接从新状态调用
        useMessageStore.getState().removePendingMessage('conv-keep', 'temp-keep-1');

        // 验证结果
        const remaining = useMessageStore.getState().pendingMessages.get('conv-keep');
        expect(remaining).toHaveLength(1);
        expect(remaining?.[0]?.tempId).toBe('temp-keep-2');
      });

      it('should delete conversation key when empty', () => {
        useMessageStore.getState().addPendingMessage(mockPendingMessage);
        useMessageStore.getState().removePendingMessage('conv-1', 'temp-1');

        expect(useMessageStore.getState().pendingMessages.has('conv-1')).toBe(false);
      });
    });

    describe('markPendingAsFailed', () => {
      it('should mark message as failed', () => {
        useMessageStore.getState().addPendingMessage(mockPendingMessage);
        useMessageStore.getState().markPendingAsFailed('temp-1', 'Network error');

        const pending = useMessageStore.getState().pendingMessages.get('conv-1');
        expect(pending?.[0]?.status).toBe(SendingStatus.FAILED);
        expect(pending?.[0]?.error).toBe('Network error');
        expect(pending?.[0]?.retryCount).toBe(1);
      });

      it('should increment retry count', () => {
        useMessageStore.getState().addPendingMessage(mockPendingMessage);
        useMessageStore.getState().markPendingAsFailed('temp-1', 'Error 1');
        useMessageStore.getState().markPendingAsFailed('temp-1', 'Error 2');

        const pending = useMessageStore.getState().pendingMessages.get('conv-1');
        expect(pending?.[0]?.retryCount).toBe(2);
      });
    });
  });

  describe('草稿操作', () => {
    describe('setDraft', () => {
      it('should set draft', () => {
        useMessageStore.getState().setDraft(mockDraft);

        const draft = useMessageStore.getState().drafts.get('conv-1');
        expect(draft).toEqual(mockDraft);
      });

      it('should replace existing draft', () => {
        useMessageStore.getState().setDraft(mockDraft);
        useMessageStore.getState().setDraft({ ...mockDraft, content: 'Updated draft' });

        const draft = useMessageStore.getState().drafts.get('conv-1');
        expect(draft?.content).toBe('Updated draft');
      });
    });

    describe('getDraft', () => {
      it('should get draft', () => {
        useMessageStore.getState().setDraft(mockDraft);

        const draft = useMessageStore.getState().getDraft('conv-1');
        expect(draft).toEqual(mockDraft);
      });

      it('should return undefined for non-existent draft', () => {
        const draft = useMessageStore.getState().getDraft('non-existent');
        expect(draft).toBeUndefined();
      });
    });

    describe('clearDraft', () => {
      it('should clear draft', () => {
        useMessageStore.getState().setDraft(mockDraft);
        useMessageStore.getState().clearDraft('conv-1');

        expect(useMessageStore.getState().drafts.get('conv-1')).toBeUndefined();
      });
    });
  });

  describe('分页操作', () => {
    describe('setPagination', () => {
      it('should set pagination', () => {
        useMessageStore.getState().setPagination('conv-1', { hasMore: false, isLoading: true });

        const pagination = useMessageStore.getState().pagination.get('conv-1');
        expect(pagination?.hasMore).toBe(false);
        expect(pagination?.isLoading).toBe(true);
      });

      it('should merge with existing pagination', () => {
        useMessageStore.getState().setPagination('conv-1', { oldestMessageId: 'msg-1' });
        useMessageStore.getState().setPagination('conv-1', { hasMore: false });

        const pagination = useMessageStore.getState().pagination.get('conv-1');
        expect(pagination?.oldestMessageId).toBe('msg-1');
        expect(pagination?.hasMore).toBe(false);
      });
    });
  });

  describe('编辑消息', () => {
    describe('setEditingMessage', () => {
      it('should set editing message id', () => {
        useMessageStore.getState().setEditingMessage('msg-1');

        expect(useMessageStore.getState().editingMessageId).toBe('msg-1');
      });

      it('should clear editing message', () => {
        useMessageStore.getState().setEditingMessage('msg-1');
        useMessageStore.getState().setEditingMessage(null);

        expect(useMessageStore.getState().editingMessageId).toBeNull();
      });
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useMessageStore.getState().setMessages('conv-1', [mockMessage]);
      useMessageStore.getState().addPendingMessage(mockPendingMessage);
      useMessageStore.getState().setDraft(mockDraft);
      useMessageStore.getState().setEditingMessage('msg-1');

      useMessageStore.getState().reset();

      const state = useMessageStore.getState();
      expect(state.messages.size).toBe(0);
      expect(state.pendingMessages.size).toBe(0);
      expect(state.drafts.size).toBe(0);
      expect(state.editingMessageId).toBeNull();
    });
  });
});

describe('工具函数', () => {
  beforeEach(() => {
    useMessageStore.getState().reset();
  });

  describe('getMessages', () => {
    it('should return messages for conversation', () => {
      useMessageStore.getState().setMessages('conv-1', [mockMessage]);

      expect(getMessages('conv-1')).toHaveLength(1);
    });

    it('should return empty array for non-existent conversation', () => {
      expect(getMessages('non-existent')).toEqual([]);
    });
  });

  describe('getMessage', () => {
    it('should return specific message', () => {
      useMessageStore.getState().setMessages('conv-1', [mockMessage, mockMessage2]);

      expect(getMessage('conv-1', 'msg-2')?.id).toBe('msg-2');
    });

    it('should return undefined for non-existent message', () => {
      useMessageStore.getState().setMessages('conv-1', [mockMessage]);

      expect(getMessage('conv-1', 'non-existent')).toBeUndefined();
    });
  });

  describe('getPendingMessages', () => {
    it('should return pending messages', () => {
      useMessageStore.getState().addPendingMessage(mockPendingMessage);

      expect(getPendingMessages('conv-1')).toHaveLength(1);
    });

    it('should return empty array for no pending', () => {
      expect(getPendingMessages('conv-1')).toEqual([]);
    });
  });

  describe('getDraft', () => {
    it('should return draft', () => {
      useMessageStore.getState().setDraft(mockDraft);

      expect(getDraft('conv-1')?.content).toBe('Draft content');
    });

    it('should return undefined for no draft', () => {
      expect(getDraft('conv-1')).toBeUndefined();
    });
  });

  describe('generateTempId', () => {
    it('should generate unique ids', () => {
      const id1 = generateTempId();
      const id2 = generateTempId();

      expect(id1).not.toBe(id2);
    });

    it('should start with temp_', () => {
      const id = generateTempId();

      expect(id.startsWith('temp_')).toBe(true);
    });
  });
});
