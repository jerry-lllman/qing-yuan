/**
 * 同步管理器测试
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SyncManager, SyncError } from './sync-manager';
import { SyncCursorManager } from './sync-cursor';
import { SyncStrategy, SyncStatus } from './types';
import { MemoryStorageAdapter } from '../storage/adapters/memory';
import type { SocketClient } from '../socket';

// Mock SocketClient
const createMockSocket = (): {
  socket: SocketClient;
  requestSync: Mock;
} => {
  const requestSync = vi.fn();
  const socket = {
    requestSync,
  } as unknown as SocketClient;
  return { socket, requestSync };
};

describe('SyncCursorManager', () => {
  let storage: MemoryStorageAdapter;
  let cursorManager: SyncCursorManager;

  beforeEach(async () => {
    storage = new MemoryStorageAdapter({ namespace: 'app' });
    await storage.init();
    cursorManager = new SyncCursorManager(storage);
  });

  describe('global cursor', () => {
    it('should return empty cursor when no cursor exists', async () => {
      const cursor = await cursorManager.getGlobalCursor();
      expect(cursor).toEqual({
        lastMessageId: null,
        lastSyncTime: 0,
        chatId: undefined,
      });
    });

    it('should save and retrieve global cursor', async () => {
      const cursor = {
        lastMessageId: 'msg-123',
        lastSyncTime: 1700000000000,
      };
      await cursorManager.saveGlobalCursor(cursor);

      const retrieved = await cursorManager.getGlobalCursor();
      expect(retrieved.lastMessageId).toBe('msg-123');
      expect(retrieved.lastSyncTime).toBe(1700000000000);
    });

    it('should reset global cursor', async () => {
      await cursorManager.saveGlobalCursor({
        lastMessageId: 'msg-123',
        lastSyncTime: 1700000000000,
      });
      await cursorManager.resetGlobalCursor();

      const cursor = await cursorManager.getGlobalCursor();
      expect(cursor.lastMessageId).toBeNull();
      expect(cursor.lastSyncTime).toBe(0);
    });
  });

  describe('chat cursor', () => {
    it('should return empty cursor for new chat', async () => {
      const cursor = await cursorManager.getChatCursor('chat-1');
      expect(cursor).toEqual({
        lastMessageId: null,
        lastSyncTime: 0,
        chatId: 'chat-1',
      });
    });

    it('should save and retrieve chat cursor', async () => {
      await cursorManager.saveChatCursor('chat-1', {
        lastMessageId: 'msg-456',
        lastSyncTime: 1700000000000,
        chatId: 'chat-1',
      });

      const cursor = await cursorManager.getChatCursor('chat-1');
      expect(cursor.lastMessageId).toBe('msg-456');
      expect(cursor.chatId).toBe('chat-1');
    });

    it('should isolate cursors between chats', async () => {
      await cursorManager.saveChatCursor('chat-1', {
        lastMessageId: 'msg-1',
        lastSyncTime: 1000,
        chatId: 'chat-1',
      });
      await cursorManager.saveChatCursor('chat-2', {
        lastMessageId: 'msg-2',
        lastSyncTime: 2000,
        chatId: 'chat-2',
      });

      const cursor1 = await cursorManager.getChatCursor('chat-1');
      const cursor2 = await cursorManager.getChatCursor('chat-2');

      expect(cursor1.lastMessageId).toBe('msg-1');
      expect(cursor2.lastMessageId).toBe('msg-2');
    });

    it('should reset chat cursor', async () => {
      await cursorManager.saveChatCursor('chat-1', {
        lastMessageId: 'msg-123',
        lastSyncTime: 1000,
        chatId: 'chat-1',
      });
      await cursorManager.resetChatCursor('chat-1');

      const cursor = await cursorManager.getChatCursor('chat-1');
      expect(cursor.lastMessageId).toBeNull();
    });
  });

  describe('updateCursor', () => {
    it('should update global cursor', async () => {
      const cursor = await cursorManager.getGlobalCursor();
      const updated = await cursorManager.updateCursor(cursor, 'msg-new', 1700000000000);

      expect(updated.lastMessageId).toBe('msg-new');
      expect(updated.lastSyncTime).toBe(1700000000000);

      // Verify persisted
      const retrieved = await cursorManager.getGlobalCursor();
      expect(retrieved.lastMessageId).toBe('msg-new');
    });

    it('should update chat cursor', async () => {
      const cursor = await cursorManager.getChatCursor('chat-1');
      const updated = await cursorManager.updateCursor(cursor, 'msg-new', 1700000000000);

      expect(updated.lastMessageId).toBe('msg-new');
      expect(updated.chatId).toBe('chat-1');

      // Verify persisted
      const retrieved = await cursorManager.getChatCursor('chat-1');
      expect(retrieved.lastMessageId).toBe('msg-new');
    });
  });

  describe('getAllChatCursors', () => {
    it('should return all chat cursors', async () => {
      await cursorManager.saveChatCursor('chat-1', {
        lastMessageId: 'msg-1',
        lastSyncTime: 1000,
        chatId: 'chat-1',
      });
      await cursorManager.saveChatCursor('chat-2', {
        lastMessageId: 'msg-2',
        lastSyncTime: 2000,
        chatId: 'chat-2',
      });

      const cursors = await cursorManager.getAllChatCursors();
      expect(cursors.size).toBe(2);
      expect(cursors.get('chat-1')?.lastMessageId).toBe('msg-1');
      expect(cursors.get('chat-2')?.lastMessageId).toBe('msg-2');
    });
  });

  describe('clearAllCursors', () => {
    it('should clear all cursors', async () => {
      await cursorManager.saveGlobalCursor({
        lastMessageId: 'msg-global',
        lastSyncTime: 1000,
      });
      await cursorManager.saveChatCursor('chat-1', {
        lastMessageId: 'msg-1',
        lastSyncTime: 1000,
        chatId: 'chat-1',
      });

      await cursorManager.clearAllCursors();

      const global = await cursorManager.getGlobalCursor();
      const chat = await cursorManager.getChatCursor('chat-1');

      expect(global.lastMessageId).toBeNull();
      expect(chat.lastMessageId).toBeNull();
    });
  });
});

describe('SyncManager', () => {
  let storage: MemoryStorageAdapter;
  let mockSocket: ReturnType<typeof createMockSocket>;
  let syncManager: SyncManager;

  beforeEach(async () => {
    storage = new MemoryStorageAdapter({ namespace: 'app' });
    await storage.init();
    mockSocket = createMockSocket();
    syncManager = new SyncManager(mockSocket.socket, storage);
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(syncManager.getStatus()).toBe(SyncStatus.IDLE);
    });
  });

  describe('syncIncremental', () => {
    it('should request incremental sync', async () => {
      mockSocket.requestSync.mockResolvedValue({
        data: [
          { id: 'msg-1', chatId: 'chat-1', content: 'Hello' },
          { id: 'msg-2', chatId: 'chat-1', content: 'World' },
        ],
        hasMore: false,
        count: 2,
      });

      const result = await syncManager.syncIncremental();

      expect(result.count).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(mockSocket.requestSync).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: SyncStrategy.INCREMENTAL,
        })
      );
    });

    it('should sync specific chat', async () => {
      mockSocket.requestSync.mockResolvedValue({
        data: [{ id: 'msg-1' }],
        hasMore: false,
        count: 1,
      });

      await syncManager.syncIncremental('chat-123');

      expect(mockSocket.requestSync).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: 'chat-123',
        })
      );
    });

    it('should update cursor after sync', async () => {
      mockSocket.requestSync.mockResolvedValue({
        data: [{ id: 'msg-1' }, { id: 'msg-2' }],
        hasMore: false,
        nextCursor: { lastMessageId: 'msg-2', lastSyncTime: 1700000000000 },
      });

      await syncManager.syncIncremental();

      const cursor = await syncManager.getCursorManager().getGlobalCursor();
      expect(cursor.lastMessageId).toBe('msg-2');
    });
  });

  describe('syncFull', () => {
    it('should reset cursor before full sync', async () => {
      // Set existing cursor
      await syncManager.getCursorManager().saveGlobalCursor({
        lastMessageId: 'old-msg',
        lastSyncTime: 1000,
      });

      mockSocket.requestSync.mockResolvedValue({
        data: [{ id: 'msg-1' }],
        hasMore: false,
        count: 1,
      });

      await syncManager.syncFull();

      // Verify cursor was reset (request should have null cursor)
      expect(mockSocket.requestSync).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: null,
          timestamp: 0,
        })
      );
    });
  });

  describe('events', () => {
    it('should emit sync:start event', async () => {
      const listener = vi.fn();
      syncManager.on('sync:start', listener);

      mockSocket.requestSync.mockResolvedValue({ data: [], hasMore: false });
      await syncManager.syncIncremental();

      expect(listener).toHaveBeenCalledWith({
        strategy: SyncStrategy.INCREMENTAL,
        chatId: undefined,
      });
    });

    it('should emit sync:complete event', async () => {
      const listener = vi.fn();
      syncManager.on('sync:complete', listener);

      mockSocket.requestSync.mockResolvedValue({
        data: [{ id: 'msg-1' }],
        hasMore: false,
        count: 1,
      });
      await syncManager.syncIncremental();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCount: 1,
        })
      );
    });

    it('should emit sync:error on failure', async () => {
      const listener = vi.fn();
      syncManager.on('sync:error', listener);

      mockSocket.requestSync.mockRejectedValue(new Error('Network error'));

      await expect(syncManager.syncIncremental()).rejects.toThrow();
      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribe via returned function', async () => {
      const listener = vi.fn();
      const unsubscribe = syncManager.on('sync:start', listener);

      mockSocket.requestSync.mockResolvedValue({ data: [], hasMore: false });
      await syncManager.syncIncremental();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      await syncManager.syncIncremental();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('abort', () => {
    it('should set status to IDLE when aborted', () => {
      syncManager.abort();
      expect(syncManager.getStatus()).toBe(SyncStatus.IDLE);
    });
  });

  describe('auto sync', () => {
    it('should start and stop auto sync', async () => {
      vi.useFakeTimers();

      mockSocket.requestSync.mockResolvedValue({ data: [], hasMore: false });

      syncManager.startAutoSync(1000);

      // Advance one interval and wait for async completion
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockSocket.requestSync).toHaveBeenCalledTimes(1);

      // Advance another interval
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockSocket.requestSync).toHaveBeenCalledTimes(2);

      // Stop auto sync
      syncManager.stopAutoSync();

      // Advance more time - should not trigger more calls
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockSocket.requestSync).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should not trigger sync when already syncing', async () => {
      vi.useFakeTimers();

      // Make the sync hang for a while
      let resolveSync: () => void;
      mockSocket.requestSync.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSync = () => resolve({ data: [], hasMore: false });
          })
      );

      syncManager.startAutoSync(100);

      // First interval triggers
      await vi.advanceTimersByTimeAsync(100);
      expect(mockSocket.requestSync).toHaveBeenCalledTimes(1);

      // Second interval - but status is SYNCING, should not call
      await vi.advanceTimersByTimeAsync(100);
      expect(mockSocket.requestSync).toHaveBeenCalledTimes(1);

      // Resolve the first sync
      resolveSync!();
      await vi.advanceTimersByTimeAsync(0); // flush promises

      // Now next interval should trigger
      await vi.advanceTimersByTimeAsync(100);
      expect(mockSocket.requestSync).toHaveBeenCalledTimes(2);

      syncManager.stopAutoSync();
      vi.useRealTimers();
    });
  });
});

describe('SyncError', () => {
  it('should create network error', () => {
    const cause = new Error('Connection refused');
    const error = SyncError.networkError(cause);

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.retryable).toBe(true);
    expect(error.cause).toBe(cause);
  });

  it('should create timeout error', () => {
    const error = SyncError.timeout();

    expect(error.code).toBe('TIMEOUT');
    expect(error.retryable).toBe(true);
  });

  it('should create server error', () => {
    const error = SyncError.serverError('Internal server error');

    expect(error.code).toBe('SERVER_ERROR');
    expect(error.retryable).toBe(true);
  });

  it('should create invalid data error (non-retryable)', () => {
    const error = SyncError.invalidData('Invalid response format');

    expect(error.code).toBe('INVALID_DATA');
    expect(error.retryable).toBe(false);
  });
});
