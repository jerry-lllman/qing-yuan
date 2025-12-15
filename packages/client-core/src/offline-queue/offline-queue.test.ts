/**
 * 离线消息队列测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OfflineQueue, QueueError } from './offline-queue';
import { QueueStorage } from './queue-storage';
import { QueueItemStatus, QueuePriority, QueueItemType } from './types';
import { MemoryStorageAdapter } from '../storage/adapters/memory';

describe('QueueStorage', () => {
  let storage: MemoryStorageAdapter;
  let queueStorage: QueueStorage;

  beforeEach(async () => {
    storage = new MemoryStorageAdapter({ namespace: 'app' });
    await storage.init();
    queueStorage = new QueueStorage(storage);
    await queueStorage.init();
  });

  describe('init', () => {
    it('should initialize empty queue', async () => {
      expect(queueStorage.size).toBe(0);
      expect(queueStorage.isEmpty).toBe(true);
    });

    it('should restore items from storage', async () => {
      // 直接添加一些项
      await queueStorage.add({
        id: 'test-1',
        type: QueueItemType.SEND_MESSAGE,
        payload: { text: 'hello' },
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
      });

      // 创建新的 storage 实例
      const newQueueStorage = new QueueStorage(storage);
      await newQueueStorage.init();

      expect(newQueueStorage.size).toBe(1);
      expect(newQueueStorage.get('test-1')).toBeDefined();
    });

    it('should reset SENDING status to PENDING on init', async () => {
      await queueStorage.add({
        id: 'test-1',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.SENDING,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
      });

      const newQueueStorage = new QueueStorage(storage);
      await newQueueStorage.init();

      const item = newQueueStorage.get('test-1');
      expect(item?.status).toBe(QueueItemStatus.PENDING);
    });
  });

  describe('add/get/remove', () => {
    it('should add and get item', async () => {
      const item = {
        id: 'test-1',
        type: QueueItemType.SEND_MESSAGE,
        payload: { text: 'hello' },
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
      };

      await queueStorage.add(item);

      expect(queueStorage.size).toBe(1);
      expect(queueStorage.get('test-1')).toEqual(item);
    });

    it('should remove item', async () => {
      await queueStorage.add({
        id: 'test-1',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
      });

      const result = await queueStorage.remove('test-1');

      expect(result).toBe(true);
      expect(queueStorage.size).toBe(0);
    });

    it('should return false when removing non-existent item', async () => {
      const result = await queueStorage.remove('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('should update item', async () => {
      await queueStorage.add({
        id: 'test-1',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
      });

      const updated = await queueStorage.update('test-1', {
        status: QueueItemStatus.SUCCESS,
      });

      expect(updated?.status).toBe(QueueItemStatus.SUCCESS);
      expect(queueStorage.get('test-1')?.status).toBe(QueueItemStatus.SUCCESS);
    });

    it('should return null for non-existent item', async () => {
      const result = await queueStorage.update('non-existent', {
        status: QueueItemStatus.SUCCESS,
      });
      expect(result).toBeNull();
    });
  });

  describe('getPending', () => {
    it('should return pending items sorted by priority', async () => {
      await queueStorage.add({
        id: 'low',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.LOW,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
      });
      await queueStorage.add({
        id: 'high',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.HIGH,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now() + 1,
        lastAttemptAt: null,
        retryCount: 0,
      });
      await queueStorage.add({
        id: 'critical',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.CRITICAL,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now() + 2,
        lastAttemptAt: null,
        retryCount: 0,
      });

      const pending = queueStorage.getPending();

      expect(pending[0]!.id).toBe('critical');
      expect(pending[1]!.id).toBe('high');
      expect(pending[2]!.id).toBe('low');
    });

    it('should limit results', async () => {
      for (let i = 0; i < 5; i++) {
        await queueStorage.add({
          id: `item-${i}`,
          type: QueueItemType.SEND_MESSAGE,
          payload: {},
          priority: QueuePriority.NORMAL,
          status: QueueItemStatus.PENDING,
          createdAt: Date.now() + i,
          lastAttemptAt: null,
          retryCount: 0,
        });
      }

      const pending = queueStorage.getPending(3);
      expect(pending.length).toBe(3);
    });
  });

  describe('getExpired', () => {
    it('should return expired items', async () => {
      await queueStorage.add({
        id: 'expired',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now() - 10000,
        lastAttemptAt: null,
        retryCount: 0,
        expiresAt: Date.now() - 1000,
      });
      await queueStorage.add({
        id: 'not-expired',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
        expiresAt: Date.now() + 10000,
      });

      const expired = queueStorage.getExpired();

      expect(expired.length).toBe(1);
      expect(expired[0]!.id).toBe('expired');
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      await queueStorage.add({
        id: 'pending',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.PENDING,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
      });
      await queueStorage.add({
        id: 'success',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.SUCCESS,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
      });
      await queueStorage.add({
        id: 'failed',
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.NORMAL,
        status: QueueItemStatus.FAILED,
        createdAt: Date.now(),
        lastAttemptAt: null,
        retryCount: 0,
      });

      const stats = queueStorage.getStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.success).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });
});

describe('OfflineQueue', () => {
  let storage: MemoryStorageAdapter;
  let queue: OfflineQueue;

  beforeEach(async () => {
    storage = new MemoryStorageAdapter({ namespace: 'app' });
    await storage.init();
    queue = new OfflineQueue(storage, {
      autoProcess: false,
      maxRetries: 3,
      retryDelayMs: 100,
    });
    await queue.init();
  });

  afterEach(() => {
    queue.stopProcessing();
  });

  describe('add', () => {
    it('should add item to queue', async () => {
      const item = await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: { text: 'hello' },
      });

      expect(item.id).toBeDefined();
      expect(item.status).toBe(QueueItemStatus.PENDING);
      expect(item.priority).toBe(QueuePriority.NORMAL);
      expect(queue.size).toBe(1);
    });

    it('should emit queue:add event', async () => {
      const listener = vi.fn();
      queue.on('queue:add', listener);

      await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
      });

      expect(listener).toHaveBeenCalled();
    });

    it('should respect priority', async () => {
      await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.LOW,
      });
      await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        priority: QueuePriority.HIGH,
      });

      const pending = queue.getPending();
      expect(pending[0]!.priority).toBe(QueuePriority.HIGH);
    });

    it('should throw when queue is full', async () => {
      const smallQueue = new OfflineQueue(storage, {
        maxQueueSize: 2,
        autoProcess: false,
      });
      await smallQueue.init();

      await smallQueue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} });
      await smallQueue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} });

      await expect(
        smallQueue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} })
      ).rejects.toThrow(QueueError);
    });
  });

  describe('processing', () => {
    it('should process items with processor', async () => {
      const processor = vi.fn().mockResolvedValue({ success: true });
      queue.setProcessor(processor);

      await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: { text: 'hello' },
      });

      await queue.processNext();

      expect(processor).toHaveBeenCalled();
    });

    it('should mark item as success on successful processing', async () => {
      const processor = vi.fn().mockResolvedValue({ success: true });
      queue.setProcessor(processor);

      const item = await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
      });

      await queue.processNext();

      const updated = queue.get(item.id);
      expect(updated?.status).toBe(QueueItemStatus.SUCCESS);
    });

    it('should retry on failure', async () => {
      vi.useFakeTimers();

      const processor = vi.fn().mockRejectedValue(new Error('Network error'));
      queue.setProcessor(processor);

      const item = await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
      });

      await queue.processNext();

      const updated = queue.get(item.id);
      expect(updated?.status).toBe(QueueItemStatus.PENDING);
      expect(updated?.retryCount).toBe(1);
      expect(updated?.error).toBe('Network error');

      vi.useRealTimers();
    });

    it('should mark as failed after max retries', async () => {
      const processor = vi.fn().mockRejectedValue(new Error('Network error'));
      queue.setProcessor(processor);

      const item = await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
      });

      // Process multiple times to exhaust retries
      for (let i = 0; i <= 3; i++) {
        await queue.processNext();
      }

      const updated = queue.get(item.id);
      expect(updated?.status).toBe(QueueItemStatus.FAILED);
    });

    it('should emit events during processing', async () => {
      const processListener = vi.fn();
      const successListener = vi.fn();
      queue.on('queue:process', processListener);
      queue.on('queue:success', successListener);

      queue.setProcessor(vi.fn().mockResolvedValue({}));
      await queue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} });
      await queue.processNext();

      expect(processListener).toHaveBeenCalled();
      expect(successListener).toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('should retry failed item', async () => {
      const processor = vi.fn().mockRejectedValue(new Error('error'));
      queue.setProcessor(processor);

      const item = await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
      });

      // Exhaust retries
      for (let i = 0; i <= 3; i++) {
        await queue.processNext();
      }

      expect(queue.get(item.id)?.status).toBe(QueueItemStatus.FAILED);

      // Retry
      await queue.retry(item.id);

      const updated = queue.get(item.id);
      expect(updated?.status).toBe(QueueItemStatus.PENDING);
      expect(updated?.retryCount).toBe(0);
    });

    it('should retry all failed items', async () => {
      const processor = vi.fn().mockRejectedValue(new Error('error'));
      queue.setProcessor(processor);

      await queue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} });
      await queue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} });

      // Exhaust retries for both
      for (let i = 0; i <= 3; i++) {
        await queue.processNext(2);
      }

      expect(queue.getFailed().length).toBe(2);

      const count = await queue.retryAll();
      expect(count).toBe(2);
      expect(queue.getFailed().length).toBe(0);
    });
  });

  describe('network status', () => {
    it('should track online status', () => {
      expect(queue.isOnline).toBe(true);

      queue.setOnline(false);
      expect(queue.isOnline).toBe(false);

      queue.setOnline(true);
      expect(queue.isOnline).toBe(true);
    });

    it('should emit network:change event', () => {
      const listener = vi.fn();
      queue.on('network:change', listener);

      queue.setOnline(false);

      expect(listener).toHaveBeenCalledWith({ online: false });
    });
  });

  describe('clean', () => {
    it('should clean expired items', async () => {
      vi.useFakeTimers();

      // 添加一个 TTL 很短的项
      await queue.add({
        type: QueueItemType.SEND_MESSAGE,
        payload: {},
        ttl: 1000, // 1秒后过期
      });

      expect(queue.size).toBe(1);

      // 时间前进 2 秒
      vi.advanceTimersByTime(2000);

      const expiredListener = vi.fn();
      queue.on('queue:expired', expiredListener);

      const count = await queue.cleanExpired();

      expect(count).toBe(1);
      expect(queue.size).toBe(0);

      vi.useRealTimers();
    });

    it('should clean completed items', async () => {
      queue.setProcessor(vi.fn().mockResolvedValue({}));

      await queue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} });
      await queue.processNext();

      const stats = queue.getStats();
      expect(stats.success).toBe(1);

      const count = await queue.cleanCompleted();
      expect(count).toBe(1);
      expect(queue.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all items', async () => {
      await queue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} });
      await queue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} });

      const count = await queue.clear();

      expect(count).toBe(2);
      expect(queue.isEmpty).toBe(true);
    });

    it('should emit queue:clear event', async () => {
      const listener = vi.fn();
      queue.on('queue:clear', listener);

      await queue.add({ type: QueueItemType.SEND_MESSAGE, payload: {} });
      await queue.clear();

      expect(listener).toHaveBeenCalledWith({ count: 1 });
    });
  });

  describe('auto processing', () => {
    it('should start and stop processing', async () => {
      const startListener = vi.fn();
      const stopListener = vi.fn();
      queue.on('processor:start', startListener);
      queue.on('processor:stop', stopListener);

      queue.setProcessor(vi.fn().mockResolvedValue({}));
      queue.startProcessing();

      expect(queue.isProcessing).toBe(true);
      expect(startListener).toHaveBeenCalled();

      queue.stopProcessing();

      expect(queue.isProcessing).toBe(false);
      expect(stopListener).toHaveBeenCalled();
    });
  });
});

describe('QueueError', () => {
  it('should create queue full error', () => {
    const error = QueueError.queueFull();
    expect(error.code).toBe('QUEUE_FULL');
  });

  it('should create item not found error', () => {
    const error = QueueError.itemNotFound('test-id');
    expect(error.code).toBe('ITEM_NOT_FOUND');
    expect(error.message).toContain('test-id');
  });

  it('should create processor not set error', () => {
    const error = QueueError.processorNotSet();
    expect(error.code).toBe('PROCESSOR_NOT_SET');
  });

  it('should create network offline error', () => {
    const error = QueueError.networkOffline();
    expect(error.code).toBe('NETWORK_OFFLINE');
  });
});
