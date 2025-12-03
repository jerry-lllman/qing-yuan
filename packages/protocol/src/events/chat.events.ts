/**
 * 会话相关 WebSocket 事件
 */

export const ChatEvent = {
  // 客户端 -> 服务端
  CREATE: 'chat:create',
  JOIN: 'chat:join',
  LEAVE: 'chat:leave',
  UPDATE: 'chat:update',
  PIN: 'chat:pin',
  UNPIN: 'chat:unpin',
  MUTE: 'chat:mute',
  UNMUTE: 'chat:unmute',

  // 服务端 -> 客户端
  CREATED: 'chat:created',
  UPDATED: 'chat:updated',
  DELETED: 'chat:deleted',
  MEMBER_JOINED: 'chat:member:joined',
  MEMBER_LEFT: 'chat:member:left',
  MEMBER_UPDATED: 'chat:member:updated',
} as const;

export type ChatEventType = (typeof ChatEvent)[keyof typeof ChatEvent];
