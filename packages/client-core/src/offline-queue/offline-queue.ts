/**
 * 离线消息队列管理器
 * 负责队列的添加、处理、重试、过期清理等核心逻辑
 */

import type { IStorageAdapter } from '../storage/types';
import type {
  QueueItem,
  OfflineQueueConfig,
  QueueEvents,
  QueueEventListener,
  QueueProcessor,
  QueueStats,
  AddQueueItemOptions,
} from './types';
import { QueueItemStatus, QueuePriority, DEFAULT_QUEUE_CONFIG } from './types';
import { QueueStorage } from './queue-storage';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 队列错误
 */
export class QueueError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public override cause?: Error
  ) {
    super(message);
    this.name = 'QueueError';
  }

  static queueFull(): QueueError {
    return new QueueError('Queue is full', 'QUEUE_FULL');
  }

  static itemNotFound(id: string): QueueError {
    return new QueueError(`Queue item not found: ${id}`, 'ITEM_NOT_FOUND');
  }

  static processorNotSet(): QueueError {
    return new QueueError('Processor not set', 'PROCESSOR_NOT_SET');
  }

  static networkOffline(): QueueError {
    return new QueueError('Network is offline', 'NETWORK_OFFLINE');
  }
}

/**
 * 离线消息队列
 */
export class OfflineQueue {
  private readonly config: OfflineQueueConfig;
  private readonly storage: QueueStorage;
  private readonly listeners: Map<keyof QueueEvents, Set<QueueEventListener<keyof QueueEvents>>> =
    new Map();

  private processor: QueueProcessor | null = null;
  private processing = false;
  private processTimer: ReturnType<typeof setTimeout> | null = null;
  private online = true;
  private initialized = false;

  constructor(storageAdapter: IStorageAdapter, config: Partial<OfflineQueueConfig> = {}) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    this.storage = new QueueStorage(storageAdapter);
  }

  // ========================
  // 初始化
  // ========================

  /**
   * 初始化队列
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await this.storage.init();
    this.initialized = true;

    // 清理过期项
    await this.cleanExpired();

    // 如果配置了自动处理，启动处理器
    if (this.config.autoProcess && this.processor) {
      this.startProcessing();
    }
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new QueueError('Queue not initialized', 'NOT_INITIALIZED');
    }
  }

  // ========================
  // 公共 API
  // ========================

  /**
   * 设置处理器
   */
  setProcessor<T = unknown, R = unknown>(processor: QueueProcessor<T, R>): void {
    this.processor = processor as QueueProcessor;
    if (this.initialized && this.config.autoProcess && !this.processing) {
      this.startProcessing();
    }
  }

  /**
   * 添加项到队列
   */
  async add<T = unknown>(options: AddQueueItemOptions<T>): Promise<QueueItem<T>> {
    this.ensureInitialized();

    // 检查队列是否已满
    if (this.storage.size >= this.config.maxQueueSize) {
      const item = this.createItem(options);
      this.emit('queue:full', { item: item as QueueItem });
      throw QueueError.queueFull();
    }

    const item = this.createItem(options);
    await this.storage.add(item as QueueItem);
    this.emit('queue:add', { item: item as QueueItem });

    // 触发处理
    if (this.config.autoProcess && this.processor && this.online) {
      this.scheduleProcess();
    }

    return item;
  }

  /**
   * 批量添加
   */
  async addMany<T = unknown>(items: AddQueueItemOptions<T>[]): Promise<QueueItem<T>[]> {
    const results: QueueItem<T>[] = [];
    for (const options of items) {
      try {
        const item = await this.add(options);
        results.push(item);
      } catch (error) {
        if (error instanceof QueueError && error.code === 'QUEUE_FULL') {
          break;
        }
        throw error;
      }
    }
    return results;
  }

  /**
   * 获取队列项
   */
  get(id: string): QueueItem | undefined {
    this.ensureInitialized();
    return this.storage.get(id);
  }

  /**
   * 获取所有队列项
   */
  getAll(): QueueItem[] {
    this.ensureInitialized();
    return this.storage.getAll();
  }

  /**
   * 获取等待处理的项
   */
  getPending(limit?: number): QueueItem[] {
    this.ensureInitialized();
    return this.storage.getPending(limit);
  }

  /**
   * 获取失败的项
   */
  getFailed(): QueueItem[] {
    this.ensureInitialized();
    return this.storage.getFailed();
  }

  /**
   * 移除队列项
   */
  async remove(id: string): Promise<boolean> {
    this.ensureInitialized();
    return this.storage.remove(id);
  }

  /**
   * 重试失败的项
   */
  async retry(id: string): Promise<QueueItem | null> {
    this.ensureInitialized();
    const item = this.storage.get(id);
    if (!item || item.status !== QueueItemStatus.FAILED) {
      return null;
    }

    const updated = await this.storage.update(id, {
      status: QueueItemStatus.PENDING,
      retryCount: 0,
      error: undefined,
    });

    if (updated && this.config.autoProcess && this.processor && this.online) {
      this.scheduleProcess();
    }

    return updated;
  }

  /**
   * 重试所有失败的项
   */
  async retryAll(): Promise<number> {
    this.ensureInitialized();
    const failed = this.storage.getFailed();
    let count = 0;

    for (const item of failed) {
      const updated = await this.storage.update(item.id, {
        status: QueueItemStatus.PENDING,
        retryCount: 0,
        error: undefined,
      });
      if (updated) count++;
    }

    if (count > 0 && this.config.autoProcess && this.processor && this.online) {
      this.scheduleProcess();
    }

    return count;
  }

  /**
   * 清空队列
   */
  async clear(): Promise<number> {
    this.ensureInitialized();
    const count = await this.storage.clear();
    this.emit('queue:clear', { count });
    return count;
  }

  /**
   * 获取统计信息
   */
  getStats(): QueueStats {
    this.ensureInitialized();
    return this.storage.getStats();
  }

  /**
   * 队列大小
   */
  get size(): number {
    return this.storage.size;
  }

  /**
   * 是否为空
   */
  get isEmpty(): boolean {
    return this.storage.isEmpty;
  }

  /**
   * 是否正在处理
   */
  get isProcessing(): boolean {
    return this.processing;
  }

  /**
   * 是否在线
   */
  get isOnline(): boolean {
    return this.online;
  }

  // ========================
  // 网络状态
  // ========================

  /**
   * 设置网络状态
   */
  setOnline(online: boolean): void {
    const wasOffline = !this.online;
    this.online = online;
    this.emit('network:change', { online });

    // 从离线变为在线，触发处理
    if (wasOffline && online && this.config.autoProcess && this.processor) {
      this.scheduleProcess();
    }
  }

  // ========================
  // 处理控制
  // ========================

  /**
   * 启动处理
   */
  startProcessing(): void {
    if (this.processing) return;
    this.processing = true;
    this.emit('processor:start', {});
    this.scheduleProcess();
  }

  /**
   * 停止处理
   */
  stopProcessing(): void {
    this.processing = false;
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }
    this.emit('processor:stop', {});
  }

  /**
   * 手动处理一批
   */
  async processNext(limit?: number): Promise<number> {
    this.ensureInitialized();
    if (!this.processor) {
      throw QueueError.processorNotSet();
    }

    const pending = this.storage.getPending(limit ?? this.config.concurrency);
    if (pending.length === 0) return 0;

    const results = await Promise.allSettled(pending.map((item) => this.processItem(item)));

    return results.filter((r) => r.status === 'fulfilled').length;
  }

  // ========================
  // 事件
  // ========================

  /**
   * 订阅事件
   */
  on<K extends keyof QueueEvents>(event: K, listener: QueueEventListener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as QueueEventListener<keyof QueueEvents>);
    return () => this.off(event, listener);
  }

  /**
   * 取消订阅
   */
  off<K extends keyof QueueEvents>(event: K, listener: QueueEventListener<K>): void {
    this.listeners.get(event)?.delete(listener as QueueEventListener<keyof QueueEvents>);
  }

  // ========================
  // 清理
  // ========================

  /**
   * 清理过期项
   */
  async cleanExpired(): Promise<number> {
    const expired = this.storage.getExpired();
    if (expired.length === 0) return 0;

    for (const item of expired) {
      await this.storage.update(item.id, { status: QueueItemStatus.EXPIRED });
      this.emit('queue:expired', { item });
    }

    // 删除过期项
    const ids = expired.map((item) => item.id);
    return this.storage.removeMany(ids);
  }

  /**
   * 清理已完成的项
   */
  async cleanCompleted(): Promise<number> {
    const completed = this.storage
      .getAll()
      .filter((item) => item.status === QueueItemStatus.SUCCESS);
    const ids = completed.map((item) => item.id);
    return this.storage.removeMany(ids);
  }

  // ========================
  // 私有方法
  // ========================

  private emit<K extends keyof QueueEvents>(event: K, payload: QueueEvents[K]): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        (listener as QueueEventListener<K>)(payload);
      } catch {
        // 监听器错误静默处理
      }
    });
  }

  private createItem<T>(options: AddQueueItemOptions<T>): QueueItem<T> {
    const now = Date.now();
    const ttl = options.ttl ?? this.config.defaultTTL;

    return {
      id: generateId(),
      type: options.type,
      payload: options.payload,
      priority: options.priority ?? QueuePriority.NORMAL,
      status: QueueItemStatus.PENDING,
      createdAt: now,
      lastAttemptAt: null,
      retryCount: 0,
      expiresAt: ttl > 0 ? now + ttl : undefined,
      metadata: options.metadata,
    };
  }

  private scheduleProcess(): void {
    if (this.processTimer || !this.processing) return;

    this.processTimer = setTimeout(async () => {
      this.processTimer = null;
      await this.processBatch();

      // 如果还有待处理项，继续调度
      if (this.processing && this.storage.getPending(1).length > 0) {
        this.scheduleProcess();
      }
    }, this.config.processIntervalMs);
  }

  private async processBatch(): Promise<void> {
    if (!this.processor || !this.online) return;

    const pending = this.storage.getPending(this.config.concurrency);
    if (pending.length === 0) return;

    await Promise.allSettled(pending.map((item) => this.processItem(item)));
  }

  private async processItem(item: QueueItem): Promise<void> {
    if (!this.processor) return;

    // 标记为发送中
    await this.storage.update(item.id, {
      status: QueueItemStatus.SENDING,
      lastAttemptAt: Date.now(),
    });
    this.emit('queue:process', { item });

    try {
      const result = await this.processor(item);

      // 成功
      await this.storage.update(item.id, {
        status: QueueItemStatus.SUCCESS,
      });
      this.emit('queue:success', { item, result });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // 判断是否需要重试
      const willRetry = item.retryCount < this.config.maxRetries;

      if (willRetry) {
        // 重试
        const retryCount = item.retryCount + 1;
        const delayMs = this.calculateRetryDelay(retryCount);

        await this.storage.update(item.id, {
          status: QueueItemStatus.PENDING,
          retryCount,
          error: err.message,
        });

        this.emit('queue:retry', { item, retryCount, delayMs });

        // 延迟后重新调度
        setTimeout(() => {
          if (this.processing && this.online) {
            this.scheduleProcess();
          }
        }, delayMs);
      } else {
        // 失败
        await this.storage.update(item.id, {
          status: QueueItemStatus.FAILED,
          error: err.message,
        });
      }

      this.emit('queue:error', { item, error: err, willRetry });
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    // 指数退避
    const delay = this.config.retryDelayMs * Math.pow(2, retryCount - 1);
    return Math.min(delay, this.config.maxRetryDelayMs);
  }
}
