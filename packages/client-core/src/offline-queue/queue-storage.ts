/**
 * 队列存储管理
 * 负责队列的持久化存储
 */

import type { IStorageAdapter } from '../storage/types';
import type { QueueItem, QueueStats } from './types';
import { QueueItemStatus } from './types';

/** 存储键前缀 */
const QUEUE_KEY_PREFIX = 'offline-queue:';
const QUEUE_ITEMS_KEY = `${QUEUE_KEY_PREFIX}items`;
const QUEUE_META_KEY = `${QUEUE_KEY_PREFIX}meta`;

/** 队列元数据 */
interface QueueMeta {
  /** 最后处理时间 */
  lastProcessedAt: number;
  /** 最后清理时间 */
  lastCleanedAt: number;
  /** 版本（用于迁移） */
  version: number;
}

/**
 * 队列存储管理器
 */
export class QueueStorage {
  private items: Map<string, QueueItem> = new Map();
  private initialized = false;

  constructor(private readonly storage: IStorageAdapter) {}

  /**
   * 初始化存储，从持久化存储加载数据
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const savedItems = await this.storage.get<QueueItem[]>(QUEUE_ITEMS_KEY);
      if (savedItems && Array.isArray(savedItems)) {
        // 恢复队列项，重置发送中的状态为等待
        for (const item of savedItems) {
          if (item.status === QueueItemStatus.SENDING) {
            item.status = QueueItemStatus.PENDING;
          }
          this.items.set(item.id, item);
        }
      }
      this.initialized = true;
    } catch {
      // 存储读取失败，使用空队列
      this.items.clear();
      this.initialized = true;
    }
  }

  /**
   * 获取所有队列项
   */
  getAll(): QueueItem[] {
    return Array.from(this.items.values());
  }

  /**
   * 获取指定 ID 的队列项
   */
  get(id: string): QueueItem | undefined {
    return this.items.get(id);
  }

  /**
   * 添加队列项
   */
  async add(item: QueueItem): Promise<void> {
    this.items.set(item.id, item);
    await this.persist();
  }

  /**
   * 更新队列项
   */
  async update(id: string, updates: Partial<QueueItem>): Promise<QueueItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    const updated = { ...item, ...updates };
    this.items.set(id, updated);
    await this.persist();
    return updated;
  }

  /**
   * 删除队列项
   */
  async remove(id: string): Promise<boolean> {
    const deleted = this.items.delete(id);
    if (deleted) {
      await this.persist();
    }
    return deleted;
  }

  /**
   * 批量删除队列项
   */
  async removeMany(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (this.items.delete(id)) {
        count++;
      }
    }
    if (count > 0) {
      await this.persist();
    }
    return count;
  }

  /**
   * 清空队列
   */
  async clear(): Promise<number> {
    const count = this.items.size;
    this.items.clear();
    await this.persist();
    return count;
  }

  /**
   * 获取等待处理的项（按优先级排序）
   */
  getPending(limit?: number): QueueItem[] {
    const pending = Array.from(this.items.values())
      .filter((item) => item.status === QueueItemStatus.PENDING)
      .sort((a, b) => {
        // 先按优先级排序
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // 同优先级按创建时间排序
        return a.createdAt - b.createdAt;
      });

    return limit ? pending.slice(0, limit) : pending;
  }

  /**
   * 获取失败的项
   */
  getFailed(): QueueItem[] {
    return Array.from(this.items.values()).filter((item) => item.status === QueueItemStatus.FAILED);
  }

  /**
   * 获取过期的项
   */
  getExpired(): QueueItem[] {
    const now = Date.now();
    return Array.from(this.items.values()).filter(
      (item) => item.expiresAt && item.expiresAt < now && item.status !== QueueItemStatus.SUCCESS
    );
  }

  /**
   * 获取队列统计
   */
  getStats(): QueueStats {
    const stats: QueueStats = {
      total: 0,
      pending: 0,
      sending: 0,
      success: 0,
      failed: 0,
      expired: 0,
    };

    const now = Date.now();
    for (const item of this.items.values()) {
      stats.total++;
      if (item.expiresAt && item.expiresAt < now && item.status !== QueueItemStatus.SUCCESS) {
        stats.expired++;
      } else {
        switch (item.status) {
          case QueueItemStatus.PENDING:
            stats.pending++;
            break;
          case QueueItemStatus.SENDING:
            stats.sending++;
            break;
          case QueueItemStatus.SUCCESS:
            stats.success++;
            break;
          case QueueItemStatus.FAILED:
            stats.failed++;
            break;
          case QueueItemStatus.EXPIRED:
            stats.expired++;
            break;
        }
      }
    }

    return stats;
  }

  /**
   * 队列大小
   */
  get size(): number {
    return this.items.size;
  }

  /**
   * 检查队列是否为空
   */
  get isEmpty(): boolean {
    return this.items.size === 0;
  }

  /**
   * 检查是否存在指定 ID 的项
   */
  has(id: string): boolean {
    return this.items.has(id);
  }

  /**
   * 获取队列元数据
   */
  async getMeta(): Promise<QueueMeta> {
    const meta = await this.storage.get<QueueMeta>(QUEUE_META_KEY);
    return (
      meta ?? {
        lastProcessedAt: 0,
        lastCleanedAt: 0,
        version: 1,
      }
    );
  }

  /**
   * 更新队列元数据
   */
  async updateMeta(updates: Partial<QueueMeta>): Promise<void> {
    const meta = await this.getMeta();
    await this.storage.set(QUEUE_META_KEY, { ...meta, ...updates });
  }

  /**
   * 持久化队列到存储
   */
  private async persist(): Promise<void> {
    try {
      await this.storage.set(QUEUE_ITEMS_KEY, this.getAll());
    } catch {
      // 持久化失败静默处理
    }
  }
}
