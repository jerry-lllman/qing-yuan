/**
 * 好友相关 WebSocket 事件
 */

export const FriendEvent = {
  // 客户端 -> 服务端
  REQUEST_SEND: 'friend:request:send',
  REQUEST_ACCEPT: 'friend:request:accept',
  REQUEST_REJECT: 'friend:request:reject',
  REMOVE: 'friend:remove',

  // 服务端 -> 客户端
  REQUEST_RECEIVED: 'friend:request:received',
  REQUEST_ACCEPTED: 'friend:request:accepted',
  REQUEST_REJECTED: 'friend:request:rejected',
  ADDED: 'friend:added',
  REMOVED: 'friend:removed',
} as const;

export type FriendEventType = (typeof FriendEvent)[keyof typeof FriendEvent];
