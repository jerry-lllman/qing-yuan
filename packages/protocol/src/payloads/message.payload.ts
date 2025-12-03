/**
 * 消息事件载荷类型
 */

import { type MessageType, type MessageAttachment, type MessageStatus } from '@cyan/shared';

/** 发送消息载荷 */
export interface SendMessagePayload {
  conversationId: string;
  type: MessageType;
  content: string;
  attachments?: Omit<MessageAttachment, 'id'>[];
  replyTo?: string;
  /** 客户端生成的临时 ID，用于消息去重和状态同步 */
  clientMessageId?: string;
}

/** 编辑消息载荷 */
export interface EditMessagePayload {
  messageId: string;
  content: string;
}

/** 删除消息载荷 */
export interface DeleteMessagePayload {
  messageId: string;
}

/** 已读消息载荷 */
export interface ReadMessagePayload {
  conversationId: string;
  messageId: string;
}

/** 正在输入载荷 */
export interface TypingPayload {
  conversationId: string;
}

/** 收到消息载荷 */
export interface MessageReceivedPayload {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  attachments: MessageAttachment[];
  replyTo: string | null;
  status: MessageStatus;
  createdAt: string;
  /** 客户端生成的临时 ID */
  clientMessageId?: string;
}

/** 消息已送达载荷 */
export interface MessageDeliveredPayload {
  messageId: string;
  clientMessageId?: string;
  deliveredAt: string;
}

/** 消息已读回执载荷 */
export interface MessageReadReceiptPayload {
  messageId: string;
  userId: string;
  readAt: string;
}

/** 正在输入通知载荷 */
export interface TypingNotificationPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}
