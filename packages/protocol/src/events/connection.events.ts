/**
 * 连接相关 WebSocket 事件
 */

export const ConnectionEvent = {
  // Socket.io 内置事件
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // 自定义连接事件
  AUTHENTICATED: 'connection:authenticated',
  UNAUTHORIZED: 'connection:unauthorized',
  RECONNECTING: 'connection:reconnecting',
  RECONNECTED: 'connection:reconnected',

  // 心跳
  PING: 'connection:ping',
  PONG: 'connection:pong',

  // 同步
  SYNC_REQUEST: 'connection:sync:request',
  SYNC_RESPONSE: 'connection:sync:response',
} as const;

export type ConnectionEventType = (typeof ConnectionEvent)[keyof typeof ConnectionEvent];
