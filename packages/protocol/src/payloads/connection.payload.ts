/**
 * 连接事件载荷类型
 */

/** 同步请求载荷 */
export interface SyncRequestPayload {
  deviceId: string;
  /** 每个会话的最后消息 ID */
  cursors: Array<{
    conversationId: string;
    lastMessageId: string;
    lastSyncTime: number;
  }>;
}

/** 同步响应载荷 */
export interface SyncResponsePayload {
  /** 需要同步的消息列表 */
  messages: Array<{
    conversationId: string;
    messages: Array<{
      id: string;
      senderId: string;
      type: string;
      content: string;
      createdAt: string;
    }>;
  }>;
  /** 更新后的游标 */
  cursors: Array<{
    conversationId: string;
    lastMessageId: string;
    lastSyncTime: number;
  }>;
}

/** 认证成功载荷 */
export interface AuthenticatedPayload {
  userId: string;
  sessionId: string;
  serverTime: string;
}

/** 认证失败载荷 */
export interface UnauthorizedPayload {
  reason: string;
  code: string;
}
