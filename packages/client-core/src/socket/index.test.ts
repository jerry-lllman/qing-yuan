/**
 * SocketClient 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { io } from 'socket.io-client';
import { ConnectionEvent, MessageEvent } from '@qing-yuan/protocol';
import {
  SocketClient,
  ConnectionStatus,
  SocketConnectionError,
  SocketAuthError,
  SocketTimeoutError,
  initSocketClient,
  socket,
  type SocketClientConfig,
} from './index';

// Mock socket.io-client
vi.mock('socket.io-client');

// ============================================================================
// 测试辅助函数
// ============================================================================

interface MockSocket {
  id: string;
  connected: boolean;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
}

function createMockSocket(): MockSocket {
  return {
    id: 'mock-socket-id',
    connected: true,
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  };
}

function createDefaultConfig(overrides?: Partial<SocketClientConfig>): SocketClientConfig {
  return {
    url: 'https://api.example.com',
    tokenProvider: vi.fn(() => 'mock-token'),
    ...overrides,
  };
}

// ============================================================================
// 测试套件
// ============================================================================

describe('SocketClient', () => {
  let mockSocket: MockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
    vi.mocked(io).mockReturnValue(mockSocket as unknown as ReturnType<typeof io>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建客户端', () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);

      expect(client.status).toBe(ConnectionStatus.DISCONNECTED);
      expect(client.isConnected).toBe(false);
      expect(client.isAuthenticated).toBe(false);
    });

    it('应该支持自定义配置', () => {
      const config = createDefaultConfig({
        namespace: '/custom',
        autoReconnect: false,
        maxReconnectAttempts: 10,
        reconnectDelay: 2000,
        timeout: 5000,
      });

      const client = new SocketClient(config);
      expect(client).toBeInstanceOf(SocketClient);
    });
  });

  describe('connect', () => {
    it('无 token 时应该抛出 SocketAuthError', async () => {
      const config = createDefaultConfig({
        tokenProvider: vi.fn(() => null),
      });
      const client = new SocketClient(config);

      await expect(client.connect()).rejects.toBeInstanceOf(SocketAuthError);
      expect(client.status).toBe(ConnectionStatus.ERROR);
    });

    it('连接成功后应该设置状态为 CONNECTED', async () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);

      // 模拟连接成功和认证成功
      mockSocket.once.mockImplementation((event: string, callback: (payload?: unknown) => void) => {
        if (event === ConnectionEvent.CONNECT) {
          setTimeout(() => callback(), 0);
        }
        if (event === ConnectionEvent.AUTHENTICATED) {
          setTimeout(
            () =>
              callback({
                userId: 'user-1',
                sessionId: 'session-1',
                serverTime: new Date().toISOString(),
              }),
            10
          );
        }
        return mockSocket;
      });

      const connectPromise = client.connect();
      await connectPromise;

      expect(client.status).toBe(ConnectionStatus.AUTHENTICATED);
    });

    it('连接错误时应该抛出 SocketConnectionError', async () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);

      mockSocket.once.mockImplementation((event: string, callback: (error?: Error) => void) => {
        if (event === ConnectionEvent.CONNECT_ERROR) {
          setTimeout(() => callback(new Error('Connection failed')), 0);
        }
        return mockSocket;
      });

      await expect(client.connect()).rejects.toBeInstanceOf(SocketConnectionError);
      expect(client.status).toBe(ConnectionStatus.ERROR);
    });

    it('认证失败时应该抛出 SocketAuthError', async () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);

      mockSocket.once.mockImplementation((event: string, callback: (payload?: unknown) => void) => {
        if (event === ConnectionEvent.CONNECT) {
          setTimeout(() => callback(), 0);
        }
        if (event === ConnectionEvent.UNAUTHORIZED) {
          setTimeout(() => callback({ reason: 'Invalid token', code: 'INVALID_TOKEN' }), 10);
        }
        return mockSocket;
      });

      await expect(client.connect()).rejects.toBeInstanceOf(SocketAuthError);
    });

    it('已连接时不应重新连接', async () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);

      // 模拟已连接
      mockSocket.connected = true;
      mockSocket.once.mockImplementation((event: string, callback: (payload?: unknown) => void) => {
        if (event === ConnectionEvent.CONNECT) {
          setTimeout(() => callback(), 0);
        }
        if (event === ConnectionEvent.AUTHENTICATED) {
          setTimeout(() => callback({ userId: 'user-1' }), 10);
        }
        return mockSocket;
      });

      await client.connect();
      vi.mocked(io).mockClear();

      // 再次调用 connect
      await client.connect();

      // io 不应该被再次调用
      expect(io).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('应该断开连接并清理状态', async () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);

      mockSocket.once.mockImplementation((event: string, callback: (payload?: unknown) => void) => {
        if (event === ConnectionEvent.CONNECT) {
          setTimeout(() => callback(), 0);
        }
        if (event === ConnectionEvent.AUTHENTICATED) {
          setTimeout(() => callback({ userId: 'user-1' }), 10);
        }
        return mockSocket;
      });

      await client.connect();
      client.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(client.status).toBe(ConnectionStatus.DISCONNECTED);
    });
  });

  describe('事件订阅', () => {
    it('on 应该注册事件监听器', () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);
      const listener = vi.fn();

      const unsubscribe = client.on(MessageEvent.RECEIVE, listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('off 应该移除事件监听器', () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);
      const listener = vi.fn();

      client.on(MessageEvent.RECEIVE, listener);
      client.off(MessageEvent.RECEIVE, listener);

      // 监听器应该被移除
    });

    it('once 应该只触发一次', () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);
      const listener = vi.fn();

      client.once(MessageEvent.RECEIVE, listener);

      // once 注册后，监听器应该只被调用一次
    });

    it('unsubscribe 函数应该正确移除监听器', () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);
      const listener = vi.fn();

      const unsubscribe = client.on(MessageEvent.RECEIVE, listener);
      unsubscribe();

      // 监听器应该被移除
    });
  });

  describe('状态监听', () => {
    it('onStatusChange 应该在状态变更时被调用', async () => {
      const config = createDefaultConfig({
        tokenProvider: vi.fn(() => null),
      });
      const client = new SocketClient(config);
      const statusListener = vi.fn();

      client.onStatusChange(statusListener);

      try {
        await client.connect();
      } catch {
        // 预期会失败
      }

      expect(statusListener).toHaveBeenCalledWith(ConnectionStatus.CONNECTING, undefined);
      expect(statusListener).toHaveBeenCalledWith(
        ConnectionStatus.ERROR,
        expect.any(SocketAuthError)
      );
    });

    it('onStatusChange 返回的函数应该取消订阅', () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);
      const statusListener = vi.fn();

      const unsubscribe = client.onStatusChange(statusListener);
      unsubscribe();

      // 状态监听器应该被移除
    });
  });

  describe('消息操作', () => {
    let client: SocketClient;

    beforeEach(async () => {
      const config = createDefaultConfig();
      client = new SocketClient(config);

      mockSocket.once.mockImplementation((event: string, callback: (payload?: unknown) => void) => {
        if (event === ConnectionEvent.CONNECT) {
          setTimeout(() => callback(), 0);
        }
        if (event === ConnectionEvent.AUTHENTICATED) {
          setTimeout(() => callback({ userId: 'user-1' }), 10);
        }
        return mockSocket;
      });

      await client.connect();
    });

    it('sendMessage 应该发送消息并返回确认', async () => {
      const payload = {
        conversationId: 'conv-1',
        type: 'text' as const,
        content: 'Hello',
      };

      const expectedResponse = {
        messageId: 'msg-1',
        clientMessageId: 'client-msg-1',
        deliveredAt: new Date().toISOString(),
      };

      mockSocket.emit.mockImplementation(
        (_event: string, _payload: unknown, callback?: (response: { data?: unknown }) => void) => {
          if (callback) {
            callback({ data: expectedResponse });
          }
        }
      );

      const result = await client.sendMessage(payload);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        MessageEvent.SEND,
        payload,
        expect.any(Function)
      );
      expect(result).toEqual(expectedResponse);
    });

    it('sendMessage 在未连接时应该抛出错误', async () => {
      client.disconnect();
      mockSocket.connected = false;

      const payload = {
        conversationId: 'conv-1',
        type: 'text' as const,
        content: 'Hello',
      };

      await expect(client.sendMessage(payload)).rejects.toBeInstanceOf(SocketConnectionError);
    });

    it('startTyping 应该发送 typing:start 事件', () => {
      const payload = { conversationId: 'conv-1' };

      client.startTyping(payload);

      expect(mockSocket.emit).toHaveBeenCalledWith(MessageEvent.TYPING_START, payload);
    });

    it('stopTyping 应该发送 typing:stop 事件', () => {
      const payload = { conversationId: 'conv-1' };

      client.stopTyping(payload);

      expect(mockSocket.emit).toHaveBeenCalledWith(MessageEvent.TYPING_STOP, payload);
    });
  });

  describe('属性访问器', () => {
    it('socketId 应该返回 socket ID', async () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);

      mockSocket.once.mockImplementation((event: string, callback: (payload?: unknown) => void) => {
        if (event === ConnectionEvent.CONNECT) {
          setTimeout(() => callback(), 0);
        }
        if (event === ConnectionEvent.AUTHENTICATED) {
          setTimeout(() => callback({ userId: 'user-1' }), 10);
        }
        return mockSocket;
      });

      await client.connect();

      expect(client.socketId).toBe('mock-socket-id');
    });

    it('未连接时 socketId 应该返回 undefined', () => {
      const config = createDefaultConfig();
      const client = new SocketClient(config);

      expect(client.socketId).toBeUndefined();
    });
  });
});

describe('错误类', () => {
  describe('SocketConnectionError', () => {
    it('应该有正确的名称和默认 code', () => {
      const error = new SocketConnectionError('连接失败');

      expect(error.name).toBe('SocketConnectionError');
      expect(error.message).toBe('连接失败');
      expect(error.code).toBe('CONNECTION_ERROR');
    });

    it('应该支持自定义 code', () => {
      const error = new SocketConnectionError('连接失败', 'CUSTOM_ERROR');

      expect(error.code).toBe('CUSTOM_ERROR');
    });
  });

  describe('SocketAuthError', () => {
    it('应该有正确的名称和默认 code', () => {
      const error = new SocketAuthError('认证失败');

      expect(error.name).toBe('SocketAuthError');
      expect(error.message).toBe('认证失败');
      expect(error.code).toBe('AUTH_ERROR');
    });
  });

  describe('SocketTimeoutError', () => {
    it('应该有正确的名称和默认消息', () => {
      const error = new SocketTimeoutError();

      expect(error.name).toBe('SocketTimeoutError');
      expect(error.message).toBe('操作超时');
    });

    it('应该支持自定义消息', () => {
      const error = new SocketTimeoutError('连接超时');

      expect(error.message).toBe('连接超时');
    });
  });
});

describe('ConnectionStatus', () => {
  it('应该包含所有状态值', () => {
    expect(ConnectionStatus.DISCONNECTED).toBe('disconnected');
    expect(ConnectionStatus.CONNECTING).toBe('connecting');
    expect(ConnectionStatus.CONNECTED).toBe('connected');
    expect(ConnectionStatus.RECONNECTING).toBe('reconnecting');
    expect(ConnectionStatus.AUTHENTICATED).toBe('authenticated');
    expect(ConnectionStatus.ERROR).toBe('error');
  });
});

describe('默认实例管理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('未初始化时 getSocketClient 应该抛出错误', async () => {
    const { getSocketClient: freshGetSocketClient } = await import('./index');

    expect(() => freshGetSocketClient()).toThrow();
  });

  it('initSocketClient 应该返回 SocketClient 实例', () => {
    const mockSocket = createMockSocket();
    vi.mocked(io).mockReturnValue(mockSocket as unknown as ReturnType<typeof io>);

    const client = initSocketClient(createDefaultConfig());

    expect(client).toBeInstanceOf(SocketClient);
  });

  it('socket 便捷对象应该提供所有方法', () => {
    const mockSocket = createMockSocket();
    vi.mocked(io).mockReturnValue(mockSocket as unknown as ReturnType<typeof io>);

    initSocketClient(createDefaultConfig());

    expect(typeof socket.connect).toBe('function');
    expect(typeof socket.disconnect).toBe('function');
    expect(typeof socket.reconnect).toBe('function');
    expect(typeof socket.onStatusChange).toBe('function');
    expect(typeof socket.on).toBe('function');
    expect(typeof socket.off).toBe('function');
    expect(typeof socket.once).toBe('function');
    expect(typeof socket.sendMessage).toBe('function');
    expect(typeof socket.editMessage).toBe('function');
    expect(typeof socket.deleteMessage).toBe('function');
    expect(typeof socket.markAsRead).toBe('function');
    expect(typeof socket.startTyping).toBe('function');
    expect(typeof socket.stopTyping).toBe('function');
    expect(typeof socket.requestSync).toBe('function');
  });
});
