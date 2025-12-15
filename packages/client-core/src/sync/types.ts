/**
 * 消息同步类型定义
 */

/** 同步策略 */
export enum SyncStrategy {
  /** 增量同步：只获取上次同步后的新数据 */
  INCREMENTAL = 'incremental',
  /** 全量同步：重建所有数据 */
  FULL = 'full',
  /** 优先级同步：按优先级分批加载 */
  PRIORITY = 'priority',
}

/** 同步状态 */
export enum SyncStatus {
  /** 空闲 */
  IDLE = 'idle',
  /** 同步中 */
  SYNCING = 'syncing',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 失败 */
  FAILED = 'failed',
}

/** 同步游标 */
export interface SyncCursor {
  /** 最后同步的消息 ID */
  lastMessageId: string | null;
  /** 最后同步时间戳 */
  lastSyncTime: number;
  /** 会话 ID（可选，用于单会话同步） */
  chatId?: string;
}

/** 同步优先级 */
export enum SyncPriority {
  /** 最高优先级：未读消息 */
  UNREAD = 0,
  /** 高优先级：置顶会话 */
  PINNED = 1,
  /** 中优先级：最近活跃 */
  RECENT = 2,
  /** 低优先级：历史会话 */
  ARCHIVE = 3,
}

/** 同步批次配置 */
export interface SyncBatchConfig {
  /** 批次大小 */
  batchSize: number;
  /** 批次延迟（毫秒） */
  delayMs: number;
  /** 优先级 */
  priority: SyncPriority;
}

/** 同步选项 */
export interface SyncOptions {
  /** 同步策略 */
  strategy: SyncStrategy;
  /** 每次请求的消息数量限制 */
  limit?: number;
  /** 同步游标 */
  cursor?: SyncCursor;
  /** 指定会话 ID（可选） */
  chatId?: string;
  /** 是否包含已删除消息 */
  includeDeleted?: boolean;
  /** 批次配置（用于优先级同步） */
  batches?: SyncBatchConfig[];
}

/** 同步结果 */
export interface SyncResult<T = unknown> {
  /** 同步的数据 */
  data: T[];
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 下一个游标 */
  nextCursor: SyncCursor | null;
  /** 同步的数据数量 */
  count: number;
  /** 同步耗时（毫秒） */
  duration: number;
}

/** 会话同步数据 */
export interface ChatSyncData {
  /** 会话 ID */
  id: string;
  /** 会话类型 */
  type: 'private' | 'group';
  /** 未读消息数 */
  unreadCount: number;
  /** 是否置顶 */
  isPinned: boolean;
  /** 最后一条消息 */
  lastMessage: MessageSyncData | null;
  /** 最后活跃时间 */
  lastActiveAt: number;
}

/** 消息同步数据 */
export interface MessageSyncData {
  /** 消息 ID */
  id: string;
  /** 会话 ID */
  chatId: string;
  /** 发送者 ID */
  senderId: string;
  /** 消息类型 */
  type: string;
  /** 加密内容 */
  encryptedContent: string;
  /** 发送时间 */
  sentAt: number;
  /** 是否已读 */
  isRead: boolean;
  /** 是否已删除 */
  isDeleted: boolean;
}

/** 同步事件 */
export interface SyncEvents {
  /** 同步开始 */
  'sync:start': { strategy: SyncStrategy; chatId?: string };
  /** 同步进度 */
  'sync:progress': { loaded: number; total: number; percentage: number };
  /** 批次完成 */
  'sync:batch': { batchIndex: number; count: number; hasMore: boolean };
  /** 同步完成 */
  'sync:complete': { totalCount: number; duration: number };
  /** 同步失败 */
  'sync:error': { error: Error; retryable: boolean };
}

/** 同步事件监听器 */
export type SyncEventListener<K extends keyof SyncEvents> = (payload: SyncEvents[K]) => void;

/** 同步管理器配置 */
export interface SyncManagerConfig {
  /** 默认批次大小 */
  defaultBatchSize: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelayMs: number;
  /** 自动同步间隔（毫秒，0 表示禁用） */
  autoSyncIntervalMs: number;
  /** 优先级同步批次配置 */
  priorityBatches: SyncBatchConfig[];
}

/** 默认同步配置 */
export const DEFAULT_SYNC_CONFIG: SyncManagerConfig = {
  defaultBatchSize: 50,
  maxRetries: 3,
  retryDelayMs: 1000,
  autoSyncIntervalMs: 0,
  priorityBatches: [
    // 第1批：未读消息，立即加载
    { batchSize: 10, delayMs: 0, priority: SyncPriority.UNREAD },
    // 第2批：置顶会话，延迟 100ms
    { batchSize: 10, delayMs: 100, priority: SyncPriority.PINNED },
    // 第3批：最近活跃，延迟 300ms
    { batchSize: 20, delayMs: 300, priority: SyncPriority.RECENT },
    // 第4批：历史会话，延迟 500ms
    { batchSize: 50, delayMs: 500, priority: SyncPriority.ARCHIVE },
  ],
};
