/**
 * 同步管理器
 * 负责消息和会话的同步逻辑
 */

import type { SocketClient } from '../socket';
import type { IStorageAdapter } from '../storage/types';
import type {
  SyncOptions,
  SyncResult,
  SyncEvents,
  SyncEventListener,
  SyncManagerConfig,
  ChatSyncData,
  MessageSyncData,
  SyncCursor,
  SyncBatchConfig,
} from './types';
import { SyncStrategy, SyncStatus, DEFAULT_SYNC_CONFIG } from './types';
import { SyncCursorManager } from './sync-cursor';

/**
 * 同步错误
 */
export class SyncError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = true,
    public override cause?: Error
  ) {
    super(message);
    this.name = 'SyncError';
  }

  static networkError(cause?: Error): SyncError {
    return new SyncError('Network error during sync', 'NETWORK_ERROR', true, cause);
  }

  static timeout(): SyncError {
    return new SyncError('Sync request timeout', 'TIMEOUT', true);
  }

  static serverError(message: string): SyncError {
    return new SyncError(message, 'SERVER_ERROR', true);
  }

  static invalidData(message: string): SyncError {
    return new SyncError(message, 'INVALID_DATA', false);
  }
}

/**
 * 同步管理器
 */
export class SyncManager {
  private readonly config: SyncManagerConfig;
  private readonly cursorManager: SyncCursorManager;
  private readonly listeners: Map<keyof SyncEvents, Set<SyncEventListener<keyof SyncEvents>>> =
    new Map();

  private status: SyncStatus = SyncStatus.IDLE;
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private currentSyncAbortController: AbortController | null = null;

  constructor(
    private readonly socket: SocketClient,
    storage: IStorageAdapter,
    config: Partial<SyncManagerConfig> = {}
  ) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.cursorManager = new SyncCursorManager(storage);
  }

  // ========================
  // 公共 API
  // ========================

  /**
   * 获取当前同步状态
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * 获取游标管理器
   */
  getCursorManager(): SyncCursorManager {
    return this.cursorManager;
  }

  /**
   * 执行增量同步
   */
  async syncIncremental(chatId?: string): Promise<SyncResult<MessageSyncData>> {
    return this.sync({
      strategy: SyncStrategy.INCREMENTAL,
      chatId,
      limit: this.config.defaultBatchSize,
    });
  }

  /**
   * 执行全量同步
   */
  async syncFull(chatId?: string): Promise<SyncResult<MessageSyncData>> {
    // 重置游标
    if (chatId) {
      await this.cursorManager.resetChatCursor(chatId);
    } else {
      await this.cursorManager.resetGlobalCursor();
    }

    return this.sync({
      strategy: SyncStrategy.FULL,
      chatId,
      limit: this.config.defaultBatchSize,
    });
  }

  /**
   * 执行优先级同步（渐进式加载）
   */
  async syncWithPriority(): Promise<SyncResult<ChatSyncData>> {
    const startTime = Date.now();
    const allData: ChatSyncData[] = [];
    let totalCount = 0;

    this.setStatus(SyncStatus.SYNCING);
    this.emit('sync:start', { strategy: SyncStrategy.PRIORITY });

    try {
      const batches = this.config.priorityBatches;

      for (const [index, batch] of batches.entries()) {
        // 批次延迟
        if (batch.delayMs > 0 && index > 0) {
          await this.delay(batch.delayMs);
        }

        // 检查是否被中止
        if (this.currentSyncAbortController?.signal.aborted) {
          throw new SyncError('Sync aborted', 'ABORTED', false);
        }

        const result = await this.syncBatch(batch);
        allData.push(...result.data);
        totalCount += result.count;

        this.emit('sync:batch', {
          batchIndex: index,
          count: result.count,
          hasMore: result.hasMore,
        });

        // 更新进度
        const percentage = Math.round(((index + 1) / batches.length) * 100);
        this.emit('sync:progress', {
          loaded: totalCount,
          total: -1, // 未知总数
          percentage,
        });
      }

      const duration = Date.now() - startTime;
      this.emit('sync:complete', { totalCount, duration });
      this.setStatus(SyncStatus.IDLE);

      return {
        data: allData,
        hasMore: false,
        nextCursor: null,
        count: totalCount,
        duration,
      };
    } catch (error) {
      this.setStatus(SyncStatus.IDLE);
      const syncError = error instanceof SyncError ? error : SyncError.networkError(error as Error);
      this.emit('sync:error', {
        error: syncError,
        retryable: syncError.retryable,
      });
      throw syncError;
    }
  }

  /**
   * 通用同步方法
   */
  async sync<T = MessageSyncData>(options: SyncOptions): Promise<SyncResult<T>> {
    const startTime = Date.now();

    // 获取游标
    const cursor =
      options.cursor ??
      (options.chatId
        ? await this.cursorManager.getChatCursor(options.chatId)
        : await this.cursorManager.getGlobalCursor());

    this.setStatus(SyncStatus.SYNCING);
    this.emit('sync:start', {
      strategy: options.strategy,
      chatId: options.chatId,
    });

    try {
      const result = await this.requestSync<T>(cursor, options);
      const duration = Date.now() - startTime;

      // 更新游标
      if (result.data.length > 0 && result.nextCursor) {
        if (options.chatId) {
          await this.cursorManager.saveChatCursor(options.chatId, result.nextCursor);
        } else {
          await this.cursorManager.saveGlobalCursor(result.nextCursor);
        }
      }

      this.emit('sync:complete', { totalCount: result.count, duration });
      this.setStatus(SyncStatus.IDLE);

      return { ...result, duration };
    } catch (error) {
      this.setStatus(SyncStatus.IDLE);
      const syncError = error instanceof SyncError ? error : SyncError.networkError(error as Error);
      this.emit('sync:error', {
        error: syncError,
        retryable: syncError.retryable,
      });
      throw syncError;
    }
  }

  /**
   * 中止当前同步
   */
  abort(): void {
    this.currentSyncAbortController?.abort();
    this.currentSyncAbortController = null;
    this.setStatus(SyncStatus.IDLE);
  }

  /**
   * 启动自动同步
   */
  startAutoSync(intervalMs?: number): void {
    const interval = intervalMs ?? this.config.autoSyncIntervalMs;
    if (interval <= 0) return;

    this.stopAutoSync();
    this.autoSyncTimer = setInterval(() => {
      if (this.status === SyncStatus.IDLE) {
        this.syncIncremental().catch(() => {
          // 自动同步失败静默处理
        });
      }
    }, interval);
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  // ========================
  // 事件监听
  // ========================

  /**
   * 订阅同步事件
   */
  on<K extends keyof SyncEvents>(event: K, listener: SyncEventListener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as SyncEventListener<keyof SyncEvents>);

    return () => this.off(event, listener);
  }

  /**
   * 取消订阅同步事件
   */
  off<K extends keyof SyncEvents>(event: K, listener: SyncEventListener<K>): void {
    this.listeners.get(event)?.delete(listener as SyncEventListener<keyof SyncEvents>);
  }

  // ========================
  // 私有方法
  // ========================

  private setStatus(status: SyncStatus): void {
    this.status = status;
  }

  private emit<K extends keyof SyncEvents>(event: K, payload: SyncEvents[K]): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        (listener as SyncEventListener<K>)(payload);
      } catch {
        // 监听器错误静默处理
      }
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 同步单个批次
   */
  private async syncBatch(batch: SyncBatchConfig): Promise<SyncResult<ChatSyncData>> {
    const cursor = await this.cursorManager.getGlobalCursor();

    // 构建同步请求
    const payload = {
      limit: batch.batchSize,
      cursor: cursor.lastMessageId,
      timestamp: cursor.lastSyncTime,
      priority: batch.priority,
    };

    return this.requestSyncWithRetry<ChatSyncData>(payload);
  }

  /**
   * 发送同步请求
   */
  private async requestSync<T>(cursor: SyncCursor, options: SyncOptions): Promise<SyncResult<T>> {
    const payload = {
      strategy: options.strategy,
      limit: options.limit ?? this.config.defaultBatchSize,
      cursor: cursor.lastMessageId,
      timestamp: cursor.lastSyncTime,
      chatId: options.chatId,
      includeDeleted: options.includeDeleted ?? false,
    };

    return this.requestSyncWithRetry<T>(payload);
  }

  /**
   * 带重试的同步请求
   */
  private async requestSyncWithRetry<T>(payload: Record<string, unknown>): Promise<SyncResult<T>> {
    this.currentSyncAbortController = new AbortController();

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      try {
        // 检查中止信号
        if (this.currentSyncAbortController.signal.aborted) {
          throw new SyncError('Sync aborted', 'ABORTED', false);
        }

        const response = await this.socket.requestSync(
          payload as unknown as Parameters<SocketClient['requestSync']>[0]
        );

        // 解析响应
        return this.parseResponse<T>(response);
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }

    throw lastError ?? SyncError.networkError();
  }

  /**
   * 解析同步响应
   */
  private parseResponse<T>(response: unknown): SyncResult<T> {
    // 类型安全的响应解析
    const res = response as {
      data?: T[];
      messages?: T[];
      chats?: T[];
      hasMore?: boolean;
      nextCursor?: { lastMessageId: string; lastSyncTime: number };
      count?: number;
    };

    const data = res.data ?? res.messages ?? res.chats ?? [];
    const lastItem = data[data.length - 1] as { id?: string } | undefined;

    return {
      data,
      hasMore: res.hasMore ?? false,
      nextCursor: res.nextCursor
        ? {
            lastMessageId: res.nextCursor.lastMessageId,
            lastSyncTime: res.nextCursor.lastSyncTime,
          }
        : lastItem?.id
          ? {
              lastMessageId: lastItem.id,
              lastSyncTime: Date.now(),
            }
          : null,
      count: res.count ?? data.length,
      duration: 0,
    };
  }
}
