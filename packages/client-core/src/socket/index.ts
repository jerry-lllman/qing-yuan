import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';
import { ConnectionEvent, MessageEvent, ChatEvent, FriendEvent, UserEvent } from '@qyra/protocol';
import type {
  SendMessagePayload,
  EditMessagePayload,
  DeleteMessagePayload,
  ReadMessagePayload,
  TypingPayload,
  MessageReceivedPayload,
  MessageDeliveredPayload,
  MessageReadReceiptPayload,
  TypingNotificationPayload,
  SyncRequestPayload,
  SyncResponsePayload,
  AuthenticatedPayload,
  UnauthorizedPayload,
} from '@qyra/protocol';

// ============================================================================
// 类型定义
// ============================================================================

/** 连接状态 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error',
}

/** Token 提供者 */
export type TokenProvider = () => string | null | Promise<string | null>;

/** Socket 客户端配置 */
export interface SocketClientConfig {
  /** 服务器 URL */
  url: string;
  /** 命名空间 */
  namespace?: string;
  /** Token 提供者 */
  tokenProvider: TokenProvider;
  /** 自动重连 */
  autoReconnect?: boolean;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 重连延迟（毫秒） */
  reconnectDelay?: number;
  /** 连接超时（毫秒） */
  timeout?: number;
  /** Socket.io 额外选项 */
  socketOptions?: Partial<ManagerOptions & SocketOptions>;
}

/** 事件监听器类型 */
export type EventListener<T = unknown> = (payload: T) => void;

/** 事件监听器映射 */
interface EventListenerMap {
  // 连接事件
  [ConnectionEvent.CONNECT]: EventListener<void>;
  [ConnectionEvent.DISCONNECT]: EventListener<string>;
  [ConnectionEvent.CONNECT_ERROR]: EventListener<Error>;
  [ConnectionEvent.AUTHENTICATED]: EventListener<AuthenticatedPayload>;
  [ConnectionEvent.UNAUTHORIZED]: EventListener<UnauthorizedPayload>;
  [ConnectionEvent.RECONNECTING]: EventListener<number>;
  [ConnectionEvent.RECONNECTED]: EventListener<void>;
  [ConnectionEvent.SYNC_RESPONSE]: EventListener<SyncResponsePayload>;

  // 消息事件
  [MessageEvent.RECEIVE]: EventListener<MessageReceivedPayload>;
  [MessageEvent.DELIVERED]: EventListener<MessageDeliveredPayload>;
  [MessageEvent.UPDATED]: EventListener<MessageReceivedPayload>;
  [MessageEvent.DELETED]: EventListener<{ messageId: string }>;
  [MessageEvent.READ_RECEIPT]: EventListener<MessageReadReceiptPayload>;
  [MessageEvent.TYPING]: EventListener<TypingNotificationPayload>;

  // 会话事件
  [ChatEvent.CREATED]: EventListener<unknown>;
  [ChatEvent.UPDATED]: EventListener<unknown>;
  [ChatEvent.DELETED]: EventListener<{ chatId: string }>;
  [ChatEvent.MEMBER_JOINED]: EventListener<unknown>;
  [ChatEvent.MEMBER_LEFT]: EventListener<unknown>;
  [ChatEvent.MEMBER_UPDATED]: EventListener<unknown>;

  // 好友事件
  [FriendEvent.REQUEST_RECEIVED]: EventListener<unknown>;
  [FriendEvent.REQUEST_ACCEPTED]: EventListener<unknown>;
  [FriendEvent.REQUEST_REJECTED]: EventListener<unknown>;
  [FriendEvent.ADDED]: EventListener<unknown>;
  [FriendEvent.REMOVED]: EventListener<unknown>;

  // 用户事件
  [UserEvent.STATUS_CHANGED]: EventListener<unknown>;
  [UserEvent.PROFILE_CHANGED]: EventListener<unknown>;
  [UserEvent.ONLINE]: EventListener<{ userId: string }>;
  [UserEvent.OFFLINE]: EventListener<{ userId: string }>;
}

/** 状态变更监听器 */
export type StatusChangeListener = (status: ConnectionStatus, error?: Error) => void;

// ============================================================================
// 自定义错误类
// ============================================================================

/** Socket 连接错误 */
export class SocketConnectionError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'CONNECTION_ERROR') {
    super(message);
    this.name = 'SocketConnectionError';
    this.code = code;
  }
}

/** Socket 认证错误 */
export class SocketAuthError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'AUTH_ERROR') {
    super(message);
    this.name = 'SocketAuthError';
    this.code = code;
  }
}

/** Socket 超时错误 */
export class SocketTimeoutError extends Error {
  constructor(message = '操作超时') {
    super(message);
    this.name = 'SocketTimeoutError';
  }
}

// ============================================================================
// Socket 客户端类
// ============================================================================

export class SocketClient {
  private socket: Socket | null = null;
  private readonly config: Required<Omit<SocketClientConfig, 'socketOptions'>> & {
    socketOptions?: Partial<ManagerOptions & SocketOptions>;
  };
  private _status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectAttempts = 0;
  private statusListeners: Set<StatusChangeListener> = new Set();
  private eventListeners: Map<string, Set<EventListener>> = new Map();

  constructor(config: SocketClientConfig) {
    this.config = {
      url: config.url,
      namespace: config.namespace ?? '/chat',
      tokenProvider: config.tokenProvider,
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
      timeout: config.timeout ?? 10000,
      socketOptions: config.socketOptions,
    };
  }

  // --------------------------------------------------------------------------
  // 属性访问器
  // --------------------------------------------------------------------------

  /** 获取连接状态 */
  get status(): ConnectionStatus {
    return this._status;
  }

  /** 是否已连接 */
  get isConnected(): boolean {
    return (
      this._status === ConnectionStatus.CONNECTED || this._status === ConnectionStatus.AUTHENTICATED
    );
  }

  /** 是否已认证 */
  get isAuthenticated(): boolean {
    return this._status === ConnectionStatus.AUTHENTICATED;
  }

  /** 获取 Socket ID */
  get socketId(): string | undefined {
    return this.socket?.id;
  }

  // --------------------------------------------------------------------------
  // 连接管理
  // --------------------------------------------------------------------------

  /** 连接到服务器 */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    this.setStatus(ConnectionStatus.CONNECTING);

    const token = await this.config.tokenProvider();
    if (!token) {
      const error = new SocketAuthError('No authentication token available');
      this.setStatus(ConnectionStatus.ERROR, error);
      throw error;
    }

    return new Promise((resolve, reject) => {
      const fullUrl = `${this.config.url}${this.config.namespace}`;

      this.socket = io(fullUrl, {
        auth: { token },
        autoConnect: true,
        reconnection: this.config.autoReconnect,
        reconnectionAttempts: this.config.maxReconnectAttempts,
        reconnectionDelay: this.config.reconnectDelay,
        timeout: this.config.timeout,
        transports: ['websocket', 'polling'],
        ...this.config.socketOptions,
      });

      const connectTimeout = setTimeout(() => {
        this.socket?.disconnect();
        const error = new SocketTimeoutError('连接超时');
        this.setStatus(ConnectionStatus.ERROR, error);
        reject(error);
      }, this.config.timeout);

      this.socket.once(ConnectionEvent.CONNECT, () => {
        clearTimeout(connectTimeout);
        this.reconnectAttempts = 0;
        this.setStatus(ConnectionStatus.CONNECTED);
        console.log('[SocketClient] Connected, waiting for authentication...');
        // 等待服务端认证确认
      });

      this.socket.once(ConnectionEvent.CONNECT_ERROR, (error: Error) => {
        clearTimeout(connectTimeout);
        console.error('[SocketClient] Connection error:', error);
        const socketError = new SocketConnectionError(error.message);
        this.setStatus(ConnectionStatus.ERROR, socketError);
        reject(socketError);
      });

      // 设置事件监听
      this.setupEventHandlers();

      // 认证成功
      this.socket.once(ConnectionEvent.AUTHENTICATED, (payload: AuthenticatedPayload) => {
        console.log('[SocketClient] Authenticated:', payload);
        this.setStatus(ConnectionStatus.AUTHENTICATED);
        this.notifyListeners(ConnectionEvent.AUTHENTICATED, payload);
        resolve();
      });

      // 认证失败
      this.socket.once(ConnectionEvent.UNAUTHORIZED, (payload: UnauthorizedPayload) => {
        clearTimeout(connectTimeout);
        const error = new SocketAuthError(payload.reason, payload.code);
        this.setStatus(ConnectionStatus.ERROR, error);
        reject(error);
      });
    });
  }

  /** 断开连接 */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
    this.setStatus(ConnectionStatus.DISCONNECTED);
    this.reconnectAttempts = 0;
  }

  /** 重新连接 */
  async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  // --------------------------------------------------------------------------
  // 事件处理
  // --------------------------------------------------------------------------

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // 断开连接
    this.socket.on(ConnectionEvent.DISCONNECT, (reason: string) => {
      this.setStatus(ConnectionStatus.DISCONNECTED);
      this.notifyListeners(ConnectionEvent.DISCONNECT, reason);

      if (
        this.config.autoReconnect &&
        reason !== 'io client disconnect' &&
        reason !== 'io server disconnect'
      ) {
        this.handleReconnect();
      }
    });

    // 连接错误
    this.socket.on(ConnectionEvent.CONNECT_ERROR, (error: Error) => {
      this.notifyListeners(ConnectionEvent.CONNECT_ERROR, error);
    });

    // 转发所有服务端事件
    this.forwardEvents();
  }

  private forwardEvents(): void {
    if (!this.socket) return;

    // 消息事件
    const messageEvents = [
      MessageEvent.RECEIVE,
      MessageEvent.DELIVERED,
      MessageEvent.UPDATED,
      MessageEvent.DELETED,
      MessageEvent.READ_RECEIPT,
      MessageEvent.TYPING,
    ];

    // 会话事件
    const chatEvents = [
      ChatEvent.CREATED,
      ChatEvent.UPDATED,
      ChatEvent.DELETED,
      ChatEvent.MEMBER_JOINED,
      ChatEvent.MEMBER_LEFT,
      ChatEvent.MEMBER_UPDATED,
    ];

    // 好友事件
    const friendEvents = [
      FriendEvent.REQUEST_RECEIVED,
      FriendEvent.REQUEST_ACCEPTED,
      FriendEvent.REQUEST_REJECTED,
      FriendEvent.ADDED,
      FriendEvent.REMOVED,
    ];

    // 用户事件
    const userEvents = [
      UserEvent.STATUS_CHANGED,
      UserEvent.PROFILE_CHANGED,
      UserEvent.ONLINE,
      UserEvent.OFFLINE,
    ];

    // 连接事件
    const connectionEvents = [ConnectionEvent.SYNC_RESPONSE, ConnectionEvent.PONG];

    const allEvents = [
      ...messageEvents,
      ...chatEvents,
      ...friendEvents,
      ...userEvents,
      ...connectionEvents,
    ];

    allEvents.forEach((event) => {
      this.socket?.on(event, (payload: unknown) => {
        console.log(`[SocketClient] Received event: ${event}`, payload);
        this.notifyListeners(event, payload);
      });
    });
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      const error = new SocketConnectionError('已达到最大重连次数');
      this.setStatus(ConnectionStatus.ERROR, error);
      return;
    }

    this.reconnectAttempts++;
    this.setStatus(ConnectionStatus.RECONNECTING);
    this.notifyListeners(ConnectionEvent.RECONNECTING, this.reconnectAttempts);

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.connect();
      this.notifyListeners(ConnectionEvent.RECONNECTED, undefined);
    } catch {
      // 递归重试
      this.handleReconnect();
    }
  }

  // --------------------------------------------------------------------------
  // 状态管理
  // --------------------------------------------------------------------------

  private setStatus(status: ConnectionStatus, error?: Error): void {
    console.log('[SocketClient] setStatus:', status, 'listeners:', this.statusListeners.size);
    this._status = status;
    this.statusListeners.forEach((listener) => listener(status, error));
  }

  /** 监听状态变更 */
  onStatusChange(listener: StatusChangeListener): () => void {
    console.log(
      '[SocketClient] onStatusChange registered, total listeners:',
      this.statusListeners.size + 1
    );
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  // --------------------------------------------------------------------------
  // 事件订阅
  // --------------------------------------------------------------------------

  /** 订阅事件 */
  on<K extends keyof EventListenerMap>(event: K, listener: EventListenerMap[K]): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as EventListener);

    return () => this.off(event, listener);
  }

  /** 取消订阅事件 */
  off<K extends keyof EventListenerMap>(event: K, listener: EventListenerMap[K]): void {
    this.eventListeners.get(event)?.delete(listener as EventListener);
  }

  /** 订阅一次性事件 */
  once<K extends keyof EventListenerMap>(event: K, listener: EventListenerMap[K]): () => void {
    const wrappedListener = ((payload: unknown) => {
      this.off(event, wrappedListener as EventListenerMap[K]);
      (listener as EventListener)(payload);
    }) as EventListenerMap[K];

    return this.on(event, wrappedListener);
  }

  private notifyListeners(event: string, payload: unknown): void {
    const listeners = this.eventListeners.get(event);
    console.log(
      `[SocketClient] notifyListeners for ${event}, listeners count:`,
      listeners?.size ?? 0
    );
    listeners?.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 消息操作
  // --------------------------------------------------------------------------

  /** 发送消息 */
  sendMessage(payload: SendMessagePayload): Promise<MessageDeliveredPayload> {
    return this.emitWithAck(MessageEvent.SEND, payload);
  }

  /** 编辑消息 */
  editMessage(payload: EditMessagePayload): Promise<void> {
    return this.emitWithAck(MessageEvent.EDIT, payload);
  }

  /** 删除消息 */
  deleteMessage(payload: DeleteMessagePayload): Promise<void> {
    return this.emitWithAck(MessageEvent.DELETE, payload);
  }

  /** 标记消息已读 */
  markAsRead(payload: ReadMessagePayload): Promise<void> {
    return this.emitWithAck(MessageEvent.READ, payload);
  }

  /** 开始输入 */
  startTyping(payload: TypingPayload): void {
    this.socket?.emit(MessageEvent.TYPING_START, payload);
  }

  /** 停止输入 */
  stopTyping(payload: TypingPayload): void {
    this.socket?.emit(MessageEvent.TYPING_STOP, payload);
  }

  // --------------------------------------------------------------------------
  // 同步操作
  // --------------------------------------------------------------------------

  /** 请求同步 */
  requestSync(payload: SyncRequestPayload): Promise<SyncResponsePayload> {
    return this.emitWithAck(ConnectionEvent.SYNC_REQUEST, payload);
  }

  // --------------------------------------------------------------------------
  // 通用方法
  // --------------------------------------------------------------------------

  /** 发送事件并等待确认 */
  private emitWithAck<T>(event: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new SocketConnectionError('Socket 未连接'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new SocketTimeoutError());
      }, this.config.timeout);

      this.socket.emit(
        event,
        payload,
        (response: { error?: { message: string; code: string }; data?: T }) => {
          clearTimeout(timeout);

          if (response.error) {
            reject(new SocketConnectionError(response.error.message, response.error.code));
          } else {
            resolve(response.data as T);
          }
        }
      );
    });
  }

  /** 发送原始事件（无确认） */
  emit(event: string, payload: unknown): void {
    this.socket?.emit(event, payload);
  }
}

// ============================================================================
// 默认实例管理
// ============================================================================

let defaultClient: SocketClient | null = null;

/** 初始化默认 Socket 客户端 */
export function initSocketClient(config: SocketClientConfig): SocketClient {
  defaultClient = new SocketClient(config);
  return defaultClient;
}

/** 获取默认 Socket 客户端 */
export function getSocketClient(): SocketClient {
  if (!defaultClient) {
    throw new Error('SocketClient not initialized. Call initSocketClient() first.');
  }
  return defaultClient;
}

// ============================================================================
// 便捷方法导出
// ============================================================================

export const socket = {
  connect: () => getSocketClient().connect(),
  disconnect: () => getSocketClient().disconnect(),
  reconnect: () => getSocketClient().reconnect(),

  get status() {
    return getSocketClient().status;
  },
  get isConnected() {
    return getSocketClient().isConnected;
  },
  get isAuthenticated() {
    return getSocketClient().isAuthenticated;
  },

  onStatusChange: (listener: StatusChangeListener) => getSocketClient().onStatusChange(listener),

  on: <K extends keyof EventListenerMap>(event: K, listener: EventListenerMap[K]) =>
    getSocketClient().on(event, listener),

  off: <K extends keyof EventListenerMap>(event: K, listener: EventListenerMap[K]) =>
    getSocketClient().off(event, listener),

  once: <K extends keyof EventListenerMap>(event: K, listener: EventListenerMap[K]) =>
    getSocketClient().once(event, listener),

  // 消息操作
  sendMessage: (payload: SendMessagePayload) => getSocketClient().sendMessage(payload),
  editMessage: (payload: EditMessagePayload) => getSocketClient().editMessage(payload),
  deleteMessage: (payload: DeleteMessagePayload) => getSocketClient().deleteMessage(payload),
  markAsRead: (payload: ReadMessagePayload) => getSocketClient().markAsRead(payload),
  startTyping: (payload: TypingPayload) => getSocketClient().startTyping(payload),
  stopTyping: (payload: TypingPayload) => getSocketClient().stopTyping(payload),

  // 同步操作
  requestSync: (payload: SyncRequestPayload) => getSocketClient().requestSync(payload),
};
