/**
 * 消息相关 WebSocket 事件
 */

export const MessageEvent = {
  // 客户端 -> 服务端
  SEND: 'message:send',
  EDIT: 'message:edit',
  DELETE: 'message:delete',
  READ: 'message:read',
  TYPING_START: 'message:typing:start',
  TYPING_STOP: 'message:typing:stop',

  // 服务端 -> 客户端
  RECEIVE: 'message:receive',
  DELIVERED: 'message:delivered',
  UPDATED: 'message:updated',
  DELETED: 'message:deleted',
  READ_RECEIPT: 'message:read:receipt',
  TYPING: 'message:typing',
} as const;

export type MessageEventType = (typeof MessageEvent)[keyof typeof MessageEvent];
