/**
 * 会话 Store 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useChatStore,
  getCurrentChatId,
  getChat,
  getTotalUnreadCount,
  hasChat,
  type ChatConversation,
} from './chat.store';
import type { PrivateConversation, GroupConversation, Message } from '@qyra/shared';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

// 测试数据
const mockPrivateChat: PrivateConversation = {
  id: 'chat-private-1',
  type: 'private',
  name: null,
  avatar: null,
  lastMessage: null,
  unreadCount: 0,
  isPinned: false,
  isMuted: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  participant: {
    id: 'user-2',
    username: 'friend',
    nickname: 'Friend',
    avatar: null,
    status: 'online',
  },
};

const mockGroupChat: GroupConversation = {
  id: 'chat-group-1',
  type: 'group',
  name: 'Test Group',
  avatar: null,
  lastMessage: null,
  unreadCount: 0,
  isPinned: false,
  isMuted: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  memberCount: 5,
  ownerId: 'user-1',
  announcement: null,
};

const mockMessage: Message = {
  id: 'msg-1',
  conversationId: 'chat-private-1',
  senderId: 'user-2',
  sender: {
    id: 'user-2',
    username: 'friend',
    nickname: 'Friend',
    avatar: null,
    status: 'online',
  },
  type: 'text',
  content: 'Hello!',
  attachments: [],
  replyTo: null,
  status: 'sent',
  isEdited: false,
  isDeleted: false,
  createdAt: new Date('2024-01-01T12:00:00'),
  updatedAt: new Date('2024-01-01T12:00:00'),
};

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    localStorageMock.clear();
  });

  describe('初始状态', () => {
    it('should have correct initial state', () => {
      const state = useChatStore.getState();

      expect(state.chats.size).toBe(0);
      expect(state.chatIds).toEqual([]);
      expect(state.currentChatId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.totalUnreadCount).toBe(0);
    });
  });

  describe('setChats', () => {
    it('should set chat list', () => {
      useChatStore.getState().setChats([mockPrivateChat, mockGroupChat]);

      const state = useChatStore.getState();
      expect(state.chats.size).toBe(2);
      expect(state.chatIds.length).toBe(2);
    });

    it('should calculate total unread count', () => {
      const chatWithUnread: PrivateConversation = { ...mockPrivateChat, unreadCount: 5 };
      const groupWithUnread: GroupConversation = { ...mockGroupChat, unreadCount: 3 };

      useChatStore.getState().setChats([chatWithUnread, groupWithUnread]);

      expect(useChatStore.getState().totalUnreadCount).toBe(8);
    });

    it('should not count muted chats in total unread', () => {
      const mutedChat: PrivateConversation = { ...mockPrivateChat, unreadCount: 5, isMuted: true };
      const normalChat: GroupConversation = { ...mockGroupChat, unreadCount: 3 };

      useChatStore.getState().setChats([mutedChat, normalChat]);

      expect(useChatStore.getState().totalUnreadCount).toBe(3);
    });
  });

  describe('addChat', () => {
    it('should add a new chat', () => {
      useChatStore.getState().addChat(mockPrivateChat);

      expect(useChatStore.getState().chats.size).toBe(1);
      expect(useChatStore.getState().chats.get('chat-private-1')).toEqual(mockPrivateChat);
    });
  });

  describe('updateChat', () => {
    it('should update existing chat', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().updateChat('chat-private-1', { unreadCount: 10 });

      const chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.unreadCount).toBe(10);
    });

    it('should do nothing for non-existent chat', () => {
      useChatStore.getState().updateChat('non-existent', { unreadCount: 10 });

      expect(useChatStore.getState().chats.size).toBe(0);
    });
  });

  describe('removeChat', () => {
    it('should remove chat', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().removeChat('chat-private-1');

      expect(useChatStore.getState().chats.size).toBe(0);
      expect(useChatStore.getState().chatIds).toEqual([]);
    });

    it('should clear currentChatId if removed chat is current', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().setCurrentChat('chat-private-1');
      useChatStore.getState().removeChat('chat-private-1');

      expect(useChatStore.getState().currentChatId).toBeNull();
    });
  });

  describe('setCurrentChat', () => {
    it('should set current chat', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().setCurrentChat('chat-private-1');

      expect(useChatStore.getState().currentChatId).toBe('chat-private-1');
    });

    it('should auto mark as read when selecting chat', () => {
      const chatWithUnread: PrivateConversation = { ...mockPrivateChat, unreadCount: 5 };
      useChatStore.getState().addChat(chatWithUnread);

      useChatStore.getState().setCurrentChat('chat-private-1');

      const chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.unreadCount).toBe(0);
    });

    it('should clear current chat when set to null', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().setCurrentChat('chat-private-1');
      useChatStore.getState().setCurrentChat(null);

      expect(useChatStore.getState().currentChatId).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should mark chat as read', () => {
      const chatWithUnread: PrivateConversation = { ...mockPrivateChat, unreadCount: 5 };
      useChatStore.getState().addChat(chatWithUnread);

      useChatStore.getState().markAsRead('chat-private-1');

      const chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.unreadCount).toBe(0);
    });

    it('should update total unread count', () => {
      const chatWithUnread: PrivateConversation = { ...mockPrivateChat, unreadCount: 5 };
      useChatStore.getState().addChat(chatWithUnread);

      useChatStore.getState().markAsRead('chat-private-1');

      expect(useChatStore.getState().totalUnreadCount).toBe(0);
    });
  });

  describe('incrementUnread', () => {
    it('should increment unread count', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().incrementUnread('chat-private-1');

      const chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.unreadCount).toBe(1);
    });

    it('should increment by specified count', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().incrementUnread('chat-private-1', 5);

      const chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.unreadCount).toBe(5);
    });

    it('should not increment for current chat', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().setCurrentChat('chat-private-1');
      useChatStore.getState().incrementUnread('chat-private-1');

      const chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.unreadCount).toBe(0);
    });
  });

  describe('togglePin', () => {
    it('should toggle pin status', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().togglePin('chat-private-1');

      let chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.isPinned).toBe(true);

      useChatStore.getState().togglePin('chat-private-1');
      chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.isPinned).toBe(false);
    });

    it('should re-sort chat list after pin', () => {
      useChatStore
        .getState()
        .setChats([mockPrivateChat, { ...mockGroupChat, updatedAt: new Date('2024-01-02') }]);

      // 群聊更新时间更晚，应该在前面
      expect(useChatStore.getState().chatIds[0]).toBe('chat-group-1');

      // 置顶私聊后，私聊应该在前面
      useChatStore.getState().togglePin('chat-private-1');
      expect(useChatStore.getState().chatIds[0]).toBe('chat-private-1');
    });
  });

  describe('toggleMute', () => {
    it('should toggle mute status', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().toggleMute('chat-private-1');

      let chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.isMuted).toBe(true);

      useChatStore.getState().toggleMute('chat-private-1');
      chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.isMuted).toBe(false);
    });

    it('should update total unread count when muting', () => {
      const chatWithUnread: PrivateConversation = { ...mockPrivateChat, unreadCount: 5 };
      useChatStore.getState().addChat(chatWithUnread);

      expect(useChatStore.getState().totalUnreadCount).toBe(5);

      useChatStore.getState().toggleMute('chat-private-1');
      expect(useChatStore.getState().totalUnreadCount).toBe(0);
    });
  });

  describe('updateLastMessage', () => {
    it('should update last message', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().updateLastMessage('chat-private-1', mockMessage);

      const chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.lastMessage).toEqual(mockMessage);
    });

    it('should update updatedAt', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      const beforeUpdate = useChatStore.getState().chats.get('chat-private-1')?.updatedAt;

      useChatStore.getState().updateLastMessage('chat-private-1', mockMessage);

      const chat = useChatStore.getState().chats.get('chat-private-1');
      expect(chat?.updatedAt.getTime()).toBeGreaterThan(beforeUpdate!.getTime());
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useChatStore.getState().setLoading(true);
      expect(useChatStore.getState().isLoading).toBe(true);

      useChatStore.getState().setLoading(false);
      expect(useChatStore.getState().isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useChatStore.getState().setChats([mockPrivateChat, mockGroupChat]);
      useChatStore.getState().setCurrentChat('chat-private-1');

      useChatStore.getState().reset();

      const state = useChatStore.getState();
      expect(state.chats.size).toBe(0);
      expect(state.chatIds).toEqual([]);
      expect(state.currentChatId).toBeNull();
    });
  });
});

describe('工具函数', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  describe('getCurrentChatId', () => {
    it('should return current chat id', () => {
      useChatStore.getState().addChat(mockPrivateChat);
      useChatStore.getState().setCurrentChat('chat-private-1');

      expect(getCurrentChatId()).toBe('chat-private-1');
    });

    it('should return null when no chat selected', () => {
      expect(getCurrentChatId()).toBeNull();
    });
  });

  describe('getChat', () => {
    it('should return chat by id', () => {
      useChatStore.getState().addChat(mockPrivateChat);

      expect(getChat('chat-private-1')).toEqual(mockPrivateChat);
    });

    it('should return undefined for non-existent chat', () => {
      expect(getChat('non-existent')).toBeUndefined();
    });
  });

  describe('getTotalUnreadCount', () => {
    it('should return total unread count', () => {
      const chatWithUnread: PrivateConversation = { ...mockPrivateChat, unreadCount: 5 };
      useChatStore.getState().addChat(chatWithUnread);

      expect(getTotalUnreadCount()).toBe(5);
    });
  });

  describe('hasChat', () => {
    it('should return true if chat exists', () => {
      useChatStore.getState().addChat(mockPrivateChat);

      expect(hasChat('chat-private-1')).toBe(true);
    });

    it('should return false if chat does not exist', () => {
      expect(hasChat('non-existent')).toBe(false);
    });
  });
});
