/**
 * Query Keys 测试
 */

import { describe, it, expect } from 'vitest';
import {
  userKeys,
  chatKeys,
  messageKeys,
  contactKeys,
  groupKeys,
  notificationKeys,
  queryKeys,
} from '../../queries/keys';

describe('Query Keys', () => {
  describe('userKeys', () => {
    it('should have correct all key', () => {
      expect(userKeys.all).toEqual(['users']);
    });

    it('should have correct lists key', () => {
      expect(userKeys.lists()).toEqual(['users', 'list']);
    });

    it('should have correct list key with filters', () => {
      const filters = { status: 'online' };
      expect(userKeys.list(filters)).toEqual(['users', 'list', filters]);
    });

    it('should have correct details key', () => {
      expect(userKeys.details()).toEqual(['users', 'detail']);
    });

    it('should have correct detail key', () => {
      expect(userKeys.detail('user-123')).toEqual(['users', 'detail', 'user-123']);
    });

    it('should have correct search key', () => {
      expect(userKeys.search('john')).toEqual(['users', 'search', 'john']);
    });

    it('should have correct me key', () => {
      expect(userKeys.me()).toEqual(['users', 'me']);
    });

    it('should have correct settings key', () => {
      expect(userKeys.settings()).toEqual(['users', 'settings']);
    });
  });

  describe('chatKeys', () => {
    it('should have correct all key', () => {
      expect(chatKeys.all).toEqual(['chats']);
    });

    it('should have correct lists key', () => {
      expect(chatKeys.lists()).toEqual(['chats', 'list']);
    });

    it('should have correct list key with filters', () => {
      const filters = { type: 'private' };
      expect(chatKeys.list(filters)).toEqual(['chats', 'list', filters]);
    });

    it('should have correct detail key', () => {
      expect(chatKeys.detail('chat-123')).toEqual(['chats', 'detail', 'chat-123']);
    });

    it('should have correct members key', () => {
      expect(chatKeys.members('chat-123')).toEqual(['chats', 'detail', 'chat-123', 'members']);
    });
  });

  describe('messageKeys', () => {
    it('should have correct all key', () => {
      expect(messageKeys.all).toEqual(['messages']);
    });

    it('should have correct chat key', () => {
      expect(messageKeys.chat('chat-123')).toEqual(['messages', 'chat', 'chat-123']);
    });

    it('should have correct list key', () => {
      expect(messageKeys.list('chat-123')).toEqual([
        'messages',
        'chat',
        'chat-123',
        'list',
        undefined,
      ]);
    });

    it('should have correct list key with cursor', () => {
      expect(messageKeys.list('chat-123', 'cursor-456')).toEqual([
        'messages',
        'chat',
        'chat-123',
        'list',
        'cursor-456',
      ]);
    });

    it('should have correct detail key', () => {
      expect(messageKeys.detail('msg-123')).toEqual(['messages', 'detail', 'msg-123']);
    });

    it('should have correct search key', () => {
      expect(messageKeys.search('chat-123', 'hello')).toEqual([
        'messages',
        'chat',
        'chat-123',
        'search',
        'hello',
      ]);
    });
  });

  describe('contactKeys', () => {
    it('should have correct all key', () => {
      expect(contactKeys.all).toEqual(['contacts']);
    });

    it('should have correct lists key', () => {
      expect(contactKeys.lists()).toEqual(['contacts', 'list']);
    });

    it('should have correct requests key', () => {
      expect(contactKeys.requests()).toEqual(['contacts', 'requests']);
    });

    it('should have correct receivedRequests key', () => {
      expect(contactKeys.receivedRequests()).toEqual(['contacts', 'requests', 'received']);
    });

    it('should have correct sentRequests key', () => {
      expect(contactKeys.sentRequests()).toEqual(['contacts', 'requests', 'sent']);
    });
  });

  describe('groupKeys', () => {
    it('should have correct all key', () => {
      expect(groupKeys.all).toEqual(['groups']);
    });

    it('should have correct detail key', () => {
      expect(groupKeys.detail('group-123')).toEqual(['groups', 'detail', 'group-123']);
    });

    it('should have correct members key', () => {
      expect(groupKeys.members('group-123')).toEqual(['groups', 'detail', 'group-123', 'members']);
    });

    it('should have correct settings key', () => {
      expect(groupKeys.settings('group-123')).toEqual([
        'groups',
        'detail',
        'group-123',
        'settings',
      ]);
    });
  });

  describe('notificationKeys', () => {
    it('should have correct all key', () => {
      expect(notificationKeys.all).toEqual(['notifications']);
    });

    it('should have correct list key', () => {
      expect(notificationKeys.list()).toEqual(['notifications', 'list']);
    });

    it('should have correct unreadCount key', () => {
      expect(notificationKeys.unreadCount()).toEqual(['notifications', 'unread-count']);
    });
  });

  describe('queryKeys (unified export)', () => {
    it('should export all key factories', () => {
      expect(queryKeys.users).toBe(userKeys);
      expect(queryKeys.chats).toBe(chatKeys);
      expect(queryKeys.messages).toBe(messageKeys);
      expect(queryKeys.contacts).toBe(contactKeys);
      expect(queryKeys.groups).toBe(groupKeys);
      expect(queryKeys.notifications).toBe(notificationKeys);
    });
  });
});
