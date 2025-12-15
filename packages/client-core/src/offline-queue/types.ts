/**
 * 离线消息队列类型定义
 */

/** 队列项状态 */
export enum QueueItemStatus {
  /** 等待发送 */
  PENDING = 'pending',
  /** 正在发送 */
  SENDING = 'sending',
  /** 发送成功 */
  SUCCESS = 'success',
  /** 发送失败 */
  FAILED = 'failed',
  /** 已过期 */
  EXPIRED = 'expired',
}

/** 消息优先级 */
export enum QueuePriority {
  /** 最高优先级（系统消息） */
  CRITICAL = 0,
  /** 高优先级（用户主动操作） */
  HIGH = 1,
  /** 普通优先级（普通消息） */
  NORMAL = 2,
  /** 低优先级（后台同步） */
  LOW = 3,
}

/** 队列项类型 */
export enum QueueItemType {
  /** 发送消息 */
  SEND_MESSAGE = 'send_message',
  /** 消息已读 */
  MESSAGE_READ = 'message_read',
  /** 消息撤回 */
  MESSAGE_REVOKE = 'message_revoke',
  /** 输入状态 */
  TYPING = 'typing',
  /** 同步请求 */
  SYNC = 'sync',
  /** 自定义 */
  CUSTOM = 'custom',
}

/** 队列项 */
export interface QueueItem<T = unknown> {
  /** 唯一标识 */
  id: string;
  /** 类型 */
  type: QueueItemType;
  /** 载荷数据 */
  payload: T;
  /** 优先级 */
  priority: QueuePriority;
  /** 状态 */
  status: QueueItemStatus;
  /** 创建时间 */
  createdAt: number;
  /** 最后尝试时间 */
  lastAttemptAt: number | null;
  /** 重试次数 */
  retryCount: number;
  /** 过期时间（可选） */
  expiresAt?: number;
  /** 错误信息（失败时） */
  error?: string;
  /** 元数据（可选） */
  metadata?: Record<string, unknown>;
}

/** 队列配置 */
export interface OfflineQueueConfig {
  /** 最大队列长度 */
  maxQueueSize: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始重试延迟（毫秒） */
  retryDelayMs: number;
  /** 最大重试延迟（毫秒） */
  maxRetryDelayMs: number;
  /** 默认消息过期时间（毫秒），0 表示不过期 */
  defaultTTL: number;
  /** 处理并发数 */
  concurrency: number;
  /** 处理间隔（毫秒） */
  processIntervalMs: number;
  /** 是否自动处理 */
  autoProcess: boolean;
}

/** 默认配置 */
export const DEFAULT_QUEUE_CONFIG: OfflineQueueConfig = {
  maxQueueSize: 1000,
  maxRetries: 5,
  retryDelayMs: 1000,
  maxRetryDelayMs: 30000,
  defaultTTL: 24 * 60 * 60 * 1000, // 24小时
  concurrency: 3,
  processIntervalMs: 100,
  autoProcess: true,
};

/** 队列统计信息 */
export interface QueueStats {
  /** 总数 */
  total: number;
  /** 等待中 */
  pending: number;
  /** 发送中 */
  sending: number;
  /** 成功 */
  success: number;
  /** 失败 */
  failed: number;
  /** 已过期 */
  expired: number;
}

/** 队列事件 */
export interface QueueEvents {
  /** 项被添加 */
  'queue:add': { item: QueueItem };
  /** 项开始处理 */
  'queue:process': { item: QueueItem };
  /** 项处理成功 */
  'queue:success': { item: QueueItem; result: unknown };
  /** 项处理失败 */
  'queue:error': { item: QueueItem; error: Error; willRetry: boolean };
  /** 项重试 */
  'queue:retry': { item: QueueItem; retryCount: number; delayMs: number };
  /** 项过期 */
  'queue:expired': { item: QueueItem };
  /** 队列清空 */
  'queue:clear': { count: number };
  /** 队列已满 */
  'queue:full': { item: QueueItem };
  /** 处理器启动 */
  'processor:start': Record<string, never>;
  /** 处理器停止 */
  'processor:stop': Record<string, never>;
  /** 网络状态变化 */
  'network:change': { online: boolean };
}

/** 队列事件监听器 */
export type QueueEventListener<K extends keyof QueueEvents> = (payload: QueueEvents[K]) => void;

/** 处理器函数 */
export type QueueProcessor<T = unknown, R = unknown> = (item: QueueItem<T>) => Promise<R>;

/** 添加队列项的选项 */
export interface AddQueueItemOptions<T = unknown> {
  /** 类型 */
  type: QueueItemType;
  /** 载荷 */
  payload: T;
  /** 优先级（默认 NORMAL） */
  priority?: QueuePriority;
  /** 过期时间（毫秒），0 表示使用默认值 */
  ttl?: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}
