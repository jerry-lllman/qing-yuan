/**
 * 用户状态相关 WebSocket 事件
 */

export const UserEvent = {
  // 客户端 -> 服务端
  STATUS_UPDATE: 'user:status:update',
  PROFILE_UPDATE: 'user:profile:update',

  // 服务端 -> 客户端
  STATUS_CHANGED: 'user:status:changed',
  PROFILE_CHANGED: 'user:profile:changed',
  ONLINE: 'user:online',
  OFFLINE: 'user:offline',
} as const;

export type UserEventType = (typeof UserEvent)[keyof typeof UserEvent];
